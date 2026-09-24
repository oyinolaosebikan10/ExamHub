const courseService = require("../services/courseService");

const createCourse = async (req, res) => {
    try {
        const course = await courseService.createCourse(req.body);

        res.status(201).json({
            success: true,
            message: "Course created successfully",
            data: course
        });
    } catch (error) {
        console.error(error);

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const getAllCourses = async (req, res) => {
    try {
        const courses = await courseService.getAllCourses();

        res.status(200).json({
            success: true,
            data: courses
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve courses"
        });
    }
};

/*
|--------------------------------------------------------------------------
| Public course list
|--------------------------------------------------------------------------
| Used during student registration.
|--------------------------------------------------------------------------
*/

const getAvailableCourses = async (req, res) => {
    try {
        const courses = await courseService.getAvailableCourses();

        res.status(200).json({
            success: true,
            data: courses
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve available courses"
        });
    }
};

module.exports = {
    createCourse,
    getAllCourses,
    getAvailableCourses
};