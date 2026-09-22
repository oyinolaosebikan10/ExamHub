const { db } = require("../firebase/firebaseAdmin");
const shuffleArray = require("../utils/shuffleArray");
const { createResult } = require("./resultService");

const examSessionsCollection = db.collection("examSessions");
const examsCollection = db.collection("exams");
const questionsCollection = db.collection("questions");
const enrollmentsCollection = db.collection("enrollments");
const studentsCollection = db.collection("students");
const programsCollection = db.collection("programs");

const toDate = (value) => {
    if (!value) return null;

    if (typeof value.toDate === "function") {
        return value.toDate();
    }

    if (value instanceof Date) {
        return value;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
};

const startExamSession = async ({
    studentId,
    userId,
    examId,
    courseId
}) => {

    // 1. Get exam
    const examDoc = await examsCollection
        .doc(examId)
        .get();

    if (!examDoc.exists) {
        throw new Error("Exam not found");
    }

    const exam = examDoc.data();

    if (exam.status !== "active") {
        throw new Error("This exam is not currently active");
    }

    // 2. Make sure exam belongs to a program
    const programId = exam.programId;

    if (!programId) {
        throw new Error("This exam is not linked to a program");
    }

    const programDoc = await programsCollection
        .doc(programId)
        .get();

    if (!programDoc.exists) {
        throw new Error("Program not found");
    }

    const program = programDoc.data();

    const now = new Date();

    const examStart = toDate(program.examStart);
    const examEnd = toDate(program.examEnd);

    if (!examStart || !examEnd) {
        throw new Error("Exam schedule is not properly configured");
    }

    if (now < examStart) {
        throw new Error("The exam has not started yet");
    }

    if (now > examEnd) {
        throw new Error("The exam period has ended");
    }

    // 3. Make sure exam belongs to student's course
    if (exam.courseId !== courseId) {
        throw new Error("This exam is not available for your course");
    }

    // 4. Get student
    const studentDoc = await studentsCollection
        .doc(studentId)
        .get();

    if (!studentDoc.exists) {
        throw new Error("Student not found");
    }

    const student = studentDoc.data();

    // Make sure the logged-in user actually owns this student record
    if (student.userId !== userId) {
        throw new Error("You are not allowed to start this exam");
    }

    // 5. Find active enrollment
    const enrollmentSnapshot = await enrollmentsCollection
        .where("studentId", "==", studentId)
        .where("programId", "==", programId)
        .where("courseId", "==", courseId)
        .where("status", "==", "active")
        .limit(1)
        .get();

    if (enrollmentSnapshot.empty) {
        throw new Error(
            "You are not actively enrolled in this course"
        );
    }

    const enrollmentDoc = enrollmentSnapshot.docs[0];

    const enrollment = {
        id: enrollmentDoc.id,
        ...enrollmentDoc.data()
    };

    // 6. Prevent multiple active sessions
    const existingSessionSnapshot = await examSessionsCollection
        .where("studentId", "==", studentId)
        .where("examId", "==", examId)
        .where("status", "==", "in-progress")
        .limit(1)
        .get();

    if (!existingSessionSnapshot.empty) {
        throw new Error(
            "You already have an active session for this exam"
        );
    }

    // 7. Get active questions
    const questionSnapshot = await questionsCollection
        .where("courseId", "==", courseId)
        .get();

    const questions = questionSnapshot.docs
        .map(doc => ({
            id: doc.id,
            ...doc.data()
        }))
        .filter(question => question.isActive !== false);

    // 8. Make sure there are enough questions
    if (questions.length < exam.questionCount) {
        throw new Error(
            `Not enough questions available. Required: ${exam.questionCount}, Available: ${questions.length}`
        );
    }

    // 9. Randomly select questions
    const shuffledQuestions = shuffleArray(questions);

    const selectedQuestions = shuffledQuestions.slice(
        0,
        exam.questionCount
    );

    const questionIds = selectedQuestions.map(
        question => question.id
    );

    // 10. Set individual exam timing
    const startedAt = new Date();

    const expiresAt = new Date(
        startedAt.getTime() +
        exam.durationMinutes * 60 * 1000
    );

    // 11. Create session
    const sessionRef = examSessionsCollection.doc();

    const sessionData = {
        studentId,
        userId,
        examId,
        programId,
        courseId,

        enrollmentId: enrollment.id,

        fullName: student.fullName,
        registrationNumber: student.registrationNumber,

        questionIds,
        answers: {},

        startedAt,
        expiresAt,

        status: "in-progress",
        submittedAt: null,

        createdAt: startedAt,
        updatedAt: startedAt
    };

    await sessionRef.set(sessionData);

    // 12. Never send correct answers to the student
    const studentQuestions = selectedQuestions.map(question => {
        const {
            correctAnswer,
            ...safeQuestion
        } = question;

        return safeQuestion;
    });

    return {
        sessionId: sessionRef.id,
        examId,
        startedAt,
        expiresAt,
        durationMinutes: exam.durationMinutes,
        questions: studentQuestions
    };
};


const saveAnswers = async ({
    sessionId,
    userId,
    answers
}) => {

    const sessionRef = examSessionsCollection.doc(sessionId);

    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
        throw new Error("Exam session not found");
    }

    const session = sessionDoc.data();

    if (session.userId !== userId) {
        throw new Error(
            "You are not allowed to access this exam session"
        );
    }

    if (session.status === "submitted") {
        throw new Error("This exam has already been submitted");
    }

    const expiresAt = toDate(session.expiresAt);

    if (!expiresAt) {
        throw new Error("Exam session expiry is invalid");
    }

    const now = new Date();

    if (now >= expiresAt) {
        throw new Error("Exam time has expired");
    }

    await sessionRef.update({
        answers,
        updatedAt: now
    });

    return {
        sessionId,
        answers
    };
};


const submitExam = async ({
    sessionId,
    userId,
    answers = {}
}) => {

    const sessionRef = examSessionsCollection.doc(sessionId);

    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
        throw new Error("Exam session not found");
    }

    const session = sessionDoc.data();

    if (session.userId !== userId) {
        throw new Error(
            "You are not allowed to access this exam session"
        );
    }

    if (session.status === "submitted") {
        throw new Error(
            "This exam has already been submitted"
        );
    }

    const now = new Date();

    const expiresAt = toDate(session.expiresAt);

    if (!expiresAt) {
        throw new Error("Exam session expiry is invalid");
    }

    /*
     * The server decides whether this is an automatic submission
     * based on the individual session expiry time.
     */
    const autoSubmitted = now >= expiresAt;

    /*
     * Re-read the session immediately before grading.
     * This reduces the chance of processing stale session data.
     */
    const latestSessionDoc = await sessionRef.get();

    if (!latestSessionDoc.exists) {
        throw new Error("Exam session not found");
    }

    const latestSession = latestSessionDoc.data();

    if (latestSession.status === "submitted") {
        throw new Error(
            "This exam has already been submitted"
        );
    }

    // Only grade questions assigned to this session.
    const questionIds = Array.isArray(latestSession.questionIds)
        ? latestSession.questionIds
        : [];

    if (questionIds.length === 0) {
        throw new Error(
            "No questions were assigned to this exam session"
        );
    }

    const questionDocs = await Promise.all(
        questionIds.map(questionId =>
            questionsCollection.doc(questionId).get()
        )
    );

    const questions = questionDocs
        .filter(doc => doc.exists)
        .map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

    if (questions.length !== questionIds.length) {
        throw new Error(
            "One or more exam questions could not be found"
        );
    }

    /*
     * Use the answers supplied with the submission when available.
     * This prevents the final answer from being lost because a
     * debounced save happened too close to exam expiry.
     *
     * If no answers were supplied, fall back to the answers already
     * stored in Firestore.
     */
    const submittedAnswers =
        answers && typeof answers === "object"
            ? answers
            : latestSession.answers || {};

    let score = 0;
    let totalMarks = 0;

    questions.forEach(question => {

        const marks = Number(question.marks) || 1;

        totalMarks += marks;

        const studentAnswer = submittedAnswers[question.id];

        if (
            studentAnswer !== undefined &&
            studentAnswer !== null &&
            studentAnswer === question.correctAnswer
        ) {
            score += marks;
        }
    });

    const percentage = totalMarks > 0
        ? Math.round((score / totalMarks) * 100)
        : 0;

    /*
     * Save the final answers before creating the result.
     * This means Firestore contains the actual answers that were
     * graded.
     */
    await sessionRef.update({
        answers: submittedAnswers,
        updatedAt: now
    });

    /*
     * Create the result using the session ID as the result document ID.
     */
    await createResult({
        sessionId,
        studentId: latestSession.studentId,
        userId: latestSession.userId,
        examId: latestSession.examId,
        courseId: latestSession.courseId,
        enrollmentId: latestSession.enrollmentId || null,
        fullName: latestSession.fullName,
        registrationNumber: latestSession.registrationNumber,
        score,
        totalMarks,
        percentage,
        submittedAt: now
    });

    // Mark session as submitted.
    await sessionRef.update({
        status: "submitted",
        submittedAt: now,
        updatedAt: now,
        score,
        totalMarks,
        percentage,
        autoSubmitted
    });

    return {
        sessionId,
        submittedAt: now,
        status: "submitted",
        autoSubmitted
    };
};


const getExamParticipation = async (examId) => {

    const examDoc = await examsCollection
        .doc(examId)
        .get();

    if (!examDoc.exists) {
        throw new Error("Exam not found");
    }

    const exam = examDoc.data();

    const enrollmentSnapshot = await enrollmentsCollection
        .where("programId", "==", exam.programId)
        .where("courseId", "==", exam.courseId)
        .get();

    const participants = [];

    for (const enrollmentDoc of enrollmentSnapshot.docs) {

        const enrollment = enrollmentDoc.data();

        if (enrollment.status !== "active") {
            continue;
        }

        const studentDoc = await studentsCollection
            .doc(enrollment.studentId)
            .get();

        if (!studentDoc.exists) {
            continue;
        }

        const student = studentDoc.data();

        const sessionSnapshot = await examSessionsCollection
            .where("studentId", "==", enrollment.studentId)
            .where("examId", "==", examId)
            .limit(1)
            .get();

        let participationStatus = "not-started";
        let session = null;

        if (!sessionSnapshot.empty) {

            session = {
                id: sessionSnapshot.docs[0].id,
                ...sessionSnapshot.docs[0].data()
            };

            if (session.status === "submitted") {

                participationStatus = "submitted";

            } else if (session.status === "in-progress") {

                const expiresAt = toDate(session.expiresAt);

                if (expiresAt && new Date() >= expiresAt) {
                    participationStatus = "expired";
                } else {
                    participationStatus = "in-progress";
                }
            }
        }

        participants.push({
            studentId: enrollment.studentId,
            enrollmentId: enrollmentDoc.id,

            fullName: student.fullName,
            registrationNumber: student.registrationNumber,

            courseId: enrollment.courseId,

            status: participationStatus,

            startedAt: session?.startedAt || null,
            submittedAt: session?.submittedAt || null,

            autoSubmitted: session?.autoSubmitted || false
        });
    }

    return {
        examId,
        participants
    };
};


module.exports = {
    examSessionsCollection,
    startExamSession,
    saveAnswers,
    submitExam,
    getExamParticipation
};