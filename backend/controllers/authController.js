const { db } = require("../firebase/firebaseAdmin");

const {
    studentsCollection,
    createStudentUser,
    loginStudent,
    loginAdmin
} = require("../services/authService");
const { createEnrollment } = require("../services/enrollmentService");

const { programsCollection } = require("../services/programService");

const {
    generateRegistrationNumber
} = require("../services/studentService");

const {
    validateStudentRegistration
} = require("../validators/studentValidator");

const registerStudent = async (req, res) => {
    let userId = null;

    try {
        // 1. Validate registration data
        const validation = validateStudentRegistration(req.body);

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: "Please correct the following errors",
                errors: validation.errors
            });
        }

        const {
            fullName,
            phoneNumber,
            programId,
            courseId,
            password,
            confirmPassword
        } = req.body;

        if (!programId) {
        return res.status(400).json({
        success: false,
        message: "Program is required"
    });
}

        // 2. Check that the selected course exists
        const courseRef = db
            .collection("courses")
            .doc(courseId);

        const courseSnapshot = await courseRef.get();

        if (!courseSnapshot.exists) {
            return res.status(400).json({
                success: false,
                message: "Selected course does not exist"
            });
        }

        const course = courseSnapshot.data();

        // 3. Check if course is active
        if (!course.isActive) {
            return res.status(400).json({
                success: false,
                message: "This course is currently unavailable for registration"
            });
        }

        // 4. Normalize phone number
        let normalizedPhone = phoneNumber
            .replace(/[\s()-]/g, "");

        if (normalizedPhone.startsWith("0")) {
            normalizedPhone =
                "+234" + normalizedPhone.substring(1);
        }

        // 5. Normalize full name
        const normalizedName = fullName
            .trim()
            .replace(/\s+/g, " ")
            .toLowerCase();

        // 6. Check for duplicate student
       const existingStudents = await studentsCollection
    .where("normalizedName", "==", normalizedName)
    .where("phoneNumber", "==", normalizedPhone)
    .limit(10)
    .get();

let duplicateRegistration = false;

for (const studentDoc of existingStudents.docs) {
    const studentId = studentDoc.id;

    const enrollmentSnapshot = await db
        .collection("enrollments")
        .where("studentId", "==", studentId)
        .where("programId", "==", programId)
        .where("courseId", "==", courseId)
        .where("status", "==", "active")
        .limit(1)
        .get();

    if (!enrollmentSnapshot.empty) {
        duplicateRegistration = true;
        break;
    }
}

if (duplicateRegistration) {
    return res.status(409).json({
        success: false,
        message: "A student with these registration details already exists for this program and course"
    });
}

        // 7. Generate registration number
        const registrationNumber =
            await generateRegistrationNumber(
                fullName,
                course.code
            );

            const programDoc =
            await programsCollection
            .doc(programId)
            .get();

        if (!programDoc.exists) {
        return res.status(400).json({
        success: false,
        message: "Program not found"
        });
        }

        const program =
        programDoc.data();

        if (
    program.venueType === "school" &&
    program.schoolId
) {
    const schoolDoc = await db
        .collection("schools")
        .doc(program.schoolId)
        .get();

    if (!schoolDoc.exists) {
        return res.status(400).json({
            success: false,
            message: "The school for this program no longer exists"
        });
    }

    const school = schoolDoc.data();

    if (school.isActive === false) {
        return res.status(400).json({
            success: false,
            message: "Registration is unavailable because this school is inactive"
        });
    }
}

if (program.isActive === false) {
    return res.status(400).json({
        success: false,
        message: "Registration is unavailable because this program is inactive"
    });
}

        const now = new Date();

const registrationStart =
    program.registrationStart.toDate
        ? program.registrationStart.toDate()
        : new Date(program.registrationStart);

const registrationEnd =
    program.registrationEnd.toDate
        ? program.registrationEnd.toDate()
        : new Date(program.registrationEnd);

if (
    now < registrationStart ||
    now > registrationEnd
) {
    return res.status(400).json({
        success: false,
        message: "Registration for this program is closed"
    });
}


        // 8. Create user account
const user = await createStudentUser({
    fullName,
    password
});

userId = user.userId;

// 9. Create student profile
const studentData = {
    userId,
    fullName: fullName.trim(),
    normalizedName,
    phoneNumber: normalizedPhone,
    registrationNumber,
    courseId,
    status: "active",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
};

const studentRef =
    await studentsCollection.add(studentData);

// 10. Create enrollment
await createEnrollment({
    studentId: studentRef.id,
    programId,
    courseId
});

        // 10. Successful response
        return res.status(201).json({
            success: true,
            message: "Student registered successfully",
            data: {
                studentId: studentRef.id,
                fullName: studentData.fullName,
                registrationNumber,
                courseId
            }
        });

    } catch (error) {
        console.error("Student registration error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to register student at this time"
        });
    }
};

const studentLogin = async (req, res) => {
    try {
        const {
            registrationNumber,
            password
        } = req.body;

        if (!registrationNumber || !registrationNumber.trim()) {
            return res.status(400).json({
                success: false,
                message: "Registration number is required"
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                message: "Password is required"
            });
        }

        const result = await loginStudent({
            registrationNumber,
            password
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: result
        });

    } catch (error) {
        console.error("Student login error:", error);

        if (
            error.message ===
            "Invalid registration number or password"
        ) {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        if (
            error.message ===
            "This student account is inactive" ||
            error.message ===
            "This user account is inactive"
        ) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to login at this time"
        });
    }
};

const getMe = async (req, res) => {
    try {
        const userId = req.user.userId;

        const userDoc = await db
            .collection("users")
            .doc(userId)
            .get();

        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const user = userDoc.data();

        if (user.role === "student") {
            const studentSnapshot = await db
                .collection("students")
                .where("userId", "==", userId)
                .limit(1)
                .get();

            if (studentSnapshot.empty) {
                return res.status(404).json({
                    success: false,
                    message: "Student profile not found"
                });
            }

            const studentDoc = studentSnapshot.docs[0];
            const student = studentDoc.data();

            return res.status(200).json({
                success: true,
                data: {
                    userId,
                    studentId: studentDoc.id,
                    fullName: student.fullName,
                    registrationNumber: student.registrationNumber,
                    courseId: student.courseId,
                    role: user.role
                }
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                userId,
                fullName: user.fullName,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Get current user error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to get current user"
        });
    }
};

const adminLogin = async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                message: "Password is required"
            });
        }

        const result = await loginAdmin({
            email,
            password
        });

        return res.status(200).json({
            success: true,
            message: "Admin login successful",
            data: result
        });

    } catch (error) {
        console.error("Admin login error:", error);

        if (error.message === "Invalid admin credentials") {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        if (error.message === "This admin account is inactive") {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to login at this time"
        });
    }
};

module.exports = {
    registerStudent,
    studentLogin,
    getMe,
    adminLogin
};
