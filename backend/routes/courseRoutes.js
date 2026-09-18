const express = require("express");

const {
    createCourse,
    getAllCourses
} = require("../controllers/courseController");

const router = express.Router();

router.post("/", createCourse);

router.get("/", getAllCourses);

module.exports = router;