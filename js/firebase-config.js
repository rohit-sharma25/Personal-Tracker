// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCc22Lttv8BEq4QSw_mrI_NwXJHackYD3w",
  authDomain: "personal-tracker-1f02e.firebaseapp.com",
  projectId: "personal-tracker-1f02e",
  storageBucket: "personal-tracker-1f02e.firebasestorage.app",
  messagingSenderId: "924625298797",
  appId: "1:924625298797:web:7c9c9e684b111c32762664"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
