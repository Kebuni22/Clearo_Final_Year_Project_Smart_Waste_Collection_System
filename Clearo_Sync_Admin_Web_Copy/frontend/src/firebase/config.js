// src/firebase-config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyD4km-aHvRYdofBFLCLYWXlarY-Jsj_CBk",
    authDomain: "clearo-73407.firebaseapp.com",
    projectId: "clearo-73407",
    storageBucket: "clearo-73407.firebasestorage.app",
    messagingSenderId: "400489519426",
    appId: "1:400489519426:web:b0cfbe876fe886e2cb10db",
    measurementId: "G-CRTEFYBJ58"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
