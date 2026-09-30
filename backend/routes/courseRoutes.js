const express = require("express");

const {
    createCourse,
    getAllCourses,
    getCourseById,
    updateCourse,
    deactivateCourse,
    activateCourse,
    deleteCourse,
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


/*
|--------------------------------------------------------------------------
| Course collection
|--------------------------------------------------------------------------
*/

// Create course
router.post("/", createCourse);

// Get all courses
router.get("/", getAllCourses);


/*
|--------------------------------------------------------------------------
| Single course
|--------------------------------------------------------------------------
*/

// Get single course
router.get("/:id", getCourseById);

// Update course
router.patch("/:id", updateCourse);

// Deactivate course
router.patch("/:id/deactivate", deactivateCourse);

// Reactivate course
router.patch("/:id/activate", activateCourse);

// Permanently delete course
router.delete("/:id", deleteCourse);


module.exports = router;