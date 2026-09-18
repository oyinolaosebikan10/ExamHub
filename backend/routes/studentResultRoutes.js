const express = require("express");

const {
    getMyResults,
    getMyResultById,
    downloadMyResult
} = require("../controllers/studentResultController");

const authMiddleware =
    require("../middleware/authMiddleware");

const roleMiddleware =
    require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
    "/me",
    authMiddleware,
    roleMiddleware("student"),
    getMyResults
);

router.get(
    "/me/:id",
    authMiddleware,
    roleMiddleware("student"),
    getMyResultById
);

router.get(
    "/me/:id/download",
    authMiddleware,
    roleMiddleware("student"),
    downloadMyResult
);

module.exports = router;