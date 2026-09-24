const express = require("express");

const {
    createQuestion,
    getQuestions,
    getQuestionById,
    updateQuestion,
    deleteQuestion
} = require("../controllers/questionController");

const { validateQuestion } = require("../validators/questionValidator");
const validate = require("../middleware/validate");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Question bank management is admin-only
router.use(authMiddleware, roleMiddleware("admin"));

// Create question
router.post(
    "/",
    validateQuestion,
    validate,
    createQuestion
);

// Get questions
router.get("/", getQuestions);

// Get single question
router.get("/:id", getQuestionById);

// Update question
router.patch("/:id", updateQuestion);

// Delete question
router.delete("/:id", deleteQuestion);

module.exports = router;