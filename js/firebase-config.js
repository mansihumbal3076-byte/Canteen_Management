// ============================================
// Firebase Configuration & Initialization
// ============================================
// Replace the config below with your Firebase project credentials
// Get these from: Firebase Console → Project Settings → Web App

const firebaseConfig = {
    apiKey: "AIzaSyDlPr9LvHgeW_mkZk3KOVo1b9xEK1Xi4ZQ",
    authDomain: "canteen-management-71b05.firebaseapp.com",
    projectId: "canteen-management-71b05",
    storageBucket: "canteen-management-71b05.firebasestorage.app",
    messagingSenderId: "321243606697",
    appId: "1:321243606697:web:b9c7825f21d5793d8f43b8",
    measurementId: "G-9G9ZPMTNTH"
  };
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable Firestore offline persistence (optional but recommended)
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence not supported in this browser');
    }
});

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();

console.log('🔥 Firebase initialized successfully');
