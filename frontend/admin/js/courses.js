const $ = (id) => document.getElementById(id);

let courses = [];
let editingCourseId = null;
let pendingCourseAction = null;

const courseModal = $("courseModal");
const viewCourseModal = $("viewCourseModal");
const courseConfirmModal = $("courseConfirmModal");
const courseForm = $("courseForm");
const coursesTableWrapper = $("coursesTableWrapper");
const coursesTableBody = $("coursesTableBody");
const coursesLoading = $("coursesLoading");
const coursesEmpty = $("coursesEmpty");
const coursesError = $("coursesError");
const courseFormMessage = $("courseFormMessage");
const courseSearch = $("courseSearch");
const courseStatusFilter = $("courseStatusFilter");
const courseCount = $("courseCount");
const totalCourses = $("totalCourses");
const activeCourses = $("activeCourses");
const inactiveCourses = $("inactiveCourses");
const courseCodes = $("courseCodes");

const courseModalTitle = $("courseModalTitle");
const courseModalDescription = $("courseModalDescription");
const courseId = $("courseId");
const courseName = $("courseName");
const courseCode = $("courseCode");
const courseSlug = $("courseSlug");
const courseDescription = $("courseDescription");
const saveCourseBtn = $("saveCourseBtn");
const saveCourseText = $("saveCourseText");
const saveCourseSpinner = $("saveCourseSpinner");

const viewCourseTitle = $("viewCourseTitle");
const viewCourseSubtitle = $("viewCourseSubtitle");
const viewCourseName = $("viewCourseName");
const viewCourseCode = $("viewCourseCode");
const viewCourseCodeDetail = $("viewCourseCodeDetail");
const viewCourseSlug = $("viewCourseSlug");
const viewCourseId = $("viewCourseId");
const viewCourseStatus = $("viewCourseStatus");
const viewCourseCreated = $("viewCourseCreated");
const viewCourseUpdated = $("viewCourseUpdated");
const viewCourseDescription = $("viewCourseDescription");

const courseConfirmTitle = $("courseConfirmTitle");
const courseConfirmMessage = $("courseConfirmMessage");
const confirmCourseActionBtn = $("confirmCourseActionBtn");
const confirmCourseActionText = $("confirmCourseActionText");
const confirmCourseSpinner = $("confirmCourseSpinner");
const confirmIcon = $("confirmIcon");

function extractCoursesFromResponse(response) {
if (Array.isArray(response)) {
return response;
}

if (response && Array.isArray(response.data)) {
    return response.data;
}

if (response && Array.isArray(response.courses)) {
    return response.courses;
}

if (
    response &&
    response.data &&
    Array.isArray(response.data.courses)
) {
    return response.data.courses;
}

if (response && Array.isArray(response.items)) {
    return response.items;
}

if (response && Array.isArray(response.results)) {
    return response.results;
}

return [];

}

function parseDateValue(value) {
if (!value) {
return null;
}

if (value instanceof Date) {
    return value;
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
    return new Date(
        value < 100000000000
            ? value * 1000
            : value
    );
}

if (typeof value === "string") {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
        return parsed;
    }
}

return null;

}

function formatDate(value) {
const date = parseDateValue(value);

if (!date) {
    return "—";
}

return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric"
}).format(date);

}

function formatDateTime(value) {
const date = parseDateValue(value);

if (!date) {
    return "—";
}

return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
}).format(date);

}

function showLoadingState() {
coursesLoading?.classList.remove("hidden");
coursesTableWrapper?.classList.add("hidden");
coursesEmpty?.classList.add("hidden");
coursesError?.classList.add("hidden");
}

function hideLoadingState() {
coursesLoading?.classList.add("hidden");
}

function showErrorState(message) {
coursesLoading?.classList.add("hidden");
coursesTableWrapper?.classList.add("hidden");
coursesEmpty?.classList.add("hidden");
coursesError?.classList.remove("hidden");

const errorText = $("coursesErrorText");

if (errorText) {
    errorText.textContent =
        message || "Unable to load courses.";
}

}

function updateSummary() {
const total = courses.length;

const active = courses.filter(
    course => course?.isActive === true
).length;

const inactive = total - active;

const codes = courses
    .map(course => course?.code)
    .filter(Boolean);

if (totalCourses) {
    totalCourses.textContent = total;
}

if (activeCourses) {
    activeCourses.textContent = active;
}

if (inactiveCourses) {
    inactiveCourses.textContent = inactive;
}

if (courseCodes) {
    courseCodes.textContent =
        codes.length
            ? codes.join(" · ")
            : "—";
}

}

function applyFilters() {
const search = (
courseSearch?.value || ""
)
.trim()
.toLowerCase();

const status =
    courseStatusFilter?.value || "all";

const filtered = courses.filter(course => {
    const searchableText = [
        course?.name,
        course?.code,
        course?.id,
        course?.slug,
        course?.description
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    const matchesSearch =
        !search ||
        searchableText.includes(search);

    const matchesStatus =
        status === "all" ||
        (
            status === "active" &&
            course?.isActive === true
        ) ||
        (
            status === "inactive" &&
            course?.isActive !== true
        );

    return matchesSearch && matchesStatus;
});

renderCourses(filtered);

}

function renderCourses(filteredCourses = courses) {
if (!coursesTableWrapper || !coursesTableBody) {
return;
}

coursesTableBody.innerHTML = "";

const count = filteredCourses.length;

if (courseCount) {
    courseCount.textContent =
        `${count} ${count === 1 ? "course" : "courses"}`;
}

if (!count) {
    coursesTableWrapper.classList.add("hidden");
    coursesEmpty?.classList.remove("hidden");
    return;
}

coursesEmpty?.classList.add("hidden");
coursesTableWrapper.classList.remove("hidden");

filteredCourses.forEach(course => {
    const row = document.createElement("tr");

    const id = course?.id || "";
    const name = course?.name || "Unnamed course";
    const code = course?.code || "—";
    const slug = course?.slug || "—";
    const description = course?.description || "—";
    const isActive = course?.isActive === true;
    const updated = formatDate(course?.updatedAt);

    const initials = String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part =>
            part.charAt(0).toUpperCase()
        )
        .join("");

    row.innerHTML = `
        <td class="course-name-cell">
            <div class="course-name-wrapper">
                <div class="course-name-mark">
                    ${courseEscapeHtml(initials || "C")}
                </div>

                <div class="course-name-text">
                    <span class="course-name-title">
                        ${courseEscapeHtml(name)}
                    </span>
                </div>
            </div>
        </td>

        <td>
            <span class="course-code">
                ${courseEscapeHtml(code)}
            </span>
        </td>

        <td>
            <span
                class="course-id"
                title="${courseEscapeHtml(id)}"
            >
                ${courseEscapeHtml(id || "—")}
            </span>
        </td>

        <td>
            <span
                class="course-slug"
                title="${courseEscapeHtml(slug)}"
            >
                ${courseEscapeHtml(slug)}
            </span>
        </td>

        <td>
            <span
                class="course-description"
                title="${courseEscapeHtml(description)}"
            >
                ${courseEscapeHtml(description)}
            </span>
        </td>

        <td>
            <span
                class="course-status ${
                    isActive ? "active" : "inactive"
                }"
            >
                ${isActive ? "Active" : "Inactive"}
            </span>
        </td>

        <td>
            <span class="course-date">
                ${courseEscapeHtml(updated)}
            </span>
        </td>

        <td class="actions-column">
            <div class="course-actions">
                <button
                    type="button"
                    class="course-action-button view-button"
                    data-action="view"
                    data-id="${courseEscapeHtml(id)}"
                >
                    View
                </button>

                <button
                    type="button"
                    class="course-action-button edit-button"
                    data-action="edit"
                    data-id="${courseEscapeHtml(id)}"
                >
                    Edit
                </button>

                ${
                    isActive
                        ? `
                            <button
                                type="button"
                                class="course-action-button deactivate-button"
                                data-action="deactivate"
                                data-id="${courseEscapeHtml(id)}"
                            >
                                Deactivate
                            </button>
                        `
                        : `
                            <button
                                type="button"
                                class="course-action-button activate-button"
                                data-action="activate"
                                data-id="${courseEscapeHtml(id)}"
                            >
                                Reactivate
                            </button>
                        `
                }

                <button
                    type="button"
                    class="course-action-button delete-button"
                    data-action="delete"
                    data-id="${courseEscapeHtml(id)}"
                >
                    Delete
                </button>
            </div>
        </td>
    `;

    coursesTableBody.appendChild(row);
});

}

function courseEscapeHtml(value) {
if (
value === null ||
value === undefined
) {
return "";
}

return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

async function loadCourses() {
showLoadingState();

try {
    const response = await adminFetch(
        "/courses",
        {
            method: "GET"
        }
    );

    console.log(
        "ExamHub GET /courses response:",
        response
    );

    if (!response?.success) {
        throw new Error(
            response?.message ||
            "Failed to load courses."
        );
    }

    courses =
        extractCoursesFromResponse(response);

    console.log(
        "ExamHub courses extracted:",
        courses
    );

    updateSummary();
    applyFilters();

} catch (error) {
    console.error(
        "ExamHub courses loading error:",
        error
    );

    courses = [];

    updateSummary();

    showErrorState(
        error?.message ||
        "Unable to load courses."
    );

} finally {
    hideLoadingState();
}

}

function resetCourseForm() {
courseForm?.reset();

if (courseId) {
    courseId.value = "";
}

if (courseFormMessage) {
    courseFormMessage.textContent = "";
    courseFormMessage.className =
        "form-message hidden";
}

if (courseSlug) {
    courseSlug.disabled = false;
}

if (saveCourseText) {
    saveCourseText.textContent =
        "Create Course";
}

saveCourseSpinner?.classList.add("hidden");

if (saveCourseBtn) {
    saveCourseBtn.disabled = false;
}

editingCourseId = null;

}

function showFormMessage(
message,
type = "error"
) {
if (!courseFormMessage) {
return;
}

courseFormMessage.textContent = message;

courseFormMessage.className =
    `form-message ${type}`;

}

function openCreateCourseModal() {
resetCourseForm();

if (courseModalTitle) {
    courseModalTitle.textContent =
        "Add Course";
}

if (courseModalDescription) {
    courseModalDescription.textContent =
        "Create a course that can be used for examinations and student registration.";
}

courseModal?.classList.remove("hidden");

courseModal?.setAttribute(
    "aria-hidden",
    "false"
);

setTimeout(
    () => courseName?.focus(),
    50
);

}

function openEditCourseModal(course) {
if (!course) {
return;
}

resetCourseForm();

editingCourseId = course.id;

if (courseModalTitle) {
    courseModalTitle.textContent =
        "Edit Course";
}

if (courseModalDescription) {
    courseModalDescription.textContent =
        "Update the information associated with this course.";
}

if (courseId) {
    courseId.value = course.id || "";
}

if (courseName) {
    courseName.value = course.name || "";
}

if (courseCode) {
    courseCode.value = course.code || "";
}

if (courseSlug) {
    courseSlug.value =
        course.slug || course.id || "";

    courseSlug.disabled = true;
}

if (courseDescription) {
    courseDescription.value =
        course.description || "";
}

courseModal?.classList.remove("hidden");

courseModal?.setAttribute(
    "aria-hidden",
    "false"
);

setTimeout(
    () => courseName?.focus(),
    50
);

}

function closeCourseModal() {
courseModal?.classList.add("hidden");

courseModal?.setAttribute(
    "aria-hidden",
    "true"
);

resetCourseForm();

}

function viewCourse(id) {
    if (!id) {
        return;
    }

    const course = findCourseById(id);

    if (!course) {
        console.error(
            "ExamHub: Unable to find course for view:",
            id
        );

        alert(
            "Unable to find this course in the current course list."
        );

        return;
    }

    try {
        populateViewModal(course);

        viewCourseModal?.classList.remove("hidden");

        viewCourseModal?.setAttribute(
            "aria-hidden",
            "false"
        );

    } catch (error) {
        console.error(
            "ExamHub course view error:",
            error
        );

        alert(
            "Unable to display this course."
        );
    }
}

function populateViewModal(course) {
if (!course) {
return;
}

if (viewCourseTitle) {
    viewCourseTitle.textContent =
        course.name || "Course";
}

if (viewCourseSubtitle) {
    viewCourseSubtitle.textContent =
        course.description ||
        "Course information";
}

if (viewCourseName) {
    viewCourseName.textContent =
        course.name || "—";
}

if (viewCourseCode) {
    viewCourseCode.textContent =
        course.code || "—";
}

if (viewCourseCodeDetail) {
    viewCourseCodeDetail.textContent =
        course.code || "—";
}

if (viewCourseSlug) {
    viewCourseSlug.textContent =
        course.slug || "—";
}

if (viewCourseId) {
    viewCourseId.textContent =
        course.id || "—";
}

if (viewCourseCreated) {
    viewCourseCreated.textContent =
        formatDateTime(course.createdAt);
}

if (viewCourseUpdated) {
    viewCourseUpdated.textContent =
        formatDateTime(course.updatedAt);
}

if (viewCourseDescription) {
    viewCourseDescription.textContent =
        course.description ||
        "No description provided.";
}

if (viewCourseStatus) {
    const active =
        course.isActive === true;

    viewCourseStatus.textContent =
        active ? "Active" : "Inactive";

    viewCourseStatus.className =
        `course-status-badge ${
            active ? "active" : "inactive"
        }`;
}

if (viewCourseModal) {
    viewCourseModal.dataset.courseId =
        course.id || "";
}

}

function closeViewCourseModal() {
viewCourseModal?.classList.add("hidden");

viewCourseModal?.setAttribute(
    "aria-hidden",
    "true"
);

if (viewCourseModal) {
    delete viewCourseModal.dataset.courseId;
}

}

async function handleCourseSubmit(event) {
event.preventDefault();

const name =
    courseName?.value.trim();

const code =
    courseCode?.value.trim();

const slug =
    courseSlug?.value.trim();

const description =
    courseDescription?.value.trim();

if (!name) {
    showFormMessage(
        "Course name is required."
    );

    courseName?.focus();
    return;
}

if (!code) {
    showFormMessage(
        "Course code is required."
    );

    courseCode?.focus();
    return;
}

if (!editingCourseId && !slug) {
    showFormMessage(
        "Course slug is required."
    );

    courseSlug?.focus();
    return;
}

if (saveCourseBtn) {
    saveCourseBtn.disabled = true;
}

saveCourseSpinner?.classList.remove(
    "hidden"
);

if (saveCourseText) {
    saveCourseText.textContent =
        editingCourseId
            ? "Saving..."
            : "Creating...";
}

try {
    let response;

    if (editingCourseId) {
        response = await adminFetch(
            `/courses/${encodeURIComponent(
                editingCourseId
            )}`,
            {
                method: "PATCH",
                body: {
                    name,
                    code,
                    description
                }
            }
        );
    } else {
        response = await adminFetch(
            "/courses",
            {
                method: "POST",
                body: {
                    name,
                    code,
                    slug,
                    description
                }
            }
        );
    }

    if (!response?.success) {
        throw new Error(
            response?.message ||
            "Unable to save course."
        );
    }

    closeCourseModal();

    await loadCourses();

} catch (error) {
    console.error(
        "ExamHub course save error:",
        error
    );

    showFormMessage(
        error?.message ||
        "Unable to save course."
    );

} finally {
    if (saveCourseBtn) {
        saveCourseBtn.disabled = false;
    }

    saveCourseSpinner?.classList.add(
        "hidden"
    );

    if (saveCourseText) {
        saveCourseText.textContent =
            editingCourseId
                ? "Save Changes"
                : "Create Course";
    }
}

}

function openConfirmModal(action, course) {
if (!course) {
return;
}

pendingCourseAction = {
    action,
    courseId: course.id,
    course
};

let title = "Confirm action";
let message =
    "Are you sure you want to continue?";
let confirmText = "Confirm";

if (action === "deactivate") {
    title = "Deactivate course";

    message =
        `Are you sure you want to deactivate "${course.name}"? Students will no longer be able to use this course for registration.`;

    confirmText = "Deactivate";
}

if (action === "activate") {
    title = "Reactivate course";

    message =
        `Are you sure you want to reactivate "${course.name}"?`;

    confirmText = "Reactivate";
}

if (action === "delete") {
    title = "Delete course";

    message =
        `Are you sure you want to permanently delete "${course.name}"? This action cannot be undone.`;

    confirmText = "Delete";
}

if (courseConfirmTitle) {
    courseConfirmTitle.textContent = title;
}

if (courseConfirmMessage) {
    courseConfirmMessage.textContent = message;
}

if (confirmCourseActionText) {
    confirmCourseActionText.textContent =
        confirmText;
}

if (confirmIcon) {
    confirmIcon.textContent =
        action === "delete"
            ? "!"
            : "?";
}

courseConfirmModal?.classList.remove(
    "hidden"
);

courseConfirmModal?.setAttribute(
    "aria-hidden",
    "false"
);

}

function closeConfirmModal() {
courseConfirmModal?.classList.add(
"hidden"
);

courseConfirmModal?.setAttribute(
    "aria-hidden",
    "true"
);

pendingCourseAction = null;

confirmCourseSpinner?.classList.add(
    "hidden"
);

if (confirmCourseActionBtn) {
    confirmCourseActionBtn.disabled = false;
}

}

async function executeCourseAction() {
if (!pendingCourseAction) {
return;
}

const {
    action,
    courseId: id
} = pendingCourseAction;

if (!id) {
    return;
}

if (confirmCourseActionBtn) {
    confirmCourseActionBtn.disabled = true;
}

confirmCourseSpinner?.classList.remove(
    "hidden"
);

try {
    let endpoint;
    let method = "PATCH";

    if (action === "deactivate") {
        endpoint =
            `/courses/${encodeURIComponent(
                id
            )}/deactivate`;
    }

    if (action === "activate") {
        endpoint =
            `/courses/${encodeURIComponent(
                id
            )}/activate`;
    }

    if (action === "delete") {
        endpoint =
            `/courses/${encodeURIComponent(id)}`;

        method = "DELETE";
    }

    const response = await adminFetch(
        endpoint,
        {
            method
        }
    );

    if (!response?.success) {
        throw new Error(
            response?.message ||
            "Unable to complete action."
        );
    }

    closeConfirmModal();

    await loadCourses();

} catch (error) {
    console.error(
        "ExamHub course action error:",
        error
    );

    alert(
        error?.message ||
        "Unable to complete action."
    );

} finally {
    confirmCourseSpinner?.classList.add(
        "hidden"
    );

    if (confirmCourseActionBtn) {
        confirmCourseActionBtn.disabled =
            false;
    }
}

}

function findCourseById(id) {
return courses.find(
course =>
String(course?.id) ===
String(id)
);
}

function handleTableAction(event) {
const button =
event.target.closest(
"[data-action]"
);

if (!button) {
    return;
}

const action = button.dataset.action;
const id = button.dataset.id;

if (!id) {
    return;
}

const course = findCourseById(id);

if (!course) {
    console.warn(
        "ExamHub: Course not found:",
        id
    );

    return;
}

if (action === "view") {
    viewCourse(id);
    return;
}

if (action === "edit") {
    openEditCourseModal(course);
    return;
}

if (
    action === "deactivate" ||
    action === "activate" ||
    action === "delete"
) {
    openConfirmModal(
        action,
        course
    );
}

}

function bindCourseEvents() {
$("openCreateCourseBtn")
?.addEventListener(
"click",
openCreateCourseModal
);

$("emptyCreateCourseBtn")
    ?.addEventListener(
        "click",
        openCreateCourseModal
    );

$("closeCourseModalBtn")
    ?.addEventListener(
        "click",
        closeCourseModal
    );

$("cancelCourseBtn")
    ?.addEventListener(
        "click",
        closeCourseModal
    );

$("closeViewCourseModalBtn")
    ?.addEventListener(
        "click",
        closeViewCourseModal
    );

$("viewCloseCourseBtn")
    ?.addEventListener(
        "click",
        closeViewCourseModal
    );

$("viewEditCourseBtn")
    ?.addEventListener(
        "click",
        () => {
            const id =
                viewCourseModal?.dataset.courseId;

            if (!id) {
                return;
            }

            const course =
                findCourseById(id);

            closeViewCourseModal();

            if (course) {
                openEditCourseModal(course);
            }
        }
    );

$("cancelCourseConfirmBtn")
    ?.addEventListener(
        "click",
        closeConfirmModal
    );

confirmCourseActionBtn
    ?.addEventListener(
        "click",
        executeCourseAction
    );

$("refreshCoursesBtn")
    ?.addEventListener(
        "click",
        loadCourses
    );

$("retryCoursesBtn")
    ?.addEventListener(
        "click",
        loadCourses
    );

courseSearch?.addEventListener(
    "input",
    applyFilters
);

courseStatusFilter?.addEventListener(
    "change",
    applyFilters
);

coursesTableBody?.addEventListener(
    "click",
    handleTableAction
);

courseForm?.addEventListener(
    "submit",
    handleCourseSubmit
);

courseModal?.addEventListener(
    "click",
    event => {
        if (event.target === courseModal) {
            closeCourseModal();
        }
    }
);

viewCourseModal?.addEventListener(
    "click",
    event => {
        if (event.target === viewCourseModal) {
            closeViewCourseModal();
        }
    }
);

courseConfirmModal?.addEventListener(
    "click",
    event => {
        if (
            event.target ===
            courseConfirmModal
        ) {
            closeConfirmModal();
        }
    }
);

document.addEventListener(
    "keydown",
    event => {
        if (event.key !== "Escape") {
            return;
        }

        if (
            courseModal &&
            !courseModal.classList.contains(
                "hidden"
            )
        ) {
            closeCourseModal();
            return;
        }

        if (
            viewCourseModal &&
            !viewCourseModal.classList.contains(
                "hidden"
            )
        ) {
            closeViewCourseModal();
            return;
        }

        if (
            courseConfirmModal &&
            !courseConfirmModal.classList.contains(
                "hidden"
            )
        ) {
            closeConfirmModal();
        }
    }
);

}

document.addEventListener(
"DOMContentLoaded",
async () => {
if (
typeof requireAdminAuth ===
"function"
) {
if (!requireAdminAuth()) {
return;
}
}

    if (
        typeof setPageTitle ===
        "function"
    ) {
        setPageTitle("Courses");
    }

    if (
        typeof renderAdminSidebar ===
        "function"
    ) {
        renderAdminSidebar();
    }

    if (
        typeof renderAdminHeader ===
        "function"
    ) {
        renderAdminHeader();
    }

    bindCourseEvents();

    await loadCourses();
}

);