// js/db-service.js
import { db } from './firebase-config.js';
import {
    collection, doc, setDoc, getDocs, deleteDoc,
    query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

export class DBService {
    static async saveData(userId, collectionName, id, data) {
        try {
            if (!userId) {
                let local = [];
                try {
                    const raw = localStorage.getItem(collectionName);
                    local = raw ? JSON.parse(raw) : [];
                    if (!Array.isArray(local)) local = [];
                } catch (e) {
                    local = [];
                }

                const idx = local.findIndex(i => i.id === id);
                if (idx >= 0) local[idx] = data;
                else local.push(data);

                localStorage.setItem(collectionName, JSON.stringify(local));
                return;
            }
            // Ensure data has the ID for consistency
            const finalData = { ...data, id };
            await setDoc(doc(db, `users/${userId}/${collectionName}`, id), finalData);
        } catch (error) {
            console.error(`DBService Save Error [${collectionName}]:`, error);
            throw error;
        }
    }

    static async deleteData(userId, collectionName, id) {
        try {
            if (!userId) {
                let local = [];
                try {
                    const raw = localStorage.getItem(collectionName);
                    local = raw ? JSON.parse(raw) : [];
                    if (!Array.isArray(local)) local = [];
                } catch (e) {
                    local = [];
                }
                local = local.filter(i => i.id !== id);
                localStorage.setItem(collectionName, JSON.stringify(local));
                return;
            }
            await deleteDoc(doc(db, `users/${userId}/${collectionName}`, id));
        } catch (error) {
            console.error(`DBService Delete Error [${collectionName}]:`, error);
            throw error;
        }
    }

    static async fetchData(userId, collectionName) {
        try {
            if (!userId) {
                try {
                    const raw = localStorage.getItem(collectionName);
                    const local = raw ? JSON.parse(raw) : [];
                    return Array.isArray(local) ? local : [];
                } catch (e) {
                    return [];
                }
            }
            const q = query(collection(db, `users/${userId}/${collectionName}`));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        } catch (error) {
            console.error(`DBService Fetch Error [${collectionName}]:`, error);
            return [];
        }
    }

    static subscribe(userId, collectionName, callback) {
        if (!userId) {
            try {
                const raw = localStorage.getItem(collectionName);
                const local = raw ? JSON.parse(raw) : [];
                callback(Array.isArray(local) ? local : []);
            } catch (e) {
                callback([]);
            }
            return () => { };
        }

        try {
            const q = query(collection(db, `users/${userId}/${collectionName}`));
            return onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                callback(data);
            }, (error) => {
                console.error(`DBService Subscription Error [${collectionName}]:`, error);
            });
        } catch (error) {
            console.error(`DBService Subscription Setup Error [${collectionName}]:`, error);
            return () => { };
        }
    }
}

