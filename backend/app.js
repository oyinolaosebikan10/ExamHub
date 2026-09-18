const express = require("express");
const cors = require("cors");
const { db } = require("./firebase/firebaseAdmin");
const courseRoutes = require("./routes/courseRoutes");
const studentRoutes = require("./routes/studentRoutes");
const questionRoutes = require("./routes/questionRoutes");
const authRoutes = require("./routes/authRoutes");
const examRoutes = require("./routes/examRoutes");
const examSessionRoutes = require("./routes/examSessionRoutes");
const resultRoutes = require("./routes/resultRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const schoolRoutes = require("./routes/schoolRoutes");
const programRoutes = require("./routes/programRoutes");
const studentResultRoutes = require("./routes/studentResultRoutes");
const {
    generalLimiter
} = require("./config/rateLimiter");


const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/exam-sessions", examSessionRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/programs", programRoutes);
app.use("/api/student-results", studentResultRoutes);
app.use(generalLimiter);

app.get("/", (req, res) => {
    res.json({
        message: "CBT Examination System API is running"
    });
});

module.exports = app;