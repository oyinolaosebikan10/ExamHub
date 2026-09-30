const courseService = require("../services/courseService");


/*
|--------------------------------------------------------------------------
| Create course
|--------------------------------------------------------------------------
*/

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


/*
|--------------------------------------------------------------------------
| Get all courses
|--------------------------------------------------------------------------
*/

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
| Get single course
|--------------------------------------------------------------------------
*/

const getCourseById = async (req, res) => {
    try {
        const course = await courseService.getCourseById(req.params.id);

        res.status(200).json({
            success: true,
            data: course
        });
    } catch (error) {
        console.error(error);

        const statusCode =
            error.message === "Course not found" ? 404 : 400;

        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};


/*
|--------------------------------------------------------------------------
| Update course
|--------------------------------------------------------------------------
*/

const updateCourse = async (req, res) => {
    try {
        const course = await courseService.updateCourse(
            req.params.id,
            req.body
        );

        res.status(200).json({
            success: true,
            message: "Course updated successfully",
            data: course
        });
    } catch (error) {
        console.error(error);

        const statusCode =
            error.message === "Course not found" ? 404 : 400;

        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};


/*
|--------------------------------------------------------------------------
| Deactivate course
|--------------------------------------------------------------------------
*/

const deactivateCourse = async (req, res) => {
    try {
        const course = await courseService.deactivateCourse(
            req.params.id
        );

        res.status(200).json({
            success: true,
            message: "Course deactivated successfully",
            data: course
        });
    } catch (error) {
        console.error(error);

        const statusCode =
            error.message === "Course not found" ? 404 : 400;

        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};


/*
|--------------------------------------------------------------------------
| Reactivate course
|--------------------------------------------------------------------------
*/

const activateCourse = async (req, res) => {
    try {
        const course = await courseService.activateCourse(
            req.params.id
        );

        res.status(200).json({
            success: true,
            message: "Course reactivated successfully",
            data: course
        });
    } catch (error) {
        console.error(error);

        const statusCode =
            error.message === "Course not found" ? 404 : 400;

        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};


/*
|--------------------------------------------------------------------------
| Delete course
|--------------------------------------------------------------------------
*/

const deleteCourse = async (req, res) => {
    try {
        const result = await courseService.deleteCourse(
            req.params.id
        );

        res.status(200).json({
            success: true,
            message: result.message,
            data: {
                id: result.id
            }
        });
    } catch (error) {
        console.error(error);

        const statusCode =
            error.message === "Course not found" ? 404 : 400;

        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};


/*
|--------------------------------------------------------------------------
| Public available courses
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
    getCourseById,
    updateCourse,
    deactivateCourse,
    activateCourse,
    deleteCourse,
    getAvailableCourses
};