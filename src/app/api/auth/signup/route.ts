import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { User } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role, professorId } = await request.json();

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (role !== 'admin' && role !== 'professor') {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Create new user
    // In a real app, you'd hash the password here
    // TODO: Implement proper password hashing with bcrypt
    const userData: any = {
      email,
      password, // NOT SECURE - for demo only
      name,
      role,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      createdAt: serverTimestamp()
    };

    // Add professorId if provided and role is professor
    if (role === 'professor' && professorId) {
      userData.professorId = professorId;
    }

    const docRef = await addDoc(collection(db, 'users'), userData);

    const user: User = {
      id: docRef.id,
      email,
      name,
      role,
      professorId: userData.professorId,
      avatar: userData.avatar,
      createdAt: new Date()
    };

    return NextResponse.json({ user, success: true });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Signup failed' },
      { status: 500 }
    );
  }
}
