const { db } = require("../firebase/firebaseAdmin");

const bcrypt = require("bcrypt");

const {
    studentsCollection,
    generateRegistrationNumber,
    updateStudentStatus,
    getStudentProfile
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


// =========================================================
// GET ALL STUDENTS
// =========================================================

const getAllStudents =
    async (
        req,
        res
    ) => {

        try {

            const snapshot =
                await studentsCollection
                    .orderBy(
                        "createdAt",
                        "desc"
                    )
                    .get();


            const students =
                snapshot.docs.map(
                    doc => ({

                        id:
                            doc.id,

                        ...doc.data()

                    })
                );


            return res.status(200).json({

                success: true,

                count:
                    students.length,

                data:
                    students

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


            const studentDoc =
                await studentsCollection
                    .doc(studentId)
                    .get();


            if (!studentDoc.exists) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Student not found"

                });
            }


            return res.status(200).json({

                success: true,

                data: {

                    id:
                        studentDoc.id,

                    ...studentDoc.data()

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

    getAllStudents,

    getSingleStudent,

    getMyProfileController

};