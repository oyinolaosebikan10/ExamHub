const { body } = require("express-validator");

const validateUpdatedQuestionOptions = body("options")
    .if((_value, { req }) =>
        req.body &&
        Object.prototype.hasOwnProperty.call(req.body, "options")
    )
    .custom((options) =>
        options &&
        typeof options === "object" &&
        !Array.isArray(options) &&
        ["A", "B", "C", "D"].every((key) =>
            typeof options[key] === "string" &&
            options[key].trim().length > 0
        )
    )
    .withMessage("Options A, B, C, and D are required");

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

const validateQuestionUpdate = [
    validateUpdatedQuestionOptions
];

module.exports = {
    validateQuestion,
    validateQuestionUpdate
};