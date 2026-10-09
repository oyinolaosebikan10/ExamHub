(() => {
    "use strict";

    const endpoints = {
        exams: "/exams",
        courses: "/courses",
        programs: "/programs",
        questions: "/questions",
    };

    const state = {
        exams: [],
        courses: [],
        programs: [],
        courseById: new Map(),
        programById: new Map(),
        activeQuestionCountByCourse: new Map(),
        loading: false,
        saving: false,
        confirming: false,
        pageState: "loading",
        pendingExamId: null,
        viewingExamId: null,
        toastTimer: null,
    };

    const elements = {
        total: document.getElementById("totalExams"),
        active: document.getElementById("activeExams"),
        cancelled: document.getElementById("cancelledExams"),
        count: document.getElementById("examCount"),
        search: document.getElementById("examSearch"),
        courseFilter: document.getElementById("examCourseFilter"),
        programFilter: document.getElementById("examProgramFilter"),
        statusFilter: document.getElementById("examStatusFilter"),
        loading: document.getElementById("examsLoadingState"),
        error: document.getElementById("examsErrorState"),
        errorMessage: document.getElementById("examsErrorMessage"),
        empty: document.getElementById("examsEmptyState"),
        emptyTitle: document.getElementById("examsEmptyTitle"),
        emptyMessage: document.getElementById("examsEmptyMessage"),
        emptyCreate: document.getElementById("emptyCreateExamButton"),
        clearFilters: document.getElementById("clearExamFiltersButton"),
        tableWrapper: document.getElementById("examsTableWrapper"),
        tableBody: document.getElementById("examsTableBody"),
        refresh: document.getElementById("refreshExamsButton"),
        create: document.getElementById("createExamButton"),
        retry: document.getElementById("retryExamsButton"),
        toast: document.getElementById("examToast"),
        formModal: document.getElementById("examFormModal"),
        form: document.getElementById("examForm"),
        formMessage: document.getElementById("examFormMessage"),
        title: document.getElementById("examTitle"),
        program: document.getElementById("examProgram"),
        programAvailabilityMessage: document.getElementById("examProgramAvailabilityMessage"),
        course: document.getElementById("examCourse"),
        questionCount: document.getElementById("examQuestionCount"),
        questionPoolMessage: document.getElementById("examQuestionPoolMessage"),
        duration: document.getElementById("examDuration"),
        save: document.getElementById("saveExamButton"),
        saveText: document.getElementById("saveExamButtonText"),
        saveSpinner: document.getElementById("saveExamSpinner"),
        viewModal: document.getElementById("examViewModal"),
        viewTitle: document.getElementById("examViewTitle"),
        viewSubtitle: document.getElementById("examViewSubtitle"),
        viewLoading: document.getElementById("examViewLoading"),
        viewError: document.getElementById("examViewError"),
        viewErrorMessage: document.getElementById("examViewErrorMessage"),
        retryDetails: document.getElementById("retryExamDetailsButton"),
        viewDetails: document.getElementById("examViewDetails"),
        confirmModal: document.getElementById("examConfirmModal"),
        confirmTitle: document.getElementById("examConfirmTitle"),
        confirmMessage: document.getElementById("examConfirmMessage"),
        confirmError: document.getElementById("examConfirmError"),
        confirmIcon: document.getElementById("examConfirmIcon"),
        cancelAction: document.getElementById("cancelExamActionButton"),
        confirmButton: document.getElementById("confirmExamActionButton"),
        confirmText: document.getElementById("confirmExamActionText"),
        confirmSpinner: document.getElementById("confirmExamSpinner"),
    };

    function safeExam(record) {
        if (!record || typeof record !== "object" || typeof record.id !== "string" || !record.id) {
            return null;
        }
        return {
            id: record.id,
            title: typeof record.title === "string" ? record.title : "",
            programId: typeof record.programId === "string" ? record.programId : "",
            courseId: typeof record.courseId === "string" ? record.courseId : "",
            durationMinutes:
                typeof record.durationMinutes === "number" && Number.isInteger(record.durationMinutes)
                    ? record.durationMinutes
                    : null,
            questionCount:
                typeof record.questionCount === "number" && Number.isInteger(record.questionCount)
                    ? record.questionCount
                    : null,
            status: typeof record.status === "string" ? record.status : "",
            createdAt: record.createdAt ?? null,
            updatedAt: record.updatedAt ?? null,
        };
    }

    function safeCourse(record) {
        if (!record || typeof record !== "object" || typeof record.id !== "string" || !record.id) {
            return null;
        }
        return {
            id: record.id,
            name: typeof record.name === "string" ? record.name : "",
            isActive: typeof record.isActive === "boolean" ? record.isActive : null,
        };
    }

    function safeProgram(record) {
        if (!record || typeof record !== "object" || typeof record.id !== "string" || !record.id) {
            return null;
        }
        return {
            id: record.id,
            name: typeof record.name === "string" ? record.name : "",
            isActive: record.isActive !== false,
            registrationStart: record.registrationStart ?? null,
            registrationEnd: record.registrationEnd ?? null,
            examStart: record.examStart ?? null,
            examEnd: record.examEnd ?? null,
        };
    }

    function assertArrayResponse(response, label) {
        if (!response || response.success !== true || !Array.isArray(response.data)) {
            throw new Error(`${label} response format was unexpected.`);
        }
        return response.data;
    }

    function assertObjectResponse(response, label) {
        if (!response || response.success !== true || !response.data || typeof response.data !== "object") {
            throw new Error(`${label} response format was unexpected.`);
        }
        return response.data;
    }

    function courseName(courseId) {
        return state.courseById.get(courseId)?.name || "Unknown course";
    }

    function programName(programId) {
        return state.programById.get(programId)?.name || "Unknown program";
    }

    function statusCategory(status) {
        const normalized = String(status || "").toLowerCase();
        if (normalized === "active") return "active";
        if (normalized === "cancelled") return "cancelled";
        return "other";
    }

    function statusLabel(status) {
        const value = String(status || "").trim();
        if (!value) return "Unknown";
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    function toDate(value) {
        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value;
        }
        if (typeof value === "string" || typeof value === "number") {
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

    function formatDateTime(value) {
        const date = toDate(value);
        if (!date) return "—";
        return new Intl.DateTimeFormat("en-NG", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    }

    function formatDate(value) {
        const date = toDate(value);
        if (!date) return "—";
        return new Intl.DateTimeFormat("en-NG", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(date);
    }

    function formatProgramWindow(programId) {
        const program = state.programById.get(programId);
        const start = formatDateTime(program?.examStart);
        const end = formatDateTime(program?.examEnd);
        if (start === "—" && end === "—") return "Schedule unavailable";
        return `${start} – ${end}`;
    }

    function isProgramEligibleForNewExam(program) {
        const examEnd = toDate(program.examEnd);
        return program.isActive && (!examEnd || examEnd >= new Date());
    }

    async function fetchPageData() {
        const [examsResponse, coursesResponse, programsResponse, questionsResponse] = await Promise.all([
            adminFetch(endpoints.exams),
            adminFetch(endpoints.courses),
            adminFetch(endpoints.programs),
            adminFetch(endpoints.questions),
        ]);

        const examRecords = assertArrayResponse(examsResponse, "Exams");
        const courseRecords = assertArrayResponse(coursesResponse, "Courses");
        const programRecords = assertArrayResponse(programsResponse, "Programs");
        const questionRecords = assertArrayResponse(questionsResponse, "Questions");

        state.exams = examRecords.map(safeExam).filter(Boolean);
        state.courses = courseRecords.map(safeCourse).filter(Boolean);
        state.programs = programRecords.map(safeProgram).filter(Boolean);
        state.courseById = new Map(state.courses.map((course) => [course.id, course]));
        state.programById = new Map(state.programs.map((program) => [program.id, program]));
        state.activeQuestionCountByCourse = new Map();

        questionRecords.forEach((question) => {
            if (
                question &&
                typeof question.courseId === "string" &&
                question.isActive === true
            ) {
                const count = state.activeQuestionCountByCourse.get(question.courseId) || 0;
                state.activeQuestionCountByCourse.set(question.courseId, count + 1);
            }
        });

        populateRelatedFilters(elements.courseFilter, state.courses, "All courses");
        populateRelatedFilters(elements.programFilter, state.programs, "All programs");
        updateSummary();
        renderExams();
    }

    function addOption(select, value, label) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.append(option);
    }

    function populateRelatedFilters(select, records, firstLabel) {
        const selected = select.value || "all";
        select.replaceChildren();
        addOption(select, "all", firstLabel);
        [...records]
            .sort((left, right) => left.name.localeCompare(right.name))
            .forEach((record) => addOption(select, record.id, record.name || "Unnamed"));
        select.value = records.some((record) => record.id === selected) ? selected : "all";
    }

    function updateSummary() {
        elements.total.textContent = String(state.exams.length);
        elements.active.textContent = String(
            state.exams.filter((exam) => statusCategory(exam.status) === "active").length
        );
        elements.cancelled.textContent = String(
            state.exams.filter((exam) => statusCategory(exam.status) === "cancelled").length
        );
    }

    function filteredExams() {
        const query = elements.search.value.trim().toLocaleLowerCase();
        const selectedCourse = elements.courseFilter.value;
        const selectedProgram = elements.programFilter.value;
        const selectedStatus = elements.statusFilter.value;

        return state.exams.filter((exam) => {
            if (selectedCourse !== "all" && exam.courseId !== selectedCourse) return false;
            if (selectedProgram !== "all" && exam.programId !== selectedProgram) return false;
            if (selectedStatus !== "all" && statusCategory(exam.status) !== selectedStatus) return false;
            if (!query) return true;
            const searchable = `${exam.title} ${exam.id} ${courseName(exam.courseId)} ${programName(exam.programId)}`
                .toLocaleLowerCase();
            return searchable.includes(query);
        });
    }

    function textElement(tag, text, className = "") {
        const element = document.createElement(tag);
        if (className) element.className = className;
        element.textContent = text;
        return element;
    }

    function createActionButton(label, action, examId, extraClass = "") {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `exam-row-action${extraClass ? ` ${extraClass}` : ""}`;
        button.textContent = label;
        button.dataset.action = action;
        button.dataset.examId = examId;
        return button;
    }

    function renderExams() {
        const exams = filteredExams();
        elements.tableBody.replaceChildren();
        elements.count.textContent = String(exams.length);

        exams.forEach((exam) => {
            const row = document.createElement("tr");
            const examCell = document.createElement("td");
            examCell.append(
                textElement("span", exam.title || "Untitled exam", "exam-table-title"),
                textElement("span", `ID: ${exam.id}`, "exam-table-id")
            );
            row.append(examCell);
            row.append(textElement("td", courseName(exam.courseId)));
            row.append(textElement("td", programName(exam.programId)));
            row.append(textElement("td", exam.questionCount === null ? "—" : String(exam.questionCount)));
            row.append(textElement("td", exam.durationMinutes === null ? "—" : `${exam.durationMinutes} min`));
            row.append(textElement("td", formatProgramWindow(exam.programId), "exam-window-cell"));

            const statusCell = document.createElement("td");
            const category = statusCategory(exam.status);
            statusCell.append(
                textElement(
                    "span",
                    statusLabel(exam.status),
                    `exam-status-badge exam-status-${category}`
                )
            );
            row.append(statusCell);
            row.append(textElement("td", formatDate(exam.updatedAt)));

            const actionsCell = document.createElement("td");
            const actionGroup = document.createElement("div");
            actionGroup.className = "exam-row-actions";
            actionGroup.append(createActionButton("View", "view", exam.id));
            if (category !== "cancelled") {
                actionGroup.append(
                    createActionButton("Cancel", "cancel", exam.id, "exam-row-action-danger")
                );
            }
            actionsCell.append(actionGroup);
            row.append(actionsCell);
            elements.tableBody.append(row);
        });

        const hasExams = state.exams.length > 0;
        const hasResults = exams.length > 0;
        elements.tableWrapper.hidden = !hasResults;
        elements.empty.hidden = hasResults;
        elements.emptyCreate.hidden = hasExams;
        elements.clearFilters.hidden = !hasExams;

        if (hasExams && !hasResults) {
            elements.emptyTitle.textContent = "No matching exams";
            elements.emptyMessage.textContent = "Change your search or filters to find exam records.";
        } else if (!hasExams) {
            elements.emptyTitle.textContent = "No exams found";
            elements.emptyMessage.textContent = "There are currently no configured exams.";
        }
    }

    function setPageState(nextState, message = "") {
        state.pageState = nextState;
        elements.loading.hidden = nextState !== "loading";
        elements.error.hidden = nextState !== "error";
        elements.empty.hidden = nextState !== "ready";
        elements.tableWrapper.hidden = nextState !== "ready";
        if (nextState === "error") {
            elements.errorMessage.textContent =
                message || "We couldn't retrieve exam records. Please try again.";
        }
        if (nextState === "ready") renderExams();
        elements.refresh.disabled = state.loading || state.saving || state.confirming;
        elements.create.disabled = nextState !== "ready";
        elements.emptyCreate.disabled = nextState !== "ready";
    }

    async function loadExams() {
        if (state.loading) return false;
        state.loading = true;
        setPageState("loading");
        try {
            await fetchPageData();
            setPageState("ready");
            return true;
        } catch {
            console.error("Unable to load the Admin Exams page.");
            setPageState("error", "We couldn't retrieve exam records. Please try again.");
            return false;
        } finally {
            state.loading = false;
            elements.refresh.disabled = state.saving || state.confirming;
            elements.create.disabled = state.pageState !== "ready";
            elements.emptyCreate.disabled = state.pageState !== "ready";
        }
    }

    function populateFormSelect(select, records, placeholder) {
        select.replaceChildren();
        addOption(select, "", placeholder);
        [...records]
            .sort((left, right) => left.name.localeCompare(right.name))
            .forEach((record) => {
                const suffix =
                    select === elements.course && record.isActive === false ? " (inactive)" : "";
                addOption(select, record.id, `${record.name || "Unnamed"}${suffix}`);
            });
    }

    function updateQuestionPoolHint() {
        const courseId = elements.course.value;
        if (!courseId) {
            elements.questionPoolMessage.textContent = "Select a course to see its active question pool.";
            elements.questionCount.removeAttribute("max");
            return;
        }

        const available = state.activeQuestionCountByCourse.get(courseId) || 0;
        elements.questionPoolMessage.textContent =
            available === 1
                ? "1 active question is available for this course."
                : `${available} active questions are available for this course.`;
        if (available > 0) {
            elements.questionCount.max = String(available);
        } else {
            elements.questionCount.removeAttribute("max");
        }
    }

    function clearFormMessage() {
        elements.formMessage.hidden = true;
        elements.formMessage.textContent = "";
    }

    function openCreateForm() {
        if (state.loading || state.saving || state.pageState !== "ready") return;
        elements.form.reset();
        clearFormMessage();
        const eligiblePrograms = state.programs.filter(isProgramEligibleForNewExam);
        populateFormSelect(elements.program, eligiblePrograms, "Select a program");
        elements.programAvailabilityMessage.textContent = eligiblePrograms.length
            ? ""
            : "No eligible Programs available for a new Exam.";
        elements.programAvailabilityMessage.hidden = eligiblePrograms.length > 0;
        elements.program.disabled = eligiblePrograms.length === 0;
        populateFormSelect(elements.course, state.courses, "Select a course");
        elements.questionCount.removeAttribute("max");
        updateQuestionPoolHint();
        openModal(elements.formModal);
    }

    function openModal(modal) {
        modal.hidden = false;
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("exam-modal-open");
        const focusTarget = modal.querySelector(
            "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])"
        );
        focusTarget?.focus();
    }

    function closeModal(modal) {
        if (!modal || modal.hidden) return;
        modal.hidden = true;
        modal.setAttribute("aria-hidden", "true");
        if (![elements.formModal, elements.viewModal, elements.confirmModal].some((item) => !item.hidden)) {
            document.body.classList.remove("exam-modal-open");
        }
        if (modal === elements.confirmModal) {
            state.pendingExamId = null;
            setConfirmBusy(false);
        }
        if (modal === elements.formModal) {
            elements.program.disabled = false;
            elements.programAvailabilityMessage.hidden = true;
            elements.programAvailabilityMessage.textContent = "";
        }
        if (modal === elements.viewModal) {
            state.viewingExamId = null;
        }
    }

    function addDetailRow(label, value, className = "") {
        const row = document.createElement("div");
        row.className = "exam-detail-row";
        row.append(textElement("dt", label));
        row.append(textElement("dd", value || "Not available", className));
        elements.viewDetails.append(row);
    }

    function renderExamDetails(exam) {
        const program = state.programById.get(exam.programId);
        elements.viewTitle.textContent = exam.title || "Exam";
        elements.viewSubtitle.textContent = `${courseName(exam.courseId)} · ${programName(exam.programId)}`;
        elements.viewDetails.replaceChildren();
        addDetailRow("Exam title", exam.title || "Not available");
        addDetailRow("Course", courseName(exam.courseId));
        addDetailRow("Program", programName(exam.programId));
        addDetailRow("Questions per attempt", exam.questionCount === null ? "Not available" : String(exam.questionCount));
        addDetailRow(
            "Active questions in course",
            String(state.activeQuestionCountByCourse.get(exam.courseId) || 0)
        );
        addDetailRow("Duration", exam.durationMinutes === null ? "Not available" : `${exam.durationMinutes} minutes`);
        addDetailRow("Exam status", statusLabel(exam.status));
        addDetailRow("Program exam starts", formatDateTime(program?.examStart));
        addDetailRow("Program exam ends", formatDateTime(program?.examEnd));
        addDetailRow("Exam ID", exam.id, "exam-monospace");
        addDetailRow("Created", formatDateTime(exam.createdAt));
        addDetailRow("Updated", formatDateTime(exam.updatedAt));
        elements.viewLoading.hidden = true;
        elements.viewError.hidden = true;
        elements.viewDetails.hidden = false;
    }

    async function loadExamDetails(examId) {
        if (!examId) return;
        state.viewingExamId = examId;
        elements.viewDetails.replaceChildren();
        elements.viewDetails.hidden = true;
        elements.viewError.hidden = true;
        elements.viewLoading.hidden = false;
        try {
            const response = await adminFetch(`${endpoints.exams}/${encodeURIComponent(examId)}`);
            const exam = safeExam(assertObjectResponse(response, "Exam"));
            if (!exam) throw new Error("Exam response was invalid.");
            if (state.viewingExamId !== examId) return;
            renderExamDetails(exam);
        } catch {
            console.error("Unable to load exam details.");
            if (state.viewingExamId !== examId) return;
            elements.viewLoading.hidden = true;
            elements.viewError.hidden = false;
            elements.viewErrorMessage.textContent =
                "We couldn't load these exam details. Please try again.";
        }
    }

    function showCancelConfirmation(exam) {
        state.pendingExamId = exam.id;
        elements.confirmTitle.textContent = "Cancel exam?";
        elements.confirmMessage.textContent =
            `This marks "${exam.title || "this exam"}" as cancelled and prevents new students from starting it. Existing exam sessions are not changed by this action.`;
        elements.confirmText.textContent = "Cancel Exam";
        elements.confirmError.hidden = true;
        elements.confirmError.textContent = "";
        openModal(elements.confirmModal);
    }

    function setFormBusy(busy) {
        state.saving = busy;
        elements.refresh.disabled = busy || state.loading || state.confirming;
        elements.save.disabled = busy;
        elements.saveSpinner.hidden = !busy;
        elements.saveText.textContent = busy ? "Creating..." : "Create Exam";
        elements.form.querySelectorAll("[data-close-modal]").forEach((button) => {
            button.disabled = busy;
        });
    }

    function setConfirmBusy(busy) {
        state.confirming = busy;
        elements.refresh.disabled = busy || state.loading || state.saving;
        elements.confirmButton.disabled = busy;
        elements.cancelAction.disabled = busy;
        elements.confirmSpinner.hidden = !busy;
        elements.confirmText.textContent = busy ? "Cancelling..." : "Cancel Exam";
    }

    function friendlyCreateError(error) {
        const message = typeof error?.message === "string" ? error.message.toLowerCase() : "";
        if (message.includes("not enough active questions")) {
            return "There aren't enough active questions in this course for the selected exam count. Refresh the question pool and choose a smaller number.";
        }
        if (message.includes("program not found")) {
            return "The selected program could not be found. Refresh the page and try again.";
        }
        if (message.includes("program is inactive")) {
            return "The selected program is inactive. Choose an active program and try again.";
        }
        if (message.includes("program has already completed")) {
            return "The selected program has completed. Choose a program with an available exam schedule.";
        }
        if (message.includes("selected course does not exist")) {
            return "The selected course could not be found. Refresh the page and try again.";
        }
        if (message.includes("duration must be a positive whole number")) {
            return "Duration must be a positive whole number of minutes.";
        }
        if (message.includes("question count must be a positive whole number")) {
            return "Question count must be a positive whole number.";
        }
        return "The exam could not be created. Check the details and try again.";
    }

    function friendlyCancelError(error) {
        const message = typeof error?.message === "string" ? error.message.toLowerCase() : "";
        if (message.includes("already cancelled")) {
            return "This exam is already cancelled. Refresh the exam list.";
        }
        if (message.includes("exam not found")) {
            return "This exam could not be found. Refresh the exam list.";
        }
        return "The exam could not be cancelled. Please try again.";
    }

    function showToast(message) {
        window.clearTimeout(state.toastTimer);
        elements.toast.textContent = message;
        elements.toast.hidden = false;
        state.toastTimer = window.setTimeout(() => {
            elements.toast.hidden = true;
        }, 4000);
    }

    async function submitExamForm(event) {
        event.preventDefault();
        if (state.saving) return;
        clearFormMessage();
        if (!elements.form.reportValidity()) return;

        const questionCount = Number(elements.questionCount.value);
        const durationMinutes = Number(elements.duration.value);
        const availableQuestions = state.activeQuestionCountByCourse.get(elements.course.value) || 0;

        if (!elements.title.value.trim() || !elements.program.value || !elements.course.value) {
            elements.formMessage.textContent = "Enter an exam title and select a program and course.";
            elements.formMessage.hidden = false;
            return;
        }
        if (!Number.isInteger(questionCount) || questionCount <= 0) {
            elements.formMessage.textContent = "Question count must be a positive whole number.";
            elements.formMessage.hidden = false;
            return;
        }
        if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
            elements.formMessage.textContent = "Duration must be a positive whole number of minutes.";
            elements.formMessage.hidden = false;
            return;
        }
        if (questionCount > availableQuestions) {
            elements.formMessage.textContent =
                availableQuestions > 0
                    ? `Choose no more than the ${availableQuestions} active questions available for this course.`
                    : "There are no active questions for this course. Add or activate course questions before creating this exam.";
            elements.formMessage.hidden = false;
            return;
        }

        const body = {
            title: elements.title.value.trim(),
            programId: elements.program.value,
            courseId: elements.course.value,
            durationMinutes,
            questionCount,
        };
        setFormBusy(true);
        try {
            await adminFetch(endpoints.exams, { method: "POST", body });
            closeModal(elements.formModal);
            const refreshed = await loadExams();
            showToast(
                refreshed
                    ? "Exam created."
                    : "Exam created, but the list could not be refreshed. Use Refresh to reload it."
            );
        } catch (error) {
            console.error("Unable to create exam.");
            elements.formMessage.textContent = friendlyCreateError(error);
            elements.formMessage.hidden = false;
        } finally {
            setFormBusy(false);
        }
    }

    async function cancelExam() {
        if (!state.pendingExamId || state.confirming) return;
        const examId = state.pendingExamId;
        setConfirmBusy(true);
        elements.confirmError.hidden = true;
        elements.confirmError.textContent = "";
        try {
            await adminFetch(
                `${endpoints.exams}/${encodeURIComponent(examId)}/cancel`,
                { method: "PATCH" }
            );
            closeModal(elements.confirmModal);
            const refreshed = await loadExams();
            showToast(
                refreshed
                    ? "Exam cancelled."
                    : "Exam cancelled, but the list could not be refreshed. Use Refresh to reload it."
            );
        } catch (error) {
            console.error("Unable to cancel exam.");
            elements.confirmError.textContent = friendlyCancelError(error);
            elements.confirmError.hidden = false;
        } finally {
            setConfirmBusy(false);
        }
    }

    function clearFilters() {
        elements.search.value = "";
        elements.courseFilter.value = "all";
        elements.programFilter.value = "all";
        elements.statusFilter.value = "all";
        renderExams();
    }

    function handleTableClick(event) {
        const button = event.target.closest("button[data-action][data-exam-id]");
        if (!button || !elements.tableBody.contains(button)) return;
        const exam = state.exams.find((item) => item.id === button.dataset.examId);
        if (!exam) return;
        if (button.dataset.action === "view") {
            elements.viewTitle.textContent = exam.title || "Exam details";
            elements.viewSubtitle.textContent = `${courseName(exam.courseId)} · ${programName(exam.programId)}`;
            elements.viewDetails.hidden = true;
            elements.viewError.hidden = true;
            elements.viewLoading.hidden = false;
            openModal(elements.viewModal);
            loadExamDetails(exam.id);
        } else if (button.dataset.action === "cancel") {
            showCancelConfirmation(exam);
        }
    }

    function initializeEvents() {
        elements.refresh.addEventListener("click", loadExams);
        elements.retry.addEventListener("click", loadExams);
        elements.create.addEventListener("click", openCreateForm);
        elements.emptyCreate.addEventListener("click", openCreateForm);
        elements.clearFilters.addEventListener("click", clearFilters);
        elements.search.addEventListener("input", renderExams);
        elements.courseFilter.addEventListener("change", renderExams);
        elements.programFilter.addEventListener("change", renderExams);
        elements.statusFilter.addEventListener("change", renderExams);
        elements.course.addEventListener("change", updateQuestionPoolHint);
        elements.tableBody.addEventListener("click", handleTableClick);
        elements.form.addEventListener("submit", submitExamForm);
        elements.confirmButton.addEventListener("click", cancelExam);
        elements.cancelAction.addEventListener("click", () => closeModal(elements.confirmModal));
        elements.retryDetails.addEventListener("click", () => loadExamDetails(state.viewingExamId));

        document.querySelectorAll(".exam-modal-backdrop").forEach((backdrop) => {
            backdrop.addEventListener("click", (event) => {
                if (event.target === backdrop) closeModal(backdrop);
            });
            backdrop.querySelectorAll("[data-close-modal]").forEach((button) => {
                button.addEventListener("click", () => closeModal(backdrop));
            });
        });

        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;
            const modal = [elements.confirmModal, elements.viewModal, elements.formModal].find(
                (item) => !item.hidden
            );
            if (
                modal &&
                !state.saving &&
                !state.confirming &&
                !(modal === elements.viewModal && !elements.viewLoading.hidden)
            ) {
                closeModal(modal);
            }
        });
    }

    initializeEvents();
    loadExams();
})();