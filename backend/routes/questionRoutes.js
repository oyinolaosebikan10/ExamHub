const express = require("express");

const {
    createQuestion,
    getQuestions,
    getQuestionById,
    updateQuestion,
    deleteQuestion
} = require("../controllers/questionController");

const { validateQuestion } = require("../validators/questionValidator");

const router = express.Router();

const validate = require("../middleware/validate");

router.post(
    "/",
    validateQuestion,
    validate,
    createQuestion
);

router.get("/", getQuestions);

router.get("/:id", getQuestionById);

router.patch("/:id", updateQuestion);

router.delete("/:id", deleteQuestion);

module.exports = router;