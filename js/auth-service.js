// js/auth-service.js
import { auth } from './firebase-config.js';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

export class AuthService {
    static onUserChange(callback) {
        onAuthStateChanged(auth, (user) => {
            callback(user);
        });
    }

    static async login() {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            return result.user;
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    }

    static async logout() {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout failed:", error);
            throw error;
        }
    }

    static isLocalOnly() {
        return localStorage.getItem('tracker_localOnly') === '1';
    }

    static setLocalOnly(value) {
        if (value) {
            localStorage.setItem('tracker_localOnly', '1');
        } else {
            localStorage.removeItem('tracker_localOnly');
        }
    }
}
