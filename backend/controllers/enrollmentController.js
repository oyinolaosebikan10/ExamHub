const {
    createEnrollment,
    getAllEnrollments,
    getEnrollmentsByStudent,
    getEnrollmentsByUserId,
    getEnrollmentById,
    updateEnrollment
} = require("../services/enrollmentService");


const createEnrollmentController = async (req, res) => {
    try {
        const {
            studentId,
            programId,
            courseId,
            programDuration,
            startDate,
            endDate
        } = req.body;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: "Student ID is required"
            });
        }

        if (!programId) {
            return res.status(400).json({
                success: false,
                message: "Program ID is required"
            });
        }

        if (!courseId) {
            return res.status(400).json({
                success: false,
                message: "Course ID is required"
            });
        }

        const enrollment = await createEnrollment({
            studentId,
            programId,
            courseId,
            programDuration,
            startDate,
            endDate
        });

        return res.status(201).json({
            success: true,
            message: "Student enrolled successfully",
            data: enrollment
        });

    } catch (error) {
        console.error(
            "Create enrollment error:",
            error
        );

        const knownErrors = [
            "Student not found",
            "Program not found",
            "Course not found",
            "Student is already enrolled in this program and course"
        ];

        if (knownErrors.includes(error.message)) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to create enrollment"
        });
    }
};


const getAllEnrollmentsController = async (req, res) => {
    try {
        const enrollments = await getAllEnrollments();

        return res.status(200).json({
            success: true,
            data: enrollments
        });

    } catch (error) {
        console.error("Get enrollments error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to get enrollments"
        });
    }
};


const getStudentEnrollmentsController = async (req, res) => {
    try {
        const { studentId } = req.params;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: "Student ID is required"
            });
        }

        const enrollments = await getEnrollmentsByStudent(studentId);

        return res.status(200).json({
            success: true,
            data: enrollments
        });

    } catch (error) {
        console.error("Get student enrollments error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to get student enrollments"
        });
    }
};

const getMyEnrollmentsController = async (req, res) => {
    try {
        const { userId } = req.user;

        const enrollments = await getEnrollmentsByUserId(userId);

        return res.status(200).json({
            success: true,
            data: enrollments
        });

    } catch (error) {
        console.error("Get my enrollments error:", error);

        if (error.message === "Student not found") {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to get your enrollments"
        });
    }
};


const getSingleEnrollmentController = async (req, res) => {
    try {
        const { id } = req.params;

        const enrollment = await getEnrollmentById(id);

        return res.status(200).json({
            success: true,
            data: enrollment
        });

    } catch (error) {
        console.error("Get enrollment error:", error);

        if (error.message === "Enrollment not found") {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to get enrollment"
        });
    }
};


const updateEnrollmentController = async (req, res) => {
    try {
        const { id } = req.params;

        const enrollment = await updateEnrollment(
            id,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: "Enrollment updated successfully",
            data: enrollment
        });

    } catch (error) {
        console.error("Update enrollment error:", error);

        const knownErrors = [
            "Enrollment not found",
            "Course not found"
        ];

        if (knownErrors.includes(error.message)) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to update enrollment"
        });
    }
};




module.exports = {
    createEnrollmentController,
    getAllEnrollmentsController,
    getStudentEnrollmentsController,
    getMyEnrollmentsController,
    getSingleEnrollmentController,
    updateEnrollmentController
};