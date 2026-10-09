(() => {
    "use strict";

    const optionKeys = ["A", "B", "C", "D"];
    const endpoints = {
        questions: "/questions",
        courses: "/courses",
    };

    const state = {
        questions: [],
        courses: [],
        courseById: new Map(),
        loading: false,
        saving: false,
        pageState: "loading",
        pendingAction: null,
        toastTimer: null,
    };

    const elements = {
        total: document.getElementById("totalQuestions"),
        active: document.getElementById("activeQuestions"),
        inactive: document.getElementById("inactiveQuestions"),
        representedCourses: document.getElementById("representedCourses"),
        count: document.getElementById("questionCount"),
        search: document.getElementById("questionSearch"),
        courseFilter: document.getElementById("questionCourseFilter"),
        statusFilter: document.getElementById("questionStatusFilter"),
        loading: document.getElementById("questionsLoadingState"),
        error: document.getElementById("questionsErrorState"),
        errorMessage: document.getElementById("questionsErrorMessage"),
        empty: document.getElementById("questionsEmptyState"),
        emptyTitle: document.getElementById("questionsEmptyTitle"),
        emptyMessage: document.getElementById("questionsEmptyMessage"),
        emptyAdd: document.getElementById("emptyAddQuestionButton"),
        clearFilters: document.getElementById("clearQuestionFiltersButton"),
        tableWrapper: document.getElementById("questionsTableWrapper"),
        tableBody: document.getElementById("questionsTableBody"),
        refresh: document.getElementById("refreshQuestionsButton"),
        add: document.getElementById("addQuestionButton"),
        retry: document.getElementById("retryQuestionsButton"),
        toast: document.getElementById("questionToast"),
        formModal: document.getElementById("questionFormModal"),
        form: document.getElementById("questionForm"),
        formTitle: document.getElementById("questionFormTitle"),
        formDescription: document.getElementById("questionFormDescription"),
        formMessage: document.getElementById("questionFormMessage"),
        course: document.getElementById("questionCourse"),
        questionText: document.getElementById("questionText"),
        options: Object.fromEntries(
            optionKeys.map((key) => [key, document.getElementById(`questionOption${key}`)])
        ),
        correctAnswer: document.getElementById("questionCorrectAnswer"),
        marks: document.getElementById("questionMarks"),
        save: document.getElementById("saveQuestionButton"),
        saveText: document.getElementById("saveQuestionButtonText"),
        saveSpinner: document.getElementById("saveQuestionSpinner"),
        viewModal: document.getElementById("questionViewModal"),
        viewSubtitle: document.getElementById("questionViewSubtitle"),
        viewPrompt: document.getElementById("questionViewPrompt"),
        viewOptions: document.getElementById("questionViewOptions"),
        viewMetadata: document.getElementById("questionViewMetadata"),
        confirmModal: document.getElementById("questionConfirmModal"),
        confirmTitle: document.getElementById("questionConfirmTitle"),
        confirmMessage: document.getElementById("questionConfirmMessage"),
        confirmError: document.getElementById("questionConfirmError"),
        confirmIcon: document.getElementById("questionConfirmIcon"),
        confirmCard: document.querySelector("#questionConfirmModal .question-confirm-modal"),
        cancelAction: document.getElementById("cancelQuestionActionButton"),
        confirmButton: document.getElementById("confirmQuestionActionButton"),
        confirmText: document.getElementById("confirmQuestionActionText"),
        confirmSpinner: document.getElementById("confirmQuestionSpinner"),
    };

    function safeQuestion(record) {
        if (!record || typeof record !== "object" || typeof record.id !== "string" || !record.id) {
            return null;
        }
        const rawOptions =
            record.options && typeof record.options === "object" && !Array.isArray(record.options)
                ? record.options
                : {};
        const options = Object.fromEntries(
            optionKeys.map((key) => [
                key,
                typeof rawOptions[key] === "string" ? rawOptions[key] : "",
            ])
        );
        return {
            id: record.id,
            courseId: typeof record.courseId === "string" ? record.courseId : "",
            question: typeof record.question === "string" ? record.question : "",
            options,
            correctAnswer:
                typeof record.correctAnswer === "string" && optionKeys.includes(record.correctAnswer)
                    ? record.correctAnswer
                    : "",
            marks:
                typeof record.marks === "number" && Number.isInteger(record.marks)
                    ? record.marks
                    : null,
            isActive: typeof record.isActive === "boolean" ? record.isActive : null,
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
            code: typeof record.code === "string" ? record.code : "",
            isActive: typeof record.isActive === "boolean" ? record.isActive : null,
        };
    }

    function assertArrayResponse(response, label) {
        if (!response || response.success !== true || !Array.isArray(response.data)) {
            throw new Error(`${label} response format was unexpected.`);
        }
        return response.data;
    }

    function courseName(courseId) {
        const course = state.courseById.get(courseId);
        return course?.name || "Unknown course";
    }

    function statusOf(question) {
        if (question.isActive === true) return "active";
        if (question.isActive === false) return "inactive";
        return "unknown";
    }

    function statusLabel(question) {
        const status = statusOf(question);
        if (status === "unknown") return "Unspecified";
        return status === "active" ? "Active" : "Inactive";
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

    function formatDate(value) {
        const date = toDate(value);
        if (!date) return "—";
        return new Intl.DateTimeFormat("en-NG", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(date);
    }

    async function requestPageData() {
        const [questionsResponse, coursesResponse] = await Promise.all([
            adminFetch(endpoints.questions),
            adminFetch(endpoints.courses),
        ]);
        const questionRecords = assertArrayResponse(questionsResponse, "Questions");
        const courseRecords = assertArrayResponse(coursesResponse, "Courses");
        state.questions = questionRecords.map(safeQuestion).filter(Boolean);
        state.courses = courseRecords.map(safeCourse).filter(Boolean);
        state.courseById = new Map(state.courses.map((course) => [course.id, course]));
        populateCourseFilters();
        updateSummary();
        renderQuestions();
    }

    function addOption(select, value, label) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.append(option);
    }

    function populateCourseFilters() {
        const selected = elements.courseFilter.value || "all";
        elements.courseFilter.replaceChildren();
        addOption(elements.courseFilter, "all", "All courses");
        [...state.courses]
            .sort((left, right) => left.name.localeCompare(right.name))
            .forEach((course) => addOption(elements.courseFilter, course.id, course.name || "Unnamed course"));
        elements.courseFilter.value =
            state.courses.some((course) => course.id === selected) ? selected : "all";
    }

    function updateSummary() {
        const active = state.questions.filter((question) => question.isActive === true).length;
        const inactive = state.questions.filter((question) => question.isActive === false).length;
        const representedCourseIds = new Set(
            state.questions
                .map((question) => question.courseId)
                .filter((id) => id && state.courseById.has(id))
        );
        elements.total.textContent = String(state.questions.length);
        elements.active.textContent = String(active);
        elements.inactive.textContent = String(inactive);
        elements.representedCourses.textContent = String(representedCourseIds.size);
    }

    function filteredQuestions() {
        const search = elements.search.value.trim().toLocaleLowerCase();
        const selectedCourse = elements.courseFilter.value;
        const selectedStatus = elements.statusFilter.value;
        return state.questions.filter((question) => {
            if (selectedCourse !== "all" && question.courseId !== selectedCourse) return false;
            if (selectedStatus !== "all" && statusOf(question) !== selectedStatus) return false;
            if (!search) return true;
            const searchable = `${question.question} ${question.id} ${courseName(question.courseId)}`.toLocaleLowerCase();
            return searchable.includes(search);
        });
    }

    function textElement(tag, text, className = "") {
        const element = document.createElement(tag);
        if (className) element.className = className;
        element.textContent = text;
        return element;
    }

    function createActionButton(label, action, id, extraClass = "") {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `question-row-action${extraClass ? ` ${extraClass}` : ""}`;
        button.textContent = label;
        button.dataset.action = action;
        button.dataset.questionId = id;
        return button;
    }

    function renderQuestions() {
        const questions = filteredQuestions();
        elements.tableBody.replaceChildren();
        elements.count.textContent = String(questions.length);

        questions.forEach((question) => {
            const row = document.createElement("tr");
            const promptCell = document.createElement("td");
            promptCell.append(
                textElement("span", question.question || "Question text unavailable", "question-table-prompt"),
                textElement("span", `ID: ${question.id}`, "question-table-id")
            );
            row.append(promptCell);
            row.append(textElement("td", courseName(question.courseId)));
            row.append(textElement("td", question.marks === null ? "—" : String(question.marks)));
            const answer = question.correctAnswer
                ? `${question.correctAnswer}${question.options[question.correctAnswer] ? ` — ${question.options[question.correctAnswer]}` : ""}`
                : "—";
            row.append(textElement("td", answer, "question-answer-preview"));

            const statusCell = document.createElement("td");
            statusCell.append(
                textElement(
                    "span",
                    statusLabel(question),
                    `question-status-badge question-status-${statusOf(question)}`
                )
            );
            row.append(statusCell);
            row.append(textElement("td", formatDate(question.updatedAt)));

            const actionCell = document.createElement("td");
            const actionGroup = document.createElement("div");
            actionGroup.className = "question-row-actions";
            actionGroup.append(createActionButton("View", "view", question.id));
            actionGroup.append(createActionButton("Edit", "edit", question.id));
            if (question.isActive === true) {
                actionGroup.append(createActionButton("Deactivate", "deactivate", question.id));
            } else if (question.isActive === false) {
                actionGroup.append(createActionButton("Activate", "activate", question.id));
            }
            actionGroup.append(createActionButton("Delete", "delete", question.id, "question-row-action-danger"));
            actionCell.append(actionGroup);
            row.append(actionCell);
            elements.tableBody.append(row);
        });

        const hasQuestions = state.questions.length > 0;
        const hasResults = questions.length > 0;
        elements.tableWrapper.hidden = !hasResults;
        elements.empty.hidden = hasResults;
        elements.emptyAdd.hidden = hasQuestions;
        elements.clearFilters.hidden = !hasQuestions;
        if (hasQuestions && !hasResults) {
            elements.emptyTitle.textContent = "No matching questions";
            elements.emptyMessage.textContent = "Change your search or filters to find questions.";
        } else if (!hasQuestions) {
            elements.emptyTitle.textContent = "No questions found";
            elements.emptyMessage.textContent = "There are currently no questions in the question bank.";
        }
    }

    function setPageState(nextState, message = "") {
        state.pageState = nextState;
        elements.loading.hidden = nextState !== "loading";
        elements.error.hidden = nextState !== "error";
        elements.empty.hidden = nextState !== "ready";
        elements.tableWrapper.hidden = nextState !== "ready";
        if (nextState === "error") {
            elements.errorMessage.textContent = message || "We couldn't retrieve the question bank. Please try again.";
        }
        if (nextState === "ready") renderQuestions();
        elements.refresh.disabled = state.loading;
        elements.add.disabled = nextState !== "ready";
        elements.emptyAdd.disabled = nextState !== "ready";
    }

    async function loadQuestions() {
        if (state.loading) return;
        state.loading = true;
        setPageState("loading");
        try {
            await requestPageData();
            setPageState("ready");
        } catch {
            console.error("Unable to load the Admin Questions page.");
            setPageState("error", "We couldn't retrieve the question bank. Please try again.");
        } finally {
            state.loading = false;
            elements.refresh.disabled = false;
            elements.add.disabled = state.pageState !== "ready";
            elements.emptyAdd.disabled = state.pageState !== "ready";
        }
    }

    function populateQuestionCourseSelect(selectedId = "") {
        elements.course.replaceChildren();
        addOption(elements.course, "", "Select a course");
        [...state.courses]
            .sort((left, right) => left.name.localeCompare(right.name))
            .forEach((course) => {
                const label = `${course.name || "Unnamed course"}${course.isActive === false ? " (inactive)" : ""}`;
                addOption(elements.course, course.id, label);
            });
        if (selectedId && !state.courseById.has(selectedId)) {
            addOption(elements.course, selectedId, "Current course unavailable");
        }
        elements.course.value = selectedId;
    }

    function updateCorrectAnswerOptions() {
        const current = elements.correctAnswer.value;
        elements.correctAnswer.replaceChildren();
        optionKeys.forEach((key) => {
            const optionText = elements.options[key].value.trim();
            addOption(elements.correctAnswer, key, optionText ? `${key} — ${optionText}` : key);
        });
        elements.correctAnswer.value = optionKeys.includes(current) ? current : "A";
    }

    function clearFormMessage() {
        elements.formMessage.hidden = true;
        elements.formMessage.textContent = "";
    }

    function openModal(modal) {
        modal.hidden = false;
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("question-modal-open");
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
            document.body.classList.remove("question-modal-open");
        }
        if (modal === elements.confirmModal) {
            state.pendingAction = null;
            setConfirmBusy(false);
        }
    }

    function openForm(question = null) {
        if (state.loading || state.saving || state.pageState !== "ready") return;
        elements.form.reset();
        clearFormMessage();
        const editing = Boolean(question);
        elements.form.dataset.mode = editing ? "edit" : "create";
        elements.form.dataset.questionId = question?.id || "";
        elements.formTitle.textContent = editing ? "Edit Question" : "Add Question";
        elements.formDescription.textContent = editing
            ? "Update the question details and answer options."
            : "Add a multiple-choice question to a course.";
        elements.saveText.textContent = editing ? "Save Changes" : "Add Question";
        populateQuestionCourseSelect(question?.courseId || "");
        elements.questionText.value = question?.question || "";
        optionKeys.forEach((key) => {
            elements.options[key].value = question?.options[key] || "";
        });
        elements.correctAnswer.value = question?.correctAnswer || "A";
        elements.marks.value = question?.marks ?? "";
        updateCorrectAnswerOptions();
        openModal(elements.formModal);
    }

    function addMetadata(label, value, className = "") {
        const item = document.createElement("div");
        item.className = "question-view-meta-item";
        item.append(textElement("dt", label));
        item.append(textElement("dd", value || "Not available", className));
        elements.viewMetadata.append(item);
    }

    function openQuestionView(question) {
        elements.viewSubtitle.textContent = `${courseName(question.courseId)} · ${statusLabel(question)}`;
        elements.viewPrompt.textContent = question.question || "Question text unavailable";
        elements.viewOptions.replaceChildren();
        optionKeys.forEach((key) => {
            const option = document.createElement("div");
            option.className = `question-view-option${question.correctAnswer === key ? " is-correct" : ""}`;
            option.append(textElement("span", key, "question-view-option-key"));
            option.append(
                textElement("span", question.options[key] || "Option unavailable", "question-view-option-text")
            );
            if (question.correctAnswer === key) {
                option.append(textElement("span", "Correct answer", "question-view-correct-label"));
            }
            elements.viewOptions.append(option);
        });
        elements.viewMetadata.replaceChildren();
        addMetadata("Course", courseName(question.courseId));
        addMetadata("Marks", question.marks === null ? "Not available" : String(question.marks));
        addMetadata("Status", statusLabel(question));
        addMetadata("Question ID", question.id, "question-monospace");
        addMetadata("Created", formatDate(question.createdAt));
        addMetadata("Updated", formatDate(question.updatedAt));
        openModal(elements.viewModal);
    }

    function showConfirmation(action, question) {
        const definitions = {
            activate: {
                title: "Activate question?",
                message: `This will make the question available for exam selection in ${courseName(question.courseId)}.`,
                button: "Activate",
                kind: "normal",
            },
            deactivate: {
                title: "Deactivate question?",
                message: `This will exclude the question from future exam selection in ${courseName(question.courseId)}.`,
                button: "Deactivate",
                kind: "normal",
            },
            delete: {
                title: "Delete question permanently?",
                message: "This permanently removes the question from the question bank. It may affect exams that use this question and cannot be undone.",
                button: "Delete Question",
                kind: "delete",
            },
        };
        const details = definitions[action];
        if (!details) return;
        state.pendingAction = { action, questionId: question.id };
        elements.confirmTitle.textContent = details.title;
        elements.confirmMessage.textContent = details.message;
        elements.confirmText.textContent = details.button;
        elements.confirmIcon.textContent = action === "activate" ? "+" : "!";
        elements.confirmCard.dataset.action = details.kind;
        elements.confirmError.hidden = true;
        elements.confirmError.textContent = "";
        openModal(elements.confirmModal);
    }

    function setFormBusy(busy) {
        state.saving = busy;
        elements.save.disabled = busy;
        elements.saveSpinner.hidden = !busy;
        elements.saveText.textContent = busy
            ? "Saving..."
            : elements.form.dataset.mode === "edit"
                ? "Save Changes"
                : "Add Question";
        elements.form.querySelectorAll("[data-close-modal]").forEach((button) => {
            button.disabled = busy;
        });
    }

    function setConfirmBusy(busy) {
        elements.confirmButton.disabled = busy;
        elements.cancelAction.disabled = busy;
        elements.confirmSpinner.hidden = !busy;
        if (busy) {
            elements.confirmText.textContent = "Working...";
        } else if (state.pendingAction) {
            const labels = {
                activate: "Activate",
                deactivate: "Deactivate",
                delete: "Delete Question",
            };
            elements.confirmText.textContent = labels[state.pendingAction.action];
        }
    }

    function friendlyError(error, operation) {
        const message = typeof error?.message === "string" ? error.message.toLowerCase() : "";
        if (message.includes("selected course does not exist")) {
            return "That course could not be found. Refresh the page and select a course again.";
        }
        if (message.includes("question not found")) {
            return "That question could not be found. Refresh the list and try again.";
        }
        if (message.includes("correct the following errors") || message.includes("option")) {
            return "Check that the question, all four options, correct answer, and positive whole-number marks are valid.";
        }
        if (operation === "create") return "The question could not be added. Check the entered information and try again.";
        if (operation === "edit") return "The question could not be updated. Check the entered information and try again.";
        if (operation === "delete") return "The question could not be deleted. Refresh the list and try again.";
        return "The question status could not be changed. Refresh the list and try again.";
    }

    function showToast(message) {
        window.clearTimeout(state.toastTimer);
        elements.toast.textContent = message;
        elements.toast.hidden = false;
        state.toastTimer = window.setTimeout(() => {
            elements.toast.hidden = true;
        }, 4000);
    }

    async function submitQuestion(event) {
        event.preventDefault();
        if (state.saving) return;
        clearFormMessage();
        if (!elements.form.reportValidity()) return;

        const options = Object.fromEntries(
            optionKeys.map((key) => [key, elements.options[key].value.trim()])
        );
        const marks = Number(elements.marks.value);
        if (!elements.course.value || !elements.questionText.value.trim() ||
            optionKeys.some((key) => !options[key]) ||
            !optionKeys.includes(elements.correctAnswer.value) ||
            !Number.isInteger(marks) || marks < 1) {
            elements.formMessage.textContent =
                "Provide a course, question, all four options, a correct answer, and positive whole-number marks.";
            elements.formMessage.hidden = false;
            return;
        }

        const body = {
            courseId: elements.course.value,
            question: elements.questionText.value.trim(),
            options,
            correctAnswer: elements.correctAnswer.value,
            marks,
        };
        const mode = elements.form.dataset.mode;
        const id = elements.form.dataset.questionId;
        const path = mode === "edit"
            ? `${endpoints.questions}/${encodeURIComponent(id)}`
            : endpoints.questions;

        setFormBusy(true);
        try {
            await adminFetch(path, {
                method: mode === "edit" ? "PATCH" : "POST",
                body,
            });
            closeModal(elements.formModal);
            await loadQuestions();
            showToast(mode === "edit" ? "Question updated." : "Question added.");
        } catch (error) {
            console.error(`Unable to ${mode === "edit" ? "update" : "create"} question.`);
            elements.formMessage.textContent = friendlyError(error, mode);
            elements.formMessage.hidden = false;
        } finally {
            setFormBusy(false);
        }
    }

    async function performConfirmedAction() {
        if (!state.pendingAction || elements.confirmButton.disabled) return;
        const { action, questionId } = state.pendingAction;
        const path = `${endpoints.questions}/${encodeURIComponent(questionId)}`;
        const question = state.questions.find((item) => item.id === questionId);
        if (!question) return;

        elements.confirmError.hidden = true;
        elements.confirmError.textContent = "";
        setConfirmBusy(true);
        try {
            if (action === "delete") {
                await adminFetch(path, { method: "DELETE" });
            } else {
                await adminFetch(path, {
                    method: "PATCH",
                    body: { isActive: action === "activate" },
                });
            }
            closeModal(elements.confirmModal);
            await loadQuestions();
            showToast(
                action === "delete"
                    ? "Question deleted."
                    : action === "activate"
                        ? "Question activated."
                        : "Question deactivated."
            );
        } catch (error) {
            console.error(`Unable to ${action} question.`);
            elements.confirmError.textContent = friendlyError(error, action);
            elements.confirmError.hidden = false;
        } finally {
            setConfirmBusy(false);
        }
    }

    function clearFilters() {
        elements.search.value = "";
        elements.courseFilter.value = "all";
        elements.statusFilter.value = "all";
        renderQuestions();
    }

    function handleTableClick(event) {
        const button = event.target.closest("button[data-action][data-question-id]");
        if (!button || !elements.tableBody.contains(button)) return;
        const question = state.questions.find((item) => item.id === button.dataset.questionId);
        if (!question) return;
        const action = button.dataset.action;
        if (action === "view") openQuestionView(question);
        else if (action === "edit") openForm(question);
        else showConfirmation(action, question);
    }

    function initializeEvents() {
        elements.refresh.addEventListener("click", loadQuestions);
        elements.retry.addEventListener("click", loadQuestions);
        elements.add.addEventListener("click", () => openForm());
        elements.emptyAdd.addEventListener("click", () => openForm());
        elements.clearFilters.addEventListener("click", clearFilters);
        elements.search.addEventListener("input", renderQuestions);
        elements.courseFilter.addEventListener("change", renderQuestions);
        elements.statusFilter.addEventListener("change", renderQuestions);
        elements.tableBody.addEventListener("click", handleTableClick);
        elements.form.addEventListener("submit", submitQuestion);
        elements.confirmButton.addEventListener("click", performConfirmedAction);
        elements.cancelAction.addEventListener("click", () => closeModal(elements.confirmModal));
        Object.values(elements.options).forEach((input) => {
            input.addEventListener("input", updateCorrectAnswerOptions);
        });

        document.querySelectorAll(".question-modal-backdrop").forEach((backdrop) => {
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
            if (modal && !state.saving && !elements.confirmButton.disabled) closeModal(modal);
        });
    }

    initializeEvents();
    loadQuestions();
})();