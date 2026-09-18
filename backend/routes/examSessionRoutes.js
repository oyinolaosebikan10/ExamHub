const express = require("express");

const {
    startExam,
    saveExamAnswers,
    submitExamController,
    getExamParticipationController
} = require("../controllers/examSessionController");


const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const{ examSubmitLimiter } = require("../config/rateLimiter");

const router = express.Router();

router.post(
    "/",
    authMiddleware,
    roleMiddleware("student"),
    startExam
);

router.get(
    "/exam/:examId/participation",
    authMiddleware,
    roleMiddleware("admin"),
    getExamParticipationController
);

router.patch(
    "/:id/answers",
    authMiddleware,
    roleMiddleware("student"),
    saveExamAnswers
);

router.post(
    "/:id/submit",
    authMiddleware,
    roleMiddleware("student"),
    examSubmitLimiter,
    submitExamController
);

module.exports = router;