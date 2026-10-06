const express = require("express");

const {
    createEnrollmentController,
    getAllEnrollmentsController,
    getStudentEnrollmentsController,
    getMyEnrollmentsController,
    getSingleEnrollmentController,
    updateEnrollmentController,
    deactivateEnrollmentController,
    reactivateEnrollmentController,
    deleteEnrollmentController
} = require("../controllers/enrollmentController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();


// Admin creates an enrollment
router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    createEnrollmentController
);


// Admin gets all enrollments
router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    getAllEnrollmentsController
);


// Get enrollments for one student
router.get(
    "/student/:studentId",
    authMiddleware,
    roleMiddleware("admin"),
    getStudentEnrollmentsController
);

router.get(
    "/me",
    authMiddleware,
    roleMiddleware("student"),
    getMyEnrollmentsController
);

// Admin manages enrollment lifecycle
router.patch(
    "/:id/deactivate",
    authMiddleware,
    roleMiddleware("admin"),
    deactivateEnrollmentController
);

router.patch(
    "/:id/reactivate",
    authMiddleware,
    roleMiddleware("admin"),
    reactivateEnrollmentController
);

router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    deleteEnrollmentController
);

// Get one enrollment
router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    getSingleEnrollmentController
);


// Admin updates enrollment
router.patch(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    updateEnrollmentController
);


module.exports = router;