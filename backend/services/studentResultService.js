const { db } = require("../firebase/firebaseAdmin");

const resultsCollection = db.collection("results");
const enrollmentsCollection = db.collection("enrollments");
const programsCollection = db.collection("programs");
const studentsCollection = db.collection("students");
const examsCollection = db.collection("exams");
const coursesCollection = db.collection("courses");


const getStudentResultsByUserId = async (userId) => {

    // Find the student belonging to this user
    const studentSnapshot = await studentsCollection
        .where("userId", "==", userId)
        .limit(1)
        .get();

    if (studentSnapshot.empty) {
        throw new Error("Student not found");
    }

    const studentDoc = studentSnapshot.docs[0];

    const studentId = studentDoc.id;

    // Get this student's results
    const resultSnapshot = await resultsCollection
        .where("studentId", "==", studentId)
        .get();

    const results = [];

    for (const resultDoc of resultSnapshot.docs) {

        const result = {
            id: resultDoc.id,
            ...resultDoc.data()
        };

        if (!result.enrollmentId) {
            continue;
        }

        const enrollmentDoc =
            await enrollmentsCollection
                .doc(result.enrollmentId)
                .get();

        if (!enrollmentDoc.exists) {
            continue;
        }

        const enrollment = enrollmentDoc.data();

        if (!enrollment.programId) {
            continue;
        }

        const programDoc =
            await programsCollection
                .doc(enrollment.programId)
                .get();

        if (!programDoc.exists) {
            continue;
        }

        const program = programDoc.data();

        const resultsReleased =
            program.resultVisibility === "visible";

        const downloadEnabled =
            resultsReleased &&
            program.resultDownloadEnabled === true;

        results.push({

            id: result.id,

            examId: result.examId,

            courseId: result.courseId,

            enrollmentId: result.enrollmentId,

            score: resultsReleased
                ? result.score
                : null,

            totalMarks: resultsReleased
                ? result.totalMarks
                : null,

            percentage: resultsReleased
                ? result.percentage
                : null,

            submittedAt: result.submittedAt,

            resultsReleased,

            downloadEnabled
        });
    }

    results.sort((a, b) => {

    const dateA =
        a.submittedAt?.toDate
            ? a.submittedAt.toDate()
            : new Date(a.submittedAt || 0);

    const dateB =
        b.submittedAt?.toDate
            ? b.submittedAt.toDate()
            : new Date(b.submittedAt || 0);

    return dateB - dateA;
});

    return results;
};


/*
|--------------------------------------------------------------------------
| Get one student's complete released result
|--------------------------------------------------------------------------
*/

const getStudentResultById = async (
    userId,
    resultId
) => {

    const resultDoc =
        await resultsCollection
            .doc(resultId)
            .get();

    if (!resultDoc.exists) {
        throw new Error("Result not found");
    }

    const result = {
        id: resultDoc.id,
        ...resultDoc.data()
    };


    // Make absolutely sure this result belongs
    // to the currently authenticated student.
    if (result.userId !== userId) {
        throw new Error("Access denied");
    }


    if (!result.enrollmentId) {
        throw new Error("Result enrollment not found");
    }


    const enrollmentDoc =
        await enrollmentsCollection
            .doc(result.enrollmentId)
            .get();

    if (!enrollmentDoc.exists) {
        throw new Error("Enrollment not found");
    }

    const enrollment =
        enrollmentDoc.data();


    if (!enrollment.programId) {
        throw new Error("Program not found");
    }


    const programDoc =
        await programsCollection
            .doc(enrollment.programId)
            .get();

    if (!programDoc.exists) {
        throw new Error("Program not found");
    }

    const program = {
        id: programDoc.id,
        ...programDoc.data()
    };


    /*
    |--------------------------------------------------------------------------
    | Result release protection
    |--------------------------------------------------------------------------
    */

    const released =
        program.resultVisibility === "visible";

    if (!released) {
        throw new Error("Results not released");
    }


    /*
    |--------------------------------------------------------------------------
    | Resolve exam
    |--------------------------------------------------------------------------
    */

    let exam = null;

    if (result.examId) {

        const examDoc =
            await examsCollection
                .doc(result.examId)
                .get();

        if (examDoc.exists) {

            exam = {
                id: examDoc.id,
                ...examDoc.data()
            };
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Resolve course
    |--------------------------------------------------------------------------
    */

    let course = null;

    if (result.courseId) {

        const courseDoc =
            await coursesCollection
                .doc(result.courseId)
                .get();

        if (courseDoc.exists) {

            course = {
                id: courseDoc.id,
                ...courseDoc.data()
            };
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Return student-safe report data
    |--------------------------------------------------------------------------
    */

    return {

        result: {

            id: result.id,

            studentId: result.studentId,

            userId: result.userId,

            fullName: result.fullName,

            registrationNumber:
                result.registrationNumber,

            enrollmentId:
                result.enrollmentId,

            score:
                result.score,

            totalMarks:
                result.totalMarks,

            percentage:
                result.percentage,

            submittedAt:
                result.submittedAt
        },


        exam: exam
            ? {
                id: exam.id,
                title: exam.title,
                durationMinutes:
                    exam.durationMinutes,
                questionCount:
                    exam.questionCount,
                status:
                    exam.status
            }
            : null,


        course: course
            ? {
                id: course.id,
                name: course.name,
                code: course.code,
                description:
                    course.description || null
            }
            : null,


        program: {

            id: program.id,

            name:
                program.name,

            description:
                program.description || null,

            venueType:
                program.venueType || null,

            status:
                program.status || null
        },


        resultsReleased: true,

        downloadEnabled:
            program.resultDownloadEnabled === true
    };
};


module.exports = {
    getStudentResultsByUserId,
    getStudentResultById
};