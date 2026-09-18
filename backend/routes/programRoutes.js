const express = require("express");

const {
    createProgramController,
    getAllProgramsController,
    getProgramController,
    updateProgramController,
    getAvailableProgramsController
} = require("../controllers/programController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Create program - Admin only
router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    createProgramController
);

// Get all programs - Admin only
router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    getAllProgramsController
);

router.get(
    "/available/registration",
    getAvailableProgramsController
);


// Get one program - Admin only
router.get(
    "/:programId",
    authMiddleware,
    roleMiddleware("admin"),
    getProgramController
);

// Update program - Admin only
router.patch(
    "/:programId",
    authMiddleware,
    roleMiddleware("admin"),
    updateProgramController
);


module.exports = router;