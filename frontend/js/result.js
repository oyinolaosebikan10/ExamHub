/* ============================================
   STUDENT RESULT
============================================ */


/* ============================================
   ELEMENTS
============================================ */

const resultLoading =
    document.getElementById(
        "resultLoading"
    );

const resultContent =
    document.getElementById(
        "resultContent"
    );

const resultError =
    document.getElementById(
        "resultError"
    );

const submissionConfirmation =
    document.getElementById(
        "submissionConfirmation"
    );

const submissionStatusBadge =
    document.getElementById(
        "submissionStatusBadge"
    );

const submissionConfirmationTitle =
    document.getElementById(
        "submissionConfirmationTitle"
    );

const submissionConfirmationMessage =
    document.getElementById(
        "submissionConfirmationMessage"
    );

const resultPageEyebrow =
    document.getElementById(
        "resultPageEyebrow"
    );

const resultPageTitle =
    document.getElementById(
        "resultPageTitle"
    );

const resultPageSubtitle =
    document.getElementById(
        "resultPageSubtitle"
    );


/* Navigation */

const navStudentName =
    document.getElementById(
        "navStudentName"
    );

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


/* Result */

const resultStatusBadge =
    document.getElementById(
        "resultStatusBadge"
    );

const resultMessage =
    document.getElementById(
        "resultMessage"
    );

const examTitle =
    document.getElementById(
        "examTitle"
    );

const submittedAt =
    document.getElementById(
        "submittedAt"
    );

const percentage =
    document.getElementById(
        "percentage"
    );

const scoreBreakdown =
    document.getElementById(
        "scoreBreakdown"
    );

const studentName =
    document.getElementById(
        "studentName"
    );

const registrationNumber =
    document.getElementById(
        "registrationNumber"
    );

const courseId =
    document.getElementById(
        "courseId"
    );

const submissionType =
    document.getElementById(
        "submissionType"
    );

const downloadResultButton =
    document.getElementById(
        "downloadResultButton"
    );

const downloadResultError =
    document.getElementById(
        "downloadResultError"
    );


/* ============================================
   AUTH / STORAGE
============================================ */

const token =
    localStorage.getItem(
        "examhub_token"
    );

const storedUser =
    localStorage.getItem(
        "examhub_user"
    );

const storedResult =
    sessionStorage.getItem(
        "examhub_exam_result"
    );


if (!token || !storedUser) {

    window.location.href =
        "../login.html";
}


/* ============================================
   STATE
============================================ */

let resultData = null;


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

            if (
                link.dataset.page
                    .toLowerCase() ===
                currentPage
            ) {

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
   FORMAT DATE
============================================ */

function formatDate(value) {

    if (!value) {
        return "Submitted —";
    }


    let date;


    if (
        typeof value === "object" &&
        value?._seconds
    ) {

        date =
            new Date(
                value._seconds * 1000
            );

    } else {

        date =
            new Date(value);
    }


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "Submitted";
    }


    return `Submitted ${date.toLocaleString(
        undefined,
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    )}`;
}


/* ============================================
   SHOW ERROR
============================================ */

function showError(message) {

    resultError.textContent =
        message;

    resultError.classList.remove(
        "hidden"
    );
}


/* ============================================
   LOAD STUDENT NAV INFO
============================================ */

function loadStudentNavigation() {

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
            "Load student navigation error:",
            error
        );

        handleLogout();
    }
}


/* ============================================
   LOAD STORED RESULT
============================================ */

function loadStoredResult() {

    /*
     * If there is no stored result,
     * Results was probably opened directly
     * from the navigation.
     *
     * In that case, fetch the student's
     * latest result instead.
     */

    if (!storedResult) {

        loadLatestResult();

        return;
    }


    try {

        resultData =
            JSON.parse(
                storedResult
            );


        if (
            resultData?.submissionConfirmation !== true &&
            !resultData?.sessionId &&
            !resultData?.resultId
        ) {

            throw new Error(
                "Invalid examination result."
            );
        }

        if (resultData.submissionConfirmation === true) {
            renderSubmissionConfirmation(resultData.autoSubmitted);
            return;
        }


        /*
         * Dashboard → View result
         *
         * Uses the secure released-result endpoint.
         */

        if (resultData.resultId) {

            loadReleasedResult();

            return;
        }


        /*
         * Exam submission → Result
         *
         * Uses the session result endpoint.
         */

        if (resultData.sessionId) {

            loadFullResult();

            return;
        }


        throw new Error(
            "Invalid examination result."
        );

    } catch (error) {

        console.error(
            "Load stored result error:",
            error
        );

        showError(
            "Unable to load your examination result."
        );

        resultLoading.classList.add(
            "hidden"
        );
    }
}

function renderSubmissionConfirmation(autoSubmitted) {
    resultLoading.classList.add("hidden");
    resultError.classList.add("hidden");
    resultContent.classList.add("hidden");
    submissionConfirmation.classList.remove("hidden");

    resultPageEyebrow.textContent = "Submission status";
    resultPageTitle.textContent = "Examination submitted";
    resultPageSubtitle.textContent =
        "Your submission is recorded. Scores are only available after results are released.";

    if (autoSubmitted === true) {
        submissionStatusBadge.textContent =
            "Automatically submitted";
        submissionStatusBadge.className =
            "badge badge-warning";
        submissionConfirmationTitle.textContent =
            "Time expired — your examination was submitted";
        submissionConfirmationMessage.textContent =
            "Your time expired and your examination was submitted automatically. Your result will be available here when it is released.";
    } else if (autoSubmitted === false) {
        submissionStatusBadge.textContent =
            "Examination submitted";
        submissionStatusBadge.className =
            "badge badge-success";
        submissionConfirmationTitle.textContent =
            "Your examination was submitted successfully";
        submissionConfirmationMessage.textContent =
            "Your submission has been recorded. Your result will be available here when it is released.";
    } else {
        submissionStatusBadge.textContent =
            "Examination already submitted";
        submissionStatusBadge.className =
            "badge badge-warning";
        submissionConfirmationTitle.textContent =
            "Your examination has already been submitted";
        submissionConfirmationMessage.textContent =
            "Your submission is recorded. Your result will be available here when it is released.";
    }
}


/* ============================================
   LOAD LATEST RESULT
============================================ */

async function loadLatestResult() {

    try {

        const response =
            await apiGet(
                "/student-results/me"
            );


        const results =
            response?.data || [];


        /*
         * No results yet.
         */

        if (results.length === 0) {

            showNoResultState();

            return;
        }


        const latest =
            results[0];


        /*
         * Store the result ID so the
         * secure individual endpoint
         * can be used.
         */

        if (latest?.id) {

            resultData = {
                resultId:
                    latest.id
            };


            sessionStorage.setItem(
                "examhub_exam_result",

                JSON.stringify(
                    resultData
                )
            );


            loadReleasedResult();

            return;
        }


        throw new Error(
            "Invalid result record."
        );

    } catch (error) {

        console.error(
            "Load latest result error:",
            error
        );


        if (error.status === 401) {

            handleLogout();

            return;
        }

        showError(
            error.data?.message ||
            "Unable to load your examination result."
        );

    } finally {

        resultLoading.classList.add(
            "hidden"
        );
    }
}


/* ============================================
   NO RESULT STATE
============================================ */

function showNoResultState() {

    resultStatusBadge.textContent =
        "No result";

    resultStatusBadge.className =
        "badge badge-primary";


    examTitle.textContent =
        "No examination result yet";


    submittedAt.textContent =
        "No completed examination";


    percentage.textContent =
        "—";


    scoreBreakdown.textContent =
        "—";


    studentName.textContent =
        "—";


    registrationNumber.textContent =
        "—";


    courseId.textContent =
        "—";


    submissionType.textContent =
        "—";


    resultMessage.textContent =
        "You have not completed an examination yet. Your result will appear here after you complete an examination.";


    resultContent.classList.remove(
        "hidden"
    );
}


/* ============================================
   LOAD SESSION RESULT
============================================ */

async function loadFullResult() {

    try {

        const sessionId =
            resultData.sessionId;


        if (!sessionId) {

            throw new Error(
                "Examination session was not found."
            );
        }


        const response =
            await apiGet(
                `/exam-sessions/${sessionId}/result`
            );


        const result =
            response?.data;


        if (!result) {

            throw new Error(
                "Invalid examination result."
            );
        }


        renderResult(result);

    } catch (error) {

        console.error(
            "Load full result error:",
            error
        );


        if (error.status === 401) {

            handleLogout();

            return;
        }

        if (error.status === 403) {
            showPendingResult();
            return;
        }


        showError(
            error.data?.message ||
            "Unable to load your examination result."
        );

    } finally {

        resultLoading.classList.add(
            "hidden"
        );
    }
}


/* ============================================
   RENDER SESSION RESULT
============================================ */

function renderResult(result) {

    examTitle.textContent =
        result.examTitle ||
        "Examination";


    studentName.textContent =
        result.fullName ||
        "—";


    registrationNumber.textContent =
        result.registrationNumber ||
        "—";


    courseId.textContent =
        result.courseId ||
        "—";


    percentage.textContent =
        `${result.percentage ?? 0}%`;


    scoreBreakdown.textContent =
        `${result.score ?? 0} / ${result.totalMarks ?? 0}`;


    submittedAt.textContent =
        formatDate(
            result.submittedAt
        );


    if (
        result.autoSubmitted ===
        true
    ) {

        resultStatusBadge.textContent =
            "Automatically submitted";

        resultStatusBadge.className =
            "badge badge-warning";


        resultMessage.textContent =
            "Your examination time expired and the examination was submitted automatically.";


        submissionType.textContent =
            "Automatic submission";

    } else {

        resultStatusBadge.textContent =
            "Examination submitted";

        resultStatusBadge.className =
            "badge badge-success";


        resultMessage.textContent =
            "Your examination has been submitted successfully.";


        submissionType.textContent =
            "Manual submission";
    }


    resultContent.classList.remove(
        "hidden"
    );
}


/* ============================================
   LOAD RELEASED RESULT
============================================ */

async function loadReleasedResult() {

    try {

        const response =
            await apiGet(
                `/student-results/me/${resultData.resultId}`
            );


        const data =
            response?.data;


        if (!data?.result) {

            throw new Error(
                "Invalid result response."
            );
        }


        renderReleasedResult(
            data
        );

    } catch (error) {

        console.error(
            "Load released result error:",
            error
        );


        if (error.status === 401) {

            handleLogout();

            return;
        }


        /*
         * A result may exist but not yet
         * be released to the student.
         */

        if (
            error.status === 403
        ) {

            showPendingResult();

            return;
        }


        showError(
            error.data?.message ||
            "Unable to load your examination result."
        );

    } finally {

        resultLoading.classList.add(
            "hidden"
        );
    }
}


/* ============================================
   RENDER RELEASED RESULT
============================================ */

function renderReleasedResult(data) {

    const result =
        data.result;

    const exam =
        data.exam;

    const course =
        data.course;


    examTitle.textContent =
        exam?.title ||
        "Examination";


    studentName.textContent =
        result.fullName ||
        "—";


    registrationNumber.textContent =
        result.registrationNumber ||
        "—";


    courseId.textContent =
        course?.name ||
        result.courseId ||
        "—";


    percentage.textContent =
        `${result.percentage ?? 0}%`;


    scoreBreakdown.textContent =
        `${result.score ?? 0} / ${result.totalMarks ?? 0}`;


    submittedAt.textContent =
        formatDate(
            result.submittedAt
        );


    resultStatusBadge.textContent =
        "Result available";

    resultStatusBadge.className =
        "badge badge-success";


    resultMessage.textContent =
        "Your examination result has been released and is available to view.";

    downloadResultButton.classList.toggle(
        "hidden",
        data.downloadEnabled !== true
    );
    downloadResultError.classList.add("hidden");
    downloadResultError.textContent = "";


    submissionType.textContent =
        result.autoSubmitted === true
            ? "Automatic submission"
            : "Manual submission";


    resultContent.classList.remove(
        "hidden"
    );
}

async function downloadReleasedResult() {
    if (
        !resultData?.resultId ||
        !downloadResultButton ||
        !downloadResultError
    ) {
        return;
    }

    downloadResultButton.disabled = true;
    downloadResultButton.textContent = "Preparing PDF...";
    downloadResultError.classList.add("hidden");
    downloadResultError.textContent = "";

    try {
        const response = await fetch(
            `${API_BASE_URL}/student-results/me/${encodeURIComponent(resultData.resultId)}/download`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (response.status === 401) {
            handleLogout();
            return;
        }

        if (!response.ok) {
            let message =
                "The result PDF could not be downloaded.";

            try {
                const errorResponse = await response.json();
                message =
                    errorResponse?.message || message;
            } catch {
                // Keep the user-facing fallback when the error response is not JSON.
            }

            throw new Error(message);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");
        downloadLink.href = objectUrl;
        downloadLink.download =
            `result-${resultData.resultId}.pdf`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        URL.revokeObjectURL(objectUrl);
    } catch (error) {
        console.error(
            "Download student result error:",
            error
        );
        downloadResultError.textContent =
            error.message ||
            "The result PDF could not be downloaded.";
        downloadResultError.classList.remove("hidden");
    } finally {
        downloadResultButton.disabled = false;
        downloadResultButton.textContent = "Download result";
    }
}


/* ============================================
   PENDING RESULT
============================================ */

function showPendingResult() {

    resultStatusBadge.textContent =
        "Result pending";

    resultStatusBadge.className =
        "badge badge-warning";


    examTitle.textContent =
        "Your result is pending";


    submittedAt.textContent =
        "Examination submitted";


    percentage.textContent =
        "—";


    scoreBreakdown.textContent =
        "—";


    studentName.textContent =
        "—";


    registrationNumber.textContent =
        "—";


    courseId.textContent =
        "—";


    submissionType.textContent =
        "Submitted";


    resultMessage.textContent =
        "Your examination has been submitted. Your result will appear here when it has been released.";


    resultContent.classList.remove(
        "hidden"
    );
}


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
        "examhub_exam_result"
    );

    sessionStorage.removeItem(
        "examhub_exam_session"
    );

    sessionStorage.removeItem(
        "examhub_pending_exam"
    );


    window.location.href =
        "../login.html";
}


sidebarLogoutButton.addEventListener(
    "click",
    handleLogout
);

downloadResultButton?.addEventListener(
    "click",
    downloadReleasedResult
);

document.querySelectorAll('a[href="./dashboard.html"]').forEach(
    (dashboardLink) => {
        dashboardLink.addEventListener("click", () => {
            sessionStorage.removeItem(
                "examhub_exam_result"
            );
        });
    }
);


/* ============================================
   INIT
============================================ */

setActiveStudentNav();

loadStudentNavigation();

loadStoredResult();