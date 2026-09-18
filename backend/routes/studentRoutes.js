const express = require("express");

const {
    getAllStudents,
    getSingleStudent,
    updateStudentStatusController
} = require("../controllers/studentController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Get all students
router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    getAllStudents
);

// Update student active/inactive status
router.patch(
    "/:studentId/status",
    authMiddleware,
    roleMiddleware("admin"),
    updateStudentStatusController
);

router.get(
    "/:studentId",
    authMiddleware,
    roleMiddleware("admin"),
    getSingleStudent
);

module.exports = router;