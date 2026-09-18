const express = require("express");

const {
    createExamController,
    getAllExams,
    getSingleExam,
    cancelExamController
} = require("../controllers/examController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    getAllExams
);

router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    createExamController
);

router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    getSingleExam
);

router.patch(
    "/:examId/cancel",
    authMiddleware,
    roleMiddleware("admin"),
    cancelExamController
);

module.exports = router;