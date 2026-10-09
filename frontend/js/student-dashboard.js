/* ============================================
   STUDENT DASHBOARD
============================================ */


/* ============================================
   ELEMENTS
============================================ */

const studentName =
    document.getElementById("studentFullName");

const studentFirstName =
    document.getElementById("studentFirstName");

const studentRegistrationNumber =
    document.getElementById("studentRegistrationNumber");

const studentCourse =
    document.getElementById("studentCourse");


/* Desktop student information */

const navStudentName =
    document.getElementById("navStudentName");

const navRegistrationNumber =
    document.getElementById(
        "navRegistrationNumber"
    );


/* Sidebar */

const studentMenuButton =
    document.getElementById(
        "studentMenuButton"
    );

const studentMenuClose =
    document.getElementById(
        "studentMenuClose"
    );

const studentSidebar =
    document.getElementById(
        "studentSidebar"
    );

const studentSidebarOverlay =
    document.getElementById(
        "studentSidebarOverlay"
    );

const sidebarInitials =
    document.getElementById(
        "sidebarInitials"
    );

const sidebarStudentName =
    document.getElementById(
        "sidebarStudentName"
    );

const sidebarRegistrationNumber =
    document.getElementById(
        "sidebarRegistrationNumber"
    );

const sidebarLogoutButton =
    document.getElementById(
        "sidebarLogoutButton"
    );


/* Examination */

const examLoading =
    document.getElementById("examLoading");

const examContent =
    document.getElementById("examContent");

const examEmpty =
    document.getElementById("examEmpty");

const examError =
    document.getElementById("examError");

const examStatus =
    document.getElementById("examStatus");

const examTitle =
    document.getElementById("examTitle");

const examDescription =
    document.getElementById(
        "examDescription"
    );

const examDuration =
    document.getElementById(
        "examDuration"
    );

const examQuestionCount =
    document.getElementById(
        "examQuestionCount"
    );

const startExamButton =
    document.getElementById(
        "startExamButton"
    );


/* Results */

const resultStatus =
    document.getElementById(
        "resultStatus"
    );

const resultIcon =
    document.getElementById(
        "resultIcon"
    );

const resultBadge =
    document.getElementById(
        "resultBadge"
    );

const resultTitle =
    document.getElementById(
        "resultTitle"
    );

const resultMessage =
    document.getElementById(
        "resultMessage"
    );

const resultAction =
    document.getElementById(
        "resultAction"
    );

const viewResultButton =
    document.getElementById(
        "viewResultButton"
    );


/* ============================================
   AUTH CHECK
============================================ */

const token =
    localStorage.getItem(
        "examhub_token"
    );

const storedUser =
    localStorage.getItem(
        "examhub_user"
    );

if (!token || !storedUser) {
    window.location.href =
        "../login.html";
}


/* ============================================
   STATE
============================================ */

let availableExam = null;
let latestResult = null;
let resumeExamSession = null;


/* ============================================
   SIDEBAR
============================================ */

function openStudentSidebar() {

    studentSidebar.classList.add(
        "open"
    );

    studentSidebarOverlay.classList.add(
        "visible"
    );

    studentSidebar.setAttribute(
        "aria-hidden",
        "false"
    );

    studentMenuButton.setAttribute(
        "aria-expanded",
        "true"
    );

    document.body.classList.add(
        "sidebar-open"
    );
}


function closeStudentSidebar() {

    studentSidebar.classList.remove(
        "open"
    );

    studentSidebarOverlay.classList.remove(
        "visible"
    );

    studentSidebar.setAttribute(
        "aria-hidden",
        "true"
    );

    studentMenuButton.setAttribute(
        "aria-expanded",
        "false"
    );

    document.body.classList.remove(
        "sidebar-open"
    );
}


studentMenuButton.addEventListener(
    "click",
    openStudentSidebar
);

studentMenuClose.addEventListener(
    "click",
    closeStudentSidebar
);

studentSidebarOverlay.addEventListener(
    "click",
    closeStudentSidebar
);


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            studentSidebar.classList.contains(
                "open"
            )
        ) {
            closeStudentSidebar();
        }

    }
);


/* ============================================
   ACTIVE NAVIGATION
============================================ */

function setActiveStudentNav() {

    const currentPage =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();

    document
        .querySelectorAll(
            "[data-page]"
        )
        .forEach(link => {

            const page =
                link.dataset.page
                    .toLowerCase();

            if (page === currentPage) {
                link.classList.add(
                    "active"
                );
            }

        });
}


/* ============================================
   INITIALS
============================================ */

function getInitials(name) {

    if (!name) {
        return "ST";
    }

    const parts =
        name
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (parts.length === 1) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();

    }

    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();
}


/* ============================================
   LOAD STUDENT
============================================ */

function loadStudent() {

    try {

        const user =
            JSON.parse(storedUser);

        const fullName =
            user.fullName ||
            "Student";

        const firstName =
            fullName
                .split(/\s+/)[0];

        const registration =
            user.registrationNumber ||
            "—";


        studentName.textContent =
            fullName;

        studentFirstName.textContent =
            firstName;

        studentRegistrationNumber.textContent =
            registration;

        studentCourse.textContent =
            user.courseId ||
            "—";


        navStudentName.textContent =
            firstName;

        navRegistrationNumber.textContent =
            registration;


        sidebarInitials.textContent =
            getInitials(fullName);

        sidebarStudentName.textContent =
            fullName;

        sidebarRegistrationNumber.textContent =
            registration;

    } catch (error) {

        console.error(
            "Load student error:",
            error
        );

        handleLogout();
    }
}


/* ============================================
   LOAD AVAILABLE EXAM
============================================ */

async function loadAvailableExam() {

    examLoading.classList.remove(
        "hidden"
    );

    examContent.classList.add(
        "hidden"
    );

    examEmpty.classList.add(
        "hidden"
    );

    examError.classList.add(
        "hidden"
    );


    try {

        const response =
            await apiGet(
                "/exam-sessions/available"
            );

        const exams =
            response.data || [];


        if (exams.length === 0) {

            examEmpty.classList.remove(
                "hidden"
            );

            return;
        }


        const storedSession =
            getStoredExamSession();

        availableExam =
            exams.find(exam =>
                exam.attemptStatus === "in-progress" &&
                storedSession?.examId === exam.id
            ) ||
            exams.find(exam =>
                exam.retakeAuthorized === true
            ) ||
            exams.find(exam =>
                !exam.attemptStatus
            ) ||
            exams[0];

        const attemptStatus =
            availableExam.attemptStatus;

        examTitle.textContent =
            availableExam.title ||
            "Examination";

        examStatus.className =
            "badge badge-primary";
        startExamButton.classList.remove("hidden");
        resumeExamSession = null;

        if (attemptStatus === "submitted") {
            if (availableExam.retakeAuthorized) {
                examStatus.textContent = "Retake authorized";
                examStatus.className =
                    "badge badge-primary";
                examDescription.textContent =
                    "An administrator has authorized you to take this examination again.";
                startExamButton.textContent =
                    "Start authorized retake";
            } else {
                examStatus.textContent = "Submitted";
                examStatus.className =
                    "badge badge-warning";
                examDescription.textContent =
                    "You have already submitted this examination. Your result will be available when it is released.";
                startExamButton.classList.add("hidden");
            }
        } else if (attemptStatus === "in-progress") {
            examStatus.textContent = "In progress";
            examStatus.className =
                "badge badge-warning";
            examDescription.textContent =
                "An active examination session already exists.";

            if (
                storedSession?.examId === availableExam.id &&
                storedSession.sessionId &&
                Array.isArray(storedSession.questions)
            ) {
                resumeExamSession = storedSession;
                examDescription.textContent =
                    "Your examination is in progress. You can continue your active session.";
                startExamButton.textContent =
                    "Resume examination";
            } else {
                examDescription.textContent =
                    "An active examination session already exists. Continue in the exam session you opened earlier; a second session cannot be started.";
                startExamButton.classList.add("hidden");
            }
        } else if (attemptStatus) {
            examStatus.textContent = "Attempt recorded";
            examStatus.className =
                "badge badge-warning";
            examDescription.textContent =
                "An attempt is already recorded for this examination. Another attempt is not available.";
            startExamButton.classList.add("hidden");
        } else {
            examStatus.textContent = "Available";
            examDescription.textContent =
                "Your examination is ready to begin.";
            startExamButton.textContent =
                "View instructions";
        }

        examDuration.textContent =
            `${availableExam.durationMinutes} minutes`;

        examQuestionCount.textContent =
            availableExam.questionCount;


        examContent.classList.remove(
            "hidden"
        );

    } catch (error) {

        console.error(
            "Load available exam error:",
            error
        );


        if (error.status === 401) {

            handleLogout();

            return;
        }

        examError.textContent =
            error.data?.message ||
            "Unable to load your examination information.";

        examError.classList.remove(
            "hidden"
        );

    } finally {

        examLoading.classList.add(
            "hidden"
        );
    }
}

function getStoredExamSession() {
    const storedSession =
        sessionStorage.getItem("examhub_exam_session");

    if (!storedSession) {
        return null;
    }

    try {
        return JSON.parse(storedSession);
    } catch (error) {
        console.error("Load active exam session error:", error);
        return null;
    }
}


/* ============================================
   RESULT UI HELPERS
============================================ */

function resetResultAction() {

    resultAction.classList.add(
        "hidden"
    );

    viewResultButton.onclick =
        null;
}


function setResultState({
    icon,
    badge,
    badgeClass,
    title,
    message,
    showAction = false
}) {

    resultIcon.textContent =
        icon;

    resultBadge.textContent =
        badge;

    resultBadge.className =
        `badge ${badgeClass}`;

    resultTitle.textContent =
        title;

    resultMessage.textContent =
        message;


    resetResultAction();


    if (showAction) {

        resultAction.classList.remove(
            "hidden"
        );

        viewResultButton.onclick =
            openResult;
    }
}


/* ============================================
   LOAD RESULT STATUS
============================================ */

async function loadResultStatus() {

    resetResultAction();


    try {

        const response =
            await apiGet(
                "/student-results/me"
            );

        const results =
            response.data || [];


        if (results.length === 0) {

            setResultState({

                icon: "—",

                badge: "No result",

                badgeClass:
                    "badge-primary",

                title:
                    "No result available",

                message:
                    "You have not completed an examination yet."
            });

            return;
        }


        latestResult =
            results[0];


        if (
            latestResult.resultsReleased !==
            true
        ) {

            setResultState({

                icon: "…",

                badge: "Result pending",

                badgeClass:
                    "badge-warning",

                title:
                    "Your result is pending",

                message:
                    "Your examination has been submitted. Your result will appear here when it has been released."
            });

            return;
        }


        setResultState({

            icon: "✓",

            badge:
                "Result available",

            badgeClass:
                "badge-success",

            title:
                "Your examination result is ready",

            message:
                "Your examination result has been released and is ready to view.",

            showAction: true
        });

    } catch (error) {

        console.error(
            "Load result status error:",
            error
        );


        if (error.status === 401) {

            handleLogout();

            return;
        }


        setResultState({

            icon: "—",

            badge:
                "Result status",

            badgeClass:
                "badge-primary",

            title:
                "Unable to check result",

            message:
                error.data?.message ||
                "We couldn't check your result status right now. Please try again later."
        });
    }
}


/* ============================================
   OPEN RESULT
============================================ */

function openResult() {

    if (!latestResult?.id) {
        return;
    }


    sessionStorage.setItem(
        "examhub_exam_result",

        JSON.stringify({
            resultId:
                latestResult.id
        })
    );


    window.location.href =
        "./result.html";
}


/* ============================================
   START EXAM
============================================ */

startExamButton.addEventListener(
    "click",
    () => {

        if (!availableExam) {
            return;
        }

        if (resumeExamSession) {
            window.location.href =
                "./exam.html";
            return;
        }

        if (
            availableExam.attemptStatus &&
            !availableExam.retakeAuthorized
        ) {
            return;
        }


        sessionStorage.setItem(
            "examhub_pending_exam",

            JSON.stringify(
                availableExam
            )
        );


        window.location.href =
            "./instructions.html";
    }
);


/* ============================================
   LOGOUT
============================================ */

function handleLogout() {

    localStorage.removeItem(
        "examhub_token"
    );

    localStorage.removeItem(
        "examhub_user"
    );


    sessionStorage.removeItem(
        "examhub_pending_exam"
    );

    sessionStorage.removeItem(
        "examhub_exam_session"
    );

    sessionStorage.removeItem(
        "examhub_exam_result"
    );


    window.location.href =
        "../login.html";
}


sidebarLogoutButton.addEventListener(
    "click",
    handleLogout
);


/* ============================================
   INIT
============================================ */

setActiveStudentNav();
loadStudent();
loadAvailableExam();
loadResultStatus();