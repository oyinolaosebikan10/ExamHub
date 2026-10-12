(() => {
    "use strict";

    const STUDENTS_API_URL = "/students";
    const NOT_AVAILABLE = "Not available";

    let studentId = null;

    const loadingState = document.getElementById("studentDetailsLoadingState");
    const errorState = document.getElementById("studentDetailsErrorState");
    const errorTitle = document.getElementById("studentDetailsErrorTitle");
    const errorMessage = document.getElementById("studentDetailsErrorMessage");
    const retryButton = document.getElementById("retryStudentDetailsButton");
    const content = document.getElementById("studentDetailsContent");
    const accountStatus = document.getElementById("studentAccountStatus");

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        if (typeof setPageTitle === "function") {
            setPageTitle("Student Details");
        }

        document
            .querySelector('.sidebar-link[href="./students.html"]')
            ?.classList.add("active");

        retryButton?.addEventListener("click", loadStudentDetails);
        document
            .getElementById("exportStudentRecordButton")
            ?.addEventListener("click", exportStudentRecord);

        const params = new URLSearchParams(window.location.search);
        studentId = params.get("id")?.trim() || null;

        if (!studentId) {
            showError(
                "Student ID is missing",
                "Return to Students and select a student to view their details.",
                false
            );
            return;
        }

        loadStudentDetails();
    }

    async function loadStudentDetails() {
        if (!studentId) {
            return;
        }

        showLoading();

        try {
            const response = await adminFetch(
                `${STUDENTS_API_URL}/${encodeURIComponent(studentId)}`,
                { method: "GET" }
            );

            if (
                !response?.success ||
                !response.data ||
                typeof response.data !== "object" ||
                Array.isArray(response.data)
            ) {
                throw new Error("Unexpected student response.");
            }

            const record = response.data;
            const displayModel = createSafeDisplayModel(
                record,
                studentId
            );

            renderStudent(displayModel);
            showContent();
        } catch (error) {
            console.error("ExamHub student details request failed.", {
                errorName: error?.name || "Error"
            });

            if (error?.message === "Student not found") {
                showError(
                    "Student not found",
                    "This student record may have been removed or the link may be incorrect.",
                    false
                );
                return;
            }

            if (error?.message === "Access denied") {
                showError(
                    "Access denied",
                    "Your administrator account does not have permission to view this student.",
                    false
                );
                return;
            }

            showError(
                "Unable to load student details",
                "We couldn't retrieve this student record. Check your connection and try again.",
                true
            );
        }
    }

    function createSafeDisplayModel(record, requestedId) {
        return {
            studentId: normalizeIdentifier(record.id) || requestedId,
            fullName: getSafeString(record.fullName) || NOT_AVAILABLE,
            registrationNumber:
                getSafeString(record.registrationNumber) || NOT_AVAILABLE,
            phoneNumber: getSafeString(record.phoneNumber) || NOT_AVAILABLE,
            course: getSafeString(record.courseName) || NOT_AVAILABLE,
            accountStatus: getAccountStatus(record),
            createdAt: formatDate(record.createdAt),
            updatedAt: formatDate(record.updatedAt),
            associations: Array.isArray(record.associations)
                ? record.associations
                : [],
            results: Array.isArray(record.results)
                ? record.results
                : []
        };
    }

    function getAccountStatus(record) {
        if (typeof record.isActive === "boolean") {
            return record.isActive ? "Active" : "Inactive";
        }

        const status = getSafeString(record.status);
        if (!status) {
            return NOT_AVAILABLE;
        }

        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    function getSafeString(value) {
        if (typeof value === "string") {
            return value.trim();
        }

        if (typeof value === "number" && Number.isFinite(value)) {
            return String(value);
        }

        return "";
    }

    function normalizeIdentifier(value) {
        if (typeof value === "string" || typeof value === "number") {
            const identifier = String(value).trim();
            return identifier || null;
        }

        return null;
    }

    function parseDate(value) {
        if (!value) {
            return null;
        }

        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value;
        }

        if (
            typeof value === "object" &&
            typeof value._seconds === "number"
        ) {
            return new Date(
                value._seconds * 1000 +
                Math.floor((value._nanoseconds || 0) / 1000000)
            );
        }

        if (
            typeof value === "object" &&
            typeof value.seconds === "number"
        ) {
            return new Date(
                value.seconds * 1000 +
                Math.floor((value.nanoseconds || 0) / 1000000)
            );
        }

        if (typeof value === "number") {
            return new Date(value < 100000000000 ? value * 1000 : value);
        }

        if (typeof value === "string") {
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? null : date;
        }

        return null;
    }

    function formatDate(value) {
        const date = parseDate(value);
        if (!date) {
            return NOT_AVAILABLE;
        }

        try {
            return new Intl.DateTimeFormat("en-NG", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }).format(date);
        } catch {
            return NOT_AVAILABLE;
        }
    }

    function renderStudent(student) {
        setText("studentFullName", student.fullName);
        setText("studentHeroSubtitle", student.registrationNumber);
        setText("studentProfileRegistration", student.registrationNumber);
        setText("studentIdValue", student.studentId);
        setText("studentIdentityName", student.fullName);
        setText("studentRegistrationNumber", student.registrationNumber);
        setText("studentIdentityId", student.studentId);
        setText("studentPhoneNumber", student.phoneNumber);
        setText("studentCourseName", student.course);
        setText("studentAccountStatusDetail", student.accountStatus);
        setText("studentCreatedAt", student.createdAt);
        setText("studentUpdatedAt", student.updatedAt);
        const associations = student.associations;
        setText(
            "studentPrograms",
            uniqueLabels(associations, "programName")
        );
        setText(
            "studentSchools",
            uniqueLabels(associations, "schoolName")
        );
        setText(
            "studentOrganizationPrograms",
            uniqueLabels(
                associations.filter(
                    item => item.venueType === "organization"
                ),
                "programName"
            )
        );
        setText("studentInitials", getInitials(student.fullName));
        renderStudentResults(student.results);
        document.getElementById("exportStudentRecordButton").disabled = false;

        const statusClass = student.accountStatus === "Active"
            ? "status-success"
            : student.accountStatus === "Inactive"
                ? "status-danger"
                : "status-neutral";

        accountStatus.className = `status-badge ${statusClass}`;
        accountStatus.textContent = student.accountStatus;
    }

    function getInitials(fullName) {
        if (!fullName || fullName === NOT_AVAILABLE) {
            return "—";
        }

        return fullName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part.charAt(0).toUpperCase())
            .join("");
    }

        function uniqueLabels(records, key) {
            const labels = [
                ...new Set(
                    records
                        .map(record => getSafeString(record?.[key]))
                        .filter(Boolean)
                )
            ];

            return labels.length ? labels.join(", ") : NOT_AVAILABLE;
        }

        function renderStudentResults(results) {
            const list = document.getElementById("studentResultsList");
            const empty = document.getElementById("studentResultsEmpty");

            list.replaceChildren();
            empty.hidden = results.length !== 0;

            results.forEach(result => {
                const item = document.createElement("article");
                item.className = "student-result-row";

                const details = document.createElement("div");
                details.className = "student-result-details";

                const title = document.createElement("strong");
                title.textContent =
                    getSafeString(result.examName) ||
                    `Exam ${getSafeString(result.examId) || "unavailable"}`;

                const attempt = Math.max(
                    1,
                    Number(result.attemptNumber) || 1
                );
                const score = document.createElement("span");
                score.textContent =
                    `${result.score ?? "—"} / ${result.totalMarks ?? "—"} · ${
                        Number.isFinite(Number(result.percentage))
                            ? `${Number(result.percentage)}%`
                            : "—"
                    } · Attempt ${attempt}`;

                const submitted = document.createElement("time");
                submitted.textContent = formatDate(result.submittedAt);
                details.append(title, score, submitted);

                const download = document.createElement("button");
                download.type = "button";
                download.className = "btn btn-secondary student-result-download";
                download.textContent = "Download PDF";
                download.addEventListener("click", () =>
                    downloadStudentResultPdf(result.id, download)
                );

                item.append(details, download);
                list.appendChild(item);
            });
        }

        async function downloadStudentResultPdf(resultId, button) {
            if (!resultId) {
                return;
            }

            const feedback = document.getElementById(
                "studentResultsFeedback"
            );
            button.disabled = true;
            feedback.hidden = true;

            try {
                const token = getAdminToken();
                if (!token) {
                    throw new Error("Authentication required.");
                }

                const response = await fetch(
                    `${ADMIN_API_BASE_URL}/results/reports/student/${encodeURIComponent(resultId)}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                if (response.status === 401) {
                    clearAdminSession();
                    window.location.href = "./login.html";
                    return;
                }

                if (!response.ok) {
                    let message = "The result PDF could not be downloaded.";
                    try {
                        const body = await response.json();
                        message = body?.message || message;
                    } catch {
                        // Keep a clear fallback for non-JSON errors.
                    }
                    throw new Error(message);
                }

                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = objectUrl;
                link.download = `result-${resultId}.pdf`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(objectUrl);
            } catch (error) {
                console.error("Student result PDF export error:", error);
                feedback.textContent =
                    error.message || "The result PDF could not be downloaded.";
                feedback.hidden = false;
            } finally {
                button.disabled = false;
            }
        }

        async function exportStudentRecord() {
            const button = document.getElementById(
                "exportStudentRecordButton"
            );
            if (!studentId || !button) {
                return;
            }

            button.disabled = true;
            try {
                const token = getAdminToken();
                if (!token) {
                    throw new Error("Authentication required.");
                }

                const query = new URLSearchParams({ studentId });
                const response = await fetch(
                    `${ADMIN_API_BASE_URL}${STUDENTS_API_URL}/export?${query}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                if (response.status === 401) {
                    clearAdminSession();
                    window.location.href = "./login.html";
                    return;
                }

                if (!response.ok) {
                    let message = "The student CSV could not be exported.";
                    try {
                        const body = await response.json();
                        message = body?.message || message;
                    } catch {
                        // Keep the fallback for non-JSON responses.
                    }
                    throw new Error(message);
                }

                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = objectUrl;
                link.download = "examhub-student.csv";
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(objectUrl);
            } catch (error) {
                console.error("Student CSV export error:", error);
                const feedback = document.getElementById(
                    "studentResultsFeedback"
                );
                feedback.textContent =
                    error.message || "The student CSV could not be exported.";
                feedback.hidden = false;
            } finally {
                button.disabled = false;
            }
        }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value || NOT_AVAILABLE;
        }
    }

    function showLoading() {
        loadingState.hidden = false;
        errorState.hidden = true;
        content.hidden = true;
    }

    function showContent() {
        loadingState.hidden = true;
        errorState.hidden = true;
        content.hidden = false;
    }

    function showError(title, message, canRetry) {
        loadingState.hidden = true;
        content.hidden = true;
        errorState.hidden = false;
        errorTitle.textContent = title;
        errorMessage.textContent = message;
        retryButton.hidden = !canRetry;
    }
})();
