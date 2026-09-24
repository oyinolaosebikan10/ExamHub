const express = require("express");

const {
    getAllStudents,
    getSingleStudent,
    updateStudentStatusController,
    getMyProfileController
} = require("../controllers/studentController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Student's own profile
|--------------------------------------------------------------------------
*/

router.get(
    "/me",
    authMiddleware,
    roleMiddleware("student"),
    getMyProfileController
);

/*
|--------------------------------------------------------------------------
| Admin student management
|--------------------------------------------------------------------------
*/

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

// Get single student
router.get(
    "/:studentId",
    authMiddleware,
    roleMiddleware("admin"),
    getSingleStudent
);

module.exports = router;