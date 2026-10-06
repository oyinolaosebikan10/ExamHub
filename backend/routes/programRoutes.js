const express = require("express");

const {
    createProgramController,
    getAllProgramsController,
    getProgramController,
    updateProgramController,
    deactivateProgramController,
    reactivateProgramController,
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

router.patch(
    "/:programId/deactivate",
    authMiddleware,
    roleMiddleware("admin"),
    deactivateProgramController
);

router.patch(
    "/:programId/reactivate",
    authMiddleware,
    roleMiddleware("admin"),
    reactivateProgramController
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