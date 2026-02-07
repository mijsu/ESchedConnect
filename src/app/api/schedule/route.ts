import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc, query, where } from 'firebase/firestore';
import { ScheduleItem, MAX_START_SLOT, DAYS } from '@/lib/types';

// GET - Fetch schedule with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filterType = searchParams.get('type') || 'master';
    const sectionId = searchParams.get('sectionId');
    const professorId = searchParams.get('professorId');
    const year = searchParams.get('year');

    let scheduleRef = collection(db, 'schedule');
    let queryConstraints = [];

    // Apply filters
    if (sectionId && filterType === 'section') {
      queryConstraints.push(query(collection(db, 'schedule'), where('sectionId', '==', sectionId)));
    }
    if (professorId && filterType === 'professor') {
      queryConstraints.push(query(collection(db, 'schedule'), where('professorId', '==', professorId)));
    }
    if (year && filterType === 'year') {
      queryConstraints.push(query(collection(db, 'schedule'), where('year', '==', parseInt(year))));
    }

    const snapshot = await getDocs(queryConstraints.length > 0 ? queryConstraints[0] : scheduleRef);

    if (snapshot.empty) {
      // Don't auto-generate - let admin create schedules
      return NextResponse.json({ schedule: [] });
    }

    const schedule = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as ScheduleItem[];

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}

// POST - Auto-generate and save schedule with improved day-based distribution
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sectionId, academicYear, semester } = body;

    // Fetch all required data from Firestore
    const [subjectsSnap, sectionsSnap, usersSnap, deptsSnap, programsSnap] = await Promise.all([
      getDocs(collection(db, 'subjects')),
      getDocs(collection(db, 'sections')),
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'departments')),
      getDocs(collection(db, 'programs'))
    ]);

    if (subjectsSnap.empty || sectionsSnap.empty) {
      return NextResponse.json(
        { error: 'Please create subjects and sections first' },
        { status: 400 }
      );
    }

    const subjects = subjectsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const sections = sectionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const professors = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((user: any) => (user as any).role === 'professor');
    const departments = deptsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const programs = programsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (professors.length === 0) {
      return NextResponse.json(
        { error: 'No professors found' },
        { status: 400 }
      );
    }

    // Delete existing schedule items if we're generating for all sections
    if (!sectionId) {
      const existingSchedule = await getDocs(collection(db, 'schedule'));
      const deleteBatch = writeBatch(db);
      existingSchedule.docs.forEach((doc) => {
        deleteBatch.delete(doc.ref);
      });
      if (!existingSchedule.empty) {
        await deleteBatch.commit();
      }
    }

    // Helper function to check if professor is qualified for subject based on department
    const isProfessorQualifiedForSubject = (prof: any, subject: any): boolean => {
      if (!subject.programId) {
        return false;
      }

      const subjectProgram = programs.find((p: any) => p.id === subject.programId);

      if (!subjectProgram) {
        console.warn(`Warning: Subject ${subject.code} (${subject.name}) has programId ${subject.programId} but program not found`);
        return false; // Program not found
      }

      if (!subjectProgram.departmentId) {
        console.warn(`Warning: Subject ${subject.code} belongs to program ${subjectProgram.name} which is not assigned to any department`);
        return false; // Program not assigned to a department
      }

      if (!prof.departmentIds || prof.departmentIds.length === 0) {
        console.warn(`Warning: Professor ${prof.name} has no department assignments`);
        return false; // Professor has no department assignments
      }

      const isQualified = prof.departmentIds.includes(subjectProgram.departmentId);

      if (!isQualified) {
        const dept = departments.find((d: any) => d.id === subjectProgram.departmentId);
        console.warn(`Warning: Professor ${prof.name} (depts: ${prof.departmentIds.join(', ')}) not qualified for subject ${subject.code} - subject's department is ${dept?.code || subjectProgram.departmentId}`);
      }

      return isQualified;
    };

    // Define professor schedule tracking
    interface ProfessorSchedule {
      id: string;
      name: string;
      departmentIds: string[];
      teachingDays: string[]; // Days this professor teaches (Mon, Tue, Wed, Thu, Fri)
      scheduledDays: Set<string>;
      scheduledHours: number;
      assignedSubjects: number;
    }

    // Initialize professor schedule tracking
    const professorSchedule: ProfessorSchedule[] = professors.map((prof: any) => {
      // Determine teaching days from department assignments
      const teachingDays: string[] = [];

      if (prof.departmentIds && prof.departmentIds.length > 0) {
        // Each department defines which days they operate
        // For simplicity, assume departments operate Mon-Fri (DAYS array)
        prof.departmentIds.forEach((deptId) => {
          teachingDays.push(...DAYS);
        });
      }

      return {
        id: prof.id,
        name: prof.name,
        departmentIds: prof.departmentIds || [],
        teachingDays: [...new Set(teachingDays)], // Unique teaching days
        scheduledDays: new Set<string>(),
        scheduledHours: 0,
        assignedSubjects: 0
      };
    });

    // Check if professor is available for a time slot
    const isProfessorAvailable = (
      prof: ProfessorSchedule,
      day: string,
      startSlot: number,
      duration: number
    ): boolean => {
      // Check if professor teaches on this day
      if (!prof.teachingDays.includes(day)) {
        return false; // Professor doesn't teach on this day
      }

      // Check if day is already scheduled
      if (prof.scheduledDays.has(day)) {
        return false;
      }

      return true;
    };

    // Mark time slot as used for a professor
    const markSlotUsed = (
      prof: ProfessorSchedule,
      day: string,
      startSlot: number,
      duration: number
    ): void => {
      prof.scheduledDays.add(day);
      prof.scheduledHours += duration;
      prof.assignedSubjects += 1;
    };

    // Find best time slot (prioritizes least recently used day)
    const findBestTimeSlot = (
      day: string,
      duration: number,
      prof: ProfessorSchedule,
      existingSchedule: ScheduleItem[],
      sectionId: string
    ): { day: string; startSlot: number } | null => {
      // Check all possible time slots for this day and professor
      const timeSlots: number[] = [];

      for (let slot = 1; slot <= MAX_START_SLOT - duration + 1; slot++) {
        if (isProfessorAvailable(prof, day, slot, duration)) {
          // Check for conflicts
          const endSlot = slot + duration;
          const hasConflict = existingSchedule.some((item) => {
            if (item.day !== day) return false;
            const itemEnd = item.startSlot + item.duration;
            const timeOverlap = slot < itemEnd && endSlot > item.startSlot;
            const profOverlap = item.professorId === prof.id;
            const sectionOverlap = item.sectionId === sectionId;
            // Conflict if time overlaps AND (same professor OR same section)
            return timeOverlap && (profOverlap || sectionOverlap);
          });

          if (!hasConflict) {
            timeSlots.push(slot);
          }
        }
      }

      if (timeSlots.length === 0) return null;

      // Prefer slots that minimize conflicts and spread across day
      // Sort by position to find earliest/most available
      const bestSlot = timeSlots[0];

      return { day, startSlot: bestSlot };
    };

    // Generate schedule for a specific section or all sections
    const targetSections = sectionId ? sections.filter((s) => s.id === sectionId) : sections;
    const schedule: ScheduleItem[] = [];
    const batch = writeBatch(db);

    // Track statistics
    let scheduledCount = 0;
    let skippedCount = 0;
    const skippedSubjects: string[] = [];
    const scheduledBaseCodes = new Set<string>();

    // Check for subjects without program assignments
    const subjectsWithoutProgram = subjects.filter((subj: any) => !subj.programId);
    if (subjectsWithoutProgram.length > 0) {
      console.warn(`Warning: ${subjectsWithoutProgram.length} subjects not assigned to any program and will not be scheduled`);
    }

    // Check for programs without department assignments
    const programsWithoutDepartment = programs.filter((p: any) => !p.departmentId);
    if (programsWithoutDepartment.length > 0) {
      console.warn(`Warning: ${programsWithoutDepartment.length} programs not assigned to any department. Subjects belonging to these programs will not be scheduled.`);
    }

    // Phase 1: Day-Based Distribution (Aggressive - Fill all teaching days)
    console.log('\n=== Phase 1: Day-Based Distribution (Aggressive Fill All Days) ===');
    let phase1Scheduled = 0;
    let phase1Attempts = 0;
    const maxPhase1Attempts = 500; // Increased to allow more assignments

    targetSections.forEach((section) => {
      const sectionProgram = programs.find((p: any) => p.id === section.programId);
      if (!sectionProgram || !sectionProgram.departmentId) return;

      const sectionDept = departments.find((d: any) => d.id === sectionProgram.departmentId);
      const sectionDeptName = sectionDept?.code || sectionProgram.departmentId;

      // Get matching subjects for this section
      const matchingSubjects = subjects.filter((subj: any) => {
        if (!subj.programId) return false;
        const matchesProgram = subj.programId === section.programId;
        const matchesYear = subj.year === section.year;
        const matchesSemester = subj.semester === semester;
        return matchesProgram && matchesYear && matchesSemester;
      });

      // For each subject, try to assign to each professor's teaching days (don't stop after first assignment)
      matchingSubjects.forEach((subj: any) => {
        const uniqueKey = `${section.id}-${subj.code}`;
        if (scheduledBaseCodes.has(uniqueKey)) return;

        const qualifiedProfs = professorSchedule.filter((prof) =>
          isProfessorQualifiedForSubject(prof, subj)
        );

        if (qualifiedProfs.length === 0) {
          const subjectDept = departments.find((d: any) => d.id === subj.programId);
          console.warn(`Warning: No qualified professors found for subject ${subj.code} (${subj.name}) in department ${subjectDept?.code || 'N/A'}`);
          skippedCount++;
          skippedSubjects.push(`${subj.code} (${subj.name}) - Department: ${subjectDept?.code || 'N/A'}`);
          return;
        }

        // Try to assign to each professor's teaching days (more aggressive)
        for (const prof of qualifiedProfs) {
          let subjectAssignedThisProfessor = false;

          for (const day of prof.teachingDays) {
            if (phase1Attempts >= maxPhase1Attempts) break; // Global attempt limit

            if (prof.scheduledDays.has(day)) continue; // Day already used

            const slot = findBestTimeSlot(day, subj.totalHours || 1, prof, schedule, section.id);

            if (slot) {
              // Create schedule item
              const scheduleData = {
                subjectId: subj.id,
                subjectCode: subj.code,
                subjectName: subj.name,
                type: 'combined',
                sectionId: section.id,
                sectionName: section.sectionName,
                programId: section.programId,
                programName: section.programName,
                year: section.year,
                professorId: prof.id,
                professorName: prof.name,
                day: slot.day,
                startSlot: slot.startSlot,
                duration: subj.totalHours || 1,
                semester: semester,
                academicYear: academicYear || '2024-2025',
                lectureHours: subj.lectureHours || 0,
                labHours: subj.labHours || 0,
                createdAt: new Date()
              };

              const docRef = doc(collection(db, 'schedule'));
              batch.set(docRef, scheduleData);
              schedule.push({ id: docRef.id, ...scheduleData });

              // Mark slot as used
              markSlotUsed(prof, slot.day, slot.startSlot, subj.totalHours || 1);

              scheduledCount++;
              phase1Scheduled++;
              subjectAssignedThisProfessor = true;

              console.log(`  Assigned ${subj.code} to ${prof.name} on ${slot.day} slot ${slot.startSlot} (Prof now has ${prof.assignedSubjects} subjects, ${prof.scheduledHours} hours)`);
              break; // Stop after first successful assignment to this professor
            }
          }

          if (subjectAssignedThisProfessor) {
            console.log(`  Subject ${subj.code} was assigned to ${prof.name}`);
          }
        }
      });

      phase1Attempts++;
    });

    console.log(`Phase 1 scheduled: ${phase1Scheduled} subjects`);

    // Phase 2: Balanced Stacking (only if Phase 1 couldn't fill all days)
    console.log('\n=== Phase 2: Balanced Stacking (Fill Remaining Capacity) ===');
    let phase2Scheduled = 0;
    let phase2Attempts = 0;
    const maxPhase2Attempts = 500;

    // Check if there are still unassigned subjects after Phase 1
    const hasUnassignedSubjects = professorSchedule.some((prof) => prof.teachingDays.some((day) => !prof.scheduledDays.has(day)));

    while (phase2Attempts < maxPhase2Attempts && hasUnassignedSubjects) {
      phase2Attempts++;

      let assignedThisRound = false;

      targetSections.forEach((section) => {
        const matchingSubjects = subjects.filter((subj: any) => {
          if (!subj.programId) return false;
          const matchesProgram = subj.programId === section.programId;
          const matchesYear = subj.year === section.year;
          const matchesSemester = subj.semester === semester;
          return matchesProgram && matchesYear && matchesSemester;
        });

        matchingSubjects.forEach((subj: any) => {
          const uniqueKey = `${section.id}-${subj.code}`;
          if (scheduledBaseCodes.has(uniqueKey)) return;

          const qualifiedProfs = professorSchedule.filter((prof) =>
            isProfessorQualifiedForSubject(prof, subj)
          );

          if (qualifiedProfs.length === 0) return;

          // Try to assign to professors with more availability (prioritize underutilized)
          // Sort professors by available slots (more slots first)
          const sortedProfessors = [...qualifiedProfs].sort((a, b) => {
            const aAvailable = a.teachingDays.filter((day) => !a.scheduledDays.has(day)).length;
            const bAvailable = b.teachingDays.filter((day) => !b.scheduledDays.has(day)).length;
            if (aAvailable !== bAvailable) {
              return bAvailable - aAvailable; // More slots wins
            } else {
              return a.scheduledHours - b.scheduledHours; // Lower hours wins
            }
          });

          // Try each professor
          for (const prof of sortedProfessors) {
            for (const day of prof.teachingDays) {
              if (prof.scheduledDays.has(day)) continue;

              const slot = findBestTimeSlot(day, subj.totalHours || 1, prof, schedule, section.id);

              if (slot) {
                const scheduleData = {
                  subjectId: subj.id,
                  subjectCode: subj.code,
                  subjectName: subj.name,
                  type: 'combined',
                  sectionId: section.id,
                  sectionName: section.sectionName,
                  programId: section.programId,
                  programName: section.programName,
                  year: section.year,
                  professorId: prof.id,
                  professorName: prof.name,
                  day: slot.day,
                  startSlot: slot.startSlot,
                  duration: subj.totalHours || 1,
                  semester: semester,
                  academicYear: academicYear || '2024-2025',
                  lectureHours: subj.lectureHours || 0,
                  labHours: subj.labHours || 0,
                  createdAt: new Date()
                };

                const docRef = doc(collection(db, 'schedule'));
                batch.set(docRef, scheduleData);
                schedule.push({ id: docRef.id, ...scheduleData });

                markSlotUsed(prof, slot.day, slot.startSlot, subj.totalHours || 1);

                scheduledCount++;
                phase2Scheduled++;

                scheduledBaseCodes.add(uniqueKey);
                assignedThisRound = true;

                console.log(`  Phase 2: Assigned ${subj.code} to ${prof.name} on ${slot.day} ( ${prof.assignedSubjects + 1} subjects, ${prof.scheduledHours} hours)`);
                break;
              }
            }

            if (assignedThisRound) break;
          }
        });
      });

      // Check if all teaching days are now filled
      const allTeachingDaysFilled = professorSchedule.every((prof) => prof.teachingDays.every((day) => prof.scheduledDays.has(day)));

      if (allTeachingDaysFilled || phase2Attempts >= maxPhase2Attempts) {
        console.log('All teaching days are now filled or max attempts reached');
        break;
      }
    }

    console.log(`Phase 2 scheduled: ${phase2Scheduled} subjects`);

    // Count how many subjects couldn't be scheduled
    const skippedSubjectDetails: string[] = [];

    targetSections.forEach((section) => {
      const matchingSubjects = subjects.filter((subj: any) => {
        if (!subj.programId) return false;
        const matchesProgram = subj.programId === section.programId;
        const matchesYear = subj.year === section.year;
        const matchesSemester = subj.semester === semester;
        return matchesProgram && matchesYear && matchesSemester;
      });

      matchingSubjects.forEach((subj: any) => {
        const uniqueKey = `${section.id}-${subj.code}`;
        if (!scheduledBaseCodes.has(uniqueKey)) {
          const subjectProgram = programs.find((p: any) => p.id === subj.programId);
          const subjectDept = departments.find((d: any) => d.id === subjectProgram?.departmentId);
          skippedCount++;
          skippedSubjectDetails.push(`${subj.code} (${subj.name}) - Department: ${subjectDept?.code || 'N/A'}`);
        }
      });
    });

    // Commit all schedule items to Firestore
    await batch.commit();

    // Log detailed day distribution
    console.log('\n=== Professor Day Distribution ===');
    professorSchedule.forEach((prof) => {
      const teachingDaysStr = prof.teachingDays.join(', ');
      const scheduledDaysStr = Array.from(prof.scheduledDays).join(', ');
      const availableSlots = prof.teachingDays.filter((day) => !prof.scheduledDays.has(day)).length;
      console.log(`${prof.name}:`);
      console.log(`  Teaching Days: ${teachingDaysStr}`);
      console.log(`  Scheduled Days: ${scheduledDaysStr}`);
      console.log(`  Subjects: ${prof.assignedSubjects}`);
      console.log(`  Hours: ${prof.scheduledHours}`);
    });

    // Log summary
    console.log(`\n=== Schedule Generation Summary ===`);
    console.log(`Total sections processed: ${targetSections.length}`);
    console.log(`Phase 1 (Fill all teaching days): ${phase1Scheduled} subjects`);
    console.log(`Phase 2 (Balanced stacking): ${phase2Scheduled} subjects`);
    console.log(`Total scheduled: ${scheduledCount}`);
    console.log(`Subjects skipped: ${skippedCount}`);
    if (skippedSubjectDetails.length > 0) {
      console.log(`Skipped subjects details:`);
      skippedSubjectDetails.forEach(s => console.log(`  ${s}`));
    }
    console.log(`================================\n`);

    return NextResponse.json({
      schedule,
      stats: {
        totalSections: targetSections.length,
        scheduled: scheduledCount,
        skipped: skippedCount,
        skippedSubjects: skippedSubjectDetails,
      }
    });
  } catch (error) {
    console.error('Error generating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to generate schedule' },
      { status: 500 }
    );
  }
}
