const {
    createProgram,
    getAllPrograms,
    getProgramById,
    updateProgram,
    getAvailableProgramsForRegistration
} = require("../services/programService");

const createProgramController = async (req, res) => {
    try {
        const {
            name,
            description,
            venueType,
            schoolId,
            registrationStart,
            registrationEnd,
            examStart,
            examEnd
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Program name is required"
            });
        }

        if (!venueType) {
            return res.status(400).json({
                success: false,
                message: "Venue type is required"
            });
        }

        if (!registrationStart || !registrationEnd) {
            return res.status(400).json({
                success: false,
                message: "Registration dates are required"
            });
        }

        if (!examStart || !examEnd) {
            return res.status(400).json({
                success: false,
                message: "Exam dates are required"
            });
        }

        const program = await createProgram({
            name,
            description,
            venueType,
            schoolId,
            registrationStart,
            registrationEnd,
            examStart,
            examEnd
        });

        return res.status(201).json({
            success: true,
            message: "Program created successfully",
            data: program
        });

    } catch (error) {
        console.error(
            "Create program error:",
            error
        );

        const knownErrors = [
            "Venue type must be either school or organization",
            "School is required for a school-hosted program",
            "School not found",
            "Cannot create a program for an inactive school"
        ];

        if (knownErrors.includes(error.message)) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to create program"
        });
    }
};

const getAllProgramsController = async (req, res) => {
    try {
        const programs = await getAllPrograms();

        return res.status(200).json({
            success: true,
            data: programs
        });

    } catch (error) {
        console.error(
            "Get programs error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to get programs"
        });
    }
};

const getProgramController = async (req, res) => {
    try {
        const { programId } = req.params;

        const program = await getProgramById(
            programId
        );

        return res.status(200).json({
            success: true,
            data: program
        });

    } catch (error) {
        console.error(
            "Get program error:",
            error
        );

        if (error.message === "Program not found") {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to get program"
        });
    }
};

const updateProgramController = async (req, res) => {
    try {
        const { programId } = req.params;

        const program = await updateProgram(
            programId,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: "Program updated successfully",
            data: program
        });

    } catch (error) {
        console.error(
            "Update program error:",
            error
        );

        const knownErrors = [
            "Program not found",
            "Venue type must be either school or organization",
            "School is required for a school-hosted program",
            "School not found",
            "Result visibility must be either hidden or visible",
            "Result download setting must be true or false",
            "All program dates are required",
            "Registration start must be before registration end",
            "Registration must end before the exam starts",
            "Exam start must be before exam end",
            "Cannot update a program to an inactive school"
        ];

        if (knownErrors.includes(error.message)) {
            return res.status(
                error.message === "Program not found"
                    ? 404
                    : 400
            ).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to update program"
        });
    }
};

const getAvailableProgramsController = async (req, res) => {
    try {
        const programs =
            await getAvailableProgramsForRegistration();

        return res.status(200).json({
            success: true,
            data: programs
        });

    } catch (error) {
        console.error(
            "Get available programs error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to get available programs"
        });
    }
};

module.exports = {
    createProgramController,
    getAllProgramsController,
    getProgramController,
    updateProgramController,
    getAvailableProgramsController
};