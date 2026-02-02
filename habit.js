// habit.js (Enhanced with Analytics & Animations)
import { AuthService } from './js/auth-service.js';
import { DBService } from './js/db-service.js';
import { AIService } from './js/ai-service.js';
import { celebrateWithConfetti, showToast } from './js/animations.js';
import { calculateHabitStats, getHabitCompletionTrend } from './js/analytics.js';

const TIMEZONE = "Asia/Kolkata";
const todayStr = () => new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

let activities = [];
let habitLogs = {};
let currentUser = null;

// DOM
const userName = document.getElementById('user-name');
const userPhoto = document.getElementById('user-photo');
const form = document.getElementById("activity-form");
const input = document.getElementById("activity-input");
const list = document.getElementById("activity-list");

// AI Chat elements
const fab = document.getElementById('ai-fab');
const chatPopup = document.getElementById('ai-chat-popup');
const chatClose = document.getElementById('ai-close');
const chatInput = document.getElementById('ai-chat-input');
const chatSend = document.getElementById('ai-chat-send');
const chatBody = document.getElementById('ai-chat-body');

AuthService.onUserChange((user) => {
  currentUser = user;
  if (user) {
    userName.textContent = user.displayName;
    userPhoto.src = user.photoURL;
  } else {
    userName.textContent = AuthService.isLocalOnly() ? "Guest (Local)" : "Sign in";
    userPhoto.src = "https://ui-avatars.com/api/?name=Guest";
  }

  // Reactive Subscriptions
  DBService.subscribe(user?.uid, 'activities', (data) => {
    activities = data;
    renderActivities();
    renderAnalytics();
  });

  DBService.subscribe(user?.uid, 'habitLogs', (data) => {
    habitLogs = data.reduce((acc, doc) => {
      acc[doc.id] = doc.habits;
      return acc;
    }, {});
    renderActivities();
    renderAnalytics();
  });
});

function renderActivities() {
  if (!list) return;
  list.innerHTML = "";
  if (activities.length === 0) {
    list.innerHTML = '<li class="empty-state"><div class="empty-state-icon">🎯</div><div class="empty-state-title">No habits yet</div><div class="empty-state-text">Start building better routines today!</div></li>';
    return;
  }

  const today = todayStr();
  const currentHabits = habitLogs[today] || [];

  activities.slice().sort((a, b) => b.streak - a.streak).forEach((act, index) => {
    const isDone = currentHabits.includes(act.id);
    const li = document.createElement("li");
    li.className = "card item animate-fade-in-up";
    li.style.animationDelay = `${index * 0.1}s`;

    // Calculate completion percentage for this week
    const weekDates = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - now.getDay() + i);
      weekDates.push(d.toISOString().slice(0, 10));
    }
    let weekCompleted = 0;
    weekDates.forEach(date => {
      if (habitLogs[date] && habitLogs[date].includes(act.id)) weekCompleted++;
    });
    const weekPercent = Math.round((weekCompleted / 7) * 100);

    li.innerHTML = `
      <div class="row" style="justify-content:space-between; align-items:flex-start; margin-bottom: 12px;">
        <div style="flex: 1;">
          <div class="name" style="font-size: 1.1rem; font-weight: 600; margin-bottom: 5px;">${act.name}</div>
          <div class="meta" style="display: flex; gap: 15px; align-items: center;">
            <span style="color: var(--accent); font-weight: 600;">🔥 ${act.streak || 0} days</span>
            <span class="muted" style="font-size: 0.85rem;">This week: ${weekCompleted}/7</span>
          </div>
        </div>
        <div class="badge ${isDone ? 'badge-success' : 'badge-primary'}" style="font-size: 0.9rem;">
          ${isDone ? "✅ Done" : "🎯 Goal"}
        </div>
      </div>
      
      <!-- Week Progress Bar -->
      <div class="progress-bar" style="margin: 12px 0;">
        <div class="progress-bar-fill" style="width: ${weekPercent}%;"></div>
      </div>
      
      <!-- Week Calendar -->
      <div class="week-row" style="display: flex; gap: 6px; margin: 12px 0;">${renderWeek(act.id)}</div>
      
      <!-- Actions -->
      <div class="actions" style="margin-top: 12px; display: flex; gap: 8px;">
        <button class="btn accent btn-done hover-lift" ${isDone ? 'disabled' : ''} style="flex: 1; ${isDone ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
          ${isDone ? '✓ Completed' : 'Mark Done'}
        </button>
        <button class="btn secondary btn-del hover-scale" style="background:rgba(255,0,0,0.1); color:var(--danger);">Delete</button>
      </div>
    `;

    li.querySelector(".btn-done").onclick = () => markDone(act.id, act.name);
    li.querySelector(".btn-del").onclick = () => deleteHabit(act.id);
    list.appendChild(li);
  });
}

function renderWeek(habitId) {
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const now = new Date();
  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay() + i);
    const iso = d.toISOString().slice(0, 10);
    const done = habitLogs[iso] && habitLogs[iso].includes(habitId);
    const isToday = iso === todayStr();
    week.push(`
      <div class="week-day" style="flex: 1; text-align: center;">
        <span style="font-size: 0.7rem; color: var(--muted); display: block; margin-bottom: 4px;">${days[i]}</span>
        <div class="week-circle ${done ? 'done' : ''}" style="width: 32px; height: 32px; margin: 0 auto; border-radius: 50%; border: 2px solid ${isToday ? 'var(--accent)' : 'var(--border)'}; background: ${done ? 'var(--success)' : 'transparent'}; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;">
          ${done ? '<span style="font-size: 1rem;">✓</span>' : ''}
        </div>
      </div>
    `);
  }
  return week.join("");
}

async function markDone(id, habitName) {
  const today = todayStr();
  const current = habitLogs[today] || [];
  if (current.includes(id)) return;

  const updated = [...current, id];
  await DBService.saveData(currentUser?.uid, 'habitLogs', today, { id: today, habits: updated });

  // Update streak logic
  const act = activities.find(a => a.id === id);
  if (act) {
    const newStreak = (act.streak || 0) + 1;
    await DBService.saveData(currentUser?.uid, 'activities', id, { ...act, streak: newStreak });

    // Celebrate with confetti!
    celebrateWithConfetti(2000);

    // Show toast notification
    const messages = [
      `🎉 Awesome! ${habitName} completed!`,
      `🔥 ${newStreak} day streak! Keep it up!`,
      `⭐ Great job on ${habitName}!`,
      `💪 You're crushing it!`
    ];
    showToast(messages[Math.floor(Math.random() * messages.length)], 'success', 3000);
  }
}

async function deleteHabit(id) {
  if (confirm("Delete this habit and all history?")) {
    await DBService.deleteData(currentUser?.uid, 'activities', id);
  }
}

function renderAnalytics() {
  const analyticsContent = document.getElementById('analytics-content');
  if (!analyticsContent) return;

  const stats = calculateHabitStats(activities, habitLogs);

  analyticsContent.innerHTML = `
    <div class="stat-card hover-scale">
      <span class="stat-card-icon">\ud83c\udfaf</span>
      <div class="stat-card-value">${stats.totalHabits}</div>
      <div class="stat-card-label">Total Habits</div>
    </div>
    
    <div class="stat-card hover-scale">
      <span class="stat-card-icon">\ud83d\udd25</span>
      <div class="stat-card-value">${stats.longestStreak}</div>
      <div class="stat-card-label">Best Streak</div>
    </div>
    
    <div class="stat-card hover-scale">
      <span class="stat-card-icon">\ud83d\udcaa</span>
      <div class="stat-card-value">${stats.activeHabits}</div>
      <div class="stat-card-label">Active Streaks</div>
    </div>
    
    <div class="stat-card hover-scale">
      <span class="stat-card-icon">\ud83d\udcca</span>
      <div class="stat-card-value" style="color: ${stats.weeklyCompletion >= 80 ? 'var(--success)' : stats.weeklyCompletion >= 50 ? 'var(--warning)' : 'var(--danger)'}">${stats.weeklyCompletion}%</div>
      <div class="stat-card-label">Weekly Rate</div>
    </div>
  `;
}

form.onsubmit = async (e) => {
  e.preventDefault();
  const name = input.value.trim();
  if (!name) return;
  const id = crypto.randomUUID();
  await DBService.saveData(currentUser?.uid, 'activities', id, { id, name, streak: 0, created: Date.now() });
  input.value = "";
};

// AI Chat Interaction
fab.onclick = () => chatPopup.classList.toggle('hidden');
chatClose.onclick = () => chatPopup.classList.add('hidden');

async function handleChat() {
  const msg = chatInput.value.trim();
  if (!msg) return;

  const userMsg = document.createElement('div');
  userMsg.className = 'msg-user';
  userMsg.textContent = msg;
  chatBody.appendChild(userMsg);
  chatInput.value = "";
  chatBody.scrollTop = chatBody.scrollHeight;

  const aiMsg = document.createElement('div');
  aiMsg.className = 'msg-ai';
  aiMsg.textContent = "...";
  chatBody.appendChild(aiMsg);

  const response = await AIService.chat(msg, { habits: activities, logs: habitLogs });
  aiMsg.innerHTML = response;
  chatBody.scrollTop = chatBody.scrollHeight;
}

chatSend.onclick = handleChat;
chatInput.onkeydown = (e) => e.key === 'Enter' && handleChat();
