const {
    getResultsByExam,
    getAllResults
} = require("../services/resultService");

const getLeaderboard = async (req, res) => {
    try {
        const { examId } = req.params;

        if (!examId) {
            return res.status(400).json({
                success: false,
                message: "Exam ID is required"
            });
        }

        const results = await getResultsByExam(examId);

        const leaderboard = results.map((result, index) => ({
            rank: index + 1,
            studentId: result.studentId,
            fullName: result.fullName,
            registrationNumber: result.registrationNumber,
            score: result.score,
            totalMarks: result.totalMarks,
            percentage: result.percentage,
            submittedAt: result.submittedAt
        }));

        return res.status(200).json({
            success: true,
            data: leaderboard
        });

    } catch (error) {
        console.error("Leaderboard error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to get leaderboard"
        });
    }
};

const getAllResultsController = async (req, res) => {
    try {
        const {
    examId,
    courseId,
    studentId
} = req.query;

const results = await getAllResults({
    examId,
    courseId,
    studentId
});

        const formattedResults = results.map(result => ({
            id: result.id,
            studentId: result.studentId,
            fullName: result.fullName,
            registrationNumber: result.registrationNumber,
            examId: result.examId,
            courseId: result.courseId,
            enrollmentId: result.enrollmentId,
            score: result.score,
            totalMarks: result.totalMarks,
            percentage: result.percentage,
            submittedAt: result.submittedAt
        }));

        return res.status(200).json({
            success: true,
            data: formattedResults
        });

    } catch (error) {
        console.error("Get all results error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to get results"
        });
    }
};

module.exports = {
    getLeaderboard,
    getAllResultsController
};