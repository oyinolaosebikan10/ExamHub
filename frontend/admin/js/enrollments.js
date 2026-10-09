(() => {
    "use strict";

    const endpoints = {
        enrollments: "/enrollments",
        students: "/students",
        courses: "/courses",
        programs: "/programs",
    };

    const state = {
        enrollments: [],
        students: [],
        courses: [],
        programs: [],
        studentById: new Map(),
        courseById: new Map(),
        programById: new Map(),
        confirmAction: null,
        loading: false,
        saving: false,
        pageState: "loading",
        toastTimer: null,
    };

    const elements = {
        total: document.getElementById("totalEnrollments"),
        active: document.getElementById("activeEnrollments"),
        inactive: document.getElementById("inactiveEnrollments"),
        count: document.getElementById("enrollmentCount"),
        search: document.getElementById("enrollmentSearch"),
        statusFilter: document.getElementById("enrollmentStatusFilter"),
        courseFilter: document.getElementById("enrollmentCourseFilter"),
        programFilter: document.getElementById("enrollmentProgramFilter"),
        loading: document.getElementById("enrollmentsLoadingState"),
        error: document.getElementById("enrollmentsErrorState"),
        errorMessage: document.getElementById("enrollmentsErrorMessage"),
        empty: document.getElementById("enrollmentsEmptyState"),
        emptyTitle: document.getElementById("enrollmentsEmptyTitle"),
        emptyMessage: document.getElementById("enrollmentsEmptyMessage"),
        emptyCreate: document.getElementById("emptyCreateEnrollmentButton"),
        clearFilters: document.getElementById("clearEnrollmentFiltersButton"),
        tableWrapper: document.getElementById("enrollmentsTableWrapper"),
        tableBody: document.getElementById("enrollmentsTableBody"),
        refresh: document.getElementById("refreshEnrollmentsButton"),
        create: document.getElementById("createEnrollmentButton"),
        retry: document.getElementById("retryEnrollmentsButton"),
        toast: document.getElementById("enrollmentToast"),
        formModal: document.getElementById("enrollmentFormModal"),
        form: document.getElementById("enrollmentForm"),
        formTitle: document.getElementById("enrollmentFormTitle"),
        formDescription: document.getElementById("enrollmentFormDescription"),
        formMessage: document.getElementById("enrollmentFormMessage"),
        student: document.getElementById("enrollmentStudent"),
        course: document.getElementById("enrollmentCourse"),
        program: document.getElementById("enrollmentProgram"),
        duration: document.getElementById("enrollmentDuration"),
        startDate: document.getElementById("enrollmentStartDate"),
        endDate: document.getElementById("enrollmentEndDate"),
        save: document.getElementById("saveEnrollmentButton"),
        saveText: document.getElementById("saveEnrollmentButtonText"),
        saveSpinner: document.getElementById("saveEnrollmentSpinner"),
        viewModal: document.getElementById("enrollmentViewModal"),
        viewTitle: document.getElementById("enrollmentViewTitle"),
        viewSubtitle: document.getElementById("enrollmentViewSubtitle"),
        viewDetails: document.getElementById("enrollmentViewDetails"),
        confirmModal: document.getElementById("enrollmentConfirmModal"),
        confirmTitle: document.getElementById("enrollmentConfirmTitle"),
        confirmMessage: document.getElementById("enrollmentConfirmMessage"),
        confirmError: document.getElementById("enrollmentConfirmError"),
        confirmIcon: document.getElementById("enrollmentConfirmIcon"),
        confirmCard: document.querySelector("#enrollmentConfirmModal .enrollment-confirm-modal"),
        cancelAction: document.getElementById("cancelEnrollmentActionButton"),
        confirmActionButton: document.getElementById("confirmEnrollmentActionButton"),
        confirmActionText: document.getElementById("confirmEnrollmentActionText"),
        confirmSpinner: document.getElementById("confirmEnrollmentSpinner"),
    };

    function safeRecordId(record) {
        return typeof record?.id === "string" ? record.id : "";
    }

    function toSafeEnrollment(record) {
        if (!record || typeof record !== "object") return null;
        const id = safeRecordId(record);
        if (!id) return null;

        return {
            id,
            studentId: typeof record.studentId === "string" ? record.studentId : "",
            programId: typeof record.programId === "string" ? record.programId : "",
            courseId: typeof record.courseId === "string" ? record.courseId : "",
            programDuration:
                typeof record.programDuration === "string" || typeof record.programDuration === "number"
                    ? String(record.programDuration)
                    : "",
            startDate: record.startDate ?? null,
            endDate: record.endDate ?? null,
            status: typeof record.status === "string" ? record.status : "",
            createdAt: record.createdAt ?? null,
            updatedAt: record.updatedAt ?? null,
        };
    }

    function toSafeStudent(record) {
        if (!record || typeof record !== "object") return null;
        const id = safeRecordId(record) || (typeof record.studentId === "string" ? record.studentId : "");
        if (!id) return null;

        return {
            id,
            fullName: typeof record.fullName === "string" ? record.fullName : "",
            registrationNumber:
                typeof record.registrationNumber === "string" ? record.registrationNumber : "",
            phoneNumber: typeof record.phoneNumber === "string" ? record.phoneNumber : "",
            courseId: typeof record.courseId === "string" ? record.courseId : "",
            isActive: record.isActive === true,
            status: typeof record.status === "string" ? record.status : "",
            createdAt: record.createdAt ?? null,
            updatedAt: record.updatedAt ?? null,
        };
    }

    function toSafeRelatedRecord(record) {
        if (!record || typeof record !== "object") return null;
        const id = safeRecordId(record);
        if (!id) return null;

        return {
            id,
            name: typeof record.name === "string" ? record.name : "",
            title: typeof record.title === "string" ? record.title : "",
            isActive: record.isActive !== false,
            examEnd: record.examEnd ?? null,
        };
    }

    function responseData(response, label) {
        if (!response || response.success !== true || !Array.isArray(response.data)) {
            throw new Error(`${label} response was not in the expected format.`);
        }
        return response.data;
    }

    function displayName(record, fallback) {
        return record?.fullName || record?.name || record?.title || fallback;
    }

    function getCourseName(id) {
        return displayName(state.courseById.get(id), "Unknown course");
    }

    function getProgramName(id) {
        return displayName(state.programById.get(id), "Unknown program");
    }

    function isProgramEligibleForNewEnrollment(program) {
        return program.isActive && !isProgramScheduleCompleted(program);
    }

    function isProgramScheduleCompleted(program) {
        const examEnd = timestampToDate(program.examEnd);
        return Boolean(examEnd && new Date() > examEnd);
    }

    function timestampToDate(value) {
        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value;
        }

        if (typeof value === "number") {
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? null : date;
        }

        if (typeof value === "string") {
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? null : date;
        }

        if (value && typeof value === "object") {
            const seconds =
                typeof value._seconds === "number"
                    ? value._seconds
                    : typeof value.seconds === "number"
                        ? value.seconds
                        : null;
            const nanoseconds =
                typeof value._nanoseconds === "number"
                    ? value._nanoseconds
                    : typeof value.nanoseconds === "number"
                        ? value.nanoseconds
                        : 0;
            if (seconds !== null) {
                const date = new Date(seconds * 1000 + Math.floor(nanoseconds / 1000000));
                return Number.isNaN(date.getTime()) ? null : date;
            }
        }

        return null;
    }

    function formatDate(value) {
        const date = timestampToDate(value);
        if (!date) return "—";
        return new Intl.DateTimeFormat(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
        }).format(date);
    }

    function dateInputValue(value) {
        const date = timestampToDate(value);
        if (!date) return "";
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function statusCategory(status) {
        const normalized = String(status || "").toLowerCase();
        if (normalized === "active") return "active";
        if (normalized === "inactive") return "inactive";
        return "other";
    }

    function statusLabel(status) {
        const normalized = String(status || "").trim();
        if (!normalized) return "Unknown";
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }

    async function fetchPageData() {
        const [enrollmentsResponse, studentsResponse, coursesResponse, programsResponse] =
            await Promise.all([
                adminFetch(endpoints.enrollments),
                adminFetch(endpoints.students),
                adminFetch(endpoints.courses),
                adminFetch(endpoints.programs),
            ]);

        const enrollmentRecords = responseData(enrollmentsResponse, "Enrollments");
        const studentRecords = responseData(studentsResponse, "Students");
        const courseRecords = responseData(coursesResponse, "Courses");
        const programRecords = responseData(programsResponse, "Programs");

        state.enrollments = enrollmentRecords.map(toSafeEnrollment).filter(Boolean);
        state.students = studentRecords.map(toSafeStudent).filter(Boolean);
        state.courses = courseRecords.map(toSafeRelatedRecord).filter(Boolean);
        state.programs = programRecords.map(toSafeRelatedRecord).filter(Boolean);
        state.studentById = new Map(state.students.map((record) => [record.id, record]));
        state.courseById = new Map(state.courses.map((record) => [record.id, record]));
        state.programById = new Map(state.programs.map((record) => [record.id, record]));

        populateFilterOptions(elements.courseFilter, state.courses, "All courses");
        populateFilterOptions(elements.programFilter, state.programs, "All programs");
        updateSummary();
        renderTable();
    }

    function populateFilterOptions(select, records, firstLabel) {
        const selected = select.value || "all";
        select.replaceChildren();
        addOption(select, "all", firstLabel);
        [...records]
            .sort((left, right) => displayName(left, "").localeCompare(displayName(right, "")))
            .forEach((record) => addOption(select, record.id, displayName(record, "Unnamed")));
        select.value = records.some((record) => record.id === selected) ? selected : "all";
    }

    function addOption(select, value, label) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.append(option);
    }

    function updateSummary() {
        const counts = state.enrollments.reduce(
            (result, enrollment) => {
                result.total += 1;
                const category = statusCategory(enrollment.status);
                if (category === "active") result.active += 1;
                if (category === "inactive") result.inactive += 1;
                return result;
            },
            { total: 0, active: 0, inactive: 0 }
        );
        elements.total.textContent = String(counts.total);
        elements.active.textContent = String(counts.active);
        elements.inactive.textContent = String(counts.inactive);
    }

    function filteredEnrollments() {
        const query = elements.search.value.trim().toLocaleLowerCase();
        const status = elements.statusFilter.value;
        const courseId = elements.courseFilter.value;
        const programId = elements.programFilter.value;

        return state.enrollments.filter((enrollment) => {
            const category = statusCategory(enrollment.status);
            if (status !== "all" && category !== status) return false;
            if (courseId !== "all" && enrollment.courseId !== courseId) return false;
            if (programId !== "all" && enrollment.programId !== programId) return false;
            if (!query) return true;

            const student = state.studentById.get(enrollment.studentId);
            const searchable = [
                student?.fullName,
                student?.registrationNumber,
                student?.phoneNumber,
                enrollment.studentId,
                getCourseName(enrollment.courseId),
                getProgramName(enrollment.programId),
            ]
                .filter(Boolean)
                .join(" ")
                .toLocaleLowerCase();

            return searchable.includes(query);
        });
    }

    function createCell(text, className = "") {
        const cell = document.createElement("td");
        if (className) cell.className = className;
        cell.textContent = text;
        return cell;
    }

    function createTextElement(tag, text, className = "") {
        const element = document.createElement(tag);
        if (className) element.className = className;
        element.textContent = text;
        return element;
    }

    function appendNameCell(cell, primary, secondary) {
        cell.append(createTextElement("span", primary, "enrollment-cell-primary"));
        if (secondary) {
            cell.append(createTextElement("span", secondary, "enrollment-cell-secondary"));
        }
    }

    function createActionButton(label, action, enrollmentId, extraClass = "") {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `enrollment-row-action${extraClass ? ` ${extraClass}` : ""}`;
        button.textContent = label;
        button.dataset.action = action;
        button.dataset.enrollmentId = enrollmentId;
        return button;
    }

    function renderTable() {
        const records = filteredEnrollments();
        elements.tableBody.replaceChildren();
        elements.count.textContent = String(records.length);

        records.forEach((enrollment) => {
            const row = document.createElement("tr");
            const student = state.studentById.get(enrollment.studentId);

            const studentCell = document.createElement("td");
            appendNameCell(studentCell, displayName(student, "Unknown student"), student?.phoneNumber || "");
            row.append(studentCell);
            row.append(createCell(student?.registrationNumber || "—", student?.registrationNumber ? "enrollment-monospace" : ""));
            row.append(createCell(getCourseName(enrollment.courseId)));
            row.append(createCell(getProgramName(enrollment.programId)));

            const statusCell = document.createElement("td");
            const category = statusCategory(enrollment.status);
            statusCell.append(
                createTextElement(
                    "span",
                    statusLabel(enrollment.status),
                    `enrollment-status-badge enrollment-status-${category}`
                )
            );
            row.append(statusCell);
            row.append(createCell(formatDate(enrollment.startDate)));
            row.append(createCell(formatDate(enrollment.endDate)));
            row.append(createCell(formatDate(enrollment.createdAt)));

            const actionsCell = document.createElement("td");
            const actions = document.createElement("div");
            actions.className = "enrollment-row-actions";
            actions.append(createActionButton("View", "view", enrollment.id));
            actions.append(createActionButton("Edit", "edit", enrollment.id));
            if (category === "active") {
                actions.append(createActionButton("Deactivate", "deactivate", enrollment.id));
            } else if (category === "inactive") {
                actions.append(createActionButton("Reactivate", "reactivate", enrollment.id));
            }
            actions.append(createActionButton("Delete", "delete", enrollment.id, "enrollment-row-action-danger"));
            actionsCell.append(actions);
            row.append(actionsCell);
            elements.tableBody.append(row);
        });

        const hasEnrollments = state.enrollments.length > 0;
        const hasFilteredResults = records.length > 0;
        elements.tableWrapper.hidden = !hasFilteredResults;
        elements.empty.hidden = hasFilteredResults;
        elements.emptyCreate.hidden = hasEnrollments;
        elements.clearFilters.hidden = !hasEnrollments;

        if (hasEnrollments && !hasFilteredResults) {
            elements.emptyTitle.textContent = "No matching enrollments";
            elements.emptyMessage.textContent = "Try changing your search or filters to see enrollment records.";
        } else if (!hasEnrollments) {
            elements.emptyTitle.textContent = "No enrollments yet";
            elements.emptyMessage.textContent = "Create an enrollment to associate a student with a program and course.";
        }
    }

    function setPageState(pageState, message = "") {
        state.pageState = pageState;
        elements.loading.hidden = pageState !== "loading";
        elements.error.hidden = pageState !== "error";
        elements.empty.hidden = pageState !== "ready";
        elements.tableWrapper.hidden = pageState !== "ready";
        if (pageState === "error") {
            elements.errorMessage.textContent = message || "We couldn't retrieve enrollment records. Please try again.";
        }
        if (pageState === "ready") renderTable();
        elements.refresh.disabled = state.loading;
        elements.create.disabled = pageState !== "ready" || !state.students.length;
        elements.emptyCreate.disabled = pageState !== "ready" || !state.students.length;
    }

    async function loadPage() {
        if (state.loading) return;
        state.loading = true;
        setPageState("loading");
        try {
            await fetchPageData();
            setPageState("ready");
        } catch {
            console.error("Unable to load the Admin Enrollments page.");
            setPageState("error", "We couldn't retrieve enrollment records. Please try again.");
        } finally {
            state.loading = false;
            elements.refresh.disabled = false;
            elements.create.disabled = state.pageState !== "ready" || !state.students.length;
            elements.emptyCreate.disabled = state.pageState !== "ready" || !state.students.length;
        }
    }

    function setSelectRecords(
        select,
        records,
        placeholder,
        { includeInactive = true, selectedId = "", eligibleOnly = false } = {}
    ) {
        select.replaceChildren();
        const availableRecords = records
            .filter((record) => !eligibleOnly || isProgramEligibleForNewEnrollment(record))
            .filter((record) => includeInactive || record.isActive)
            .sort((left, right) => displayName(left, "").localeCompare(displayName(right, "")));
        const emptyLabel = !availableRecords.length && select === elements.program && eligibleOnly
            ? "No eligible Programs available for a new Enrollment."
            : placeholder;
        addOption(select, "", emptyLabel);

        availableRecords.forEach((record) => {
            const label = `${displayName(record, "Unnamed")}${record.isActive ? "" : " (inactive)"}`;
            addOption(select, record.id, label);
        });

        if (selectedId && !Array.from(select.options).some((option) => option.value === selectedId)) {
            const selectedRecord = records.find((record) => record.id === selectedId);
            const label = selectedRecord
                ? `${displayName(selectedRecord, "Current program")}${
                    !selectedRecord.isActive
                        ? " (inactive)"
                        : isProgramScheduleCompleted(selectedRecord)
                            ? " (completed)"
                            : ""
                }`
                : "Current record unavailable";
            addOption(select, selectedId, label);
            select.options[select.options.length - 1].disabled = true;
        }
        select.value = selectedId;
    }

    function clearFormMessage() {
        elements.formMessage.hidden = true;
        elements.formMessage.textContent = "";
    }

    function openModal(modal) {
        modal.hidden = false;
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("enrollment-modal-open");
        const focusTarget = modal.querySelector("input:not([disabled]), select:not([disabled]), button:not([disabled])");
        if (focusTarget) focusTarget.focus();
    }

    function closeModal(modal) {
        if (!modal || modal.hidden) return;
        modal.hidden = true;
        modal.setAttribute("aria-hidden", "true");
        if (![elements.formModal, elements.viewModal, elements.confirmModal].some((item) => !item.hidden)) {
            document.body.classList.remove("enrollment-modal-open");
        }
        if (modal === elements.confirmModal) {
            state.confirmAction = null;
            setConfirmBusy(false);
        }
    }

    function openForm(mode, enrollment = null) {
        if (state.loading || state.saving || state.pageState !== "ready") return;
        elements.form.reset();
        clearFormMessage();
        const isEditing = mode === "edit";
        elements.form.dataset.mode = mode;
        elements.form.dataset.enrollmentId = enrollment?.id || "";
        elements.formTitle.textContent = isEditing ? "Edit Enrollment" : "Create Enrollment";
        elements.formDescription.textContent = isEditing
            ? "Update the enrollment program, course, and schedule."
            : "Assign a student to a program and course.";
        elements.saveText.textContent = isEditing ? "Save Changes" : "Create Enrollment";
        setSelectRecords(elements.student, state.students, "Select a student", {
            selectedId: enrollment?.studentId || "",
        });
        setSelectRecords(elements.course, state.courses, "Select a course", {
            includeInactive: isEditing,
            selectedId: enrollment?.courseId || "",
        });
        setSelectRecords(elements.program, state.programs, "Select a program", {
            includeInactive: false,
            selectedId: enrollment?.programId || "",
            eligibleOnly: true,
        });
        const hasEligibleProgram = isEditing ||
            state.programs.some(isProgramEligibleForNewEnrollment);
        elements.program.disabled = !hasEligibleProgram;
        elements.student.disabled = isEditing;
        if (enrollment) {
            elements.duration.value = enrollment.programDuration;
            elements.startDate.value = dateInputValue(enrollment.startDate);
            elements.endDate.value = dateInputValue(enrollment.endDate);
        }
        openModal(elements.formModal);
    }

    function addDetailRow(label, value, className = "") {
        const container = document.createElement("div");
        container.className = "enrollment-detail-row";
        container.append(
            createTextElement("dt", label),
            createTextElement("dd", value || "Not available", className)
        );
        elements.viewDetails.append(container);
    }

    function openDetails(enrollment) {
        const student = state.studentById.get(enrollment.studentId);
        elements.viewDetails.replaceChildren();
        elements.viewTitle.textContent = "Enrollment Details";
        elements.viewSubtitle.textContent = displayName(student, "Unknown student");
        addDetailRow("Student", displayName(student, "Unknown student"));
        addDetailRow("Registration number", student?.registrationNumber || "Not available");
        addDetailRow("Student ID", enrollment.studentId || "Not available", "enrollment-monospace");
        addDetailRow("Course", getCourseName(enrollment.courseId));
        addDetailRow("Program", getProgramName(enrollment.programId));
        addDetailRow("Status", statusLabel(enrollment.status));
        addDetailRow("Program duration", enrollment.programDuration || "Not available");
        addDetailRow("Start date", formatDate(enrollment.startDate));
        addDetailRow("End date", formatDate(enrollment.endDate));
        addDetailRow("Created", formatDate(enrollment.createdAt));
        addDetailRow("Last updated", formatDate(enrollment.updatedAt));
        addDetailRow("Enrollment ID", enrollment.id, "enrollment-monospace");
        openModal(elements.viewModal);
    }

    function showConfirmation(action, enrollment) {
        const studentName = displayName(state.studentById.get(enrollment.studentId), "this student");
        const courseName = getCourseName(enrollment.courseId);
        const programName = getProgramName(enrollment.programId);
        const actionDetails = {
            deactivate: {
                title: "Deactivate enrollment?",
                message: `This will deactivate ${studentName}'s enrollment in ${courseName} (${programName}).`,
                button: "Deactivate",
                cancel: "Keep enrollment",
                icon: "!",
            },
            reactivate: {
                title: "Reactivate enrollment?",
                message: `This will reactivate ${studentName}'s enrollment in ${courseName} (${programName}).`,
                button: "Reactivate",
                cancel: "Cancel",
                icon: "↻",
            },
            delete: {
                title: "Delete enrollment permanently?",
                message: `This permanently deletes ${studentName}'s enrollment in ${courseName} (${programName}). This action cannot be undone.`,
                button: "Delete Enrollment",
                cancel: "Keep enrollment",
                icon: "!",
            },
        };
        const details = actionDetails[action];
        if (!details) return;
        state.confirmAction = { action, enrollmentId: enrollment.id };
        elements.confirmTitle.textContent = details.title;
        elements.confirmMessage.textContent = details.message;
        elements.confirmActionText.textContent = details.button;
        elements.cancelAction.textContent = details.cancel;
        elements.confirmIcon.textContent = details.icon;
        elements.confirmCard.dataset.action = action;
        elements.confirmError.hidden = true;
        elements.confirmError.textContent = "";
        openModal(elements.confirmModal);
    }

    function setFormBusy(isBusy) {
        state.saving = isBusy;
        elements.save.disabled = isBusy;
        elements.saveSpinner.hidden = !isBusy;
        elements.saveText.textContent = isBusy
            ? "Saving..."
            : elements.form.dataset.mode === "edit"
                ? "Save Changes"
                : "Create Enrollment";
        elements.form.querySelectorAll("[data-close-modal]").forEach((button) => {
            button.disabled = isBusy;
        });
    }

    function setConfirmBusy(isBusy) {
        elements.confirmActionButton.disabled = isBusy;
        elements.cancelAction.disabled = isBusy;
        elements.confirmSpinner.hidden = !isBusy;
        if (isBusy) {
            elements.confirmActionText.textContent = "Working...";
        } else if (state.confirmAction) {
            const text = {
                deactivate: "Deactivate",
                reactivate: "Reactivate",
                delete: "Delete Enrollment",
            };
            elements.confirmActionText.textContent = text[state.confirmAction.action];
        }
    }

    function friendlyMutationError(error, operation) {
        const message = typeof error?.message === "string" ? error.message.toLowerCase() : "";
        if (message.includes("already exists") || message.includes("already enrolled")) {
            return "An active enrollment already exists for this student, program, and course.";
        }
        if (message.includes("inactive") || message.includes("not active")) {
            return "The selected course or program is inactive. Choose an active course and program and try again.";
        }
        if (message.includes("not found") || message.includes("does not exist")) {
            return "This enrollment or one of its related records could not be found. Refresh the list and try again.";
        }
        if (operation === "create") return "The enrollment could not be created. Check the selected records and try again.";
        if (operation === "edit") return "The enrollment could not be updated. Check the selected records and try again.";
        if (operation === "delete") return "The enrollment could not be deleted. Refresh the list and try again.";
        return "The enrollment status could not be changed. Refresh the list and try again.";
    }

    function showToast(message) {
        window.clearTimeout(state.toastTimer);
        elements.toast.textContent = message;
        elements.toast.hidden = false;
        state.toastTimer = window.setTimeout(() => {
            elements.toast.hidden = true;
        }, 4000);
    }

    async function submitEnrollmentForm(event) {
        event.preventDefault();
        if (state.saving) return;
        clearFormMessage();
        if (!elements.form.reportValidity()) return;

        const mode = elements.form.dataset.mode;
        const enrollmentId = elements.form.dataset.enrollmentId;
        const studentId = elements.student.value;
        const courseId = elements.course.value;
        const programId = elements.program.value;
        if (!courseId || !programId || (mode !== "edit" && !studentId)) {
            elements.formMessage.textContent = "Select a student, course, and program before continuing.";
            elements.formMessage.hidden = false;
            return;
        }

        const body = {
            courseId,
            programId,
            programDuration: elements.duration.value.trim() || null,
            startDate: elements.startDate.value || null,
            endDate: elements.endDate.value || null,
        };
        if (mode !== "edit") body.studentId = studentId;
        const method = mode === "edit" ? "PATCH" : "POST";
        const path = mode === "edit"
            ? `${endpoints.enrollments}/${encodeURIComponent(enrollmentId)}`
            : endpoints.enrollments;

        setFormBusy(true);
        try {
            await adminFetch(path, { method, body });
            closeModal(elements.formModal);
            showToast(mode === "edit" ? "Enrollment updated." : "Enrollment created.");
            await loadPage();
        } catch (error) {
            console.error(`Unable to ${mode === "edit" ? "update" : "create"} enrollment.`);
            elements.formMessage.textContent = friendlyMutationError(error, mode);
            elements.formMessage.hidden = false;
        } finally {
            setFormBusy(false);
        }
    }

    async function performConfirmedAction() {
        if (!state.confirmAction || elements.confirmActionButton.disabled) return;
        const { action, enrollmentId } = state.confirmAction;
        const encodedId = encodeURIComponent(enrollmentId);
        const requests = {
            deactivate: () =>
                adminFetch(`${endpoints.enrollments}/${encodedId}/deactivate`, { method: "PATCH" }),
            reactivate: () =>
                adminFetch(`${endpoints.enrollments}/${encodedId}/reactivate`, { method: "PATCH" }),
            delete: () =>
                adminFetch(`${endpoints.enrollments}/${encodedId}`, { method: "DELETE" }),
        };
        const request = requests[action];
        if (!request) return;

        elements.confirmError.hidden = true;
        setConfirmBusy(true);
        try {
            await request();
            closeModal(elements.confirmModal);
            showToast(
                action === "delete"
                    ? "Enrollment deleted."
                    : action === "deactivate"
                        ? "Enrollment deactivated."
                        : "Enrollment reactivated."
            );
            await loadPage();
        } catch (error) {
            console.error(`Unable to ${action} enrollment.`);
            elements.confirmError.textContent = friendlyMutationError(error, action);
            elements.confirmError.hidden = false;
        } finally {
            setConfirmBusy(false);
        }
    }

    function clearFilters() {
        elements.search.value = "";
        elements.statusFilter.value = "all";
        elements.courseFilter.value = "all";
        elements.programFilter.value = "all";
        renderTable();
    }

    function onTableClick(event) {
        const button = event.target.closest("button[data-action][data-enrollment-id]");
        if (!button || !elements.tableBody.contains(button)) return;
        const enrollment = state.enrollments.find((record) => record.id === button.dataset.enrollmentId);
        if (!enrollment) return;
        if (button.dataset.action === "view") {
            openDetails(enrollment);
        } else if (button.dataset.action === "edit") {
            openForm("edit", enrollment);
        } else {
            showConfirmation(button.dataset.action, enrollment);
        }
    }

    function initializeEvents() {
        elements.refresh.addEventListener("click", loadPage);
        elements.retry.addEventListener("click", loadPage);
        elements.create.addEventListener("click", () => openForm("create"));
        elements.emptyCreate.addEventListener("click", () => openForm("create"));
        elements.clearFilters.addEventListener("click", clearFilters);
        elements.search.addEventListener("input", renderTable);
        elements.statusFilter.addEventListener("change", renderTable);
        elements.courseFilter.addEventListener("change", renderTable);
        elements.programFilter.addEventListener("change", renderTable);
        elements.tableBody.addEventListener("click", onTableClick);
        elements.form.addEventListener("submit", submitEnrollmentForm);
        elements.confirmActionButton.addEventListener("click", performConfirmedAction);
        elements.cancelAction.addEventListener("click", () => closeModal(elements.confirmModal));

        document.querySelectorAll(".enrollment-modal-backdrop").forEach((backdrop) => {
            backdrop.addEventListener("click", (event) => {
                if (event.target === backdrop) closeModal(backdrop);
            });
            backdrop.querySelectorAll("[data-close-modal]").forEach((button) => {
                button.addEventListener("click", () => closeModal(backdrop));
            });
        });

        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;
            const open = [elements.confirmModal, elements.viewModal, elements.formModal].find(
                (modal) => !modal.hidden
            );
            if (open && !state.saving && !elements.confirmActionButton.disabled) closeModal(open);
        });
    }

    initializeEvents();
    loadPage();
})();