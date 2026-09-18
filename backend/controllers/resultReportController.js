const {
    getTableReportData,
    getIndividualReportData
} = require("../services/resultReportService");

const {
    generateTableReportPdf,
    generateIndividualResultPdf
} = require("../utils/resultPdfGenerator");


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getCustomization = (req) => {

    const source = {
        ...(req.query || {}),
        ...(req.body || {})
    };

    return {

        schoolName:
            source.schoolName,

        schoolAddress:
            source.schoolAddress,

        schoolContact:
            source.schoolContact,

        schoolWebsite:
            source.schoolWebsite,

        title:
            source.title,

        subtitle:
            source.subtitle,

        academicSession:
            source.academicSession,

        assessmentPeriod:
            source.assessmentPeriod,

        remarks:
            source.remarks,

        activities:
            Array.isArray(source.activities)
                ? source.activities
                : [],

        additionalSections:
            Array.isArray(source.additionalSections)
                ? source.additionalSections
                : [],

        authorizedBy:
            source.authorizedBy,

        designation:
            source.designation,

        footerText:
            source.footerText,

        nameOverride:
            source.nameOverride
    };
};


/*
|--------------------------------------------------------------------------
| Table Report PDF
|--------------------------------------------------------------------------
*/

const downloadTableReport = async (req, res) => {

    try {

        const {
            examId,
            courseId,
            studentId
        } = req.query;


        const results =
            await getTableReportData({
                examId,
                courseId,
                studentId
            });


        if (results.length === 0) {

            return res.status(404).json({
                success: false,
                message:
                    "No results found for the selected filters"
            });
        }


        let reportType = "school";

        if (examId) {
            reportType = "exam";
        } else if (courseId) {
            reportType = "course";
        }


        const customization =
            getCustomization(req);


        const doc =
            generateTableReportPdf({

                results,

                reportType,

                title:
                    customization.title ||
                    "Examination Results Report",

                schoolName:
                    customization.schoolName ||
                    "CBT Examination System",

                schoolAddress:
                    customization.schoolAddress ||
                    "",

                schoolContact:
                    customization.schoolContact ||
                    "",

                examName:
                    results[0]?.examName ||
                    "",

                courseName:
                    results[0]?.courseName ||
                    ""
            });


        res.setHeader(
            "Content-Type",
            "application/pdf"
        );


        res.setHeader(
            "Content-Disposition",
            'attachment; filename="results-report.pdf"'
        );


        doc.pipe(res);

        doc.end();

    } catch (error) {

        console.error(
            "Table report error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to generate results report"
        });
    }
};


/*
|--------------------------------------------------------------------------
| Individual PDF
|--------------------------------------------------------------------------
*/

const downloadIndividualResult = async (
    req,
    res
) => {

    try {

        const {
            resultId
        } = req.params;


        const report =
            await getIndividualReportData(
                resultId
            );


        const customization =
            getCustomization(req);


        const doc =
            generateIndividualResultPdf({

                ...report,

                schoolName:
                    customization.schoolName ||
                    "CBT Examination System",

                schoolAddress:
                    customization.schoolAddress ||
                    "",

                schoolContact:
                    customization.schoolContact ||
                    "",

                schoolWebsite:
                    customization.schoolWebsite ||
                    "",

                title:
                    customization.title ||
                    "Student Examination Result",

                subtitle:
                    customization.subtitle ||
                    "",

                academicSession:
                    customization.academicSession ||
                    "",

                assessmentPeriod:
                    customization.assessmentPeriod ||
                    "",

                remarks:
                    customization.remarks ||
                    "No additional remarks.",

                activities:
                    customization.activities,

                additionalSections:
                    customization.additionalSections,

                authorizedBy:
                    customization.authorizedBy ||
                    "Examination Administrator",

                designation:
                    customization.designation ||
                    "Examination Officer",

                footerText:
                    customization.footerText ||
                    "This document is an official examination record.",

                nameOverride:
                    customization.nameOverride ||
                    ""
            });


        const filename =
            `${report.result.registrationNumber || "student"}-result.pdf`;


        res.setHeader(
            "Content-Type",
            "application/pdf"
        );


        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}"`
        );


        doc.pipe(res);

        doc.end();

    } catch (error) {

        console.error(
            "Individual result report error:",
            error
        );


        if (
            error.message === "Result ID is required" ||
            error.message === "Result not found"
        ) {

            return res.status(404).json({
                success: false,
                message: error.message
            });
        }


        return res.status(500).json({
            success: false,
            message:
                "Unable to generate student result"
        });
    }
};


/*
|--------------------------------------------------------------------------
| Individual Preview
|--------------------------------------------------------------------------
|
| Returns JSON instead of PDF.
| The frontend editor will use this.
|
*/

const previewIndividualResult = async (
    req,
    res
) => {

    try {

        const {
            resultId
        } = req.params;


        const report =
            await getIndividualReportData(
                resultId
            );


        const customization =
            getCustomization(req);


        return res.status(200).json({

            success: true,

            data: {

                organization: {

                    name:
                        customization.schoolName ||
                        "CBT Examination System",

                    address:
                        customization.schoolAddress ||
                        "",

                    contact:
                        customization.schoolContact ||
                        "",

                    website:
                        customization.schoolWebsite ||
                        ""
                },


                document: {

                    title:
                        customization.title ||
                        "Student Examination Result",

                    subtitle:
                        customization.subtitle ||
                        "",

                    academicSession:
                        customization.academicSession ||
                        "",

                    assessmentPeriod:
                        customization.assessmentPeriod ||
                        ""
                },


                student: {

                    name:
                        customization.nameOverride ||
                        report.result.fullName,

                    registrationNumber:
                        report.result.registrationNumber,

                    studentId:
                        report.result.studentId,

                    enrollmentId:
                        report.result.enrollmentId
                },


                assessment: {

                    exam:
                        report.exam,

                    course:
                        report.course,

                    program:
                        report.program
                },


                performance: {

                    score:
                        report.result.score,

                    totalMarks:
                        report.result.totalMarks,

                    percentage:
                        report.result.percentage
                },


                submission: {

                    submittedAt:
                        report.result.submittedAt,

                    status:
                        "Submitted"
                },


                activities:
                    customization.activities || [],


                remarks:
                    customization.remarks ||
                    "No additional remarks.",


                additionalSections:
                    customization.additionalSections ||
                    [],


                authorization: {

                    authorizedBy:
                        customization.authorizedBy ||
                        "Examination Administrator",

                    designation:
                        customization.designation ||
                        "Examination Officer"
                }
            }
        });

    } catch (error) {

        console.error(
            "Individual report preview error:",
            error
        );


        if (
            error.message === "Result ID is required" ||
            error.message === "Result not found"
        ) {

            return res.status(404).json({
                success: false,
                message: error.message
            });
        }


        return res.status(500).json({
            success: false,
            message:
                "Unable to preview student result"
        });
    }
};


module.exports = {
    downloadTableReport,
    downloadIndividualResult,
    previewIndividualResult
};