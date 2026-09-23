const { db } = require("../firebase/firebaseAdmin");

const studentsCollection = db.collection("students");


// =========================================================
// GENERATE REGISTRATION NUMBER
// =========================================================

const generateRegistrationNumber = async (
    fullName,
    courseCode
) => {

    const nameParts =
        fullName.trim().split(/\s+/);

    const firstInitial =
        nameParts[0][0].toUpperCase();

    const lastInitial =
        nameParts[nameParts.length - 1][0].toUpperCase();

    while (true) {

        const randomNumber =
            Math.floor(
                1000 + Math.random() * 9000
            );

        const registrationNumber =
            `${firstInitial}${lastInitial}/${courseCode}/${randomNumber}`;

        const existingStudent =
            await studentsCollection
                .where(
                    "registrationNumber",
                    "==",
                    registrationNumber
                )
                .limit(1)
                .get();

        if (existingStudent.empty) {
            return registrationNumber;
        }
    }
};


// =========================================================
// UPDATE STUDENT STATUS
// =========================================================

const updateStudentStatus = async (
    studentId,
    isActive
) => {

    const studentRef =
        studentsCollection.doc(studentId);

    const studentDoc =
        await studentRef.get();

    if (!studentDoc.exists) {
        throw new Error("Student not found");
    }

    if (typeof isActive !== "boolean") {
        throw new Error(
            "isActive must be true or false"
        );
    }

    await studentRef.update({

        isActive,

        status:
            isActive
                ? "active"
                : "inactive",

        updatedAt:
            new Date()

    });

    const updatedDoc =
        await studentRef.get();

    return {
        id: updatedDoc.id,
        ...updatedDoc.data()
    };
};


// =========================================================
// GET STUDENT PROFILE
// =========================================================

const getStudentProfile = async (
    userId
) => {

    const snapshot =
        await studentsCollection
            .where(
                "userId",
                "==",
                userId
            )
            .limit(1)
            .get();


    if (snapshot.empty) {

        throw new Error(
            "Student not found"
        );
    }


    const studentDoc =
        snapshot.docs[0];

    const student =
        studentDoc.data();


    /*
     * Only return information that is
     * appropriate for the student's profile.
     *
     * Sensitive fields such as passwordHash
     * are intentionally excluded.
     */

    return {

        studentId:
            studentDoc.id,

        fullName:
            student.fullName || null,

        registrationNumber:
            student.registrationNumber || null,

        phoneNumber:
            student.phoneNumber || null,

        courseId:
            student.courseId || null,

        status:
            student.status || null,

        isActive:
            student.isActive !== false,

        createdAt:
            student.createdAt || null,

        updatedAt:
            student.updatedAt || null
    };
};


module.exports = {

    studentsCollection,

    generateRegistrationNumber,

    updateStudentStatus,

    getStudentProfile

};