// --------------------
// FIREBASE INIT
// --------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase config
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
const provider = new GoogleAuthProvider();

// --------------------
// ELEMENTS
// --------------------
const loginBox = document.getElementById('login-screen');
const appUI = document.getElementById('app');
const username = document.getElementById('userName');
const adminPanel = document.getElementById('admin-panel');
const logoutBtn = document.getElementById('logoutBtn');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const quizButtons = document.querySelectorAll('.quizClassBtn');
const tabs = document.querySelectorAll('.tab');
const navButtons = document.querySelectorAll('.bottom-nav div');
const rankList = document.getElementById('rankList');
const subjectListDiv = document.getElementById('subjectList');
const quizListDiv = document.getElementById('quizList');
const questionBox = document.getElementById('questionBox');

// Admin elements
const addSubjectBtn = document.getElementById('addSubjectBtn');
const addQuizBtn = document.getElementById('addQuizBtn');
const addQuestionBtn = document.getElementById('addQuestionBtn');
const updatePointsBtn = document.getElementById('updatePointsBtn');

// --------------------
// GLOBAL VARIABLES
// --------------------
let currentUser;
let currentQuiz = null;
let currentQuestionIndex = 0;
let timerInterval;
let userAnswers = [];

// --------------------
// TAB SWITCHING
// --------------------
navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabs.forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + target).classList.add('active');
  });
});

// --------------------
// GOOGLE LOGIN
// --------------------
googleLoginBtn.addEventListener('click', () => {
  signInWithPopup(auth, provider)
    .then(result => {
      setupUser(result.user);
    })
    .catch(err => alert('Login error: ' + err.message));
});

// --------------------
// LOGOUT
// --------------------
logoutBtn.addEventListener('click', () => {
  signOut(auth).then(() => {
    appUI.style.display = 'none';
    loginBox.style.display = 'flex';
  });
});

// --------------------
// AUTH STATE CHECK
// --------------------
onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    setupUser(user);
  }
});

// --------------------
// SETUP USER
// --------------------
async function setupUser(user) {
  loginBox.style.display = 'none';
  appUI.style.display = 'block';
  username.innerText = user.displayName;

  // Admin check
  if (user.email === 'nagtakanwarpkd@gmail.com') adminPanel.style.display = 'block';
  else adminPanel.style.display = 'none';

  // Add user if not exists
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      name: user.displayName,
      email: user.email,
      score: 0,
      attended: 0
    });
  }

  loadProfile(user.uid);
  loadLeaderboard();
}

// --------------------
// PROFILE
// --------------------
async function loadProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) {
    const data = snap.data();
    document.getElementById('profileName').innerText = data.name;
    document.getElementById('profileEmail').innerText = data.email;
    document.getElementById('profileScore').innerText = data.score;
    document.getElementById('yourScore').innerText = data.score;
    document.getElementById('attendedQuiz').innerText = data.attended;
  }
}

// --------------------
// LEADERBOARD
// --------------------
async function loadLeaderboard() {
  const q = query(collection(db, 'users'), orderBy('score', 'desc'), limit(10));
  const snap = await getDocs(q);
  rankList.innerHTML = '';
  let i = 0;
  snap.forEach(docSnap => {
    i++;
    const data = docSnap.data();
    const li = document.createElement('li');
    li.innerHTML = `${i===1?'👑':''} Rank ${i} - ${data.name} (${data.score})`;
    rankList.appendChild(li);
  });
}

// --------------------
// QUIZ SYSTEM
// --------------------
quizButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const classNum = btn.dataset.class;
    loadSubjects(classNum);
  });
});

// LOAD SUBJECTS
async function loadSubjects(classNum) {
  subjectListDiv.innerHTML = '<h4>Subjects:</h4>';
  quizListDiv.innerHTML = '';
  questionBox.innerHTML = '';
  const subjectSnap = await getDocs(collection(db, 'subjects'));
  subjectSnap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.class === classNum) {
      const btn = document.createElement('button');
      btn.innerText = data.name;
      btn.classList.add('quizClassBtn');
      btn.onclick = () => loadQuizzes(classNum, data.name);
      subjectListDiv.appendChild(btn);
    }
  });
}

// LOAD QUIZZES
async function loadQuizzes(classNum, subject) {
  quizListDiv.innerHTML = '<h4>Quizzes:</h4>';
  questionBox.innerHTML = '';
  const quizSnap = await getDocs(collection(db, `subjects/${classNum}_${subject}/quizzes`));
  quizSnap.forEach(docSnap => {
    const data = docSnap.data();
    const btn = document.createElement('button');
    btn.innerText = data.title;
    btn.classList.add('quizClassBtn');
    btn.onclick = () => startQuiz(classNum, subject, docSnap.id);
    quizListDiv.appendChild(btn);
  });
}

// START QUIZ
async function startQuiz(classNum, subject, quizId) {
  const questionsSnap = await getDocs(collection(db, `subjects/${classNum}_${subject}/quizzes/${quizId}/questions`));
  currentQuiz = questionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  currentQuestionIndex = 0;
  userAnswers = [];
  showQuestion();
}

// SHOW QUESTION
function showQuestion() {
  if (currentQuestionIndex >= currentQuiz.length) {
    finishQuiz();
    return;
  }
  const q = currentQuiz[currentQuestionIndex];
  questionBox.innerHTML = `<h4>Q${currentQuestionIndex+1}: ${q.question}</h4>`;
  ['A','B','C','D'].forEach(opt => {
    const btn = document.createElement('button');
    btn.classList.add('quiz-option');
    btn.innerText = `${opt}: ${q['option'+opt]}`;
    btn.onclick = () => submitAnswer(opt, q.correct);
    questionBox.appendChild(btn);
  });
  startTimer(q.timer);
}

// TIMER
function startTimer(seconds) {
  clearInterval(timerInterval);
  let timeLeft = seconds;
  const timerDisplay = document.createElement('p');
  timerDisplay.innerText = `Time Left: ${timeLeft}s`;
  questionBox.appendChild(timerDisplay);

  timerInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.innerText = `Time Left: ${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      submitAnswer(null, currentQuiz[currentQuestionIndex].correct);
    }
  }, 1000);
}

// SUBMIT ANSWER
function submitAnswer(selected, correct) {
  clearInterval(timerInterval);
  userAnswers.push(selected === correct ? 5 : (selected ? -1 : 0));
  currentQuestionIndex++;
  showQuestion();
}

// FINISH QUIZ
async function finishQuiz() {
  const totalScore = userAnswers.reduce((a,b) => a+b, 0);
  const extra = Math.floor((userAnswers.filter(s => s>0).length / currentQuiz.length) * 500);
  const finalScore = totalScore + extra;

  const userRef = doc(db, 'users', currentUser.uid);
  const userSnap = await getDoc(userRef);
  const prevScore = userSnap.data().score;
  await updateDoc(userRef, { score: prevScore + finalScore, attended: userSnap.data().attended+1 });

  alert(`Quiz Finished! Your score: ${finalScore}`);
  loadProfile(currentUser.uid);
  loadLeaderboard();
  questionBox.innerHTML = '';
}

// --------------------
// ADMIN CRUD
// --------------------

// ADD SUBJECT
addSubjectBtn.addEventListener('click', async () => {
  const cls = document.getElementById('adminClass').value.trim();
  const name = document.getElementById('adminSubject').value.trim();
  if (!cls || !name) return alert('Class & Subject required!');
  await setDoc(doc(db, 'subjects', `${cls}_${name}`), { class: cls, name });
  alert(`Subject ${name} added for class ${cls}`);
});

// ADD QUIZ
addQuizBtn.addEventListener('click', async () => {
  const cls = document.getElementById('adminQuizClass').value.trim();
  const subject = document.getElementById('adminQuizSubject').value.trim();
  const title = document.getElementById('adminQuizTitle').value.trim();
  if (!cls || !subject || !title) return alert('All fields required!');
  const quizRef = await addDoc(collection(db, `subjects/${cls}_${subject}/quizzes`), { title });
  alert(`Quiz "${title}" added with ID: ${quizRef.id}`);
});

// ADD QUESTION
addQuestionBtn.addEventListener('click', async () => {
  const cls = document.getElementById('qQuizClass').value.trim();
  const subject = document.getElementById('qQuizSubject').value.trim();
  const quizId = document.getElementById('qQuizId').value.trim();
  const question = document.getElementById('questionText').value.trim();
  const optionA = document.getElementById('optionA').value.trim();
  const optionB = document.getElementById('optionB').value.trim();
  const optionC = document.getElementById('optionC').value.trim();
  const optionD = document.getElementById('optionD').value.trim();
  const correct = document.getElementById('correctOption').value.trim().toUpperCase();
  const timer = parseInt(document.getElementById('questionTimer').value.trim());

  if (!cls || !subject || !quizId || !question || !optionA || !optionB || !optionC || !optionD || !correct || !timer) {
    return alert('All fields are required!');
  }

  await addDoc(collection(db, `subjects/${cls}_${subject}/quizzes/${quizId}/questions`), {
    question,
    optionA, optionB, optionC, optionD,
    correct, timer
  });
  alert(`Question added to quiz ${quizId}`);
});

// UPDATE USER POINTS
updatePointsBtn.addEventListener('click', async () => {
  const userId = document.getElementById('updateUserId').value.trim();
  const points = parseInt(document.getElementById('updatePoints').value.trim());
  if (!userId || isNaN(points)) return alert('Valid User ID & Points required!');

  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return alert('User not found!');

  const newScore = snap.data().score + points;
  await updateDoc(userRef, { score: newScore });
  alert(`User ${userId} points updated!`);
  loadLeaderboard();
});
