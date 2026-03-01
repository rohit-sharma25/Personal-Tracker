// js/profile.js
import { AuthService } from './auth-service.js';
import { DBService } from './db-service.js';
import { GamificationService } from './gamification-service.js';

document.addEventListener('DOMContentLoaded', () => {
    AuthService.onUserChange(async (user) => {
        if (user) {
            renderUserInfo(user);
            await renderGamificationStats();
            await renderFinancialSummary(user.uid);
        } else {
            const isLocal = AuthService.isLocalOnly();
            if (isLocal) {
                renderUserInfo({
                    displayName: "Guest User",
                    email: "Local Mode",
                    photoURL: "https://ui-avatars.com/api/?name=Guest&background=5B6CF2&color=fff"
                });
                await renderGamificationStats();
                await renderFinancialSummary(null);
            } else {
                window.location.href = 'index.html';
            }
        }
    });
});

function renderUserInfo(user) {
    document.getElementById('profile-name').textContent = user.displayName || "User";
    document.getElementById('profile-email').textContent = user.email || "Offline Account";
    
    const photoElement = document.getElementById('profile-photo');
    if (photoElement) {
        const displayName = user.displayName || "User";
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=5B6CF2&color=fff`;
        const photoUrl = user.photoURL || fallbackUrl;
        
        photoElement.src = photoUrl;
        photoElement.onerror = () => {
            photoElement.src = fallbackUrl;
        };
    }
}

async function renderGamificationStats() {
    const stats = await GamificationService.getStats();
    const progress = GamificationService.getXpProgress(stats.xp || 0);

    document.getElementById('profile-level').textContent = stats.level;
    document.getElementById('current-xp').textContent = stats.xp;
    document.getElementById('next-level-xp').textContent = GamificationService.getXpForLevel(progress.currentLevel + 1);
    document.getElementById('xp-bar-fill').style.width = `${progress.percent}%`;
    document.getElementById('xp-away').textContent = progress.xpRequiredForNext - progress.xpInLevel;
    document.getElementById('next-level-num').textContent = progress.currentLevel + 1;
    document.getElementById('total-xp-earned').textContent = `${stats.xp} XP`;

    // Rank logic
    const ranks = ["NOVICE", "APPRENTICE", "SAVER", "STRATEGIST", "ELITE", "MAESTRO"];
    const rankIndex = Math.min(Math.floor(stats.level / 2), ranks.length - 1);
    document.getElementById('rank-name').textContent = ranks[rankIndex];
}

async function renderFinancialSummary(uid) {
    const finances = await DBService.fetchData(uid, 'finances');

    document.getElementById('total-tx').textContent = finances.length;

    if (finances.length > 0) {
        // Top Category
        const cats = {};
        finances.forEach(f => {
            if (f.type === 'expense') cats[f.category] = (cats[f.category] || 0) + 1;
        });
        const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
        if (top) document.getElementById('top-category').textContent = top[0];

        // Active Days
        const dates = new Set(finances.map(f => f.dateISO));
        document.getElementById('active-days').textContent = dates.size;
    }
}

// Logout Logic
document.getElementById('logout-btn')?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to logout?')) {
        await AuthService.logout();
        window.location.href = 'index.html';
    }
});
