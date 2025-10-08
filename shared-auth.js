// Shared Authentication Module for Comfort Stays PG
// This module provides consistent authentication across all pages

// Global variables for Firebase
let firebaseAuth = null;
let firebaseDB = null;

// Initialize Firebase and make it globally available
async function initializeFirebase() {
    try {
        // Import Firebase modules
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
        const { getFirestore, collection, doc, getDocs, setDoc, updateDoc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const { getAuth, signOut, GoogleAuthProvider, signInWithPopup } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        const { getStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject, listAll } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js");

        // Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyCvIaT8x5lKq6yA5YW8OUyn_uC_uJLeuZE",
            authDomain: "comfort-stays.firebaseapp.com",
            projectId: "comfort-stays",
            storageBucket: "comfort-stays.firebasestorage.app",
            messagingSenderId: "187885851533",
            appId: "1:187885851533:web:5f82713f2ddd8fe889e3c4",
            measurementId: "G-KYZ4HX31C9"
        };

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        firebaseDB = getFirestore(app);
        firebaseAuth = getAuth(app);
        const firebaseStorage = getStorage(app);

        // Make Firebase functions globally available
        window.firebaseAuth = firebaseAuth;
        window.firebaseSignOut = signOut;
        window.firebaseOnAuthStateChanged = onAuthStateChanged;
        window.firebaseDB = firebaseDB;
        window.firebaseStorage = firebaseStorage;
        window.firestoreCollection = collection;
        window.firestoreDoc = doc;
        window.firestoreGetDocs = getDocs;
        window.firestoreSetDoc = setDoc;
        window.firestoreUpdateDoc = updateDoc;
        window.firestoreDeleteDoc = deleteDoc;
        window.firebaseProvider = new GoogleAuthProvider();
        window.firebaseSignIn = signInWithPopup;
        // Storage functions
        window.storageRef = ref;
        window.storageUploadBytes = uploadBytes;
        window.storageUploadBytesResumable = uploadBytesResumable;
        window.storageGetDownloadURL = getDownloadURL;
        window.storageDeleteObject = deleteObject;
        window.storageListAll = listAll;

        console.log('Firebase initialized successfully');
        return true;
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        return false;
    }
}

// Check if user is authenticated and is the owner
async function checkOwnerAuthentication() {
    try {
        console.log('Starting owner authentication check...');
        
        // Ensure Firebase is initialized
        if (!window.firebaseAuth) {
            console.log('Firebase auth not ready, waiting...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (!window.firebaseAuth) {
                throw new Error('Firebase auth not initialized');
            }
        }
        
        // Wait for auth state to be ready
        await new Promise((resolve) => {
            const unsubscribe = window.firebaseAuth.onAuthStateChanged((user) => {
                console.log('Auth state changed:', user ? user.email : 'No user');
                unsubscribe();
                resolve(user);
            });
        });
        
        const user = window.firebaseAuth.currentUser;
        console.log('Current user:', user ? user.email : 'No current user');
        
        if (!user) {
            console.log('No user found');
            return { authenticated: false, user: null };
        }

        // Check if user is the owner
        const allowedEmails = [
            'harshkanjariya.official@gmail.com',
            'code.harshkanjariya@gmail.com'
        ];
        
        if (!allowedEmails.includes(user.email)) {
            console.log('Access denied - not owner');
            return { authenticated: false, user: user, reason: 'not_owner' };
        }

        console.log('Owner authentication successful');
        return { authenticated: true, user: user };
        
    } catch (error) {
        console.error("Authentication check failed:", error);
        return { authenticated: false, user: null, error: error };
    }
}

// Sign in with Google
async function signInWithGoogle() {
    try {
        if (!window.firebaseAuth) {
            throw new Error('Firebase not initialized');
        }
        
        const result = await window.firebaseSignIn(window.firebaseAuth, window.firebaseProvider);
        const user = result.user;
        
        console.log('Sign-in successful:', user.email);
        
        // Check if it's the owner
        const authResult = await checkOwnerAuthentication();
        return authResult;
        
    } catch (error) {
        console.error('Sign-in error:', error);
        return { authenticated: false, user: null, error: error };
    }
}

// Sign out user
async function signOutUser() {
    try {
        if (!window.firebaseAuth) {
            throw new Error('Firebase not initialized');
        }
        
        await window.firebaseSignOut(window.firebaseAuth);
        console.log('Sign-out successful');
        return true;
    } catch (error) {
        console.error('Sign-out error:', error);
        return false;
    }
}

// Handle authentication state changes
function onAuthStateChanged(callback) {
    if (!window.firebaseAuth) {
        console.error('Firebase not initialized');
        // Return a dummy unsubscribe function
        return () => {};
    }
    
    return window.firebaseAuth.onAuthStateChanged(callback);
}

// Show owner controls (for landing page)
function showOwnerControls() {
    const signInButton = document.getElementById('googleSignInButton');
    if (signInButton) {
        signInButton.innerHTML = `
            <button onclick="showManagePanel()" class="btn-primary">🏠 Manage PG</button>
            <button onclick="signOutFromLanding()" class="btn-secondary">🚪 Sign Out</button>
        `;
    }
}

// Show guest message (for landing page)
function showGuestMessage() {
    const signInButton = document.getElementById('googleSignInButton');
    if (signInButton) {
        signInButton.innerHTML = `
            <span style="color: #10b981; font-weight: 600;">Welcome, Guest!</span>
            <button onclick="signOutFromLanding()" class="btn-secondary">🚪 Sign Out</button>
        `;
    }
}

// Sign out from landing page
async function signOutFromLanding() {
    const success = await signOutUser();
    if (success) {
        window.location.reload();
    }
}

// Show manage panel (redirect to manage page)
function showManagePanel() {
    window.location.href = 'manage.html';
}

// Initialize authentication for protected pages (manage, transactions)
async function initializeProtectedPage() {
    try {
        // Initialize Firebase
        const firebaseReady = await initializeFirebase();
        if (!firebaseReady) {
            throw new Error('Firebase initialization failed');
        }
        
        // Wait a bit more to ensure Firebase is fully ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Double-check that Firebase auth is available
        if (!window.firebaseAuth) {
            throw new Error('Firebase auth not available after initialization');
        }
        
        // Add timeout to prevent infinite loading
        const authPromise = checkOwnerAuthentication();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Authentication timeout')), 10000)
        );
        
        // Check authentication with timeout
        const authResult = await Promise.race([authPromise, timeoutPromise]);
        
        if (!authResult.authenticated) {
            if (authResult.reason === 'not_owner') {
                alert('Access denied. Only the owner can access this page.');
            }
            window.location.href = 'index.html';
            return false;
        }
        
        console.log('Protected page authentication successful');
        return true;
        
    } catch (error) {
        console.error('Protected page initialization failed:', error);
        alert('Authentication failed. Please try signing in again.');
        window.location.href = 'index.html';
        return false;
    }
}

// Initialize authentication for landing page
async function initializeLandingPage() {
    try {
        // Initialize Firebase
        const firebaseReady = await initializeFirebase();
        if (!firebaseReady) {
            console.error('Firebase initialization failed');
            return;
        }
        
        // Set up auth state listener
        onAuthStateChanged((user) => {
            if (user) {
                // User is signed in
                const allowedEmails = [
                    'harshkanjariya.official@gmail.com',
                    'code.harshkanjariya@gmail.com'
                ];
                if (allowedEmails.includes(user.email)) {
                    showOwnerControls();
                } else {
                    showGuestMessage();
                }
            } else {
                // User is signed out
                showSignInButton();
            }
        });
        
    } catch (error) {
        console.error('Landing page initialization failed:', error);
    }
}

// Show sign in button (for landing page)
function showSignInButton() {
    const signInButton = document.getElementById('googleSignInButton');
    if (signInButton) {
        signInButton.innerHTML = `
            <div id="g_id_onload"
                 data-client_id="YOUR_GOOGLE_CLIENT_ID"
                 data-callback="handleCredentialResponse">
            </div>
            <div class="g_id_signin" data-type="standard"></div>
        `;
    }
}

// Handle credential response (for landing page Google Sign-in)
async function handleCredentialResponse(response) {
    try {
        const authResult = await signInWithGoogle();
        if (authResult.authenticated) {
            showOwnerControls();
        } else {
            showGuestMessage();
        }
    } catch (error) {
        console.error('Credential response error:', error);
    }
}

// Make functions globally available
// Storage utility functions
async function uploadDocument(file, guestEmail, documentType) {
    try {
        if (!window.firebaseStorage) {
            throw new Error('Firebase Storage not initialized');
        }

        // Create a unique filename
        const timestamp = Date.now();
        const fileName = `${guestEmail}_${documentType}_${timestamp}_${file.name}`;
        
        // Create storage reference
        const storageRef = window.storageRef(window.firebaseStorage, `guest-documents/${guestEmail}/${fileName}`);
        
        // Upload file with progress tracking
        const uploadTask = window.storageUploadBytesResumable(storageRef, file);
        
        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    // Progress tracking
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log('Upload is ' + progress + '% done');
                    
                    // Dispatch progress event
                    window.dispatchEvent(new CustomEvent('uploadProgress', {
                        detail: { progress, fileName }
                    }));
                },
                (error) => {
                    console.error('Upload error:', error);
                    reject(error);
                },
                async () => {
                    // Upload completed successfully
                    try {
                        const downloadURL = await window.storageGetDownloadURL(uploadTask.snapshot.ref);
                        
                        // Store document metadata in Firestore
                        const documentData = {
                            fileName: file.name,
                            storagePath: `guest-documents/${guestEmail}/${fileName}`,
                            downloadURL: downloadURL,
                            guestEmail: guestEmail,
                            documentType: documentType,
                            fileSize: file.size,
                            uploadDate: new Date().toISOString(),
                            mimeType: file.type
                        };
                        
                        await window.firestoreSetDoc(
                            window.firestoreDoc(window.firebaseDB, 'guest-documents', `${guestEmail}_${timestamp}`),
                            documentData
                        );
                        
                        resolve({
                            success: true,
                            downloadURL: downloadURL,
                            fileName: file.name,
                            documentData: documentData
                        });
                    } catch (error) {
                        console.error('Error getting download URL or saving metadata:', error);
                        reject(error);
                    }
                }
            );
        });
    } catch (error) {
        console.error('Upload document error:', error);
        throw error;
    }
}

async function getGuestDocuments(guestEmail) {
    try {
        if (!window.firebaseDB) {
            throw new Error('Firebase not initialized');
        }

        const documentsRef = window.firestoreCollection(window.firebaseDB, 'guest-documents');
        const querySnapshot = await window.firestoreGetDocs(documentsRef);
        
        const documents = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.guestEmail === guestEmail) {
                documents.push({
                    id: doc.id,
                    ...data
                });
            }
        });
        
        return documents.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    } catch (error) {
        console.error('Error getting guest documents:', error);
        throw error;
    }
}

async function getAllGuestDocuments() {
    try {
        if (!window.firebaseDB) {
            throw new Error('Firebase not initialized');
        }

        const documentsRef = window.firestoreCollection(window.firebaseDB, 'guest-documents');
        const querySnapshot = await window.firestoreGetDocs(documentsRef);
        
        const documents = [];
        querySnapshot.forEach((doc) => {
            documents.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return documents.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    } catch (error) {
        console.error('Error getting all guest documents:', error);
        throw error;
    }
}

async function deleteDocument(documentId, storagePath) {
    try {
        if (!window.firebaseDB || !window.firebaseStorage) {
            throw new Error('Firebase not initialized');
        }

        // Delete from Firestore
        await window.firestoreDeleteDoc(window.firestoreDoc(window.firebaseDB, 'guest-documents', documentId));
        
        // Delete from Storage
        const storageRef = window.storageRef(window.firebaseStorage, storagePath);
        await window.storageDeleteObject(storageRef);
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting document:', error);
        throw error;
    }
}

window.initializeFirebase = initializeFirebase;
window.checkOwnerAuthentication = checkOwnerAuthentication;
window.signInWithGoogle = signInWithGoogle;
window.signOutUser = signOutUser;
window.onAuthStateChanged = onAuthStateChanged;
window.showOwnerControls = showOwnerControls;
window.showGuestMessage = showGuestMessage;
window.signOutFromLanding = signOutFromLanding;
window.showManagePanel = showManagePanel;
window.initializeProtectedPage = initializeProtectedPage;
window.initializeLandingPage = initializeLandingPage;
window.showSignInButton = showSignInButton;
window.handleCredentialResponse = handleCredentialResponse;
// Storage functions
window.uploadDocument = uploadDocument;
window.getGuestDocuments = getGuestDocuments;
window.getAllGuestDocuments = getAllGuestDocuments;
window.deleteDocument = deleteDocument;
