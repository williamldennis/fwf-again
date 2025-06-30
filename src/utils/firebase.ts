import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAZlkioQD4BonyjDH2TyjzTEfkfowjWcps",
  authDomain: "fair-weather-77aa9.firebaseapp.com",
  projectId: "fair-weather-77aa9",
  storageBucket: "fair-weather-77aa9.appspot.com",
  messagingSenderId: "41048503341",
  appId: "1:41048503341:web:1a5534599815fd267ef4a4",
  measurementId: "G-14378DJ0WQ",
};

// ✅ Only initialize once
const app = initializeApp(firebaseConfig);

// ❌ Don't call getAuth() here

export { app };
