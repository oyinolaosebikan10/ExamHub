const {
    createExam,
    getExams,
    getExamById,
    cancelExam
} = require("../services/examService");


const createExamController = async (req, res) => {
    try {
        const {
            title,
            programId,
            courseId,
            durationMinutes,
            questionCount
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Exam title is required"
            });
        }

        if (!programId || !programId.trim()) {
            return res.status(400).json({
                success: false,
                message: "Program is required"
            });
        }

        if (!courseId || !courseId.trim()) {
            return res.status(400).json({
                success: false,
                message: "Course is required"
            });
        }

        const exam = await createExam({
            title,
            programId,
            courseId,
            durationMinutes,
            questionCount
        });

        return res.status(201).json({
            success: true,
            message: "Exam created successfully",
            data: exam
        });

    } catch (error) {
        console.error("Create exam error:", error);

        if (error.message === "Program not found" ||
            error.message === "Selected course does not exist" ||
            error.message === "Exam duration must be a positive whole number" ||
            error.message === "Question count must be a positive whole number"
        ) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to create exam"
        });
    }
};


const getAllExams = async (req, res) => {
    try {
        const exams = await getExams();

        return res.status(200).json({
            success: true,
            data: exams
        });

    } catch (error) {
        console.error("Get exams error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to get exams"
        });
    }
};


const getSingleExam = async (req, res) => {
    try {
        const exam = await getExamById(req.params.id);

        return res.status(200).json({
            success: true,
            data: exam
        });

    } catch (error) {
        console.error("Get exam error:", error);

        if (error.message === "Exam not found") {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to get exam"
        });
    }
};

const cancelExamController = async (req, res) => {
    try {
        const { examId } = req.params;

        const exam = await cancelExam(examId);

        return res.status(200).json({
            success: true,
            message: "Exam cancelled successfully",
            data: exam
        });

    } catch (error) {
        console.error("Cancel exam error:", error);

        if (
            error.message === "Exam not found" ||
            error.message === "Exam is already cancelled"
        ) {
            return res.status(
                error.message === "Exam not found"
                    ? 404
                    : 400
            ).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to cancel exam"
        });
    }
};


module.exports = {
    createExamController,
    getAllExams,
    getSingleExam,
    cancelExamController
};