import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, orderBy, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. FIREBASE CONFIGURATION (Using your provided keys)
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

// 2. APP STATE & CONSTANTS
let currentUser = null;
let currentQuizData = [];
let currentQuestionIndex = 0;
let userScore = 0;
let correctAnswers = 0;
let timerInterval;
const ADMIN_EMAIL = "nagtakanwarpkd@gmail.com";

// 3. AUTHENTICATION LOGIC
const loginBtn = document.getElementById('google-login-btn');
if(loginBtn) {
    loginBtn.onclick = () => {
        signInWithPopup(auth, provider).catch(err => console.error("Login Failed", err));
    };
}

document.getElementById('btn-logout').onclick = () => signOut(auth);

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await setupUser(user);
        showScreen('app-container');
        updateUI(user);
        loadLeaderboard();
    } else {
        showScreen('auth-screen');
    }
});

// 4. USER SETUP & DATA
async function setupUser(user) {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    
    if (!snap.exists()) {
        const newUser = {
            uid: user.uid,
            name: user.displayName,
            email: user.email,
            photo: user.photoURL,
            score: 0,
            attended: 0,
            unattended: 0,
            isAdmin: user.email === ADMIN_EMAIL
        };
        await setDoc(userRef, newUser);
    }
}

// 5. NAVIGATION & UI UPDATES
function showScreen(id) {
    document.getElementById('splash-screen').style.display = 'none';
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById(id).classList.remove('hidden');
    if(id === 'app-container') document.getElementById(id).classList.add('flex');
}

function updateUI(user) {
    document.getElementById('user-name-display').innerText = user.displayName;
    document.getElementById('profile-name').innerText = user.displayName;
    document.getElementById('profile-email').innerText = user.email;
    document.getElementById('header-user-img').src = user.photoURL;
    document.getElementById('profile-img-lg').src = user.photoURL;
}

// 6. QUIZ SYSTEM LOGIC
// Admin decide karega Class (10/12) aur Subject
window.startQuiz = async (category, subject) => {
    const q = query(collection(db, `quizzes/${category}/${subject}`));
    const snap = await getDocs(q);
    currentQuizData = snap.docs.map(doc => ({id: doc.id, ...doc.data()}));
    
    if(currentQuizData.length === 0) return alert("No questions added yet!");
    
    document.getElementById('quiz-class-select').classList.add('hidden');
    document.getElementById('quiz-interface').classList.remove('hidden');
    currentQuestionIndex = 0;
    correctAnswers = 0;
    loadQuestion();
};

function loadQuestion() {
    const q = currentQuizData[currentQuestionIndex];
    document.getElementById('question-text').innerText = q.question;
    document.getElementById('quiz-progress').innerText = `${currentQuestionIndex + 1}/${currentQuizData.length}`;
    
    const optionsBox = document.getElementById('options-container');
    optionsBox.innerHTML = '';
    
    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option glass-panel p-4 text-left hover:bg-white/10';
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(idx, q.correct);
        optionsBox.appendChild(btn);
    });

    startTimer(q.time || 30); // Admin decide karega timer
}

function checkAnswer(selected, correct) {
    clearInterval(timerInterval);
    if(selected === correct) {
        correctAnswers++;
        userScore += 5; // Har sahi ke 5 points
    } else {
        userScore -= 1; // Galat hone pr 1 point cut
    }
    
    currentQuestionIndex++;
    if(currentQuestionIndex < currentQuizData.length) {
        loadQuestion();
    } else {
        finishQuiz();
    }
}

async function finishQuiz() {
    // Percent extra points calculation (from 500)
    const accuracy = (correctAnswers / currentQuizData.length);
    const bonus = Math.round(500 * accuracy);
    const finalEarned = userScore + bonus;

    // Update Firebase
    const userRef = doc(db, "users", currentUser.uid);
    const snap = await getDoc(userRef);
    const newTotal = (snap.data().score || 0) + finalEarned;
    
    await updateDoc(userRef, {
        score: newTotal,
        attended: (snap.data().attended || 0) + 1
    });

    alert(`Quiz Finished! Earned: ${finalEarned} Points (Bonus: ${bonus})`);
    location.reload(); // Refresh to home
}

function startTimer(sec) {
    let t = sec;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        t--;
        document.getElementById('quiz-timer').innerText = `Time: ${t}s`;
        if(t <= 0) {
            clearInterval(timerInterval);
            checkAnswer(-1, -2); // Auto wrong if time up
        }
    }, 1000);
}

// 7. LEADERBOARD (Global Rank)
async function loadLeaderboard() {
    const q = query(collection(db, "users"), orderBy("score", "desc"));
    const snap = await getDocs(q);
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    
    snap.docs.forEach((doc, idx) => {
        const data = doc.data();
        const isFirst = idx === 0;
        list.innerHTML += `
            <div class="glass-panel p-4 flex items-center gap-4 ${isFirst ? 'border-raj-gold bg-yellow-900/10' : ''}">
                <div class="relative">
                    ${isFirst ? '<i class="fas fa-crown text-raj-gold absolute -top-4 -left-2 rotate-[-20deg]"></i>' : ''}
                    <img src="${data.photo}" class="w-10 h-10 rounded-full border-2 ${isFirst ? 'border-raj-gold' : 'border-gray-500'}">
                </div>
                <div class="flex-1">
                    <p class="font-bold">${data.name}</p>
                    <p class="text-xs text-gray-400">${data.score} XP</p>
                </div>
                <div class="font-brand text-xl">#${idx + 1}</div>
            </div>
        `;
    });
}

// 8. ADMIN SECRET & PANEL
let adminClicks = 0;
document.getElementById('admin-secret-btn').onclick = () => {
    if(currentUser.email !== ADMIN_EMAIL) return;
    adminClicks++;
    if(adminClicks === 5) {
        document.getElementById('admin-badge').classList.remove('hidden');
        alert("Admin Mode ON! You can now add classes and edit points.");
        // Admin code to inject buttons for adding questions would go here
    }
};

// Admin Function: Point Badhana
window.adminUpdatePoints = async (targetUserId, newPoints) => {
    if(currentUser.email !== ADMIN_EMAIL) return;
    await updateDoc(doc(db, "users", targetUserId), { score: newPoints });
};
