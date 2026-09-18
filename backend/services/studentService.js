const { db } = require("../firebase/firebaseAdmin");

const studentsCollection = db.collection("students");

const generateRegistrationNumber = async (fullName, courseCode) => {
    const nameParts = fullName.trim().split(/\s+/);

    const firstInitial = nameParts[0][0].toUpperCase();
    const lastInitial = nameParts[nameParts.length - 1][0].toUpperCase();

    while (true) {
        const randomNumber = Math.floor(1000 + Math.random() * 9000);

        const registrationNumber =
            `${firstInitial}${lastInitial}/${courseCode}/${randomNumber}`;

        const existingStudent = await studentsCollection
            .where("registrationNumber", "==", registrationNumber)
            .limit(1)
            .get();

        if (existingStudent.empty) {
            return registrationNumber;
        }
    }
};

const updateStudentStatus = async (studentId, isActive) => {
    const studentRef = studentsCollection.doc(studentId);

    const studentDoc = await studentRef.get();

    if (!studentDoc.exists) {
        throw new Error("Student not found");
    }

    if (typeof isActive !== "boolean") {
        throw new Error("isActive must be true or false");
    }

    await studentRef.update({
        isActive,
        status: isActive ? "active" : "inactive",
        updatedAt: new Date()
    });

    const updatedDoc = await studentRef.get();

    return {
        id: updatedDoc.id,
        ...updatedDoc.data()
    };
};

module.exports = {
    studentsCollection,
    generateRegistrationNumber,
    updateStudentStatus
};