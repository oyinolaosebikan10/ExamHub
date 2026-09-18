const {
    getAllResults,
    resultsCollection
} = require("./resultService");

const {
    getExamById
} = require("./examService");

const {
    getCourseById
} = require("./courseService");

const {
    getProgramById
} = require("./programService");


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

/**
 * Safely resolve an exam.
 *
 * Reports should still be able to generate when an old result
 * references an exam that has since been removed.
 */
const resolveExam = async (examId) => {

    if (!examId) {
        return null;
    }

    try {
        return await getExamById(examId);
    } catch (error) {
        return null;
    }
};


/**
 * Safely resolve a course.
 */
const resolveCourse = async (courseId) => {

    if (!courseId) {
        return null;
    }

    try {
        return await getCourseById(courseId);
    } catch (error) {
        return null;
    }
};


/**
 * Safely resolve a program.
 */
const resolveProgram = async (programId) => {

    if (!programId) {
        return null;
    }

    try {
        return await getProgramById(programId);
    } catch (error) {
        return null;
    }
};


/*
|--------------------------------------------------------------------------
| Table Report Data
|--------------------------------------------------------------------------
|
| Supported filters:
|
|   examId
|   courseId
|   studentId
|
| No filters = all results.
|
*/

const getTableReportData = async ({
    examId,
    courseId,
    studentId
} = {}) => {

    const results = await getAllResults({
        examId,
        courseId,
        studentId
    });


    if (results.length === 0) {
        return [];
    }


    /*
     * Resolve unique exams and courses only once.
     *
     * This prevents unnecessary Firestore reads when
     * many students have the same exam/course.
     */

    const examIds = [
        ...new Set(
            results
                .map(result => result.examId)
                .filter(Boolean)
        )
    ];


    const courseIds = [
        ...new Set(
            results
                .map(result => result.courseId)
                .filter(Boolean)
        )
    ];


    const examEntries = await Promise.all(
        examIds.map(async (id) => {

            const exam =
                await resolveExam(id);

            return [id, exam];
        })
    );


    const courseEntries = await Promise.all(
        courseIds.map(async (id) => {

            const course =
                await resolveCourse(id);

            return [id, course];
        })
    );


    const exams =
        Object.fromEntries(examEntries);

    const courses =
        Object.fromEntries(courseEntries);


    /*
     * Build the final report rows.
     */

    return results.map((result, index) => {

        const exam =
            exams[result.examId] || null;

        const course =
            courses[result.courseId] || null;


        return {

            rank:
                index + 1,

            id:
                result.id,

            studentId:
                result.studentId,

            fullName:
                result.fullName,

            registrationNumber:
                result.registrationNumber,

            examId:
                result.examId,

            examName:
                exam?.title ||
                "N/A",

            courseId:
                result.courseId,

            courseName:
                course?.name ||
                "N/A",

            courseCode:
                course?.code ||
                "",

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
        };
    });
};


/*
|--------------------------------------------------------------------------
| Individual Result Report
|--------------------------------------------------------------------------
|
| Gets one exact result using its result document ID.
|
*/

const getIndividualReportData = async (
    resultId
) => {

    if (!resultId) {
        throw new Error(
            "Result ID is required"
        );
    }


    /*
     * Fetch the exact result.
     */

    const resultDoc =
        await resultsCollection
            .doc(resultId)
            .get();


    if (!resultDoc.exists) {
        throw new Error(
            "Result not found"
        );
    }


    const result = {
        id: resultDoc.id,
        ...resultDoc.data()
    };


    /*
     * Resolve related records.
     */

    const exam =
        await resolveExam(
            result.examId
        );


    const course =
        await resolveCourse(
            result.courseId
        );


    /*
     * The program belongs to the exam.
     */

    const program =
        await resolveProgram(
            exam?.programId
        );


    /*
     * Return only the data required by
     * the reporting system.
     */

    return {

        result: {

            id:
                result.id,

            sessionId:
                result.sessionId,

            studentId:
                result.studentId,

            userId:
                result.userId,

            fullName:
                result.fullName,

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

                id:
                    exam.id,

                title:
                    exam.title,

                programId:
                    exam.programId || null,

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

                id:
                    course.id,

                name:
                    course.name,

                code:
                    course.code,

                description:
                    course.description || null
            }
            : null,


        program: program
            ? {

                id:
                    program.id,

                name:
                    program.name,

                description:
                    program.description || null,

                venueType:
                    program.venueType || null,

                schoolId:
                    program.schoolId || null,

                status:
                    program.status || null
            }
            : null
    };
};


module.exports = {
    getTableReportData,
    getIndividualReportData
};