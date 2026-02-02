// js/db-service.js
import { db } from './firebase-config.js';
import {
    collection, doc, setDoc, getDocs, deleteDoc,
    query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

export class DBService {
    static async saveData(userId, collectionName, id, data) {
        if (!userId) {
            const local = JSON.parse(localStorage.getItem(collectionName)) || [];
            const idx = local.findIndex(i => i.id === id);
            if (idx >= 0) local[idx] = data;
            else local.push(data);
            localStorage.setItem(collectionName, JSON.stringify(local));
            return;
        }
        await setDoc(doc(db, `users/${userId}/${collectionName}`, id), data);
    }

    static async deleteData(userId, collectionName, id) {
        if (!userId) {
            let local = JSON.parse(localStorage.getItem(collectionName)) || [];
            local = local.filter(i => i.id !== id);
            localStorage.setItem(collectionName, JSON.stringify(local));
            return;
        }
        await deleteDoc(doc(db, `users/${userId}/${collectionName}`, id));
    }

    static async fetchData(userId, collectionName) {
        if (!userId) {
            return JSON.parse(localStorage.getItem(collectionName)) || [];
        }
        const q = query(collection(db, `users/${userId}/${collectionName}`));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data());
    }

    static subscribe(userId, collectionName, callback) {
        if (!userId) {
            // For local only, we just return the current state as it's not "live" in the same way
            callback(JSON.parse(localStorage.getItem(collectionName)) || []);
            return () => { }; // No-op unsubscribe
        }
        const q = query(collection(db, `users/${userId}/${collectionName}`));
        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => doc.data());
            callback(data);
        });
    }
}
