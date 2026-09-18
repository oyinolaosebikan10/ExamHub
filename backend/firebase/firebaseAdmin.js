const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const path = require("path");

const serviceAccount = require(
    path.join(__dirname, "..", "firebase-service-account.json")
);

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}

const db = getFirestore();

module.exports = {
    db
};