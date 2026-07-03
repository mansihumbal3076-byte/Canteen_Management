# CanteenHub — Canteen Management System

A beginner-friendly, beautifully designed serverless web app built using HTML, CSS, Vanilla JS, and Firebase.

## Setup Instructions

1. **Create a Firebase Project:**
    - Go to [Firebase Console](https://console.firebase.google.com/)
    - Create a new project (e.g. `canteen-management-system`)

2. **Enable Services in Firebase Console:**
    - **Authentication:** Enable Google Sign-in and Email/Password providers.
    - **Firestore Database:** Create a database in test mode or production mode. (Security rules provided in `firestore.rules`).

3. **Get Firebase Config:**
    - Register a Web app in the Firebase project settings.
    - Copy the `firebaseConfig` object and paste it into `js/firebase-config.js`.

4. **Deploy Security Rules:**
    - In Firebase Console, go to Firestore Database -> Rules, and paste the contents of `firestore.rules`.
    - Go to Indexes and configure the composite indexes found in `firestore.indexes.json`.
    - Alternatively, install Firebase CLI (`npm i -g firebase-tools`), login (`firebase login`), init (`firebase init`), and deploy (`firebase deploy`).

5. **Create an Admin Account:**
    - Open your Firebase project -> Authentication -> Users.
    - Add user with Email/Password (e.g. `admin@canteen.com` / `password123`).
    - Go to Firestore Database, create a new collection called `admins`.
    - Add a document where the Document ID is the `uid` of the admin user you just created.
    - Add an fields:
        - `name`: `Admin User` (string)
        - `email`: `admin@canteen.com` (string)
        - `role`: `super_admin` (string)

6. **Add Menu Items:**
    - Open `index.html` locally or deploy via Firebase Hosting.
    - Go to `/admin-login.html`.
    - Login with admin email/password.
    - Navigate to Menu Management and start adding items!

7. **Test Orders:**
    - URL structure: `http://localhost:5000/customer.html?table=T1`
    - Open in a new incognito window, login with Google, add items to cart, and place order.
    - Check the Admin Dashboard to accept and complete the order. Bills are automatically generated.

## Authors
- Prepared securely and intelligently by Antigravity / Deepmind.
