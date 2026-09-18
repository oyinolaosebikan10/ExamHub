const { db } = require("../firebase/firebaseAdmin");

const examsCollection = db.collection("exams");
const coursesCollection = db.collection("courses");
const programsCollection = db.collection("programs");
const questionsCollection = db.collection("questions");

const createExam = async ({
    title,
    programId,
    courseId,
    durationMinutes,
    questionCount
}) => {

    const programDoc = await programsCollection
    .doc(programId)
    .get();

    if (!programDoc.exists) {
    throw new Error("Program not found");
}

    // Check that the course exists
    const courseDoc = await coursesCollection
        .doc(courseId)
        .get();

    if (!courseDoc.exists) {
        throw new Error("Selected course does not exist");
    }

    if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0
) {
    throw new Error(
        "Exam duration must be a positive whole number"
    );
}

if (
    !Number.isInteger(questionCount) ||
    questionCount <= 0
) {
    throw new Error(
        "Question count must be a positive whole number"
    );
}

const questionSnapshot = await questionsCollection
    .where("courseId", "==", courseId)
    .where("isActive", "==", true)
    .get();

if (questionSnapshot.size < questionCount) {
    throw new Error(
        `Not enough active questions available. Only ${questionSnapshot.size} questions are available for this course.`
    );
}

    const examRef = examsCollection.doc();

    const examData = {
        title: title.trim(),
        programId,
        courseId,
        durationMinutes,
        questionCount,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
    };

    await examRef.set(examData);

    return {
        id: examRef.id,
        ...examData
    };
};


const getExams = async () => {
    const snapshot = await examsCollection.get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};


const getExamById = async (examId) => {
    const examDoc = await examsCollection
        .doc(examId)
        .get();

    if (!examDoc.exists) {
        throw new Error("Exam not found");
    }

    return {
        id: examDoc.id,
        ...examDoc.data()
    };
};

const cancelExam = async (examId) => {
    const examRef = examsCollection.doc(examId);

    const examDoc = await examRef.get();

    if (!examDoc.exists) {
        throw new Error("Exam not found");
    }

    const exam = examDoc.data();

    if (exam.status === "cancelled") {
        throw new Error("Exam is already cancelled");
    }

    await examRef.update({
        status: "cancelled",
        updatedAt: new Date()
    });

    const updatedDoc = await examRef.get();

    return {
        id: updatedDoc.id,
        ...updatedDoc.data()
    };
};


module.exports = {
    examsCollection,
    createExam,
    getExams,
    getExamById,
    cancelExam
};