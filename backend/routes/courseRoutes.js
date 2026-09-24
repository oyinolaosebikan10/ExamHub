const express = require("express");

const {
    createCourse,
    getAllCourses,
    getAvailableCourses
} = require("../controllers/courseController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Public course endpoint
|--------------------------------------------------------------------------
| Used by the student registration page.
|--------------------------------------------------------------------------
*/

router.get("/available", getAvailableCourses);

/*
|--------------------------------------------------------------------------
| Admin course management
|--------------------------------------------------------------------------
*/

router.use(authMiddleware, roleMiddleware("admin"));

// Create course
router.post("/", createCourse);

// Get all active courses
router.get("/", getAllCourses);

module.exports = router;