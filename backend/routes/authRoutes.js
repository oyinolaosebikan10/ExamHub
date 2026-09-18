const express = require("express");

const {
    registerStudent,
    studentLogin,
    getMe,
    adminLogin
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
const { authLimiter } = require("../config/rateLimiter");

router.post("/student/register", authLimiter, registerStudent);
router.post("/student/login", authLimiter, studentLogin);
router.post("/admin/login", authLimiter, adminLogin);

router.get("/me", authMiddleware, getMe);

module.exports = router;