import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, query, where, writeBatch, doc } from 'firebase/firestore';

// GET - Seed subjects (no programId needed - uses first available)
export async function GET() {
  try {
    // Clear all existing subjects first to ensure clean state
    const existingSubjectsSnap = await getDocs(collection(db, 'subjects'));
    if (!existingSubjectsSnap.empty) {
      console.log('Clearing existing subjects...');
      const deleteBatch = writeBatch(db);
      existingSubjectsSnap.docs.forEach((doc) => {
        deleteBatch.delete(doc.ref);
      });
      await deleteBatch.commit();
      console.log(`Cleared ${existingSubjectsSnap.size} existing subjects`);
    }

    // Try to get programs
    const programsSnap = await getDocs(collection(db, 'programs'));

    let program;

    if (programsSnap.empty) {
      // No programs exist, create a default one
      console.log('No programs found, creating default program');
      const programRef = await addDoc(collection(db, 'programs'), {
        name: 'Bachelor of Science in Computer Science',
        code: 'BSCS',
        description: 'Default computer science program',
        createdAt: new Date()
      });

      program = {
        id: programRef.id,
        name: 'Bachelor of Science in Computer Science',
        code: 'BSCS',
        description: 'Default computer science program'
      };

      console.log('Created default program:', program.name);
    } else {
      // Use the first program
      program = { id: programsSnap.docs[0].id, ...programsSnap.docs[0].data() };
      console.log('Using existing program:', program.name);
    }

    return await seedSubjects(program);
  } catch (error) {
    console.error('Error seeding subjects:', error);
    return NextResponse.json(
      { error: 'Failed to seed subjects. ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (error) {
      // Empty body - treat as GET request
      return await GET();
    }

    const { programId } = body;

    if (programId) {
      // Specific program requested
      const programRef = await getDocs(
        query(collection(db, 'programs'), where('id', '==', programId))
      );

      if (programRef.empty) {
        return NextResponse.json(
          { error: 'Program not found with the provided ID' },
          { status: 404 }
        );
      }

      const program = { id: programRef.docs[0].id, ...programRef.docs[0].data() };
      return await seedSubjects(program);
    }

    // No programId - fallback to GET behavior
    return await GET();
  } catch (error) {
    console.error('Error seeding subjects:', error);
    return NextResponse.json(
      { error: 'Failed to seed subjects. ' + (error as Error).message },
      { status: 500 }
    );
  }
}

async function seedSubjects(program: any): Promise<NextResponse> {
  try {
    // Sample subjects with combined lecture and lab hours
    const subjectsData = [
      // First Year, First Semester
      {
        code: 'CS101',
        name: 'Introduction to Computing',
        year: 1,
        semester: 1,
        units: 3,
        lectureHours: 2,
        labHours: 3,
        totalHours: 5,
        programId: program.id,
        programName: program.name
      },
      {
        code: 'MATH101',
        name: 'College Algebra',
        year: 1,
        semester: 1,
        units: 3,
        lectureHours: 3,
        labHours: 0,
        totalHours: 3,
        programId: program.id,
        programName: program.name
      },
      {
        code: 'ENG101',
        name: 'English Communication',
        year: 1,
        semester: 1,
        units: 3,
        lectureHours: 3,
        labHours: 0,
        totalHours: 3,
        programId: program.id,
        programName: program.name
      },
      // First Year, Second Semester
      {
        code: 'CS102',
        name: 'Programming Fundamentals',
        year: 1,
        semester: 2,
        units: 3,
        lectureHours: 2,
        labHours: 3,
        totalHours: 5,
        programId: program.id,
        programName: program.name
      },
      {
        code: 'MATH102',
        name: 'Trigonometry',
        year: 1,
        semester: 2,
        units: 3,
        lectureHours: 3,
        labHours: 0,
        totalHours: 3,
        programId: program.id,
        programName: program.name
      },
      {
        code: 'PHY101',
        name: 'Physics 1',
        year: 1,
        semester: 2,
        units: 4,
        lectureHours: 3,
        labHours: 3,
        totalHours: 6,
        programId: program.id,
        programName: program.name
      },
      // Second Year, First Semester
      {
        code: 'CS201',
        name: 'Data Structures',
        year: 2,
        semester: 1,
        units: 3,
        lectureHours: 2,
        labHours: 3,
        totalHours: 5,
        programId: program.id,
        programName: program.name
      },
      {
        code: 'CS202',
        name: 'Discrete Mathematics',
        year: 2,
        semester: 1,
        units: 3,
        lectureHours: 3,
        labHours: 0,
        totalHours: 3,
        programId: program.id,
        programName: program.name
      },
      {
        code: 'MATH201',
        name: 'Calculus 1',
        year: 2,
        semester: 1,
        units: 3,
        lectureHours: 3,
        labHours: 0,
        totalHours: 3,
        programId: program.id,
        programName: program.name
      },
      // Second Year, Second Semester
      {
        code: 'CS203',
        name: 'Object-Oriented Programming',
        year: 2,
        semester: 2,
        units: 3,
        lectureHours: 2,
        labHours: 3,
        totalHours: 5,
        programId: program.id,
        programName: program.name
      },
      {
        code: 'CS204',
        name: 'Database Systems',
        year: 2,
        semester: 2,
        units: 3,
        lectureHours: 2,
        labHours: 3,
        totalHours: 5,
        programId: program.id,
        programName: program.name
      },
      {
        code: 'MATH202',
        name: 'Calculus 2',
        year: 2,
        semester: 2,
        units: 3,
        lectureHours: 3,
        labHours: 0,
        totalHours: 3,
        programId: program.id,
        programName: program.name
      },
      // Third Year, First Semester
      {
        code: 'CS301',
        name: 'Algorithms',
        year: 3,
        semester: 1,
        units: 3,
        lectureHours: 2,
        labHours: 3,
        totalHours: 5,
        programId: program.id,
        programName: program.name
      },
      {
        code: 'CS302',
        name: 'Web Development',
        year: 3,
        semester: 1,
        units: 3,
        lectureHours: 2,
        labHours: 3,
        totalHours: 5,
        programId: program.id,
        programName: program.name
      },
      {
        code: 'CS303',
        name: 'Computer Networks',
        year: 3,
        semester: 1,
        units: 3,
        lectureHours: 3,
        labHours: 0,
        totalHours: 3,
        programId: program.id,
        programName: program.name
      },
      // Third Year, Second Semester
      {
        code: 'CS304',
        name: 'Software Engineering',
        year: 3,
        semester: 2,
        units: 3,
        lectureHours: 2,
        labHours: 3,
        totalHours: 5,
        programId: program.id,
        programName: program.name
      },
      {
        code: 'CS305',
        name: 'Mobile App Development',
        year: 3,
        semester: 2,
        units: 3,
        lectureHours: 2,
        labHours: 3,
        totalHours: 5,
        programId: program.id,
        programName: program.name
      },
      {
        code: 'CS306',
        name: 'Operating Systems',
        year: 3,
        semester: 2,
        units: 3,
        lectureHours: 3,
        labHours: 0,
        totalHours: 3,
        programId: program.id,
        programName: program.name
      },
      // Fourth Year, First Semester
      {
        code: 'CS401',
        name: 'Machine Learning',
        year: 4,
        semester: 1,
        units: 3,
        lectureHours: 2,
        labHours: 3,
        totalHours: 5,
        programId: program.id,
        programName: program.name
      },
      {
        code: 'CS402',
        name: 'Cloud Computing',
        year: 4,
        semester: 1,
        units: 3,
        lectureHours: 2,
        labHours: 3,
        totalHours: 5,
        programId: program.id,
        programName: program.name
      },
      {
        code: 'CS403',
        name: 'Cybersecurity',
        year: 4,
        semester: 1,
        units: 3,
        lectureHours: 3,
        labHours: 0,
        totalHours: 3,
        programId: program.id,
        programName: program.name
      },
      // Fourth Year, Second Semester
      {
        code: 'CS404',
        name: 'Capstone Project 1',
        year: 4,
        semester: 2,
        units: 3,
        lectureHours: 1,
        labHours: 6,
        totalHours: 7,
        programId: program.id,
        programName: program.name
      },
      {
        code: 'CS405',
        name: 'Artificial Intelligence',
        year: 4,
        semester: 2,
        units: 3,
        lectureHours: 2,
        labHours: 3,
        totalHours: 5,
        programId: program.id,
        programName: program.name
      },
      {
        code: 'CS406',
        name: 'Capstone Project 2',
        year: 4,
        semester: 2,
        units: 3,
        lectureHours: 0,
        labHours: 6,
        totalHours: 6,
        programId: program.id,
        programName: program.name
      }
    ];

    // Create professors if none exist
    const professorsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'professor')));

    if (professorsSnap.empty) {
      // Create sample professors
      const sampleProfessors = [
        {
          email: 'prof1@university.edu',
          name: 'Dr. John Smith',
          role: 'professor',
          createdAt: new Date()
        },
        {
          email: 'prof2@university.edu',
          name: 'Dr. Jane Johnson',
          role: 'professor',
          createdAt: new Date()
        },
        {
          email: 'prof3@university.edu',
          name: 'Dr. Michael Brown',
          role: 'professor',
          createdAt: new Date()
        },
        {
          email: 'prof4@university.edu',
          name: 'Dr. Sarah Wilson',
          role: 'professor',
          createdAt: new Date()
        },
        {
          email: 'prof5@university.edu',
          name: 'Dr. Robert Davis',
          role: 'professor',
          createdAt: new Date()
        }
      ];

      const profBatch = writeBatch(db);
      for (const prof of sampleProfessors) {
        const profRef = doc(collection(db, 'users'));
        profBatch.set(profRef, prof);
      }

      await profBatch.commit();
      console.log('Created 5 sample professors');
    }

    // Create all subjects
    const batch = writeBatch(db);
    const createdSubjects = [];

    for (const subjectData of subjectsData) {
      const docRef = doc(collection(db, 'subjects'));
      const subject = {
        ...subjectData,
        createdAt: new Date()
      };
      batch.set(docRef, subject);
      createdSubjects.push({
        id: docRef.id,
        ...subject
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${createdSubjects.length} subjects`,
      subjects: createdSubjects
    });
  } catch (error) {
    console.error('Error in seedSubjects:', error);
    return NextResponse.json(
      { error: 'Failed to seed subjects. ' + (error as Error).message },
      { status: 500 }
    );
  }
}
