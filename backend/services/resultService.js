const { db } = require("../firebase/firebaseAdmin");

const resultsCollection = db.collection("results");

const createResult = async ({
    sessionId,
    studentId,
    userId,
    examId,
    courseId,
    enrollmentId,
    fullName,
    registrationNumber,
    score,
    totalMarks,
    percentage,
    submittedAt
}) => {

    // Use sessionId as the result document ID.
    // This prevents duplicate results for the same exam session.
    const resultRef = resultsCollection.doc(sessionId);

    const resultData = {
        sessionId,
        studentId,
        userId,
        examId,
        courseId,
        enrollmentId: enrollmentId || null,
        fullName,
        registrationNumber,
        score,
        totalMarks,
        percentage,
        submittedAt,
        createdAt: new Date()
    };

    await resultRef.set(resultData);

    return {
        id: resultRef.id,
        ...resultData
    };
};

const getResultsByExam = async (examId) => {

    const snapshot = await resultsCollection
        .where("examId", "==", examId)
        .get();

    const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    // Highest score first
    results.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }

        // If scores are tied, higher percentage comes first
        return b.percentage - a.percentage;
    });

    return results;
};

const getAllResults = async ({
    examId,
    courseId,
    studentId
} = {}) => {

    let query = resultsCollection;

    if (examId) {
        query = query.where("examId", "==", examId);
    }

    if (courseId) {
        query = query.where("courseId", "==", courseId);
    }

    if (studentId) {
        query = query.where("studentId", "==", studentId);
    }

    const snapshot = await query.get();

    const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    results.sort((a, b) => {
        const dateA = a.submittedAt?.toDate
            ? a.submittedAt.toDate()
            : new Date(a.submittedAt);

        const dateB = b.submittedAt?.toDate
            ? b.submittedAt.toDate()
            : new Date(b.submittedAt);

        return dateB - dateA;
    });

    return results;
};

module.exports = {
    resultsCollection,
    createResult,
    getResultsByExam,
    getAllResults
};