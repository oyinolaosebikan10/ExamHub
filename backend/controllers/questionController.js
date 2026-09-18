const questionService = require("../services/questionService");

const createQuestion = async (req, res) => {
    try {
        const question = await questionService.createQuestion(req.body);

        res.status(201).json({
            success: true,
            message: "Question created successfully",
            data: question
        });

    } catch (error) {
        console.error("Create question error:", error);

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const getQuestions = async (req, res) => {
    try {
        const { courseId } = req.query;

        const questions = await questionService.getQuestions(courseId);

        res.json({
            success: true,
            data: questions
        });

    } catch (error) {
        console.error("Get questions error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve questions"
        });
    }
};

const getQuestionById = async (req, res) => {
    try {
        const question = await questionService.getQuestionById(
            req.params.id
        );

        res.json({
            success: true,
            data: question
        });

    } catch (error) {
        console.error("Get question error:", error);

        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

const updateQuestion = async (req, res) => {
    try {
        const question = await questionService.updateQuestion(
            req.params.id,
            req.body
        );

        res.json({
            success: true,
            message: "Question updated successfully",
            data: question
        });

    } catch (error) {
        console.error("Update question error:", error);

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const deleteQuestion = async (req, res) => {
    try {
        await questionService.deleteQuestion(req.params.id);

        res.json({
            success: true,
            message: "Question deleted successfully"
        });

    } catch (error) {
        console.error("Delete question error:", error);

        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createQuestion,
    getQuestions,
    getQuestionById,
    updateQuestion,
    deleteQuestion
};