import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc, query, where, deleteDoc } from 'firebase/firestore';
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
      queryConstraints.push(where('sectionId', '==', sectionId));
    }
    if (professorId && filterType === 'professor') {
      queryConstraints.push(where('professorId', '==', professorId));
    }
    if (year && filterType === 'year') {
      queryConstraints.push(where('year', '==', parseInt(year)));
    }

    if (queryConstraints.length > 0) {
      scheduleRef = query(collection(db, 'schedule'), ...queryConstraints);
    }

    const snapshot = await getDocs(scheduleRef);

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

// POST - Auto-generate and save schedule
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
      // Subject MUST have a programId to be scheduled
      if (!subject.programId) {
        return false;
      }

      // Find the program that this subject belongs to
      const subjectProgram = programs.find((p: any) => p.id === subject.programId);

      if (!subjectProgram) {
        console.warn(`Warning: Subject ${subject.code} (${subject.name}) has programId ${subject.programId} but program not found`);
        return false; // Program not found
      }

      // Check if the program is assigned to a department
      if (!subjectProgram.departmentId) {
        console.warn(`Warning: Subject ${subject.code} belongs to program ${subjectProgram.name} which is not assigned to any department`);
        return false; // Program not assigned to a department
      }

      // Check if professor is assigned to this department
      if (!prof.departmentIds || prof.departmentIds.length === 0) {
        console.warn(`Warning: Professor ${prof.name} has no department assignments`);
        return false; // Professor has no department assignments
      }

      // Core constraint: Professor's departments MUST include the subject's program's department
      const isQualified = prof.departmentIds.includes(subjectProgram.departmentId);

      if (!isQualified) {
        const dept = departments.find((d: any) => d.id === subjectProgram.departmentId);
        console.warn(`Warning: Professor ${prof.name} (depts: ${prof.departmentIds.join(', ')}) not qualified for subject ${subject.code} - subject's department is ${dept?.code || subjectProgram.departmentId}`);
      }

      return isQualified;
    };

    // Generate schedule for a specific section or all sections
    const targetSections = sectionId ? sections.filter((s) => s.id === sectionId) : sections;
    const schedule: ScheduleItem[] = [];
    const batch = writeBatch(db);

    // Track statistics
    let scheduledCount = 0;
    let skippedCount = 0;
    const skippedSubjects: string[] = [];

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

    targetSections.forEach((section) => {
      // Verify section's program has a department
      const sectionProgram = programs.find((p: any) => p.id === section.programId);
      if (!sectionProgram) {
        console.warn(`Warning: Section ${section.sectionName} has programId ${section.programId} but program not found. Skipping section.`);
        return;
      }
      if (!sectionProgram.departmentId) {
        console.warn(`Warning: Section ${section.sectionName} belongs to program ${sectionProgram.name} which is not assigned to any department. Skipping section.`);
        return;
      }

      const sectionDept = departments.find((d: any) => d.id === sectionProgram.departmentId);
      const sectionDeptName = sectionDept?.code || sectionProgram.departmentId;

      // Track which base courses have already been scheduled for this section
      const scheduledBaseCodes = new Set<string>();

      // Filter subjects that match section's program, year AND specified semester
      const matchingSubjects = subjects.filter((subj: any) => {
        // Subject MUST have a programId to be scheduled
        if (!subj.programId) {
          return false; // Skip subjects not assigned to any program
        }

        // Subject must belong to the same program as the section
        const matchesProgram = subj.programId === section.programId;

        // Subject must match the section's year level
        const matchesYear = subj.year === section.year;

        // Subject must match the specified semester
        const matchesSemester = subj.semester === semester;

        return matchesProgram && matchesYear && matchesSemester;
      });

      // For each matching subject, try to schedule it
      matchingSubjects.forEach((subj: any) => {
        // Skip if this base course is already scheduled for this section
        if (scheduledBaseCodes.has(subj.code)) {
          return;
        }

        // Find qualified professors for this subject (hard department constraint)
        const qualifiedProfessors = professors.filter((prof: any) =>
          isProfessorQualifiedForSubject(prof, subj)
        );

        // If no qualified professors, skip this subject
        if (qualifiedProfessors.length === 0) {
          const subjectDept = departments.find((d: any) => d.id === subjectProgram.departmentId);
          console.warn(`Warning: No qualified professors found for subject ${subj.code} (${subj.name}) in department ${subjectDept?.code || subjectProgram.departmentId}. Subject skipped.`);
          skippedCount++;
          skippedSubjects.push(`${subj.code} (${subj.name}) - Department: ${subjectDept?.code || 'N/A'}`);
          return;
        }

        const prof = qualifiedProfessors[Math.floor(Math.random() * qualifiedProfessors.length)];
        scheduledCount++;

        // Create ONE schedule item that includes both lecture and lab info
        const scheduleData = {
          subjectId: subj.id,
          subjectCode: subj.code,
          subjectName: subj.name,
          type: 'combined',  // New type to indicate this is a combined subject
          sectionId: section.id,
          sectionName: section.sectionName,
          programId: section.programId,
          programName: section.programName,
          year: section.year,
          professorId: prof.id,
          professorName: prof.name,
          day: DAYS[Math.floor(Math.random() * 5)],
          startSlot: Math.floor(Math.random() * (MAX_START_SLOT - (subj.totalHours || 1))) + 1,
          duration: subj.totalHours || 1,
          semester: semester,
          academicYear: academicYear || '2024-2025',
          lectureHours: subj.lectureHours || 0,  // Store lecture hours separately
          labHours: subj.labHours || 0,  // Store lab hours separately
          createdAt: new Date()
        };

        const docRef = doc(collection(db, 'schedule'));
        batch.set(docRef, scheduleData);

        schedule.push({
          id: docRef.id,
          ...scheduleData
        });

        // Mark this subject as scheduled for this section
        scheduledBaseCodes.add(subj.code);
      });
    });

    // Commit all schedule items to Firestore
    await batch.commit();

    // Log summary
    console.log(`\n=== Schedule Generation Summary ===`);
    console.log(`Total sections processed: ${targetSections.length}`);
    console.log(`Subjects scheduled: ${scheduledCount}`);
    console.log(`Subjects skipped: ${skippedCount}`);
    if (skippedSubjects.length > 0) {
      console.log(`Skipped subjects details:`);
      skippedSubjects.forEach(s => console.log(`  - ${s}`));
    }
    console.log(`================================\n`);

    return NextResponse.json({
      schedule,
      stats: {
        totalSections: targetSections.length,
        scheduled: scheduledCount,
        skipped: skippedCount,
        skippedSubjects,
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

// Helper function to schedule a single session (lecture or lab)
function scheduleSession(
  subject: any,
  prof: any,
  type: 'lecture' | 'lab',
  duration: number,
  section: any,
  semester: number,
  academicYear: string,
  schedule: ScheduleItem[],
  batch: any
): void {
  let attempts = 0;
  let placed = false;

  while (!placed && attempts < 100) {
    const day = DAYS[Math.floor(Math.random() * 5)];
    const startSlot = Math.floor(Math.random() * (MAX_START_SLOT - duration)) + 1;

    if (checkOverlap(day, startSlot, duration, prof.id, schedule)) {
      const scheduleData = {
        subjectId: subject.id,
        subjectCode: subject.code,
        subjectName: subject.name,
        type: type,
        sectionId: section.id,
        sectionName: section.sectionName,
        programId: section.programId,
        programName: section.programName,
        year: section.year,
        professorId: prof.id,
        professorName: prof.name,
        day: day,
        startSlot: startSlot,
        duration: duration,
        semester: semester,
        academicYear: academicYear || '2024-2025',
        createdAt: new Date()
      };

      const docRef = doc(collection(db, 'schedule'));
      batch.set(docRef, scheduleData);

      schedule.push({
        id: docRef.id,
        ...scheduleData
      });

      placed = true;
    }
    attempts++;
  }
}

// Helper function to check overlap (no room tracking)
function checkOverlap(
  day: string,
  start: number,
  duration: number,
  profId: string,
  schedule: ScheduleItem[]
): boolean {
  const end = start + duration;

  return !schedule.some((item) => {
    if (item.day !== day) return false;

    const itemEnd = item.startSlot + item.duration;
    const timeOverlap = start < itemEnd && end > item.startSlot;
    const profOverlap = item.professorId === profId;

    return timeOverlap && profOverlap;
  });
}
