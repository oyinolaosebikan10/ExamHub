const PDFDocument = require("pdfkit");


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const formatDate = (value) => {

    if (!value) {
        return "N/A";
    }

    let date;

    if (value && typeof value.toDate === "function") {
        date = value.toDate();
    } else {
        date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) {
        return "N/A";
    }

    return date.toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short"
    });
};


const formatDateOnly = (value) => {

    if (!value) {
        return "N/A";
    }

    let date;

    if (value && typeof value.toDate === "function") {
        date = value.toDate();
    } else {
        date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) {
        return "N/A";
    }

    return date.toLocaleDateString("en-NG", {
        dateStyle: "long"
    });
};


const getPerformanceLabel = (percentage) => {

    const value = Number(percentage);

    if (Number.isNaN(value)) {
        return "N/A";
    }

    if (value >= 70) {
        return "Excellent";
    }

    if (value >= 60) {
        return "Very Good";
    }

    if (value >= 50) {
        return "Good";
    }

    if (value >= 40) {
        return "Pass";
    }

    return "Needs Improvement";
};


const drawSectionTitle = (doc, title) => {

    doc
        .moveDown(0.7)
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(title.toUpperCase());

    doc
        .moveDown(0.2)
        .moveTo(55, doc.y)
        .lineTo(540, doc.y)
        .stroke();

    doc.moveDown(0.5);
};


const drawKeyValue = (
    doc,
    label,
    value,
    options = {}
) => {

    const {
        labelWidth = 150
    } = options;

    const startY = doc.y;

    doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(
            `${label}:`,
            55,
            startY,
            {
                width: labelWidth
            }
        );

    doc
        .font("Helvetica")
        .fontSize(10)
        .text(
            value ?? "N/A",
            55 + labelWidth,
            startY,
            {
                width: 430 - labelWidth
            }
        );

    doc.moveDown(0.45);
};


const drawFooter = (
    doc,
    footerText,
    generatedDate
) => {
    const pageHeight = doc.page.height;

    // Keep the footer safely inside the page's usable area.
    const footerY =
        pageHeight -
        doc.options.margins.bottom -
        10;

    doc.save();

    doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("gray")
        .text(
            footerText || "Official examination document",
            55,
            footerY,
            {
                width: 300,
                lineBreak: false
            }
        );

    doc
        .text(
            `Generated: ${formatDate(generatedDate)}`,
            350,
            footerY,
            {
                width: 190,
                align: "right",
                lineBreak: false
            }
        );

    doc.restore();
};


/*
|--------------------------------------------------------------------------
| TABLE REPORT
|--------------------------------------------------------------------------
*/

const generateTableReportPdf = ({
    results,
    title = "Examination Results Report",
    schoolName = "CBT Examination System",
    schoolAddress = "",
    schoolContact = "",
    examName = "",
    courseName = "",
    reportType = "school"
}) => {

    const doc = new PDFDocument({
        size: "A4",
        margin: 40
    });


    /*
     * Header
     */

    doc
        .font("Helvetica-Bold")
        .fontSize(19)
        .text(
            schoolName,
            {
                align: "center"
            }
        );

    if (schoolAddress) {

        doc
            .moveDown(0.2)
            .font("Helvetica")
            .fontSize(9)
            .text(
                schoolAddress,
                {
                    align: "center"
                }
            );
    }

    if (schoolContact) {

        doc
            .moveDown(0.1)
            .fontSize(9)
            .text(
                schoolContact,
                {
                    align: "center"
                }
            );
    }

    doc
        .moveDown(0.8)
        .font("Helvetica-Bold")
        .fontSize(15)
        .text(
            title,
            {
                align: "center"
            }
        );


    /*
     * Report context
     */

    doc.moveDown(0.6);

    if (reportType === "course" && courseName) {

        doc
            .font("Helvetica")
            .fontSize(10)
            .text(
                `Course: ${courseName}`,
                {
                    align: "center"
                }
            );
    }

    if (reportType === "exam" && examName) {

        doc
            .font("Helvetica")
            .fontSize(10)
            .text(
                `Examination: ${examName}`,
                {
                    align: "center"
                }
            );
    }


    /*
     * Summary
     */

    doc.moveDown(0.8);

    doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(
            `Total Results: ${results.length}`
        );


    /*
     * Dynamic columns
     */

    const columns = [];

    if (reportType !== "school") {

        columns.push({
            label: "Rank",
            key: "rank",
            width: 32
        });
    }

    columns.push(
        {
            label: "Student",
            key: "fullName",
            width: 125
        },
        {
            label: "Reg. No.",
            key: "registrationNumber",
            width: 88
        }
    );


    if (reportType === "school") {

        columns.push({
            label: "Course",
            key: "courseName",
            width: 105
        });

        columns.push({
            label: "Exam",
            key: "examName",
            width: 100
        });
    }

    if (reportType === "course") {

        columns.push({
            label: "Exam",
            key: "examName",
            width: 105
        });
    }

    if (reportType === "exam") {

        columns.push({
            label: "Course",
            key: "courseName",
            width: 105
        });
    }


    columns.push(
        {
            label: "Score",
            key: "score",
            width: 45
        },
        {
            label: "%",
            key: "percentage",
            width: 45
        }
    );


    const startX = 40;

    const drawHeader = () => {

        let x = startX;

        const y = doc.y;

        doc
            .font("Helvetica-Bold")
            .fontSize(7.5);

        columns.forEach(column => {

            doc.text(
                column.label,
                x,
                y,
                {
                    width: column.width
                }
            );

            x += column.width;
        });

        doc
            .moveTo(startX, y + 17)
            .lineTo(555, y + 17)
            .stroke();

        doc.y = y + 25;

        doc
            .font("Helvetica")
            .fontSize(7.5);
    };


    drawHeader();


    /*
     * Rows
     */

    results.forEach((result, index) => {

        if (doc.y > 730) {

            doc.addPage();

            doc.y = 45;

            drawHeader();
        }


        let x = startX;

        const rowY = doc.y;

        columns.forEach(column => {

            let value = result[column.key];

            if (column.key === "rank") {
                value = value || index + 1;
            }

            if (column.key === "score") {
                value = `${result.score ?? 0}/${result.totalMarks ?? 0}`;
            }

            if (column.key === "percentage") {
                value =
                    `${Number(result.percentage ?? 0).toFixed(1)}%`;
            }

            if (!value) {
                value = "N/A";
            }

            doc.text(
                String(value),
                x,
                rowY,
                {
                    width: column.width,
                    height: 30,
                    ellipsis: true
                }
            );

            x += column.width;
        });


        doc
            .moveTo(startX, rowY + 25)
            .lineTo(555, rowY + 25)
            .strokeOpacity(0.15)
            .stroke()
            .strokeOpacity(1);

        doc.y = rowY + 30;
    });


    drawFooter(
        doc,
        "Official examination results report",
        new Date()
    );

    return doc;
};


/*
|--------------------------------------------------------------------------
| INDIVIDUAL RESULT REPORT
|--------------------------------------------------------------------------
*/

const generateIndividualResultPdf = ({
    result,
    exam,
    course,
    program,

    schoolName =
        "CBT Examination System",

    schoolAddress = "",

    schoolContact = "",

    schoolWebsite = "",

    logoPath = null,

    title =
        "Student Examination Result",

    subtitle = "",

    academicSession = "",

    assessmentPeriod = "",

    remarks =
        "No additional remarks.",

    activities = [],

    additionalSections = [],

    authorizedBy =
        "Examination Administrator",

    designation =
        "Examination Officer",

    footerText =
        "This document is an official examination record.",

    nameOverride = ""
}) => {


const doc = new PDFDocument({
    size: "A4",
    margins: {
        top: 55,
        left: 55,
        right: 55,
        bottom: 85
    }
});


    /*
     * Organization header
     */

    if (logoPath) {

        try {

            doc.image(
                logoPath,
                250,
                40,
                {
                    fit: [90, 70],
                    align: "center"
                }
            );

            doc.moveDown(4);

        } catch (error) {

            console.error(
                "Unable to load organization logo:",
                error.message
            );
        }
    }


    doc
        .font("Helvetica-Bold")
        .fontSize(20)
        .text(
            schoolName,
            {
                align: "center"
            }
        );


    if (schoolAddress) {

        doc
            .moveDown(0.2)
            .font("Helvetica")
            .fontSize(9)
            .text(
                schoolAddress,
                {
                    align: "center"
                }
            );
    }


    if (schoolContact) {

        doc
            .moveDown(0.1)
            .fontSize(9)
            .text(
                schoolContact,
                {
                    align: "center"
                }
            );
    }


    if (schoolWebsite) {

        doc
            .moveDown(0.1)
            .fontSize(9)
            .text(
                schoolWebsite,
                {
                    align: "center"
                }
            );
    }


    doc.moveDown(1);


    doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .text(
            title,
            {
                align: "center"
            }
        );


    if (subtitle) {

        doc
            .moveDown(0.2)
            .font("Helvetica")
            .fontSize(10)
            .text(
                subtitle,
                {
                    align: "center"
                }
            );
    }


    if (academicSession) {

        doc
            .moveDown(0.2)
            .fontSize(10)
            .text(
                academicSession,
                {
                    align: "center"
                }
            );
    }


    doc.moveDown(0.8);

    doc
        .moveTo(55, doc.y)
        .lineTo(540, doc.y)
        .stroke();


    /*
     * Student information
     */

    drawSectionTitle(
        doc,
        "Student Information"
    );


    drawKeyValue(
        doc,
        "Full Name",
        nameOverride ||
        result.fullName ||
        "N/A"
    );

    drawKeyValue(
        doc,
        "Registration Number",
        result.registrationNumber ||
        "N/A"
    );


    if (result.enrollmentId) {

        drawKeyValue(
            doc,
            "Enrollment ID",
            result.enrollmentId
        );
    }


    if (result.studentId) {

        drawKeyValue(
            doc,
            "Student ID",
            result.studentId
        );
    }


    /*
     * Assessment information
     */

    drawSectionTitle(
        doc,
        "Assessment Information"
    );


    drawKeyValue(
        doc,
        "Examination",
        exam?.title ||
        "N/A"
    );


    drawKeyValue(
        doc,
        "Course",
        course?.name ||
        "N/A"
    );


    if (course?.code) {

        drawKeyValue(
            doc,
            "Course Code",
            course.code
        );
    }


    if (program?.name) {

        drawKeyValue(
            doc,
            "Program",
            program.name
        );
    }


    if (assessmentPeriod) {

        drawKeyValue(
            doc,
            "Assessment Period",
            assessmentPeriod
        );
    }


    if (exam?.durationMinutes) {

        drawKeyValue(
            doc,
            "Exam Duration",
            `${exam.durationMinutes} minutes`
        );
    }


    if (exam?.questionCount) {

        drawKeyValue(
            doc,
            "Questions Presented",
            `${exam.questionCount}`
        );
    }


    drawKeyValue(
        doc,
        "Submission Date",
        formatDateOnly(result.submittedAt)
    );


    drawKeyValue(
        doc,
        "Submission Status",
        "Submitted"
    );


    /*
     * Performance
     */

    drawSectionTitle(
        doc,
        "Performance Summary"
    );


    drawKeyValue(
        doc,
        "Score",
        `${result.score ?? 0} / ${result.totalMarks ?? 0}`
    );


    drawKeyValue(
        doc,
        "Percentage",
        `${Number(
            result.percentage ?? 0
        ).toFixed(1)}%`
    );


    /*
     * Activities
     */

    if (
        Array.isArray(activities) &&
        activities.length > 0
    ) {

        drawSectionTitle(
            doc,
            "Activities / Achievements"
        );


        activities.forEach(
            (activity, index) => {

                const activityTitle =
                    activity.title ||
                    `Activity ${index + 1}`;

                const status =
                    activity.status ||
                    "";

                const activityRemarks =
                    activity.remarks ||
                    "";


                doc
                    .font("Helvetica-Bold")
                    .fontSize(10)
                    .text(
                        activityTitle
                    );


                if (activity.type) {

                    doc
                        .font("Helvetica")
                        .fontSize(9)
                        .text(
                            `Type: ${activity.type}`
                        );
                }


                if (status) {

                    doc.text(
                        `Status: ${status}`
                    );
                }


                if (
                    activity.score !== undefined &&
                    activity.score !== null
                ) {

                    doc.text(
                        `Score: ${activity.score}`
                    );
                }


                if (activityRemarks) {

                    doc.text(
                        `Remarks: ${activityRemarks}`
                    );
                }


                doc.moveDown(0.5);
            }
        );
    }


    /*
     * Remarks
     */

    drawSectionTitle(
        doc,
        "Remarks"
    );


    doc
        .font("Helvetica")
        .fontSize(10)
        .text(
            remarks ||
            "No additional remarks.",
            {
                width: 475,
                lineGap: 5
            }
        );


    /*
     * Additional sections
     */

    if (
        Array.isArray(additionalSections) &&
        additionalSections.length > 0
    ) {

        additionalSections.forEach(
            section => {

                if (!section.title) {
                    return;
                }

                drawSectionTitle(
                    doc,
                    section.title
                );

                doc
                    .font("Helvetica")
                    .fontSize(10)
                    .text(
                        section.content ||
                        "",
                        {
                            width: 475,
                            lineGap: 5
                        }
                    );
            }
        );
    }


    /*
     * Authorization
     */

    drawSectionTitle(
        doc,
        "Authorization"
    );


    doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(
            authorizedBy ||
            "Examination Administrator"
        );


    doc
        .font("Helvetica")
        .fontSize(9)
        .text(
            designation ||
            "Examination Officer"
        );


    doc.moveDown(1.5);


    doc
        .moveTo(55, doc.y)
        .lineTo(220, doc.y)
        .stroke();


    doc
        .fontSize(9)
        .text(
            "Authorized Signature",
            55,
            doc.y + 5
        );


    doc
        .moveDown(2);


    doc
        .fontSize(9)
        .text(
            "Date: ______________________________"
        );


    /*
     * Document reference
     */

    drawSectionTitle(
        doc,
        "Document Information"
    );


    drawKeyValue(
        doc,
        "Result Reference",
        result.id
    );


    drawKeyValue(
        doc,
        "Generated",
        formatDate(new Date())
    );


    drawFooter(
        doc,
        footerText,
        new Date()
    );


    return doc;
};


module.exports = {
    generateTableReportPdf,
    generateIndividualResultPdf
};