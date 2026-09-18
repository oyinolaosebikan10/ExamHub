const {
    createSchool,
    getAllSchools,
    getSchoolById,
    updateSchool
} = require("../services/schoolService");

const createSchoolController = async (req, res) => {
    try {
        const { name, code, address } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "School name is required"
            });
        }

        if (!code || !code.trim()) {
            return res.status(400).json({
                success: false,
                message: "School code is required"
            });
        }

        const school = await createSchool({
            name,
            code,
            address
        });

        return res.status(201).json({
            success: true,
            message: "School created successfully",
            data: school
        });

    } catch (error) {
        console.error("Create school error:", error);

        if (
            error.message ===
            "A school with this code already exists"
        ) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to create school"
        });
    }
};

const getAllSchoolsController = async (req, res) => {
    try {
        const schools = await getAllSchools();

        return res.status(200).json({
            success: true,
            data: schools
        });

    } catch (error) {
        console.error("Get schools error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to get schools"
        });
    }
};

const getSchoolController = async (req, res) => {
    try {
        const { schoolId } = req.params;

        const school = await getSchoolById(schoolId);

        return res.status(200).json({
            success: true,
            data: school
        });

    } catch (error) {
        console.error("Get school error:", error);

        if (error.message === "School not found") {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to get school"
        });
    }
};

const updateSchoolController = async (req, res) => {
    try {
        const { schoolId } = req.params;

        const school = await updateSchool(
            schoolId,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: "School updated successfully",
            data: school
        });

    } catch (error) {
        console.error("Update school error:", error);

        if (error.message === "School not found") {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to update school"
        });
    }
};

module.exports = {
    createSchoolController,
    getAllSchoolsController,
    getSchoolController,
    updateSchoolController
};