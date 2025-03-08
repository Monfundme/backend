const admin = require('firebase-admin');
require('dotenv').config();

const initializeFirebase = () => {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });

  return admin.firestore();
};

module.exports = { initializeFirebase }; 