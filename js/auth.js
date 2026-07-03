// ============================================
// Authentication Module
// ============================================
// Handles Google Sign-In (customers) and Email/Password (admins)

// --- Google Sign-In ---
async function googleSignIn() {
    try {
        showLoader();
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;

        // Save/update user in Firestore
        await saveUserToFirestore(user);

        showToast('Welcome, ' + user.displayName + '!', 'success');
        return user;
    } catch (error) {
        console.error('Google Sign-In Error:', error);
        if (error.code === 'auth/popup-closed-by-user') {
            showToast('Sign-in cancelled', 'warning');
        } else if (error.code === 'auth/network-request-failed') {
            showToast('Network error. Check your connection.', 'error');
        } else {
            showToast('Sign-in failed: ' + error.message, 'error');
        }
        return null;
    } finally {
        hideLoader();
    }
}

// --- Email/Password Sign-In (Admin) ---
async function emailSignIn(email, password) {
    try {
        showLoader();
        const result = await auth.signInWithEmailAndPassword(email, password);
        const user = result.user;

        // Check if user is admin
        const adminDoc = await db.collection('admins').doc(user.uid).get();
        if (!adminDoc.exists) {
            await auth.signOut();
            showToast('You are not authorized as an admin.', 'error');
            return null;
        }

        // Update last login
        await db.collection('admins').doc(user.uid).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast('Welcome back, Admin!', 'success');
        return user;
    } catch (error) {
        console.error('Email Sign-In Error:', error);
        if (error.code === 'auth/user-not-found') {
            showToast('No admin account found with this email.', 'error');
        } else if (error.code === 'auth/wrong-password') {
            showToast('Incorrect password.', 'error');
        } else if (error.code === 'auth/invalid-email') {
            showToast('Invalid email format.', 'error');
        } else {
            showToast('Login failed: ' + error.message, 'error');
        }
        return null;
    } finally {
        hideLoader();
    }
}

// --- Save User to Firestore ---
async function saveUserToFirestore(user) {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();

    if (!doc.exists) {
        // New user
        await userRef.set({
            name: user.displayName || 'Customer',
            email: user.email,
            photoURL: user.photoURL || '',
            phone: '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
    } else {
        // Existing user - update last login
        await userRef.update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            name: user.displayName || doc.data().name,
            photoURL: user.photoURL || doc.data().photoURL
        });
    }
}

// --- Sign Out ---
async function signOutUser() {
    try {
        await auth.signOut();
        sessionStorage.clear();
        showToast('Signed out successfully', 'info');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Sign-Out Error:', error);
        showToast('Error signing out', 'error');
    }
}

// --- Get Current User ---
function getCurrentUser() {
    return auth.currentUser;
}

// --- Auth State Listener ---
function onAuthChange(callback) {
    auth.onAuthStateChanged(callback);
}

// --- Require Authentication (Customer) ---
function requireAuth(redirectURL = 'index.html') {
    return new Promise((resolve) => {
        auth.onAuthStateChanged((user) => {
            if (!user) {
                window.location.href = redirectURL;
                resolve(null);
            } else {
                resolve(user);
            }
        });
    });
}

// --- Require Admin Authentication ---
async function requireAdmin(redirectURL = 'admin-login.html') {
    return new Promise((resolve) => {
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = redirectURL;
                resolve(null);
                return;
            }

            try {
                const adminDoc = await db.collection('admins').doc(user.uid).get();
                if (!adminDoc.exists) {
                    await auth.signOut();
                    showToast('Unauthorized access. Admin login required.', 'error');
                    window.location.href = redirectURL;
                    resolve(null);
                } else {
                    resolve(user);
                }
            } catch (error) {
                console.error('Admin Check Error:', error);
                window.location.href = redirectURL;
                resolve(null);
            }
        });
    });
}

// --- Admin Sign Out ---
async function adminSignOut() {
    try {
        await auth.signOut();
        sessionStorage.clear();
        showToast('Admin signed out', 'info');
        window.location.href = 'admin-login.html';
    } catch (error) {
        console.error('Admin Sign-Out Error:', error);
        showToast('Error signing out', 'error');
    }
}
