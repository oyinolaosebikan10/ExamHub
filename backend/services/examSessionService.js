const { createHash } = require("crypto");
const { db } = require("../firebase/firebaseAdmin");
const shuffleArray = require("../utils/shuffleArray");
const { createResult } = require("./resultService");
const {
    createAdminNotificationInTransaction
} = require("./adminNotificationService");

const examSessionsCollection = db.collection("examSessions");
const examsCollection = db.collection("exams");
const questionsCollection = db.collection("questions");
const enrollmentsCollection = db.collection("enrollments");
const studentsCollection = db.collection("students");
const programsCollection = db.collection("programs");
const retakeAuthorizationsCollection =
    db.collection("examRetakeAuthorizations");
const { isProgramActive } = require("./programService");

const hasCompleteOptions = (question) => {
    const optionKeys = ["A", "B", "C", "D"];

    return question.options &&
        typeof question.options === "object" &&
        !Array.isArray(question.options) &&
        optionKeys.every((key) =>
            typeof question.options[key] === "string" &&
            question.options[key].trim().length > 0
        );
};

const getExamAttemptControlRef = (studentId, examId) => {
    const controlId = createHash("sha256")
        .update(JSON.stringify([studentId, examId]))
        .digest("hex");

    return retakeAuthorizationsCollection
        .doc(`control_${controlId}`);
};

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

    if (!isProgramActive(program)) {
        throw new Error("Program is inactive");
    }

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

    // 6. Create only one attempt for this student and exam.
    const existingSessionQuery = examSessionsCollection
        .where("studentId", "==", studentId)
        .where("examId", "==", examId);
    const retakeAuthorizationQuery =
        retakeAuthorizationsCollection
            .where("studentId", "==", studentId);

    // 7. Get active questions
    const questionSnapshot = await questionsCollection
        .where("courseId", "==", courseId)
        .get();

    const questions = questionSnapshot.docs
        .map(doc => ({
            id: doc.id,
            ...doc.data()
        }))
        .filter(question =>
            question.isActive !== false &&
            hasCompleteOptions(question)
        );

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

    let attemptNumber = 1;
    let retakeAuthorizationId = null;

    await db.runTransaction(async transaction => {
        const [existingSessionSnapshot, controlDoc] =
            await Promise.all([
                transaction.get(existingSessionQuery),
                transaction.get(
                    getExamAttemptControlRef(studentId, examId)
                )
            ]);
        const existingSessions = existingSessionSnapshot.docs
            .map(doc => doc.data());

        if (existingSessions.some(session =>
            session.status === "in-progress"
        )) {
            throw new Error(
                "You already have an active session for this exam"
            );
        }

        if (existingSessions.length > 0) {
            const authorizationSnapshot =
                await transaction.get(retakeAuthorizationQuery);
            const authorizationDoc =
                authorizationSnapshot.docs.find(doc =>
                    doc.data().examId === examId &&
                    doc.data().status === "authorized"
                );
            const hasCompletedAttempt =
                existingSessions.some(session =>
                    session.status === "submitted"
                );

            if (!hasCompletedAttempt) {
                throw new Error(
                    "You have already attempted this exam"
                );
            }

            if (!authorizationDoc) {
                const hasConsumedAuthorization =
                    authorizationSnapshot.docs.some(doc =>
                        doc.data().examId === examId &&
                        doc.data().status === "consumed"
                    );

                if (hasConsumedAuthorization) {
                    throw new Error(
                        "The retake authorization has already been consumed"
                    );
                }

                throw new Error(
                    "You have already submitted this exam. A retake has not been authorized."
                );
            }

            attemptNumber = existingSessions.length + 1;
            retakeAuthorizationId = authorizationDoc.id;
            transaction.update(authorizationDoc.ref, {
                status: "consumed",
                consumedAt: startedAt,
                consumedBySessionId: sessionRef.id,
                attemptNumber
            });
        }

        sessionData.attemptNumber = attemptNumber;
        sessionData.isRetake = attemptNumber > 1;
        sessionData.retakeAuthorizationId =
            retakeAuthorizationId;
        const controlRef =
            getExamAttemptControlRef(studentId, examId);
        const controlData =
            controlDoc.exists ? controlDoc.data() : {};

        transaction.set(controlRef, {
            studentId,
            examId,
            recordType: "pair-control",
            revision: (Number(controlData.revision) || 0) + 1,
            createdAt: controlData.createdAt || startedAt,
            updatedAt: startedAt
        });
        transaction.create(sessionRef, sessionData);
    });

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
        attemptNumber,
        isRetake: attemptNumber > 1,
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
        attemptNumber: latestSession.attemptNumber || 1,
        isRetake: latestSession.isRetake === true,
        retakeAuthorizationId:
            latestSession.retakeAuthorizationId || null,
        submittedAt: now
    });

    const examDoc = await examsCollection
        .doc(latestSession.examId)
        .get();
    const examTitle = examDoc.exists
        ? examDoc.data().title || "examination"
        : "examination";

    await db.runTransaction(async transaction => {
        const currentSessionDoc =
            await transaction.get(sessionRef);

        if (!currentSessionDoc.exists) {
            throw new Error("Exam session not found");
        }

        await createAdminNotificationInTransaction(
            transaction,
            {
                eventKey: `exam-submitted:${sessionId}`,
                type: autoSubmitted
                    ? "exam-auto-submitted"
                    : "exam-submitted",
                title: autoSubmitted
                    ? "Examination automatically submitted"
                    : "Examination submitted",
                message: `${latestSession.fullName || "A student"} ${autoSubmitted ? "was automatically submitted for" : "submitted"} ${examTitle}.`,
                targetUrl: "./results.html",
                createdAt: now
            }
        );

        transaction.update(sessionRef, {
            status: "submitted",
            submittedAt: now,
            updatedAt: now,
            score,
            totalMarks,
            percentage,
            autoSubmitted
        });
    });

    return {
        sessionId,
        submittedAt: now,
        status: "submitted",
        autoSubmitted
    };
};

const getStudentExamResult = async ({
    sessionId,
    userId
}) => {

    const sessionDoc = await examSessionsCollection
        .doc(sessionId)
        .get();

    if (!sessionDoc.exists) {
        throw new Error("Exam session not found");
    }

    const session = sessionDoc.data();

    if (session.userId !== userId) {
        throw new Error(
            "You are not allowed to access this exam result"
        );
    }

    if (session.status !== "submitted") {
        throw new Error(
            "This exam has not been submitted yet"
        );
    }

    if (!session.enrollmentId) {
        throw new Error("Results not released");
    }

    const enrollmentDoc = await enrollmentsCollection
        .doc(session.enrollmentId)
        .get();

    if (!enrollmentDoc.exists) {
        throw new Error("Results not released");
    }

    const enrollment = enrollmentDoc.data();

    if (!enrollment.programId) {
        throw new Error("Results not released");
    }

    const programDoc = await programsCollection
        .doc(enrollment.programId)
        .get();

    if (
        !programDoc.exists ||
        programDoc.data().resultVisibility !== "visible"
    ) {
        throw new Error("Results not released");
    }

    const examDoc = await examsCollection
        .doc(session.examId)
        .get();

    if (!examDoc.exists) {
        throw new Error("Exam not found");
    }

    const exam = examDoc.data();

    return {
        sessionId,
        examId: session.examId,
        examTitle: exam.title || "Examination",

        fullName: session.fullName,
        registrationNumber: session.registrationNumber,
        courseId: session.courseId,

        score: Number(session.score) || 0,
        totalMarks: Number(session.totalMarks) || 0,
        percentage: Number(session.percentage) || 0,

        submittedAt: session.submittedAt || null,
        autoSubmitted: session.autoSubmitted === true,

        status: session.status
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

const getStudentExamAttemptStatuses = async (studentId) => {
    const [sessionSnapshot, authorizationSnapshot] =
        await Promise.all([
            examSessionsCollection
                .where("studentId", "==", studentId)
                .get(),
            retakeAuthorizationsCollection
                .where("studentId", "==", studentId)
                .get()
        ]);

    const attemptStatuses = {};
    const statusPriority = {
        attempted: 1,
        "in-progress": 2,
        submitted: 3
    };

    sessionSnapshot.docs.forEach(doc => {
        const session = doc.data();
        if (!session.examId) {
            return;
        }

        const status = session.status === "submitted"
            ? "submitted"
            : session.status === "in-progress"
                ? "in-progress"
                : "attempted";
        const existingStatus =
            attemptStatuses[session.examId]?.status;

        if (
            !existingStatus ||
            statusPriority[status] > statusPriority[existingStatus]
        ) {
            attemptStatuses[session.examId] = {
                status,
                retakeAuthorized: false
            };
        }
    });

    authorizationSnapshot.docs.forEach(doc => {
        const authorization = doc.data();

        if (
            authorization.status === "authorized" &&
            attemptStatuses[authorization.examId]
        ) {
            attemptStatuses[authorization.examId].retakeAuthorized =
                true;
        }
    });

    return attemptStatuses;
};

const authorizeStudentExamRetake = async ({
    studentId,
    examId,
    adminUserId
}) => {
    const [studentDoc, examDoc] = await Promise.all([
        studentsCollection.doc(studentId).get(),
        examsCollection.doc(examId).get()
    ]);

    if (!studentDoc.exists) {
        throw new Error("Student not found");
    }

    if (!examDoc.exists) {
        throw new Error("Exam not found");
    }

    const student = studentDoc.data();
    const exam = examDoc.data();

    if (student.userId === adminUserId) {
        throw new Error(
            "You cannot authorize a retake for your own student account"
        );
    }

    if (student.courseId !== exam.courseId) {
        throw new Error(
            "This exam is not available for the student's course"
        );
    }

    const existingSessionQuery = examSessionsCollection
        .where("studentId", "==", studentId)
        .where("examId", "==", examId);
    const existingAuthorizationQuery =
        retakeAuthorizationsCollection
            .where("studentId", "==", studentId);
    const authorizationRef =
        retakeAuthorizationsCollection.doc();
    const authorizedAt = new Date();
    const controlRef =
        getExamAttemptControlRef(studentId, examId);

    await db.runTransaction(async transaction => {
        const [sessionSnapshot, authorizationSnapshot, controlDoc] =
            await Promise.all([
                transaction.get(existingSessionQuery),
                transaction.get(existingAuthorizationQuery),
                transaction.get(controlRef)
            ]);
        const sessions = sessionSnapshot.docs
            .map(doc => doc.data());

        if (sessions.some(session =>
            session.status === "in-progress"
        )) {
            throw new Error(
                "The student has an examination session in progress"
            );
        }

        if (!sessions.some(session =>
            session.status === "submitted"
        )) {
            throw new Error(
                "The student has no completed attempt for this exam"
            );
        }

        if (authorizationSnapshot.docs.some(doc =>
            doc.data().examId === examId &&
            doc.data().status === "authorized"
        )) {
            throw new Error(
                "A retake is already authorized for this student and exam"
            );
        }

        const controlData =
            controlDoc.exists ? controlDoc.data() : {};
        await createAdminNotificationInTransaction(
            transaction,
            {
                eventKey:
                    `exam-retake-authorized:${authorizationRef.id}`,
                type: "exam-retake-authorized",
                title: "Exam retake authorized",
                message: `${student.fullName || "A student"} was authorized to retake ${exam.title || "an examination"}.`,
                targetUrl: "./results.html",
                createdAt: authorizedAt
            }
        );
        transaction.set(controlRef, {
            studentId,
            examId,
            recordType: "pair-control",
            revision: (Number(controlData.revision) || 0) + 1,
            createdAt: controlData.createdAt || authorizedAt,
            updatedAt: authorizedAt
        });
        transaction.create(authorizationRef, {
            studentId,
            examId,
            authorizedBy: adminUserId,
            status: "authorized",
            createdAt: authorizedAt,
            consumedAt: null,
            consumedBySessionId: null,
            attemptNumber: null
        });
    });

    return {
        authorizationId: authorizationRef.id,
        studentId,
        examId,
        status: "authorized",
        createdAt: authorizedAt
    };
};


module.exports = {
    examSessionsCollection,
    startExamSession,
    saveAnswers,
    submitExam,
    getStudentExamResult,
    getExamParticipation,
    getStudentExamAttemptStatuses,
    authorizeStudentExamRetake
};