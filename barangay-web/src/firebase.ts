import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyCdmoV2Q3ShK2Ufs-SMBVGGcgrsVb8NIcY",
  authDomain: "bmis-damolog.firebaseapp.com",
  projectId: "bmis-damolog",
  storageBucket: "bmis-damolog.firebasestorage.app",
  messagingSenderId: "1081953670328",
  appId: "1:1081953670328:web:5b149222357ef75a0fd04d",
  measurementId: "G-ND3T6ZQ6VC",
};

export const firebaseApp = initializeApp(firebaseConfig);
