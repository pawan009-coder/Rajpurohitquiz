import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, orderBy, getDocs, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==========================================
// 1. FIREBASE INITIALIZATION
// ==========================================
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

// Global Variables
let currentUser = null;
let isAdmin = false;
const ADMIN_EMAIL = "nagtakanwarpkd@gmail.com";
let currentQuestions = [];
let questionIndex = 0;
let tempScore = 0;
let correctCount = 0;
let quizTimer;

// ==========================================
// 2. AUTHENTICATION & USER DATA
// ==========================================
const checkUser = async (user) => {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    
    isAdmin = (user.email === ADMIN_EMAIL);

    if (!snap.exists()) {
        const userData = {
            uid: user.uid,
            name: user.displayName,
            email: user.email,
            photo: user.photoURL,
            score: 0,
            attended: 0,
            unattended: 0,
            rank: 0
        };
        await setDoc(userRef, userData);
    }
    loadAppData(user.uid);
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        checkUser(user);
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        document.getElementById('app-container').classList.add('flex');
    } else {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
    }
});

// Login Trigger
document.getElementById('login-btn').onclick = () => signInWithPopup(auth, provider);

// ==========================================
// 3. UI NAVIGATION LOGIC
// ==========================================
window.switchTab = (viewId) => {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    
    // Update Nav UI
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.add('text-gray-500'));
    if(viewId === 'home-view') loadLeaderboard();
};

// ==========================================
// 4. QUIZ ENGINE (POINTS & LOGIC)
// ==========================================
window.startQuizFlow = async (grade) => {
    // Grade (10 or 12) se questions fetch karna
    const qSnap = await getDocs(collection(db, `quizzes/class${grade}/questions`));
    currentQuestions = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if(currentQuestions.length === 0) {
        alert("Admin ne abhi questions nahi dale hain!");
        return;
    }

    document.getElementById('class-select').classList.add('hidden');
    document.getElementById('quiz-interface').classList.remove('hidden');
    
    questionIndex = 0;
    tempScore = 0;
    correctCount = 0;
    showQuestion();
};

const showQuestion = () => {
    const q = currentQuestions[questionIndex];
    document.getElementById('question-text').innerText = q.text;
    document.getElementById('quiz-progress').innerText = `${questionIndex + 1}/${currentQuestions.length}`;
    
    const optionsDiv = document.getElementById('options-container');
    optionsDiv.innerHTML = '';

    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = "quiz-option glass p-4 text-left hover:border-cyan-400 transition-all";
        btn.innerText = opt;
        btn.onclick = () => handleAnswer(i, q.correct);
        optionsDiv.appendChild(btn);
    });

    startTimer(q.time || 30);
};

const handleAnswer = (selected, correct) => {
    clearInterval(quizTimer);
    if(selected === correct) {
        tempScore += 5; // +5 for correct
        correctCount++;
    } else {
        tempScore -= 1; // -1 for wrong
    }

    questionIndex++;
    if(questionIndex < currentQuestions.length) {
        showQuestion();
    } else {
        endQuiz();
    }
};

const endQuiz = async () => {
    // Bonus Logic: Total 500 me se Accuracy % extra points
    const accuracy = (correctCount / currentQuestions.length);
    const bonusPoints = Math.round(500 * accuracy);
    const totalEarned = tempScore + bonusPoints;

    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    const currentTotal = userSnap.data().score || 0;

    await updateDoc(userRef, {
        score: currentTotal + totalEarned,
        attended: (userSnap.data().attended || 0) + 1
    });

    alert(`Quiz Complete! Points: ${tempScore} + Bonus: ${bonusPoints} = ${totalEarned}`);
    window.location.reload();
};

const startTimer = (sec) => {
    let timeLeft = sec;
    const timerUI = document.getElementById('quiz-timer');
    clearInterval(quizTimer);
    quizTimer = setInterval(() => {
        timeLeft--;
        timerUI.innerText = `Time: ${timeLeft}s`;
        if(timeLeft <= 0) {
            clearInterval(quizTimer);
            handleAnswer(-1, 0); // Time up = Wrong
        }
    }, 1000);
};

// ==========================================
// 5. ADMIN & DATA MANAGEMENT
// ==========================================
// Secret Admin Button (Top Logo click logic)
let adminClicks = 0;
document.getElementById('admin-trigger').onclick = () => {
    if(!isAdmin) return;
    adminClicks++;
    if(adminClicks === 5) {
        document.getElementById('admin-tag').classList.remove('hidden');
        alert("Master Admin Mode Activated!");
        // Enable Admin-only UI elements here
    }
};

// Admin can manually update points
window.updatePointsAdmin = async (uid, newScore) => {
    if(!isAdmin) return;
    await updateDoc(doc(db, "users", uid), { score: newScore });
};

// Load Leaderboard with Crown for Rank 1
const loadLeaderboard = async () => {
    const q = query(collection(db, "users"), orderBy("score", "desc"));
    const snap = await getDocs(q);
    const board = document.getElementById('leaderboard');
    board.innerHTML = '';

    snap.docs.forEach((doc, index) => {
        const d = doc.data();
        const isFirst = index === 0;
        board.innerHTML += `
            <div class="glass p-4 flex items-center gap-4 ${isFirst ? 'border-yellow-500 bg-yellow-500/10' : ''}">
                <div class="relative">
                    ${isFirst ? '<i class="fas fa-crown text-yellow-500 absolute -top-4 -left-2 scale-125"></i>' : ''}
                    <img src="${d.photo}" class="w-10 h-10 rounded-full border-2 border-pink-500">
                </div>
                <div class="flex-1">
                    <p class="font-bold">${d.name}</p>
                    <p class="text-xs text-gray-400">${d.score} XP</p>
                </div>
                <div class="font-brand text-xl">#${index + 1}</div>
            </div>
        `;
    });
};

// Profile & Data Updates
const loadAppData = async (uid) => {
    const userRef = doc(db, "users", uid);
    onSnapshot(userRef, (doc) => {
        const data = doc.data();
        document.getElementById('score-display').innerText = `${data.score} XP`;
        document.getElementById('score-val').innerText = data.score;
        document.getElementById('user-name').innerText = data.name;
        // User data for Profile section
        if(document.getElementById('profile-score')) {
            document.getElementById('profile-score').innerText = `${data.score} XP`;
        }
    });
};
