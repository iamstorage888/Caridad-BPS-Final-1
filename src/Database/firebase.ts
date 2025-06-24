// src/Database/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCxpP565Ul5NnNzh_oCMMabzOqZzeaVyVs",
  authDomain: "barsys-30541.firebaseapp.com",
  projectId: "barsys-30541",
  storageBucket: "barsys-30541.firebasestorage.app",
  messagingSenderId: "742196366993",
  appId: "1:742196366993:web:4d2ad910a3f2dc48f8b930",
  measurementId: "G-1G0TMY0JMQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase Auth and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

