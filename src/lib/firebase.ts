import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDaTQzKAE-g0gafiElG3ZiO9atJiP-_Bco",
  authDomain: "e-schedconnect.firebaseapp.com",
  projectId: "e-schedconnect",
  storageBucket: "e-schedconnect.firebasestorage.app",
  messagingSenderId: "377672804127",
  appId: "1:377672804127:web:d6510816f5ddffb63d322a"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { db };
