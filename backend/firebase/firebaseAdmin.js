const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

let serviceAccountPath;

// Render Secret Files are available in /etc/secrets
const renderSecretPath = "/etc/secrets/firebase-service-account.json";

// Local development file
const localSecretPath = path.join(
    __dirname,
    "..",
    "firebase-service-account.json"
);

if (fs.existsSync(renderSecretPath)) {
    serviceAccountPath = renderSecretPath;
} else {
    serviceAccountPath = localSecretPath;
}

const serviceAccount = require(serviceAccountPath);

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}

const db = getFirestore();

module.exports = {
    db
};