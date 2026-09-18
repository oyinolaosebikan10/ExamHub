const express = require("express");

const {
    getLeaderboard,
    getAllResultsController
} = require("../controllers/resultController");

const {
    downloadTableReport,
    downloadIndividualResult,
    previewIndividualResult
} = require("../controllers/resultReportController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();


// ============================================================
// RESULTS
// ============================================================

router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    getAllResultsController
);


// ============================================================
// LEADERBOARD
// ============================================================

router.get(
    "/leaderboard/:examId",
    authMiddleware,
    roleMiddleware("admin"),
    getLeaderboard
);


// ============================================================
// REPORT PREVIEW
// IMPORTANT:
// These must come BEFORE /student/:resultId
// ============================================================

router.get(
    "/reports/student/:resultId/preview",
    authMiddleware,
    roleMiddleware("admin"),
    previewIndividualResult
);

router.post(
    "/reports/student/:resultId/preview",
    authMiddleware,
    roleMiddleware("admin"),
    previewIndividualResult
);


// ============================================================
// TABLE REPORT
// ============================================================

router.get(
    "/reports/table",
    authMiddleware,
    roleMiddleware("admin"),
    downloadTableReport
);


// ============================================================
// INDIVIDUAL RESULT PDF
// ============================================================

router.get(
    "/reports/student/:resultId",
    authMiddleware,
    roleMiddleware("admin"),
    downloadIndividualResult
);


module.exports = router;