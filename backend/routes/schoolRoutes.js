const express = require("express");

const {
    updateStudentStatusController
} = require("../controllers/studentController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Update student active/inactive status
router.patch(
    "/:studentId/status",
    authMiddleware,
    roleMiddleware("admin"),
    updateStudentStatusController
);

module.exports = router;