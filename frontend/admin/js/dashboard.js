/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/

document.addEventListener(
    "DOMContentLoaded",
    () => {
        loadDashboard();
    }
);


/*
|--------------------------------------------------------------------------
| Load dashboard
|--------------------------------------------------------------------------
*/

const loadDashboard = async () => {
    try {
        const [
            studentsResult,
            programsResult,
            coursesResult,
            examsResult,
            resultsResult
        ] = await Promise.all([
            adminFetch("/students"),
            adminFetch("/programs"),
            adminFetch("/courses"),
            adminFetch("/exams"),
            adminFetch("/results")
        ]);

        const students =
            extractDataArray(
                studentsResult
            );

        const programs =
            extractDataArray(
                programsResult
            );

        const courses =
            extractDataArray(
                coursesResult
            );

        const exams =
            extractDataArray(
                examsResult
            );

        const results =
            extractDataArray(
                resultsResult
            );

        updateStatistics({
            students,
            programs,
            courses,
            exams
        });

        renderRecentExams(exams);
        renderRecentResults(results);

    } catch (error) {
        console.error(
            "Dashboard loading error:",
            error
        );

        showDashboardError(
            error.message
        );
    }
};


/*
|--------------------------------------------------------------------------
| Extract arrays from API responses
|--------------------------------------------------------------------------
*/

const extractDataArray = (result) => {
    if (Array.isArray(result)) {
        return result;
    }

    if (Array.isArray(result?.data)) {
        return result.data;
    }

    if (Array.isArray(result?.data?.items)) {
        return result.data.items;
    }

    if (Array.isArray(result?.data?.results)) {
        return result.data.results;
    }

    if (Array.isArray(result?.results)) {
        return result.results;
    }

    return [];
};


/*
|--------------------------------------------------------------------------
| Statistics
|--------------------------------------------------------------------------
*/

const updateStatistics = ({
    students,
    programs,
    courses,
    exams
}) => {
    const studentsCount =
        document.getElementById(
            "studentsCount"
        );

    const programsCount =
        document.getElementById(
            "programsCount"
        );

    const coursesCount =
        document.getElementById(
            "coursesCount"
        );

    const examsCount =
        document.getElementById(
            "examsCount"
        );

    if (studentsCount) {
        studentsCount.textContent =
            students.length;
    }

    if (programsCount) {
        programsCount.textContent =
            programs.length;
    }

    if (coursesCount) {
        coursesCount.textContent =
            courses.length;
    }

    if (examsCount) {
        examsCount.textContent =
            exams.length;
    }
};


/*
|--------------------------------------------------------------------------
| Recent exams
|--------------------------------------------------------------------------
*/

const renderRecentExams = (exams) => {
    const container =
        document.getElementById(
            "recentExams"
        );

    if (!container) {
        return;
    }

    if (!exams.length) {
        container.innerHTML = `
            <div class="dashboard-empty">
                No examinations have been created yet.
            </div>
        `;

        return;
    }

    const sortedExams =
        [...exams]
            .sort(
                (a, b) =>
                    getTimestamp(
                        b.createdAt
                    ) -
                    getTimestamp(
                        a.createdAt
                    )
            )
            .slice(0, 5);

    container.innerHTML =
        sortedExams
            .map((exam) => {
                const title =
                    exam.title ||
                    "Untitled exam";

                const status =
                    exam.status ||
                    "active";

                const duration =
                    exam.durationMinutes
                        ? `${exam.durationMinutes} min`
                        : "—";

                return `
                    <div class="dashboard-list-item">

                        <div class="list-item-icon">
                            ▣
                        </div>

                        <div class="list-item-content">
                            <span class="list-item-title">
                                ${escapeHtml(title)}
                            </span>

                            <span class="list-item-meta">
                                ${escapeHtml(
                                    formatStatus(status)
                                )}
                            </span>
                        </div>

                        <span class="list-item-value">
                            ${escapeHtml(duration)}
                        </span>

                    </div>
                `;
            })
            .join("");
};


/*
|--------------------------------------------------------------------------
| Recent results
|--------------------------------------------------------------------------
*/

const renderRecentResults = (results) => {
    const container =
        document.getElementById(
            "recentResults"
        );

    if (!container) {
        return;
    }

    if (!results.length) {
        container.innerHTML = `
            <div class="dashboard-empty">
                No examination results have been submitted yet.
            </div>
        `;

        return;
    }

    const sortedResults =
        [...results]
            .sort(
                (a, b) =>
                    getTimestamp(
                        b.submittedAt
                    ) -
                    getTimestamp(
                        a.submittedAt
                    )
            )
            .slice(0, 5);

    container.innerHTML =
        sortedResults
            .map((result) => {
                const name =
                    result.fullName ||
                    result.studentName ||
                    result.student?.fullName ||
                    "Student";

                const exam =
                    result.examTitle ||
                    result.examName ||
                    result.title ||
                    "Examination";

                const percentage =
                    result.percentage !== undefined &&
                    result.percentage !== null
                        ? `${result.percentage}%`
                        : "—";

                return `
                    <div class="dashboard-list-item">

                        <div class="list-item-icon">
                            ✓
                        </div>

                        <div class="list-item-content">
                            <span class="list-item-title">
                                ${escapeHtml(name)}
                            </span>

                            <span class="list-item-meta">
                                ${escapeHtml(exam)}
                            </span>
                        </div>

                        <span class="list-item-value">
                            ${escapeHtml(percentage)}
                        </span>

                    </div>
                `;
            })
            .join("");
};


/*
|--------------------------------------------------------------------------
| Formatting helpers
|--------------------------------------------------------------------------
*/

const getTimestamp = (value) => {
    if (!value) {
        return 0;
    }

    if (
        typeof value === "object" &&
        value._seconds
    ) {
        return value._seconds * 1000;
    }

    if (
        typeof value === "object" &&
        value.seconds
    ) {
        return value.seconds * 1000;
    }

    const timestamp =
        new Date(value).getTime();

    return Number.isNaN(timestamp)
        ? 0
        : timestamp;
};

const formatStatus = (status) => {
    if (!status) {
        return "Unknown";
    }

    return String(status)
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, char =>
            char.toUpperCase()
        );
};


/*
|--------------------------------------------------------------------------
| Dashboard error
|--------------------------------------------------------------------------
*/

const showDashboardError = (message) => {
    const examContainer =
        document.getElementById(
            "recentExams"
        );

    const resultContainer =
        document.getElementById(
            "recentResults"
        );

    const errorMessage =
        message ||
        "Unable to load dashboard data.";

    if (examContainer) {
        examContainer.innerHTML = `
            <div class="error-state">
                <h3>Unable to load data</h3>
                <p>
                    ${escapeHtml(errorMessage)}
                </p>
            </div>
        `;
    }

    if (resultContainer) {
        resultContainer.innerHTML = `
            <div class="error-state">
                <h3>Unable to load data</h3>
                <p>
                    Please refresh the page and try again.
                </p>
            </div>
        `;
    }

    [
        "studentsCount",
        "programsCount",
        "coursesCount",
        "examsCount"
    ].forEach((id) => {
        const element =
            document.getElementById(id);

        if (element) {
            element.textContent = "—";
        }
    });
};