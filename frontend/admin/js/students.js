const STUDENTS_API_URL = "/students";
const COURSES_API_URL = "/courses";
const STUDENT_FIELDS = [
    "fullName",
    "registrationNumber",
    "phoneNumber",
    "courseId",
    "status",
    "isActive",
    "createdAt",
    "updatedAt"
];

let students = [];
let courseNames = new Map();
let coursesLoaded = false;
let pendingStatusChange = null;
let statusChangeInProgress = false;
let lastStatusTrigger = null;

const studentSearch = document.getElementById("studentSearch");
const studentStatusFilter = document.getElementById("studentStatusFilter");
const studentsTableBody = document.getElementById("studentsTableBody");
const studentsTableWrapper = document.getElementById("studentsTableWrapper");
const studentsLoading = document.getElementById("studentsLoading");
const studentsEmpty = document.getElementById("studentsEmpty");
const studentsError = document.getElementById("studentsError");
const refreshStudentsBtn = document.getElementById("refreshStudentsBtn");

const studentConfirmModal = document.getElementById("studentConfirmModal");
const confirmStudentActionBtn = document.getElementById("confirmStudentActionBtn");
const confirmStudentSpinner = document.getElementById("confirmStudentSpinner");
const cancelStudentConfirmBtn = document.getElementById("cancelStudentConfirmBtn");

document.addEventListener("DOMContentLoaded", async () => {
    if (typeof setPageTitle === "function") {
        setPageTitle("Students");
    }

    bindStudentEvents();

    await loadStudents();
});

function bindStudentEvents() {
    studentSearch?.addEventListener("input", renderStudents);
    studentStatusFilter?.addEventListener("change", renderStudents);
    studentsTableBody?.addEventListener("click", handleStudentTableAction);
    refreshStudentsBtn?.addEventListener("click", () => loadStudents());

    document.getElementById("retryStudentsBtn")
        ?.addEventListener("click", () => loadStudents());

    document.getElementById("clearStudentFiltersBtn")
        ?.addEventListener("click", clearStudentFilters);

    cancelStudentConfirmBtn?.addEventListener("click", closeStudentConfirmation);
    confirmStudentActionBtn?.addEventListener("click", executeStudentStatusChange);

    studentConfirmModal?.addEventListener("click", event => {
        if (event.target === studentConfirmModal && !statusChangeInProgress) {
            closeStudentConfirmation();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") {
            return;
        }

        if (studentConfirmModal && !studentConfirmModal.classList.contains("hidden")) {
            if (!statusChangeInProgress) {
                closeStudentConfirmation();
            }
            return;
        }

    });
}

async function loadStudents() {
    setStudentsLoadingState();

    try {
        const requests = [
            adminFetch(STUDENTS_API_URL, { method: "GET" })
        ];

        if (!coursesLoaded) {
            requests.push(adminFetch(COURSES_API_URL, { method: "GET" }));
        }

        const results = await Promise.allSettled(requests);
        const studentResult = results[0];
        const courseResult = results[1];

        if (courseResult?.status === "fulfilled") {
            const response = courseResult.value;
            if (!response?.success || !Array.isArray(response.data)) {
                throw new Error("The courses endpoint returned an unexpected response.");
            }
            courseNames = createCourseNameMap(response.data);
            coursesLoaded = true;
        }

        if (studentResult.status === "rejected") {
            throw studentResult.reason;
        }

        const studentResponse = studentResult.value;
        if (!studentResponse?.success || !Array.isArray(studentResponse.data)) {
            throw new Error("The students endpoint returned an unexpected response.");
        }

        if (!coursesLoaded && courseResult?.status === "rejected") {
            throw courseResult.reason;
        }

        const nextStudents = studentResponse.data.map(normalizeStudent);

        students = nextStudents;

        updateStudentSummary();
        renderStudents();
        hideStudentsLoadingState();
        setStudentControlsDisabled(false);
    } catch (error) {
        console.error("ExamHub students loading error:", error);
        showStudentsError("Unable to load student records. Please try again.");
        setStudentControlsDisabled(false);
    }
}

function createCourseNameMap(courseRecords) {
    const names = new Map();

    courseRecords.forEach(course => {
        const id = normalizeIdentifier(course?.id);
        const name = typeof course?.name === "string"
            ? course.name.trim()
            : "";

        if (id && name) {
            names.set(id, name);
        }
    });

    return names;
}

function normalizeStudent(record) {
    const studentId = normalizeIdentifier(record?.id ?? record?.studentId);
    const student = { id: studentId };

    STUDENT_FIELDS.forEach(field => {
        if (Object.prototype.hasOwnProperty.call(record || {}, field)) {
            student[field] = record[field];
        }
    });

    return student;
}

function normalizeIdentifier(value) {
    if (typeof value === "string" || typeof value === "number") {
        const identifier = String(value).trim();
        return identifier || null;
    }

    return null;
}

function getStudentActiveState(student) {
    if (typeof student?.isActive === "boolean") {
        return student.isActive;
    }

    if (typeof student?.status === "string") {
        const status = student.status.trim().toLowerCase();
        if (status === "active") {
            return true;
        }
        if (status === "inactive") {
            return false;
        }
    }

    return null;
}

function updateStudentSummary() {
    const activeCount = students.filter(
        student => getStudentActiveState(student) === true
    ).length;
    const inactiveCount = students.filter(
        student => getStudentActiveState(student) === false
    ).length;
    const representedCourseIds = new Set(
        students
            .map(student => normalizeIdentifier(student.courseId))
            .filter(Boolean)
    );

    setText("totalStudents", students.length);
    setText("activeStudents", activeCount);
    setText("inactiveStudents", inactiveCount);
    setText("representedCourses", representedCourseIds.size);
}

function getFilteredStudents() {
    const searchTerm = (studentSearch?.value || "").trim().toLowerCase();
    const statusFilter = studentStatusFilter?.value || "all";

    return students.filter(student => {
        const searchableFields = [
            student.fullName,
            student.registrationNumber,
            student.phoneNumber,
            student.id
        ];
        const matchesSearch = !searchTerm || searchableFields.some(value =>
            typeof value === "string" && value.toLowerCase().includes(searchTerm)
        );
        const activeState = getStudentActiveState(student);
        const matchesStatus = statusFilter === "all" ||
            (statusFilter === "active" && activeState === true) ||
            (statusFilter === "inactive" && activeState === false);

        return matchesSearch && matchesStatus;
    });
}

function renderStudents() {
    if (!studentsTableBody || !studentsTableWrapper) {
        return;
    }

    const filteredStudents = getFilteredStudents();
    studentsTableBody.replaceChildren();
    setText(
        "studentCount",
        `${filteredStudents.length} ${filteredStudents.length === 1 ? "student" : "students"}`
    );

    if (students.length === 0 || filteredStudents.length === 0) {
        studentsTableWrapper.classList.add("hidden");
        studentsEmpty?.classList.remove("hidden");

        const hasFilters = Boolean(
            (studentSearch?.value || "").trim() ||
            (studentStatusFilter?.value || "all") !== "all"
        );

        setText(
            "studentsEmptyTitle",
            students.length === 0 ? "No students yet" : "No matching students"
        );
        setText(
            "studentsEmptyMessage",
            students.length === 0
                ? "There are currently no students registered in the system."
                : "No student records match your current search or status filter."
        );
        document.getElementById("clearStudentFiltersBtn")
            ?.classList.toggle("hidden", !hasFilters);
        return;
    }

    studentsEmpty?.classList.add("hidden");
    studentsError?.classList.add("hidden");
    studentsTableWrapper.classList.remove("hidden");

    const rows = filteredStudents.map(createStudentRow);
    studentsTableBody.append(...rows);
}

function createStudentRow(student) {
    const row = document.createElement("tr");
    const status = getStudentActiveState(student);
    const safeId = escapeStudentHtml(student.id || "");
    const displayName = safeDisplayValue(student.fullName);
    const studentName = displayName || "Name unavailable";
    const registrationNumber = safeDisplayValue(student.registrationNumber) || "—";
    const phoneNumber = safeDisplayValue(student.phoneNumber) || "—";
    const courseId = normalizeIdentifier(student.courseId);
    const courseName = courseId ? courseNames.get(courseId) : null;
    const courseContent = courseName
        ? `<span>${escapeStudentHtml(courseName)}</span>`
        : courseId
            ? `<span>Course not found</span><small>${escapeStudentHtml(courseId)}</small>`
            : "—";
    const statusMarkup = getStatusBadgeMarkup(status);
    const statusAction = status === true ? "deactivate" : "activate";
    const statusLabel = statusAction === "activate" ? "Activate" : "Deactivate";
    const statusButtonClass = statusAction === "activate"
        ? "student-action-button activate-action"
        : "student-action-button deactivate-action";
    const actionMarkup = student.id
        ? `<div class="student-row-actions">
                <button type="button" class="student-action-button view-action"
                    data-action="view" data-student-id="${safeId}">View</button>
                <button type="button" class="${statusButtonClass}"
                    data-action="${statusAction}" data-student-id="${safeId}">${statusLabel}</button>
           </div>`
        : `<span class="student-action-unavailable">Unavailable</span>`;

    row.innerHTML = `
        <td>
            <div class="student-name-cell">
                <strong>${escapeStudentHtml(studentName)}</strong>
            </div>
        </td>
        <td><span class="student-registration">${escapeStudentHtml(registrationNumber)}</span></td>
        <td><div class="student-course-cell">${courseContent}</div></td>
        <td>${escapeStudentHtml(phoneNumber)}</td>
        <td>${statusMarkup}</td>
        <td>${escapeStudentHtml(formatDate(student.createdAt))}</td>
        <td>${actionMarkup}</td>
    `;

    return row;
}

function getStatusBadgeMarkup(activeState) {
    if (activeState === true) {
        return '<span class="status-badge status-success">Active</span>';
    }
    if (activeState === false) {
        return '<span class="status-badge status-danger">Inactive</span>';
    }
    return '<span class="status-badge status-neutral">Unknown</span>';
}

function safeDisplayValue(value) {
    if (typeof value === "string") {
        return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }
    return "";
}

function parseDateValue(value) {
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
    const date = parseDateValue(value);
    if (!date) {
        return "—";
    }

    try {
        return new Intl.DateTimeFormat("en-NG", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(date);
    } catch {
        return "—";
    }
}

function handleStudentTableAction(event) {
    const button = event.target.closest("[data-action][data-student-id]");
    if (!button || button.disabled) {
        return;
    }

    const student = students.find(
        item => item.id === button.dataset.studentId
    );
    if (!student) {
        return;
    }

    if (button.dataset.action === "view") {
        window.location.href =
            `./student-details.html?id=${encodeURIComponent(student.id)}`;
        return;
    }

    if (
        button.dataset.action === "activate" ||
        button.dataset.action === "deactivate"
    ) {
        openStudentConfirmation(
            student,
            button.dataset.action === "activate",
            button
        );
    }
}

function openStudentConfirmation(student, activate, trigger) {
    pendingStatusChange = {
        studentId: student.id,
        activate
    };
    lastStatusTrigger = trigger;
    setText(
        "studentConfirmTitle",
        activate ? "Activate student account?" : "Deactivate student account?"
    );
    setText(
        "studentConfirmMessage",
        `${activate ? "Activate" : "Deactivate"} the account for ${
            safeDisplayValue(student.fullName) || "this student"
        }?`
    );
    document.getElementById("studentConfirmError")?.classList.add("hidden");
    setText("confirmStudentActionText", activate ? "Activate account" : "Deactivate account");

    if (confirmStudentActionBtn) {
        confirmStudentActionBtn.classList.toggle("danger-button", !activate);
    }

    studentConfirmModal?.classList.remove("hidden");
    studentConfirmModal?.setAttribute("aria-hidden", "false");
    syncModalScrollLock();
    cancelStudentConfirmBtn?.focus();
}

function closeStudentConfirmation() {
    if (!studentConfirmModal || statusChangeInProgress) {
        return;
    }

    pendingStatusChange = null;
    studentConfirmModal.classList.add("hidden");
    studentConfirmModal.setAttribute("aria-hidden", "true");
    document.getElementById("studentConfirmError")?.classList.add("hidden");
    syncModalScrollLock();

    if (lastStatusTrigger?.isConnected) {
        lastStatusTrigger.focus();
    }
    lastStatusTrigger = null;
}

async function executeStudentStatusChange() {
    if (!pendingStatusChange || statusChangeInProgress) {
        return;
    }

    const { studentId, activate } = pendingStatusChange;
    statusChangeInProgress = true;
    confirmStudentActionBtn.disabled = true;
    cancelStudentConfirmBtn.disabled = true;
    confirmStudentSpinner?.classList.remove("hidden");
    document.getElementById("studentConfirmError")?.classList.add("hidden");

    try {
        const response = await adminFetch(
            `${STUDENTS_API_URL}/${encodeURIComponent(studentId)}/status`,
            {
                method: "PATCH",
                body: { isActive: activate }
            }
        );

        if (!response?.success || !response.data || typeof response.data !== "object") {
            throw new Error("The student status endpoint returned an unexpected response.");
        }

        const updatedStudent = normalizeStudent(response.data);
        updatedStudent.id = studentId;

        const index = students.findIndex(student => student.id === studentId);
        if (index !== -1) {
            students[index] = { ...students[index], ...updatedStudent };
        }

        updateStudentSummary();
        renderStudents();
        studentConfirmModal?.classList.add("hidden");
        studentConfirmModal?.setAttribute("aria-hidden", "true");
        pendingStatusChange = null;
        syncModalScrollLock();
        lastStatusTrigger = null;
        studentSearch?.focus();
    } catch (error) {
        console.error("ExamHub student status update error:", error);
        const message = document.getElementById("studentConfirmError");
        if (message) {
            message.textContent = "Unable to update the student's status. Please try again.";
            message.classList.remove("hidden");
        }
    } finally {
        statusChangeInProgress = false;
        if (confirmStudentActionBtn) {
            confirmStudentActionBtn.disabled = false;
        }
        if (cancelStudentConfirmBtn) {
            cancelStudentConfirmBtn.disabled = false;
        }
        confirmStudentSpinner?.classList.add("hidden");
    }
}

function clearStudentFilters() {
    if (studentSearch) {
        studentSearch.value = "";
    }
    if (studentStatusFilter) {
        studentStatusFilter.value = "all";
    }
    renderStudents();
    studentSearch?.focus();
}

function setStudentsLoadingState() {
    studentsLoading?.classList.remove("hidden");
    studentsTableWrapper?.classList.add("hidden");
    studentsEmpty?.classList.add("hidden");
    studentsError?.classList.add("hidden");
    setText("totalStudents", "—");
    setText("activeStudents", "—");
    setText("inactiveStudents", "—");
    setText("representedCourses", "—");
    setText("studentCount", "Loading...");
    setStudentControlsDisabled(true);
}

function hideStudentsLoadingState() {
    studentsLoading?.classList.add("hidden");
}

function showStudentsError(message) {
    hideStudentsLoadingState();
    studentsTableWrapper?.classList.add("hidden");
    studentsEmpty?.classList.add("hidden");
    studentsError?.classList.remove("hidden");
    setText("studentsErrorText", message);
    setText("studentCount", "Unavailable");
    setText("totalStudents", "—");
    setText("activeStudents", "—");
    setText("inactiveStudents", "—");
    setText("representedCourses", "—");
}

function setStudentControlsDisabled(disabled) {
    if (studentSearch) {
        studentSearch.disabled = disabled;
    }
    if (studentStatusFilter) {
        studentStatusFilter.disabled = disabled;
    }
    if (refreshStudentsBtn) {
        refreshStudentsBtn.disabled = disabled;
    }
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = String(value);
    }
}

function syncModalScrollLock() {
    const confirmationOpen = studentConfirmModal &&
        !studentConfirmModal.classList.contains("hidden");

    document.body.classList.toggle(
        "student-modal-open",
        Boolean(confirmationOpen)
    );
}

function escapeStudentHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}