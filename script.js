/*****************
 *  FIREBASE AUTH + FIRESTORE
 *****************/
let currentUser = null;
const usersCollection = () => db.collection("users");

// 🔹 Auth State Change
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    document.getElementById("login-btn").classList.add("hidden");
    document.getElementById("user-info").classList.remove("hidden");
    document.getElementById("user-name").innerText = user.displayName;
    document.getElementById("user-photo").src = user.photoURL;

    await loadDataFromFirestore();
    renderActivities();
    renderFinances();
  } else {
    currentUser = null;
    document.getElementById("login-btn").classList.remove("hidden");
    document.getElementById("user-info").classList.add("hidden");
  }
});

// 🔹 Login & Logout
document.getElementById("login-btn").addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
});

document.getElementById("logout-btn").addEventListener("click", () => {
  auth.signOut();
});


/*****************
 *  MAIN DATA
 *****************/
let activities = [];
let finances = [];
let habitLogs = {};
let monthlyBudget = null;
let expenseType = "expense";

/*****************
 *  SAVE & LOAD FROM CLOUD
 *****************/
async function loadDataFromFirestore() {
  const docRef = usersCollection().doc(currentUser.uid);
  const docSnap = await docRef.get();

  if (docSnap.exists) {
    const data = docSnap.data();
    activities = data.activities || [];
    finances = data.finances || [];
    habitLogs = data.habitLogs || {};
    monthlyBudget = data.monthlyBudget ?? null;
  } else {
    // If no data exists, set empty structure
    await docRef.set({
      activities: [],
      finances: [],
      habitLogs: {},
      monthlyBudget: null,
    });
  }
}

async function saveDataToFirestore() {
  if (!currentUser) return;
  await usersCollection().doc(currentUser.uid).set({
    activities,
    finances,
    habitLogs,
    monthlyBudget,
  }, { merge: true });
}


/*****************
 *  HELPERS
 *****************/
const TIMEZONE = "Asia/Kolkata";
const todayStr = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

const toUTC = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const diffDays = (a, b) => Math.round((toUTC(a) - toUTC(b)) / 86400000);


/*****************
 *  HABIT FUNCTIONS
 *****************/
function renderActivities() {
  const activityList = document.getElementById("activity-list");
  activityList.innerHTML = "";

  if (!activities.length) {
    activityList.innerHTML = `<li class="item"><span class="muted">No habits yet. Add one above.</span></li>`;
    return;
  }

  activities.forEach(a => {
    const doneToday = a.lastDone === todayStr();
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div>
        <div class="name">${a.name}</div>
        <div class="meta">${a.lastDone ? `Last: ${a.lastDone}` : "Not done yet"}</div>
      </div>
      <div class="badge">🔥 Streak: ${a.streak}</div>
      <div class="actions">
        <button class="success" ${doneToday ? "disabled" : ""} data-action="done">Done</button>
        <button class="secondary" data-action="reset">Reset</button>
        <button class="danger" data-action="delete">Delete</button>
      </div>
    `;
    li.querySelector('[data-action="done"]').onclick = () => markHabitDone(a.id);
    li.querySelector('[data-action="reset"]').onclick = () => resetHabit(a.id);
    li.querySelector('[data-action="delete"]').onclick = () => deleteHabit(a.id);
    activityList.appendChild(li);
  });
}

async function addHabit(name) {
  if (!currentUser) return alert("Please login first.");
  name = name.trim();
  if (!name) return;
  if (activities.some(a => a.name.toLowerCase() === name.toLowerCase())) {
    alert("Habit already exists.");
    return;
  }
  activities.push({ id: crypto.randomUUID(), name, streak: 0, lastDone: null });
  await saveDataToFirestore();
  renderActivities();
}

async function markHabitDone(id) {
  if (!currentUser) return alert("Please login first.");
  const a = activities.find(h => h.id === id);
  if (!a) return;
  const today = todayStr();

  if (a.lastDone === today) return;

  if (!a.lastDone) a.streak = 1;
  else {
    const gap = diffDays(today, a.lastDone);
    a.streak = gap === 1 ? a.streak + 1 : 1;
  }

  a.lastDone = today;
  if (!habitLogs[today]) habitLogs[today] = [];
  if (!habitLogs[today].includes(a.name)) habitLogs[today].push(a.name);

  await saveDataToFirestore();
  renderActivities();
}

async function resetHabit(id) {
  const a = activities.find(h => h.id === id);
  if (!a) return;
  a.streak = 0;
  a.lastDone = null;
  await saveDataToFirestore();
  renderActivities();
}

async function deleteHabit(id) {
  activities = activities.filter(a => a.id !== id);
  await saveDataToFirestore();
  renderActivities();
}


/*****************
 *  EXPENSE FUNCTIONS
 *****************/
function renderFinances() {
  const expenseTable = document.getElementById("expense-table-body");
  const expenseSummary = document.getElementById("expense-summary");
  expenseTable.innerHTML = "";

  if (!finances.length) {
    expenseTable.innerHTML = `<tr><td colspan="5" class="muted">No entries yet.</td></tr>`;
  } else {
    finances.forEach(f => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${f.type === "income" ? "💰 Income" : "💸 Expense"}</td>
        <td>${f.desc}</td>
        <td>${f.amount.toFixed(2)}</td>
        <td>${f.dateISO}</td>
        <td><button class="danger" onclick="deleteFinance('${f.id}')">Delete</button></td>
      `;
      expenseTable.appendChild(tr);
    });
  }

  updateFinanceSummary();
}

async function addFinance(type, desc, amount) {
  if (!currentUser) return alert("Please login first.");
  amount = Number(amount);
  if (!desc.trim() || isNaN(amount) || amount <= 0) {
    alert("Enter valid description and amount.");
    return;
  }
  finances.push({
    id: crypto.randomUUID(),
    type,
    desc: desc.trim(),
    amount,
    dateISO: todayStr(),
  });
  await saveDataToFirestore();
  renderFinances();
}

async function deleteFinance(id) {
  finances = finances.filter(f => f.id !== id);
  await saveDataToFirestore();
  renderFinances();
}

function updateFinanceSummary() {
  const expenseSummary = document.getElementById("expense-summary");
  const today = todayStr();
  const month = today.slice(0, 7);
  let income = 0, expense = 0;

  finances.forEach(f => {
    if (f.dateISO.startsWith(month)) {
      if (f.type === "income") income += f.amount;
      else expense += f.amount;
    }
  });

  expenseSummary.textContent =
    `Month Income: ₹${income} | Spent: ₹${expense} | Net: ₹${income - expense}`;
}


/*****************
 *  EVENT LISTENERS
 *****************/
document.getElementById("activity-form").addEventListener("submit", e => {
  e.preventDefault();
  addHabit(document.getElementById("activity-input").value);
  document.getElementById("activity-input").value = "";
});

document.getElementById("expense-form").addEventListener("submit", e => {
  e.preventDefault();
  addFinance(
    expenseType,
    document.getElementById("expense-desc").value,
    document.getElementById("expense-amount").value
  );
  document.getElementById("expense-desc").value = "";
  document.getElementById("expense-amount").value = "";
});

document.getElementById("btn-expense").addEventListener("click", () => expenseType = "expense");
document.getElementById("btn-income").addEventListener("click", () => expenseType = "income");


console.log("Firebase Sync Enabled ✅");
