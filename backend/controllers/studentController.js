const { db } = require("../firebase/firebaseAdmin");

const bcrypt = require("bcrypt");

const {
    studentsCollection,
    generateRegistrationNumber,
    updateStudentStatus,
    deleteStudent,
    getStudentProfile,
    getAdminStudentDirectory,
    getAdminStudentDetails
} = require("../services/studentService");

const {
    validateStudentRegistration
} = require("../validators/studentValidator");


// =========================================================
// REGISTER STUDENT
// =========================================================

const registerStudent = async (
    req,
    res
) => {

    try {

        // 1. Validate submitted data

        const validation =
            validateStudentRegistration(
                req.body
            );

        if (!validation.isValid) {

            return res.status(400).json({

                success: false,

                message:
                    "Please correct the following errors",

                errors:
                    validation.errors

            });
        }


        const {
            fullName,
            phoneNumber,
            courseId,
            password
        } = req.body;


        // 2. Check selected course

        const courseRef =
            db
                .collection("courses")
                .doc(courseId);

        const courseSnapshot =
            await courseRef.get();


        if (!courseSnapshot.exists) {

            return res.status(400).json({

                success: false,

                message:
                    "Selected course does not exist"

            });
        }


        const course =
            courseSnapshot.data();


        // 3. Check course status

        if (!course.isActive) {

            return res.status(400).json({

                success: false,

                message:
                    "This course is currently unavailable for registration"

            });
        }


        // 4. Normalize phone number

        let normalizedPhone =
            phoneNumber.replace(
                /[\s()-]/g,
                ""
            );


        if (
            normalizedPhone.startsWith("0")
        ) {

            normalizedPhone =
                "+234" +
                normalizedPhone.substring(1);

        }


        // 5. Normalize name

        const normalizedName =
            fullName
                .trim()
                .replace(/\s+/g, " ")
                .toLowerCase();


        // 6. Check existing student

        const existingStudents =
            await studentsCollection
                .where(
                    "normalizedName",
                    "==",
                    normalizedName
                )
                .where(
                    "phoneNumber",
                    "==",
                    normalizedPhone
                )
                .where(
                    "courseId",
                    "==",
                    courseId
                )
                .limit(1)
                .get();


        if (!existingStudents.empty) {

            return res.status(409).json({

                success: false,

                message:
                    "A student with these registration details already exists"

            });
        }


        // 7. Generate registration number

        const registrationNumber =
            await generateRegistrationNumber(
                fullName,
                course.code
            );


        // 8. Hash password

        const passwordHash =
            await bcrypt.hash(
                password,
                10
            );


        // 9. Create student

        const studentData = {

            fullName:
                fullName.trim(),

            normalizedName,

            phoneNumber:
                normalizedPhone,

            courseId,

            registrationNumber,

            passwordHash,

            status:
                "active",

            createdAt:
                new Date(),

            updatedAt:
                new Date()

        };


        const studentRef =
            await studentsCollection
                .add(studentData);


        // 10. Response

        return res.status(201).json({

            success: true,

            message:
                "Student registered successfully",

            data: {

                studentId:
                    studentRef.id,

                fullName:
                    studentData.fullName,

                registrationNumber,

                courseId

            }

        });

    } catch (error) {

        console.error(
            "Student registration error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to register student at this time"

        });
    }
};


// =========================================================
// UPDATE STUDENT STATUS
// =========================================================

const updateStudentStatusController =
    async (
        req,
        res
    ) => {

        try {

            const {
                studentId
            } = req.params;

            const {
                isActive
            } = req.body;


            const student =
                await updateStudentStatus(
                    studentId,
                    isActive
                );


            return res.status(200).json({

                success: true,

                message:
                    isActive
                        ? "Student account activated successfully"
                        : "Student account deactivated successfully",

                data:
                    student

            });

        } catch (error) {

            console.error(
                "Update student status error:",
                error
            );


            if (
                error.message ===
                    "Student not found" ||

                error.message ===
                    "isActive must be true or false"
            ) {

                return res.status(
                    error.message ===
                        "Student not found"
                        ? 404
                        : 400
                ).json({

                    success: false,

                    message:
                        error.message

                });
            }


            return res.status(500).json({

                success: false,

                message:
                    "Unable to update student status"

            });
        }
    };

const deleteStudentController = async (req, res) => {
    try {
        const result = await deleteStudent(req.params.studentId);
        return res.status(200).json({
            success: true,
            message: "Student account deleted successfully",
            data: result
        });
    } catch (error) {
        console.error("Delete student error:", {
            studentId: req.params.studentId,
            message: error?.message || "Unknown error",
            code: error?.code || null
        });

        if (error.message === "Student not found") {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        if (
            error.message.startsWith("Deactivate the student") ||
            error.message.startsWith("Student has ") ||
            error.message.startsWith("The linked account")
        ) {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to delete student account"
        });
    }
};


// =========================================================
// GET ALL STUDENTS
// =========================================================

const getAllStudents =
    async (
        req,
        res
    ) => {

        try {
            const status = req.query.status || "all";

            if (!["all", "active", "inactive"].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Student status filter is invalid"
                });
            }

            const directory = await getAdminStudentDirectory({
                search: req.query.search,
                status,
                programId: req.query.programId,
                schoolId: req.query.schoolId,
                organization: req.query.organization,
                studentId: req.query.studentId,
                page: req.query.page,
                limit: req.query.limit
            });


            return res.status(200).json({

                success: true,

                count:
                    directory.count,

                summary:
                    directory.summary,

                pagination:
                    directory.pagination,

                data:
                    directory.data

            });

        } catch (error) {

            console.error(
                "Get all students error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to fetch students"

            });
        }
    };

const exportStudentsController = async (req, res) => {
    try {
        const status = req.query.status || "all";

        if (!["all", "active", "inactive"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Student status filter is invalid"
            });
        }

        const directory = await getAdminStudentDirectory({
            search: req.query.search,
            status,
            programId: req.query.programId,
            schoolId: req.query.schoolId,
            organization: req.query.organization,
            studentId: req.query.studentId,
            paginate: false
        });

        const csvCell = (value) => {
            let text = String(value ?? "");

            if (/^[\s]*[=+\-@]/.test(text)) {
                text = `'${text}`;
            }

            return `"${text.replace(/"/g, '""')}"`;
        };
        const headings = [
            "Student ID",
            "Full name",
            "Registration number",
            "Phone number",
            "Course ID",
            "Status",
            "Programs",
            "Schools",
            "Organization-hosted programs",
            "Registered"
        ];
        const selectedStudent = directory.data[0];
        const selectedAssociations = directory.data.flatMap(
            (student) => student.associations || []
        );
        const scopeParts = [];

        if (req.query.search) {
            scopeParts.push(`Search: ${req.query.search}`);
        }
        if (status !== "all") {
            scopeParts.push(`Status: ${status}`);
        }
        if (req.query.programId) {
            const association = selectedAssociations.find(
                (item) => item.programId === req.query.programId
            );
            scopeParts.push(
                `Program: ${association?.programName || req.query.programId}`
            );
        }
        if (req.query.schoolId) {
            const association = selectedAssociations.find(
                (item) => item.schoolId === req.query.schoolId
            );
            scopeParts.push(
                `School: ${association?.schoolName || req.query.schoolId}`
            );
        }
        if (req.query.organization) {
            scopeParts.push("Organization-hosted program participants");
        }
        if (req.query.studentId) {
            scopeParts.push(
                `Student: ${selectedStudent?.fullName || req.query.studentId}`
            );
        }

        const rows = directory.data.map((student) => {
            const associations = student.associations || [];

            return [
                student.id,
                student.fullName,
                student.registrationNumber,
                student.phoneNumber,
                student.courseId,
                student.isActive === true
                    ? "Active"
                    : student.isActive === false
                        ? "Inactive"
                        : student.status || "Unknown",
                [...new Set(
                    associations
                        .map((item) => item.programName)
                        .filter(Boolean)
                )].join("; "),
                [...new Set(
                    associations
                        .map((item) => item.schoolName)
                        .filter(Boolean)
                )].join("; "),
                [...new Set(
                    associations
                        .filter((item) =>
                            item.venueType === "organization"
                        )
                        .map((item) => item.programName)
                        .filter(Boolean)
                )].join("; "),
                student.createdAt?.toDate
                    ? student.createdAt.toDate().toISOString()
                    : student.createdAt || ""
            ];
        });
        const csv = [
            ["Report scope", scopeParts.join(" | ") || "All students"],
            ["Records", String(directory.count)],
            [],
            headings,
            ...rows
        ].map((row) => row.map(csvCell).join(",")).join("\r\n");

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
            "Content-Disposition",
            'attachment; filename="examhub-students.csv"'
        );

        return res.status(200).send(`\uFEFF${csv}`);
    } catch (error) {
        console.error("Export students error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to export student records"
        });
    }
};


// =========================================================
// GET SINGLE STUDENT
// =========================================================

const getSingleStudent =
    async (
        req,
        res
    ) => {

        try {

            const {
                studentId
            } = req.params;


            let student;

            try {
                student = await getAdminStudentDetails(studentId);
            } catch (error) {
                if (error.message !== "Student not found") {
                    throw error;
                }

                return res.status(404).json({

                    success: false,

                    message:
                        "Student not found"

                });
            }


            return res.status(200).json({

                success: true,

                data: {
                    ...student

                }

            });

        } catch (error) {

            console.error(
                "Get single student error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to fetch student"

            });
        }
    };


// =========================================================
// GET MY PROFILE
// =========================================================

const getMyProfileController =
    async (
        req,
        res
    ) => {

        try {

            const profile =
                await getStudentProfile(
                    req.user.userId
                );


            return res.status(200).json({

                success: true,

                data:
                    profile

            });

        } catch (error) {

            console.error(
                "Get student profile error:",
                error
            );


            if (
                error.message ===
                "Student not found"
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Student profile not found"

                });
            }


            return res.status(500).json({

                success: false,

                message:
                    "Unable to fetch your profile"

            });
        }
    };


module.exports = {

    registerStudent,

    updateStudentStatusController,
    deleteStudentController,

    getAllStudents,

    exportStudentsController,

    getSingleStudent,

    getMyProfileController

};