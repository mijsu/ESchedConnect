import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    // Get user ID from session or localStorage (in a real app, this would use proper auth tokens)
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = {
      id: docSnap.id,
      email: docSnap.data().email,
      name: docSnap.data().name,
      role: docSnap.data().role,
      professorId: docSnap.data().professorId,
      avatar: docSnap.data().avatar,
      createdAt: docSnap.data().createdAt,
    };

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
