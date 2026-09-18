const { body } = require("express-validator");

const validateQuestion = [
    body("courseId")
        .trim()
        .notEmpty()
        .withMessage("Course is required"),

    body("question")
        .trim()
        .notEmpty()
        .withMessage("Question is required"),

    body("options.A")
        .trim()
        .notEmpty()
        .withMessage("Option A is required"),

    body("options.B")
        .trim()
        .notEmpty()
        .withMessage("Option B is required"),

    body("options.C")
        .trim()
        .notEmpty()
        .withMessage("Option C is required"),

    body("options.D")
        .trim()
        .notEmpty()
        .withMessage("Option D is required"),

    body("correctAnswer")
        .trim()
        .isIn(["A", "B", "C", "D"])
        .withMessage("Correct answer must be A, B, C, or D"),

    body("marks")
        .isInt({ min: 1 })
        .withMessage("Marks must be a positive number")
];

module.exports = {
    validateQuestion
};