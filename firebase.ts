
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC0xqvt5fe_8epUHFFt_EHPoLOw35KgJ3c",
  authDomain: "playroom-crm.firebaseapp.com",
  projectId: "playroom-crm",
  storageBucket: "playroom-crm.firebasestorage.app",
  messagingSenderId: "858131161054",
  appId: "1:858131161054:web:b7d267a2fcc17775bd474f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
