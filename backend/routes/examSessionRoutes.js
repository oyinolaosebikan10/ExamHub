const express = require("express");

const {
    startExam,
    saveExamAnswers,
    submitExamController,
    getStudentResultController,
    getExamParticipationController,
    getAvailableExam
} = require("../controllers/examSessionController");


const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const{ examSubmitLimiter } = require("../config/rateLimiter");

const router = express.Router();

router.get(
    "/available",
    authMiddleware,
    roleMiddleware("student"),
    getAvailableExam
);

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

router.get(
    "/:id/result",
    authMiddleware,
    roleMiddleware("student"),
    getStudentResultController
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