const express = require("express");

const {
    createSchoolController,
    getAllSchoolsController,
    getSchoolController,
    updateSchoolController
} = require("../controllers/schoolController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// All school management is admin-only
router.use(authMiddleware, roleMiddleware("admin"));

// Create school
router.post("/", createSchoolController);

// Get all schools
router.get("/", getAllSchoolsController);

// Get single school
router.get("/:schoolId", getSchoolController);

// Update school
router.patch("/:schoolId", updateSchoolController);

module.exports = router;