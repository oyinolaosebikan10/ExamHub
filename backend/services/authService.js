const { db } = require("../firebase/firebaseAdmin");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const usersCollection = db.collection("users");
const studentsCollection = db.collection("students");

const createStudentUser = async ({
    fullName,
    password
}) => {
    const passwordHash = await bcrypt.hash(password, 10);

    const userRef = usersCollection.doc();

    const userData = {
        fullName: fullName.trim(),
        role: "student",
        passwordHash,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    await userRef.set(userData);

    return {
        userId: userRef.id
    };
};

const loginStudent = async ({
    registrationNumber,
    password
}) => {
    // 1. Find student by registration number
    const studentSnapshot = await studentsCollection
        .where("registrationNumber", "==", registrationNumber.trim().toUpperCase())
        .limit(1)
        .get();

    if (studentSnapshot.empty) {
        throw new Error("Invalid registration number or password");
    }

    const studentDoc = studentSnapshot.docs[0];
    const student = studentDoc.data();

    // 2. Check student status
    if (student.status !== "active" || student.isActive === false) {
        throw new Error("This student account is inactive");
    }

    // 3. Find linked user
    const userDoc = await usersCollection
        .doc(student.userId)
        .get();

    if (!userDoc.exists) {
        throw new Error("User account not found");
    }

    const user = userDoc.data();

    // 4. Check user status
    if (!user.isActive) {
        throw new Error("This user account is inactive");
    }

    // 5. Compare password with stored hash
    const passwordMatches = await bcrypt.compare(
        password,
        user.passwordHash
    );

    if (!passwordMatches) {
        throw new Error("Invalid registration number or password");
    }

    // 6. Generate JWT
    const token = generateToken({
        userId: student.userId,
        role: user.role
    });

    return {
        token,
        user: {
            userId: student.userId,
            studentId: studentDoc.id,
            fullName: student.fullName,
            registrationNumber: student.registrationNumber,
            courseId: student.courseId,
            role: user.role
        }
    };
};

const generateToken = (user) => {
    return jwt.sign(
        {
            userId: user.userId,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "2h"
        }
    );
};

const createAdminUser = async ({
    fullName,
    email,
    password
}) => {
    const passwordHash = await bcrypt.hash(password, 10);

    const normalizedEmail = email.trim().toLowerCase();

    const existingAdmin = await usersCollection
        .where("email", "==", normalizedEmail)
        .where("role", "==", "admin")
        .limit(1)
        .get();

    if (!existingAdmin.empty) {
        throw new Error("Admin account already exists");
    }

    const adminRef = usersCollection.doc();

    const adminData = {
        fullName: fullName.trim(),
        email: normalizedEmail,
        role: "admin",
        passwordHash,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    await adminRef.set(adminData);

    return {
        userId: adminRef.id,
        fullName: adminData.fullName,
        email: adminData.email,
        role: adminData.role
    };
};


const loginAdmin = async ({
    email,
    password
}) => {
    const normalizedEmail = email.trim().toLowerCase();

    const snapshot = await usersCollection
        .where("email", "==", normalizedEmail)
        .where("role", "==", "admin")
        .limit(1)
        .get();

    if (snapshot.empty) {
        throw new Error("Invalid admin credentials");
    }

    const adminDoc = snapshot.docs[0];
    const admin = adminDoc.data();

    if (!admin.isActive) {
        throw new Error("This admin account is inactive");
    }

    const passwordMatches = await bcrypt.compare(
        password,
        admin.passwordHash
    );

    if (!passwordMatches) {
        throw new Error("Invalid admin credentials");
    }

    const token = generateToken({
        userId: adminDoc.id,
        role: "admin"
    });

    return {
        token,
        user: {
            userId: adminDoc.id,
            fullName: admin.fullName,
            email: admin.email,
            role: "admin"
        }
    };
};

module.exports = {
    usersCollection,
    studentsCollection,
    createStudentUser,
    loginStudent,
    createAdminUser,
    loginAdmin,
    generateToken
};