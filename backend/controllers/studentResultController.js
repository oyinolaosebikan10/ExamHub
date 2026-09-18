const {
    getStudentResultsByUserId,
    getStudentResultById
} = require("../services/studentResultService");

const {
    generateIndividualResultPdf
} = require("../utils/resultPdfGenerator")

const getMyResults = async (req, res) => {
    try {
        const results =
            await getStudentResultsByUserId(
                req.user.userId
            );

        return res.status(200).json({
            success: true,
            data: results
        });

    } catch (error) {
        console.error(
            "Get student results error:",
            error
        );

        if (error.message === "Student not found") {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to get your results"
        });
    }
};

const getMyResultById = async (req, res) => {
    try {
        const result =
            await getStudentResultById(
                req.user.userId,
                req.params.id
            );

        return res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error(
            "Get student result error:",
            error
        );

        if (
            error.message === "Result not found" ||
            error.message === "Enrollment not found" ||
            error.message === "Program not found"
        ) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        if (error.message === "Access denied" ||
            error.message === "Results not released"
        ) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to get result"
        });
    }
};

const downloadMyResult = async (req, res) => {
    try {
        const report =
            await getStudentResultById(
                req.user.userId,
                req.params.id
            );

        if (!report.downloadEnabled) {
            return res.status(403).json({
                success: false,
                message: "Result download is not enabled"
            });
        }

        const doc = generateIndividualResultPdf({
            result: report.result,
            exam: report.exam,
            course: report.course,
            program: report.program,

            schoolName: "CBT Examination System",
            schoolAddress: "",
            schoolContact: "",
            schoolWebsite: "",

            title: "Student Examination Result",
            subtitle: "",
            academicSession: "",
            assessmentPeriod: "",

            remarks: "No additional remarks.",
            activities: [],
            additionalSections: [],

            authorizedBy: "Examination Administrator",
            designation: "Examination Officer",

            footerText:
                "This document is an official examination record.",

            nameOverride: ""
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
            "Student result download error:",
            error
        );

        if (
            error.message === "Result not found" ||
            error.message === "Enrollment not found" ||
            error.message === "Program not found" ||
            error.message === "Result enrollment not found"
        ) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        if (
            error.message === "Access denied" ||
            error.message === "Results not released" ||
            error.message === "Result download is not enabled"
        ) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to download result"
        });
    }
};

module.exports = {
    getMyResults,
    getMyResultById,
    downloadMyResult   
};