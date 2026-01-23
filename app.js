// ================= FIREBASE IMPORTS =================
import { initializeApp } from "firebase/app";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut
} from "firebase/auth";

import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    addDoc,
    deleteDoc,
    updateDoc,
    getDocs,
    collection
} from "firebase/firestore";

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

// ================= INIT =================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ================= GLOBAL =================
let currentUser = null;
let isAdmin = false;

// ================= AUTO GOOGLE LOGIN =================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        await signInWithPopup(auth, provider);
        return;
    }

    currentUser = user;

    document.getElementById("user-name").innerText = user.displayName || "";
    document.getElementById("user-photo").src = user.photoURL;
    document.getElementById("user-photo").classList.remove("hidden");

    // Create user doc if not exists
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        await setDoc(userRef, {
            name: user.displayName,
            email: user.email,
            score: 0,
            attended: 0,
            unattended: 0,
            createdAt: Date.now()
        });
    }

    // Check admin role
    const adminRef = doc(db, "admins", user.email);
    const adminSnap = await getDoc(adminRef);

    if (adminSnap.exists()) {
        document.getElementById("admin-toggle-btn").classList.remove("hidden");
    }
});

// ================= ADMIN TOGGLE =================
document.getElementById("admin-toggle-btn").onclick = () => {
    isAdmin = true;

    document.getElementById("admin-badge").classList.remove("hidden");
    document.getElementById("admin-panel-entry").classList.remove("hidden");

    alert("Admin Mode ON");
};

// ================= TAB SWITCH =================
window.switchTab = (id) => {
    document.querySelectorAll("section")
        .forEach(sec => sec.classList.add("hidden"));

    document.getElementById(id).classList.remove("hidden");
};

// Admin dashboard open
setTimeout(() => {
    const btn = document.getElementById("admin-panel-entry");
    if (btn) {
        btn.onclick = () => switchTab("admin-dashboard");
    }
}, 500);

// ================= ADMIN FUNCTIONS =================

// ADD QUESTION
window.addQuestionAdmin = async () => {
    if (!isAdmin) return alert("Not admin");

    const cls = document.getElementById("admin-class").value;
    const question = document.getElementById("admin-question").value;

    const options = [
        opt1.value,
        opt2.value,
        opt3.value,
        opt4.value
    ];

    const correct = Number(document.getElementById("correct-opt").value);

    if (!question || options.some(o => !o)) {
        return alert("Fill all fields");
    }

    await addDoc(collection(db, `quizzes/class${cls}/questions`), {
        text: question,
        options,
        correct,
        time: 30
    });

    alert("Question Added");
};

// DELETE QUESTION
window.deleteQuestionAdmin = async () => {
    if (!isAdmin) return alert("Not admin");

    const qid = document.getElementById("delete-question-id").value;
    if (!qid) return;

    await deleteDoc(doc(db, "quizzes", "class10", "questions", qid))
        .catch(async () => {
            await deleteDoc(doc(db, "quizzes", "class12", "questions", qid));
        });

    alert("Question Deleted");
};

// UPDATE USER SCORE
window.updateUserScoreAdmin = async () => {
    if (!isAdmin) return;

    const uid = document.getElementById("user-uid").value;
    const score = Number(document.getElementById("user-score").value);

    await updateDoc(doc(db, "users", uid), {
        score
    });

    alert("User score updated");
};

// RESET LEADERBOARD
window.resetLeaderboardAdmin = async () => {
    if (!isAdmin) return;

    const snap = await getDocs(collection(db, "users"));

    snap.forEach(async (u) => {
        await updateDoc(doc(db, "users", u.id), {
            score: 0,
            attended: 0,
            unattended: 0
        });
    });

    alert("Leaderboard Reset");
};

// TEMP ADMIN ADD
window.addTempAdmin = async () => {
    if (!isAdmin) return;

    const email = document.getElementById("admin-email").value;
    if (!email) return;

    await setDoc(doc(db, "admins", email), {
        addedBy: currentUser.email,
        temp: true,
        createdAt: Date.now()
    });

    alert("Admin Added");
};

// TEMP ADMIN REMOVE
window.removeTempAdmin = async () => {
    if (!isAdmin) return;

    const email = document.getElementById("admin-email").value;
    if (!email) return;

    await deleteDoc(doc(db, "admins", email));
    alert("Admin Removed");
};
        
