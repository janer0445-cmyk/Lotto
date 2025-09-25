// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail 
} from "firebase/auth";
import { getDatabase, ref, set, get } from "firebase/database"; // For Realtime Database

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBWtUOlSlSKPiLxvB5kJzZfPD0-9Mngl_w",
    authDomain: "lotto-lux.firebaseapp.com",
    databaseURL: "https://lotto-lux-default-rtdb.firebaseio.com",
    projectId: "lotto-lux",
    storageBucket: "lotto-lux.firebasestorage.app",
    messagingSenderId: "1048484996720",
    appId: "1:1048484996720:web:5de2d5d04b031bbcc236b5",
    measurementId: "G-488XH0F2PR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // eslint-disable-line no-unused-vars
const auth = getAuth(app);
const db = getDatabase(app); // Initialize Realtime Database

// Admin User UID - IMPORTANT: This should ideally be stored securely, not client-side.
// For demonstration, it's here, but consider Firebase Remote Config or server-side checks for production.
const ADMIN_UID = "MJXDeuV9iQd0H7px0dWcBKKg22n2";

// --- DOMContentLoaded Event Listener ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Navbar & Mobile Menu Toggle ---
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const profileDropdownBtn = document.getElementById('profile-dropdown-btn');
    const userMenu = document.querySelector('.user-menu');
    const authLinks = document.querySelector('.auth-links');
    const logoutBtn = document.getElementById('logout-btn');
    const adminLink = document.getElementById('admin-link');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            // Close profile dropdown if mobile menu is closed
            if (!navLinks.classList.contains('active')) {
                if (userMenu) userMenu.classList.remove('active');
            }
        });
    }

    if (profileDropdownBtn) {
        profileDropdownBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent document click from closing immediately
            if (userMenu) userMenu.classList.toggle('active');
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (userMenu && !userMenu.contains(e.target) && userMenu.classList.contains('active')) {
            userMenu.classList.remove('active');
        }
    });

    // --- Authentication State Changes ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            if (authLinks) authLinks.style.display = 'none';
            if (userMenu) userMenu.style.display = 'list-item'; // or 'block' depending on desired layout

            // Update profile dropdown button with user's email/name if available
            if (profileDropdownBtn) {
                const userNameDisplay = profileDropdownBtn.querySelector('span');
                if (userNameDisplay) {
                    userNameDisplay.textContent = user.email ? user.email.split('@')[0] : 'Profile';
                } else {
                    // If no span, just update the text content (might overwrite icon)
                    // Consider adding a <span> inside the <a> for the text, next to the icon.
                }
            }


            // Check if the current user is the admin
            if (user.uid === ADMIN_UID) {
                if (adminLink) {
                    adminLink.style.display = 'flex'; // Show admin link
                }
            } else {
                if (adminLink) {
                    adminLink.style.display = 'none'; // Hide admin link for non-admins
                }
            }

            // Fetch user data for 'me.html'
            if (document.body.classList.contains('me-page')) {
                displayUserProfile(user);
            }

        } else {
            // User is signed out
            if (authLinks) authLinks.style.display = 'flex'; // Show login/signup buttons
            if (userMenu) userMenu.style.display = 'none'; // Hide profile menu
            if (adminLink) adminLink.style.display = 'none'; // Hide admin link if logged out
            
            // Redirect from protected pages if not logged in
            if (document.body.classList.contains('me-page') || document.body.classList.contains('admin-page')) {
                window.location.href = 'login.html'; // Redirect to login
            }
        }
    });

    // --- Logout Functionality ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                // Redirect to home or login page after logout
                window.location.href = 'index.html';
                console.log("User signed out successfully.");
            } catch (error) {
                console.error("Error signing out: ", error);
                alert("Failed to log out. Please try again.");
            }
        });
    }

    // --- Authentication Forms (Login, Signup, Forgot Password) ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm['login-email'].value;
            const password = loginForm['login-password'].value;
            const errorElement = loginForm.querySelector('.error-message');

            try {
                await signInWithEmailAndPassword(auth, email, password);
                errorElement.textContent = ''; // Clear any previous errors
                window.location.href = 'index.html'; // Redirect to home on successful login
            } catch (error) {
                console.error("Login error:", error.code, error.message);
                switch (error.code) {
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                        errorElement.textContent = 'Invalid email or password.';
                        break;
                    case 'auth/invalid-email':
                        errorElement.textContent = 'Please enter a valid email address.';
                        break;
                    default:
                        errorElement.textContent = 'Login failed. Please try again.';
                        break;
                }
            }
        });
    }

    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = signupForm['signup-email'].value;
            const password = signupForm['signup-password'].value;
            const confirmPassword = signupForm['signup-confirm-password'].value;
            const errorElement = signupForm.querySelector('.error-message');

            if (password !== confirmPassword) {
                errorElement.textContent = 'Passwords do not match.';
                return;
            }
            if (password.length < 6) {
                errorElement.textContent = 'Password should be at least 6 characters.';
                return;
            }

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Save initial user data to Realtime Database
                await set(ref(db, 'users/' + user.uid), {
                    email: user.email,
                    createdAt: new Date().toISOString(),
                    balance: 0, // Initial balance
                    // Add other default user properties here
                });

                errorElement.textContent = ''; // Clear any previous errors
                window.location.href = 'index.html'; // Redirect to home on successful signup
            } catch (error) {
                console.error("Signup error:", error.code, error.message);
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorElement.textContent = 'This email is already registered.';
                        break;
                    case 'auth/invalid-email':
                        errorElement.textContent = 'Please enter a valid email address.';
                        break;
                    case 'auth/weak-password':
                        errorElement.textContent = 'Password is too weak. Please use a stronger one.';
                        break;
                    default:
                        errorElement.textContent = 'Signup failed. Please try again.';
                        break;
                }
            }
        });
    }

    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = forgotPasswordForm['forgot-email'].value;
            const messageElement = forgotPasswordForm.querySelector('.message');
            messageElement.textContent = '';
            messageElement.classList.remove('success', 'error');

            try {
                await sendPasswordResetEmail(auth, email);
                messageElement.textContent = 'Password reset email sent! Please check your inbox.';
                messageElement.classList.add('success');
                forgotPasswordForm.reset();
            } catch (error) {
                console.error("Forgot password error:", error.code, error.message);
                switch (error.code) {
                    case 'auth/user-not-found':
                        messageElement.textContent = 'No user found with that email address.';
                        break;
                    case 'auth/invalid-email':
                        messageElement.textContent = 'Please enter a valid email address.';
                        break;
                    default:
                        messageElement.textContent = 'Failed to send reset email. Please try again.';
                        break;
                }
                messageElement.classList.add('error');
            }
        });
    }

    // --- Me Page Functionality ---
    async function displayUserProfile(user) {
        const profileInfoDiv = document.getElementById('profile-info');
        const transactionsList = document.getElementById('transactions-list'); // Assuming you have this
        if (!profileInfoDiv) return; // Only run if on me.html

        profileInfoDiv.innerHTML = '<p>Loading profile...</p>';

        try {
            const userRef = ref(db, 'users/' + user.uid);
            const snapshot = await get(userRef);

            if (snapshot.exists()) {
                const userData = snapshot.val();
                profileInfoDiv.innerHTML = `
                    <h3>Personal Information</h3>
                    <p><strong>Email:</strong> ${userData.email}</p>
                    <p><strong>Balance:</strong> $${(userData.balance || 0).toFixed(2)}</p>
                    <p><strong>Member Since:</strong> ${new Date(userData.createdAt).toLocaleDateString()}</p>
                    <!-- Add more profile details here -->
                    <button class="btn btn-secondary">Edit Profile</button>
                `;

                // Populate transactions (placeholder for now)
                if (transactionsList) {
                    transactionsList.innerHTML = `
                        <li><span class="date">2023-11-20</span> <span class="type deposit">Deposit</span> <span class="amount">+$50.00</span></li>
                        <li><span class="date">2023-11-18</span> <span class="type game">Game Win</span> <span class="amount">+$15.00</span></li>
                        <li><span class="date">2023-11-17</span> <span class="type lottery">Lottery Ticket</span> <span class="amount">-$2.50</span></li>
                        <li><span class="date">2023-11-15</span> <span class="type withdrawal">Withdrawal</span> <span class="amount">-$20.00</span></li>
                    `;
                }

            } else {
                profileInfoDiv.innerHTML = '<p>User data not found. Please contact support.</p>';
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            profileInfoDiv.innerHTML = '<p>Error loading profile. Please try again later.</p>';
        }
    }

    // --- Admin Page Functionality (Placeholder for now) ---
    // In a real app, you'd fetch data, handle form submissions for managing users/games etc.
    if (document.body.classList.contains('admin-page')) {
        // Ensure only admin can see this, already handled by onAuthStateChanged,
        // but can add client-side checks here too.
        console.log("Admin dashboard loaded.");
        // Example: Fetch and display user list for admin
        // fetchUsersForAdmin();
    }


    // --- Set Active Nav Link ---
    function setActiveNavLink() {
        const currentPath = window.location.pathname.split('/').pop();
        const navLinks = document.querySelectorAll('.nav-links a');

        navLinks.forEach(link => {
            link.classList.remove('active');
            const linkPath = link.getAttribute('href');
            if (linkPath === currentPath) {
                link.classList.add('active');
            }
        });
    }
    setActiveNavLink(); // Call it on page load

}); // End DOMContentLoaded
