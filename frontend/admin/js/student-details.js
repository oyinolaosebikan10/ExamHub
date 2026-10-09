(() => {
    "use strict";

    const STUDENTS_API_URL = "/students";
    const COURSES_API_URL = "/courses";
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
            const courseId = normalizeIdentifier(record.courseId);
            const courseName = courseId
                ? await loadCourseName(courseId)
                : NOT_AVAILABLE;
            const displayModel = createSafeDisplayModel(
                record,
                studentId,
                courseName
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

    async function loadCourseName(courseId) {
        const response = await adminFetch(
            COURSES_API_URL,
            { method: "GET" }
        );

        if (!response?.success || !Array.isArray(response.data)) {
            throw new Error("Unexpected courses response.");
        }

        const courseNames = createCourseNameMap(response.data);
        return courseNames.get(courseId) || "Unknown course";
    }

    function createCourseNameMap(courses) {
        const courseNames = new Map();

        courses.forEach(course => {
            const id = normalizeIdentifier(course?.id);
            const name = getSafeString(course?.name);

            if (id && name) {
                courseNames.set(id, name);
            }
        });

        return courseNames;
    }

    function createSafeDisplayModel(record, requestedId, courseName) {
        return {
            studentId: normalizeIdentifier(record.id) || requestedId,
            fullName: getSafeString(record.fullName) || NOT_AVAILABLE,
            registrationNumber:
                getSafeString(record.registrationNumber) || NOT_AVAILABLE,
            phoneNumber: getSafeString(record.phoneNumber) || NOT_AVAILABLE,
            course: courseName || "Unknown course",
            accountStatus: getAccountStatus(record),
            createdAt: formatDate(record.createdAt),
            updatedAt: formatDate(record.updatedAt)
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
        setText("studentInitials", getInitials(student.fullName));

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
