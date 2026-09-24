const { db } = require("../firebase/firebaseAdmin");

const enrollmentsCollection = db.collection("enrollments");
const studentsCollection = db.collection("students");
const coursesCollection = db.collection("courses");
const programsCollection = db.collection("programs");


const createEnrollment = async ({
    studentId,
    programId,
    courseId,
    programDuration = null,
    startDate = null,
    endDate = null
}) => {
    // Check student
    const studentDoc = await studentsCollection.doc(studentId).get();

    if (!studentDoc.exists) {
        throw new Error("Student not found");
    }

    // Check program
    const programDoc = await programsCollection.doc(programId).get();

    if (!programDoc.exists) {
        throw new Error("Program not found");
    }

    const program = programDoc.data();

    if (program.isActive === false) {
        throw new Error("Program is inactive");
    }

    // Check course
    const courseDoc = await coursesCollection
        .doc(courseId)
        .get();

    if (!courseDoc.exists) {
        throw new Error("Course not found");
    }

    const course = courseDoc.data();

    if (course.isActive === false) {
        throw new Error("Course is inactive");
    }

    // School comes from the program
    const schoolId =
        program.venueType === "school"
            ? program.schoolId
            : null;

    // Prevent duplicate enrollment
    // Same student + same program + same course
    const existingEnrollment = await enrollmentsCollection
        .where("studentId", "==", studentId)
        .where("programId", "==", programId)
        .where("courseId", "==", courseId)
        .where("status", "==", "active")
        .limit(1)
        .get();

    if (!existingEnrollment.empty) {
        throw new Error(
            "Student is already enrolled in this program and course"
        );
    }

    const enrollmentRef = enrollmentsCollection.doc();

    const enrollmentData = {
        studentId,
        programId,
        schoolId,
        courseId,
        programDuration,
        startDate,
        endDate,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
    };

    await enrollmentRef.set(enrollmentData);

    return {
        id: enrollmentRef.id,
        ...enrollmentData
    };
};


const getAllEnrollments = async () => {
    const snapshot = await enrollmentsCollection.get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};


const getEnrollmentsByStudent = async (studentId) => {
    const snapshot = await enrollmentsCollection
        .where("studentId", "==", studentId)
        .get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

const getEnrollmentsByUserId = async (userId) => {
    const studentSnapshot = await studentsCollection
        .where("userId", "==", userId)
        .limit(1)
        .get();

    if (studentSnapshot.empty) {
        throw new Error("Student not found");
    }

    const studentId = studentSnapshot.docs[0].id;

    return getEnrollmentsByStudent(studentId);
};

const updateEnrollment = async (
    enrollmentId,
    updateData = {}
) => {
    const enrollmentRef =
        enrollmentsCollection.doc(enrollmentId);

    const enrollmentDoc =
        await enrollmentRef.get();

    if (!enrollmentDoc.exists) {
        throw new Error("Enrollment not found");
    }

    const allowedFields = [
        "programId",
        "courseId",
        "programDuration",
        "startDate",
        "endDate",
        "status"
    ];

    const dataToUpdate = {};

    // Only allow approved fields to be updated
    for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
            dataToUpdate[field] = updateData[field];
        }
    }

    if (Object.keys(dataToUpdate).length === 0) {
        throw new Error(
            "No valid fields provided for update"
        );
    }

    const currentEnrollment =
        enrollmentDoc.data();

    // Get the final program and course values
    const finalProgramId =
        dataToUpdate.programId ||
        currentEnrollment.programId;

    const finalCourseId =
        dataToUpdate.courseId ||
        currentEnrollment.courseId;

    /*
     * Validate the FINAL program.
     * This matters even when programId wasn't changed,
     * because the enrollment must still point to a valid
     * active program.
     */
    const programDoc =
        await programsCollection
            .doc(finalProgramId)
            .get();

    if (!programDoc.exists) {
        throw new Error("Program not found");
    }

    const program = programDoc.data();

    if (program.isActive === false) {
        throw new Error("Program is inactive");
    }

    // School always comes from the final program
    dataToUpdate.schoolId =
        program.venueType === "school"
            ? program.schoolId
            : null;

    // Validate the FINAL course
    const courseDoc =
        await coursesCollection
            .doc(finalCourseId)
            .get();

    if (!courseDoc.exists) {
        throw new Error("Course not found");
    }

    const course = courseDoc.data();

    if (course.isActive === false) {
        throw new Error("Course is inactive");
    }

    // Prevent duplicate active enrollment
    const existingEnrollment =
        await enrollmentsCollection
            .where(
                "studentId",
                "==",
                currentEnrollment.studentId
            )
            .where(
                "programId",
                "==",
                finalProgramId
            )
            .where(
                "courseId",
                "==",
                finalCourseId
            )
            .where(
                "status",
                "==",
                "active"
            )
            .limit(2)
            .get();

    const duplicateExists =
        existingEnrollment.docs.some(
            doc => doc.id !== enrollmentId
        );

    if (duplicateExists) {
        throw new Error(
            "Student is already enrolled in this program and course"
        );
    }

    dataToUpdate.updatedAt = new Date();

    await enrollmentRef.update(dataToUpdate);

    const updatedDoc =
        await enrollmentRef.get();

    return {
        id: updatedDoc.id,
        ...updatedDoc.data()
    };
};


const getEnrollmentById = async (enrollmentId) => {
    const enrollmentDoc =
        await enrollmentsCollection.doc(enrollmentId).get();

    if (!enrollmentDoc.exists) {
        throw new Error("Enrollment not found");
    }

    return {
        id: enrollmentDoc.id,
        ...enrollmentDoc.data()
    };
};


module.exports = {
    enrollmentsCollection,
    createEnrollment,
    getAllEnrollments,
    getEnrollmentsByStudent,
    getEnrollmentsByUserId,
    getEnrollmentById,
    updateEnrollment
};