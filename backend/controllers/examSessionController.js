const {
    startExamSession,
    saveAnswers,
    submitExam,
    getStudentExamResult,
    getExamParticipation
} = require("../services/examSessionService");

const { db } = require("../firebase/firebaseAdmin");

const studentsCollection = db.collection("students");
const examsCollection = db.collection("exams");
const programsCollection = db.collection("programs");

const toDate = (value) => {
    if (!value) return null;

    if (value instanceof Date) {
        return value;
    }

    if (typeof value.toDate === "function") {
        return value.toDate();
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

const startExam = async (req, res) => {
    try {
        const { examId } = req.body;

        if (!examId || !examId.trim()) {
            return res.status(400).json({
                success: false,
                message: "Exam ID is required"
            });
        }

        // Get the logged-in student's record
        const studentSnapshot = await studentsCollection
            .where("userId", "==", req.user.userId)
            .limit(1)
            .get();

        if (studentSnapshot.empty) {
            return res.status(404).json({
                success: false,
                message: "Student record not found"
            });
        }

        const studentDoc = studentSnapshot.docs[0];
        const student = studentDoc.data();

        const session = await startExamSession({
            studentId: studentDoc.id,
            userId: req.user.userId,
            examId,
            courseId: student.courseId
        });

        return res.status(201).json({
            success: true,
            message: "Exam started successfully",
            data: session
        });

    } catch (error) {
        console.error("Start exam error:", error);

        const knownErrors = [
    "Exam not found",
    "This exam is not currently active",
    "This exam is not available for your course",
    "This exam is not linked to a program",
    "Program not found",
    "The exam has not started yet",
    "The exam period has ended",
    "Student not found",
    "You are not actively enrolled in this course",
    "Not enough questions available",
    "You already have an active exam session",
    "You have already submitted this exam",
    "Exam schedule is not properly configured",
    "You are not allowed to start this exam"
];

        if (knownErrors.includes(error.message)) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        if (error.message.startsWith("Not enough questions available")) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to start exam"
        });
    }
};

const saveExamAnswers = async (req, res) => {
    try {
        const { answers } = req.body;
        const { id: sessionId } = req.params;

        if (!answers || typeof answers !== "object") {
            return res.status(400).json({
                success: false,
                message: "Answers are required"
            });
        }

        const result = await saveAnswers({
            sessionId,
            userId: req.user.userId,
            answers
        });

        return res.status(200).json({
            success: true,
            message: "Answers saved successfully",
            data: result
        });

    } catch (error) {
        console.error("Save answers error:", error);

        const knownErrors = [
            "Exam session not found",
            "You are not allowed to access this exam session",
            "This exam has already been submitted",
            "Exam time has expired"
        ];

        if (knownErrors.includes(error.message)) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to save answers"
        });
    }
};

const submitExamController = async (req, res) => {
    try {
        const { id: sessionId } = req.params;
        const { answers } = req.body;

        const result = await submitExam({
            sessionId,
            userId: req.user.userId,
            answers:
                answers && typeof answers === "object"
                    ? answers
                    : {}
        });

        return res.status(200).json({
            success: true,
            message: "Exam submitted successfully",
            data: result
        });

    } catch (error) {
        console.error("Submit exam error:", error);

        const knownErrors = [
            "Exam session not found",
            "You are not allowed to access this exam session",
            "This exam has already been submitted",
            "Exam time has expired"
        ];

        if (knownErrors.includes(error.message)) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to submit exam"
        });
    }
};

const getStudentResultController = async (req, res) => {
    try {
        const { id: sessionId } = req.params;

        const result = await getStudentExamResult({
            sessionId,
            userId: req.user.userId
        });

        return res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error("Get student result error:", error);

        const knownErrors = [
            "Exam session not found",
            "You are not allowed to access this exam result",
            "This exam has not been submitted yet",
            "Exam not found"
        ];

        if (knownErrors.includes(error.message)) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to load examination result"
        });
    }
};

const getExamParticipationController = async (req, res) => {
    try {
        const { examId } = req.params;

        const participation = await getExamParticipation(examId);

        return res.status(200).json({
            success: true,
            data: participation
        });

    } catch (error) {
        console.error("Get exam participation error:", error);

        if (error.message === "Exam not found") {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to fetch exam participation"
        });
    }
};

const getAvailableExam = async (req, res) => {
    try {
        const studentSnapshot = await studentsCollection
            .where("userId", "==", req.user.userId)
            .limit(1)
            .get();

        if (studentSnapshot.empty) {
            return res.status(404).json({
                success: false,
                message: "Student record not found"
            });
        }

        const student = studentSnapshot.docs[0].data();

        const examSnapshot = await examsCollection
            .where("courseId", "==", student.courseId)
            .get();

        const now = new Date();

        const availableExams = [];

        for (const examDoc of examSnapshot.docs) {
            const exam = examDoc.data();

            if (exam.status !== "active") {
                continue;
            }

            if (!exam.programId) {
                continue;
            }

            const programDoc = await programsCollection
                .doc(exam.programId)
                .get();

            if (!programDoc.exists) {
                continue;
            }

            const program = programDoc.data();

            const examStart = toDate(program.examStart);
            const examEnd = toDate(program.examEnd);

            if (!examStart || !examEnd) {
                continue;
            }

            if (now < examStart || now > examEnd) {
                continue;
            }

            availableExams.push({
                id: examDoc.id,
                title: exam.title,
                courseId: exam.courseId,
                programId: exam.programId,
                durationMinutes: exam.durationMinutes,
                questionCount: exam.questionCount
            });
        }

        return res.status(200).json({
            success: true,
            data: availableExams
        });

    } catch (error) {
        console.error("Get available exam error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to get available examination"
        });
    }
};

module.exports = {
    startExam,
    saveExamAnswers,
    submitExamController,
    getStudentResultController,
    getAvailableExam,
    getExamParticipationController
};
