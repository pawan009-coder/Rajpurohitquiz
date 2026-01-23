// ================= FIREBASE IMPORTS =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ================= FIREBASE CONFIG =================
const firebaseConfig = {
  apiKey: "AIzaSyAOHPevaiVZWoDuxpp0L89a9kMAH6nV4IM",
  authDomain: "rajpurohit-bf36c.firebaseapp.com",
  projectId: "rajpurohit-bf36c",
  storageBucket: "rajpurohit-bf36c.firebasestorage.app",
  messagingSenderId: "765326201462",
  appId: "1:765326201462:web:a06b47ff3ae131a87d4557",
  measurementId: "G-H29TJ7PFC9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================= GLOBAL =================
const MAIN_ADMIN = "nagtakanwarpkd@gmail.com";
let currentUser = null;
let isAdmin = false;

// ================= AUTH =================
window.googleLogin = async () => {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
};

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  currentUser = user;

  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("app").style.display = "block";
  document.getElementById("userEmail").innerText = user.email;

  // Create user if not exists
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      score: 0,
      attended: 0,
      role: "user",
      createdAt: Date.now()
    });
  }

  // Check admin
  if (user.email === MAIN_ADMIN) {
    document.getElementById("adminBtn").style.display = "block";
  }

  loadHome();
  loadLeaderboard();
});

// ================= ADMIN MODE =================
window.toggleAdmin = async () => {
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);

  isAdmin = !isAdmin;

  alert(isAdmin ? "ADMIN MODE ON" : "ADMIN MODE OFF");
};

// ================= HOME =================
async function loadHome() {
  const usersRef = collection(db, "users");
  const q = query(usersRef, orderBy("score", "desc"));
  const snap = await getDocs(q);

  let rank = 1;
  snap.forEach(d => {
    if (d.id === currentUser.uid) {
      document.querySelector("#home .card:nth-child(1) b").innerText = "#" + rank;
      document.querySelector("#home .card:nth-child(2) b").innerText = d.data().score;
      document.querySelector("#home .card:nth-child(3) b").innerText = d.data().attended || 0;
    }
    rank++;
  });
}

// ================= LEADERBOARD =================
async function loadLeaderboard() {
  const rankDiv = document.getElementById("rank");
  rankDiv.innerHTML = "";

  const q = query(collection(db, "users"), orderBy("score", "desc"));
  const snap = await getDocs(q);

  let i = 1;
  snap.forEach(d => {
    const crown = i === 1 ? " 👑" : "";
    rankDiv.innerHTML += `
      <div class="card">
        #${i} ${d.data().email}${crown}
      </div>`;
    i++;
  });
}

// ================= QUIZ SYSTEM =================
export async function submitQuiz(questions, answers) {
  let correct = 0;
  let score = 0;

  questions.forEach((q, i) => {
    if (answers[i] === q.correct) {
      correct++;
      score += 5;
    } else {
      score -= 1;
    }
  });

  const percentBonus = Math.floor((correct / questions.length) * 500);
  score += percentBonus;

  const userRef = doc(db, "users", currentUser.uid);
  await updateDoc(userRef, {
    score: score,
    attended: (currentUser.attended || 0) + 1
  });

  alert("Quiz Submitted");
}

// ================= ADMIN CONTROLS =================

// Add Subject
export async function addSubject(className, subject) {
  if (!isAdmin) return;
  await setDoc(doc(db, "classes", className, "subjects", subject), {
    createdAt: Date.now()
  });
}

// Add Quiz
export async function addQuiz(className, subject, quizName) {
  if (!isAdmin) return;
  await setDoc(
    doc(db, "classes", className, "subjects", subject, "quizzes", quizName),
    { createdAt: Date.now() }
  );
}

// Add Question
export async function addQuestion(className, subject, quiz, questionData) {
  if (!isAdmin) return;
  await addDoc(
    collection(db, "classes", className, "subjects", subject, "quizzes", quiz, "questions"),
    questionData
  );
}

// Delete Question
export async function deleteQuestion(path, id) {
  if (!isAdmin) return;
  await deleteDoc(doc(db, path, id));
}

// Reset Leaderboard
export async function resetLeaderboard() {
  if (!isAdmin) return;

  const snap = await getDocs(collection(db, "users"));
  snap.forEach(async d => {
    await updateDoc(doc(db, "users", d.id), {
      score: 0,
      attended: 0
    });
  });

  alert("Leaderboard Reset");
}

// Give Extra Points
export async function givePoints(uid, points) {
  if (!isAdmin) return;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  await updateDoc(ref, {
    score: snap.data().score + points
  });
}

// Temporary Admin
export async function makeAdmin(uid) {
  if (currentUser.email !== MAIN_ADMIN) return;
  await updateDoc(doc(db, "users", uid), { role: "admin" });
}

export async function removeAdmin(uid) {
  if (currentUser.email !== MAIN_ADMIN) return;
  await updateDoc(doc(db, "users", uid), { role: "user" });
}

// ================= UI =================
window.showSection = (id) => {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
};
    
