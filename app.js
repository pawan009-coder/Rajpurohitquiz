// Master JS for RAJPUROHIT - Full Control Version
const ADMIN_EMAIL = "nagtakanwarpkd@gmail.com";
let db, auth;

// 1. INITIALIZE FIREBASE
function initApp() {
    const firebaseConfig = {
        apiKey: "AIzaSyAOHPevaiVZWoDuxpp0L89a9kMAH6nV4IM",
        authDomain: "rajpurohit-bf36c.firebaseapp.com",
        projectId: "rajpurohit-bf36c",
        storageBucket: "rajpurohit-bf36c.firebasestorage.app",
        messagingSenderId: "765326201462",
        appId: "1:765326201462:web:a06b47ff3ae131a87d4557",
        measurementId: "G-H29TJ7PFC9"
    };

    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();

    setupAuth();
}

// 2. AUTO LOGIN & SPLASH SYSTEM
function setupAuth() {
    auth.onAuthStateChanged(async (user) => {
        const splash = document.getElementById('splash-screen');
        const authScreen = document.getElementById('auth-screen');
        const appContainer = document.getElementById('app-container');

        // Splash screen delay
        setTimeout(() => {
            splash.style.opacity = '0';
            setTimeout(() => splash.classList.add('hidden'), 1000);

            if (user) {
                authScreen.classList.add('hidden');
                appContainer.classList.remove('hidden');
                loadUserData(user);
            } else {
                appContainer.classList.add('hidden');
                authScreen.classList.remove('hidden');
            }
        }, 2500);
    });
}

// 3. LOGIN TRIGGER
document.getElementById('google-login-btn').onclick = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
};

document.getElementById('btn-logout').onclick = () => auth.signOut();

// 4. LOAD USER & ADMIN CHECK
async function loadUserData(user) {
    const userRef = db.collection("users").doc(user.uid);
    const doc = await userRef.get();

    // Check if Admin (Email or Temp Admin status)
    const isAdmin = (user.email === ADMIN_EMAIL || (doc.exists() && doc.data().tempAdmin === true));

    if (!doc.exists()) {
        await userRef.set({
            name: user.displayName,
            email: user.email,
            photo: user.photoURL,
            score: 0,
            tempAdmin: false
        });
    }

    // UI Updates
    document.getElementById('user-name-display').innerText = user.displayName;
    document.getElementById('profile-name').innerText = user.displayName;
    document.getElementById('profile-email').innerText = user.email;
    document.getElementById('header-user-img').src = user.photoURL;
    document.getElementById('profile-img-lg').src = user.photoURL;

    if (isAdmin) {
        document.getElementById('admin-main-btn').classList.remove('hidden');
        document.getElementById('admin-view').classList.remove('hidden');
    }

    // Real-time Score
    userRef.onSnapshot(snap => {
        const data = snap.data();
        document.getElementById('header-points').innerText = `${data.score} XP`;
        document.getElementById('stat-score').innerText = data.score;
    });

    loadLeaderboard();
}

// 5. NAVIGATION
window.switchTab = (id) => {
    const sections = ['view-home', 'view-rank', 'view-quiz', 'view-profile'];
    sections.forEach(s => document.getElementById(s).classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
};

// 6. ADMIN SUPREME POWERS
window.adminResetLeaderboard = async () => {
    if (!confirm("Kya aap sach mein Leaderboard reset karna chahte hain? Sabka score 0 ho jayega!")) return;
    const users = await db.collection("users").get();
    const batch = db.batch();
    users.forEach(u => batch.update(u.ref, { score: 0 }));
    await batch.commit();
    alert("Leaderboard Cleared!");
};

window.adminAddTemporaryAdmin = async () => {
    const email = prompt("Jis user ko Temp Admin banana hai uska Email likhein:");
    if (!email) return;
    const q = await db.collection("users").where("email", "==", email).get();
    if (q.empty) return alert("User nahi mila!");
    await q.docs[0].ref.update({ tempAdmin: true });
    alert(email + " ab Admin hai!");
};

window.adminManageUsers = async () => {
    const email = prompt("User ka email jiska data delete/edit karna hai:");
    if (!email) return;
    const q = await db.collection("users").where("email", "==", email).get();
    if (q.empty) return alert("User nahi mila!");
    
    const action = prompt("Type 'DELETE' to remove user or 'SCORE' to edit score:");
    if (action === "DELETE") {
        await q.docs[0].ref.delete();
        alert("User Deleted!");
    } else if (action === "SCORE") {
        const newScore = parseInt(prompt("Naya score likhein:"));
        await q.docs[0].ref.update({ score: newScore });
        alert("Score Updated!");
    }
};

// 7. LEADERBOARD
async function loadLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    db.collection("users").orderBy("score", "desc").limit(20).onSnapshot(snap => {
        list.innerHTML = "";
        snap.forEach((doc, idx) => {
            const d = doc.data();
            list.innerHTML += `
                <div class="glass-panel p-3 flex items-center justify-between border-l-4 ${idx === 0 ? 'border-raj-gold' : 'border-gray-700'}">
                    <div class="flex items-center gap-3">
                        <span class="font-brand text-lg w-6">${idx + 1}</span>
                        <img src="${d.photo}" class="w-8 h-8 rounded-full border border-raj-neon">
                        <p class="text-sm font-bold">${d.name}</p>
                    </div>
                    <p class="text-raj-neon font-brand text-xs">${d.score} XP</p>
                </div>`;
        });
    });
}

window.onload = initApp;
