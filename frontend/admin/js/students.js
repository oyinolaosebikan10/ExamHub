const STUDENTS_API_URL = "/students";
const COURSES_API_URL = "/courses";
const PROGRAMS_API_URL = "/programs";
const SCHOOLS_API_URL = "/schools";
const STUDENT_PAGE_SIZE = 50;
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
let programs = [];
let schools = [];
let currentPage = 1;
let totalPages = 1;
let studentSummary = null;
let matchingStudentCount = 0;
let studentRequestVersion = 0;
let searchDebounce = null;
let pendingStatusChange = null;
let statusChangeInProgress = false;
let lastStatusTrigger = null;

const studentSearch = document.getElementById("studentSearch");
const studentStatusFilter = document.getElementById("studentStatusFilter");
const studentProgramFilter = document.getElementById("studentProgramFilter");
const studentSchoolFilter = document.getElementById("studentSchoolFilter");
const studentsTableBody = document.getElementById("studentsTableBody");
const studentsTableWrapper = document.getElementById("studentsTableWrapper");
const studentsLoading = document.getElementById("studentsLoading");
const studentsEmpty = document.getElementById("studentsEmpty");
const studentsError = document.getElementById("studentsError");
const refreshStudentsBtn = document.getElementById("refreshStudentsBtn");
const exportStudentsBtn = document.getElementById("exportStudentsBtn");

const studentConfirmModal = document.getElementById("studentConfirmModal");
const confirmStudentActionBtn = document.getElementById("confirmStudentActionBtn");
const confirmStudentSpinner = document.getElementById("confirmStudentSpinner");
const cancelStudentConfirmBtn = document.getElementById("cancelStudentConfirmBtn");

document.addEventListener("DOMContentLoaded", async () => {
    if (typeof setPageTitle === "function") {
        setPageTitle("Students");
    }

    bindStudentEvents();

    if (await loadReferenceData()) {
        await loadStudents();
    }
});

function bindStudentEvents() {
    studentSearch?.addEventListener("input", () => {
        window.clearTimeout(searchDebounce);
        searchDebounce = window.setTimeout(() => {
            currentPage = 1;
            loadStudents();
        }, 250);
    });
    [
        studentStatusFilter,
        studentProgramFilter,
        studentSchoolFilter
    ].forEach(control => control?.addEventListener("change", () => {
        currentPage = 1;
        loadStudents();
    }));
    studentsTableBody?.addEventListener("click", handleStudentTableAction);
    refreshStudentsBtn?.addEventListener("click", () => loadStudents());
    exportStudentsBtn?.addEventListener("click", exportStudentDirectory);
    document.getElementById("previousStudentsPageBtn")
        ?.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage -= 1;
                loadStudents();
            }
        });
    document.getElementById("nextStudentsPageBtn")
        ?.addEventListener("click", () => {
            if (currentPage < totalPages) {
                currentPage += 1;
                loadStudents();
            }
        });

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

async function loadReferenceData() {
    try {
        const [coursesResponse, programsResponse, schoolsResponse] =
            await Promise.all([
                adminFetch(COURSES_API_URL),
                adminFetch(PROGRAMS_API_URL),
                adminFetch(SCHOOLS_API_URL)
            ]);

        if (
            coursesResponse?.success !== true ||
            !Array.isArray(coursesResponse.data) ||
            programsResponse?.success !== true ||
            !Array.isArray(programsResponse.data) ||
            schoolsResponse?.success !== true ||
            !Array.isArray(schoolsResponse.data)
        ) {
            throw new Error(
                "An academic reference endpoint returned an unexpected response."
            );
        }

        courseNames = createCourseNameMap(coursesResponse.data);
        programs = programsResponse.data;
        schools = schoolsResponse.data;
        populateStudentFilter(
            studentProgramFilter,
            programs,
            "All programs"
        );
        populateStudentFilter(
            studentSchoolFilter,
            schools,
            "All schools"
        );
        return true;
    } catch (error) {
        console.error("Student directory reference data error:", error);
        showStudentsError(
            "Unable to load programs, schools, and courses for student filters."
        );
        return false;
    }
}

async function loadStudents() {
    const requestVersion = ++studentRequestVersion;
    setStudentsLoadingState();

    try {
        const query = new URLSearchParams({
            page: String(currentPage),
            limit: String(STUDENT_PAGE_SIZE),
            search: (studentSearch?.value || "").trim(),
            status: studentStatusFilter?.value || "all"
        });
        if (studentProgramFilter?.value !== "all") {
            query.set("programId", studentProgramFilter.value);
        }
        if (studentSchoolFilter?.value !== "all") {
            query.set("schoolId", studentSchoolFilter.value);
        }

        const studentResponse = await adminFetch(
            `${STUDENTS_API_URL}?${query.toString()}`,
            { method: "GET" }
        );

        if (requestVersion !== studentRequestVersion) {
            return;
        }

        if (
            studentResponse?.success !== true ||
            !Array.isArray(studentResponse.data) ||
            !studentResponse.pagination ||
            !studentResponse.summary
        ) {
            throw new Error(
                "The students endpoint returned an unexpected response."
            );
        }

        students = studentResponse.data.map(normalizeStudent);
        studentSummary = studentResponse.summary;
        matchingStudentCount = Number(studentResponse.count) || 0;
        currentPage = Number(studentResponse.pagination.page) || 1;
        totalPages = Math.max(
            1,
            Number(studentResponse.pagination.totalPages) || 1
        );

        updateStudentSummary();
        renderStudents();
        hideStudentsLoadingState();
        setStudentControlsDisabled(false);
        updateStudentPagination();
        if (exportStudentsBtn) {
            exportStudentsBtn.disabled = matchingStudentCount === 0;
        }
    } catch (error) {
        if (requestVersion !== studentRequestVersion) {
            return;
        }
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
    student.associations = Array.isArray(record?.associations)
        ? record.associations
        : [];

    return student;
}

function populateStudentFilter(select, records, firstLabel) {
    if (!select) {
        return;
    }

    const selected = select.value || "all";
    select.replaceChildren(new Option(firstLabel, "all"));
    records
        .filter(record =>
            record?.id &&
            typeof record.name === "string" &&
            record.name.trim()
        )
        .sort((left, right) =>
            left.name.localeCompare(right.name)
        )
        .forEach(record =>
            select.add(new Option(record.name, String(record.id)))
        );
    select.value = Array.from(select.options).some(
        option => option.value === selected
    )
        ? selected
        : "all";
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
    setText("totalStudents", studentSummary?.total ?? students.length);
    setText("activeStudents", studentSummary?.active ?? 0);
    setText("inactiveStudents", studentSummary?.inactive ?? 0);
    setText(
        "representedCourses",
        studentSummary?.representedCourses ?? 0
    );
}

function getFilteredStudents() {
    return students;
}

function renderStudents() {
    if (!studentsTableBody || !studentsTableWrapper) {
        return;
    }

    const filteredStudents = getFilteredStudents();
    studentsTableBody.replaceChildren();
    setText(
        "studentCount",
        `${matchingStudentCount} ${
            matchingStudentCount === 1
                ? "student"
                : "students"
        }`
    );

    if (matchingStudentCount === 0 || filteredStudents.length === 0) {
        studentsTableWrapper.classList.add("hidden");
        studentsEmpty?.classList.remove("hidden");

        const hasFilters = Boolean(
            (studentSearch?.value || "").trim() ||
            (studentStatusFilter?.value || "all") !== "all" ||
            studentProgramFilter?.value !== "all" ||
            studentSchoolFilter?.value !== "all"
        );

        setText(
            "studentsEmptyTitle",
            (studentSummary?.total ?? 0) === 0
                ? "No students yet"
                : "No matching students"
        );
        setText(
            "studentsEmptyMessage",
            (studentSummary?.total ?? 0) === 0
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
                <button type="button" class="student-action-button delete-action"
                    data-action="delete" data-student-id="${safeId}">Delete</button>
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
            button.dataset.action,
            button
        );
        return;
    }
    if (button.dataset.action === "delete") {
        openStudentConfirmation(student, "delete", button);
    }
}

function openStudentConfirmation(student, action, trigger) {
    const isDelete = action === "delete";
    const activate = action === "activate";
    pendingStatusChange = {
        studentId: student.id,
        action,
        activate
    };
    lastStatusTrigger = trigger;
    setText(
        "studentConfirmTitle",
        isDelete
            ? "Delete student account?"
            : activate
                ? "Activate student account?"
                : "Deactivate student account?"
    );
    setText(
        "studentConfirmMessage",
        isDelete
            ? `Permanently delete ${safeDisplayValue(student.fullName) || "this student"} and its linked student login? Deletion is allowed only after deactivation and only when there are no enrollments, exam sessions, results, or exam authorizations. Historical records will not be deleted.`
            : `${activate ? "Activate" : "Deactivate"} the account for ${
                safeDisplayValue(student.fullName) || "this student"
            }?`
    );
    document.getElementById("studentConfirmError")?.classList.add("hidden");
    setText(
        "confirmStudentActionText",
        isDelete ? "Delete account" : activate ? "Activate account" : "Deactivate account"
    );

    if (confirmStudentActionBtn) {
        confirmStudentActionBtn.classList.toggle("danger-button", isDelete || !activate);
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

    const { studentId, activate, action } = pendingStatusChange;
    statusChangeInProgress = true;
    confirmStudentActionBtn.disabled = true;
    cancelStudentConfirmBtn.disabled = true;
    confirmStudentSpinner?.classList.remove("hidden");
    document.getElementById("studentConfirmError")?.classList.add("hidden");

    try {
        if (action === "delete") {
            const response = await adminFetch(
                `${STUDENTS_API_URL}/${encodeURIComponent(studentId)}`,
                { method: "DELETE" }
            );
            if (response?.success !== true || response?.data?.deleted !== true) {
                throw new Error("The student deletion endpoint returned an unexpected response.");
            }
            students = students.filter(student => student.id !== studentId);
        } else {
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
        }

        updateStudentSummary();
        renderStudents();
        await loadStudents();
        studentConfirmModal?.classList.add("hidden");
        studentConfirmModal?.setAttribute("aria-hidden", "true");
        pendingStatusChange = null;
        syncModalScrollLock();
        lastStatusTrigger = null;
        studentSearch?.focus();
    } catch (error) {
        console.error(`ExamHub student ${action} error:`, {
            studentId,
            message: error?.message || "Unknown request error",
            name: error?.name || "Error"
        });
        const message = document.getElementById("studentConfirmError");
        if (message) {
            message.textContent = action === "delete"
                ? error?.message || "Unable to delete the student account."
                : "Unable to update the student's status. Please try again.";
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
    if (studentProgramFilter) {
        studentProgramFilter.value = "all";
    }
    if (studentSchoolFilter) {
        studentSchoolFilter.value = "all";
    }
    currentPage = 1;
    loadStudents();
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
    document.getElementById("studentsPagination")
        ?.classList.add("hidden");
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
    [
        studentProgramFilter,
        studentSchoolFilter
    ].forEach(control => {
        if (control) {
            control.disabled = disabled;
        }
    });
    if (exportStudentsBtn) {
        exportStudentsBtn.disabled =
            disabled || matchingStudentCount === 0;
    }
}

function updateStudentPagination() {
    const pagination = document.getElementById("studentsPagination");
    const previous = document.getElementById("previousStudentsPageBtn");
    const next = document.getElementById("nextStudentsPageBtn");

    pagination?.classList.toggle(
        "hidden",
        matchingStudentCount === 0
    );
    setText(
        "studentsPageLabel",
        `Page ${currentPage} of ${totalPages}`
    );
    if (previous) {
        previous.disabled = currentPage <= 1;
    }
    if (next) {
        next.disabled = currentPage >= totalPages;
    }
}

function buildStudentDirectoryQuery() {
    const query = new URLSearchParams();
    const search = (studentSearch?.value || "").trim();
    const status = studentStatusFilter?.value || "all";

    if (search) {
        query.set("search", search);
    }
    if (status !== "all") {
        query.set("status", status);
    }
    if (studentProgramFilter?.value !== "all") {
        query.set("programId", studentProgramFilter.value);
    }
    if (studentSchoolFilter?.value !== "all") {
        query.set("schoolId", studentSchoolFilter.value);
    }

    return query;
}

async function exportStudentDirectory() {
    const feedback = document.getElementById(
        "studentsExportFeedback"
    );
    const query = buildStudentDirectoryQuery();
    exportStudentsBtn.disabled = true;
    feedback?.classList.add("hidden");

    try {
        const token = getAdminToken();
        if (!token) {
            throw new Error("Authentication required.");
        }

        const suffix = query.size ? `?${query.toString()}` : "";
        const response = await fetch(
            `${ADMIN_API_BASE_URL}${STUDENTS_API_URL}/export${suffix}`,
            {
                method: "GET",
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
            let message = "Student directory export failed.";
            try {
                const body = await response.json();
                message = body?.message || message;
            } catch {
                // Retain the explicit fallback for non-JSON server errors.
            }
            throw new Error(message);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = "examhub-students.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
        if (feedback) {
            feedback.textContent =
                "Student directory CSV exported for the selected filters.";
            feedback.classList.remove("hidden", "is-error");
        }
    } catch (error) {
        console.error("Student directory export error:", error);
        if (feedback) {
            feedback.textContent =
                error.message || "Student directory export failed.";
            feedback.classList.remove("hidden");
            feedback.classList.add("is-error");
        }
    } finally {
        exportStudentsBtn.disabled = matchingStudentCount === 0;
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