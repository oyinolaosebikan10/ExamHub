const express = require("express");

const {

    getAllStudents,

    getSingleStudent,

    updateStudentStatusController,

    getMyProfileController

} = require("../controllers/studentController");

const authMiddleware =
    require("../middleware/authMiddleware");

const roleMiddleware =
    require("../middleware/roleMiddleware");

const router =
    express.Router();


// =========================================================
// STUDENT SELF PROFILE
// =========================================================

router.get(

    "/me",

    authMiddleware,

    roleMiddleware("student"),

    getMyProfileController

);


// =========================================================
// ADMIN — GET ALL STUDENTS
// =========================================================

router.get(

    "/",

    authMiddleware,

    roleMiddleware("admin"),

    getAllStudents

);


// =========================================================
// ADMIN — UPDATE STUDENT STATUS
// =========================================================

router.patch(

    "/:studentId/status",

    authMiddleware,

    roleMiddleware("admin"),

    updateStudentStatusController

);


// =========================================================
// ADMIN — GET SINGLE STUDENT
// =========================================================

router.get(

    "/:studentId",

    authMiddleware,

    roleMiddleware("admin"),

    getSingleStudent

);


module.exports = router;