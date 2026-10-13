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
        bulkQuestions: [],
        bulkSaving: false,
        bulkFormat: "text",
        bulkImportErrors: [],
        bulkPreviewDirty: true,
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
        bulkAdd: document.getElementById("bulkAddQuestionsButton"),
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
        bulkModal: document.getElementById("bulkQuestionModal"),
        bulkCourse: document.getElementById("bulkQuestionCourse"),
        bulkAnswerMode: document.getElementById("bulkAnswerMode"),
        bulkAnswerKey: document.getElementById("bulkAnswerKey"),
        bulkAnswerKeyField: document.getElementById("bulkAnswerKeyField"),
        bulkFile: document.getElementById("bulkQuestionFile"),
        bulkTemplate: document.getElementById("downloadQuestionTemplateButton"),
        bulkInput: document.getElementById("bulkQuestionInput"),
        bulkMessage: document.getElementById("bulkQuestionMessage"),
        bulkPreviewButton: document.getElementById("previewBulkQuestionsButton"),
        bulkSummary: document.getElementById("bulkQuestionSummary"),
        bulkPreview: document.getElementById("bulkQuestionPreview"),
        bulkResult: document.getElementById("bulkQuestionResult"),
        bulkConfirm: document.getElementById("confirmBulkQuestionsButton"),
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

    function populateBulkCourseSelect(selectedId = "") {
        elements.bulkCourse.replaceChildren();
        addOption(elements.bulkCourse, "", "Select a course");
        [...state.courses]
            .sort((left, right) => left.name.localeCompare(right.name))
            .forEach((course) => {
                const label = `${course.name || "Unnamed course"}${course.isActive === false ? " (inactive)" : ""}`;
                addOption(elements.bulkCourse, course.id, label);
            });
        elements.bulkCourse.value = state.courseById.has(selectedId)
            ? selectedId
            : "";
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

    function openBulkQuestionModal() {
        if (state.loading || state.saving || state.pageState !== "ready") return;

        const selectedCourse = elements.courseFilter.value;
        populateBulkCourseSelect(
            selectedCourse === "all" ? "" : selectedCourse
        );
        elements.bulkInput.value = "";
        elements.bulkAnswerKey.value = "";
        elements.bulkAnswerMode.value = "embedded";
        elements.bulkAnswerKeyField.hidden = true;
        elements.bulkFile.value = "";
        state.bulkFormat = "text";
        state.bulkImportErrors = [];
        state.bulkPreviewDirty = true;
        elements.bulkMessage.hidden = true;
        elements.bulkMessage.textContent = "";
        elements.bulkSummary.textContent = "";
        elements.bulkResult.hidden = true;
        elements.bulkResult.textContent = "";
        elements.bulkPreview.replaceChildren();
        elements.bulkConfirm.disabled = true;
        state.bulkQuestions = [];
        openModal(elements.bulkModal);
    }

    function validateBulkEntry(entry) {
        const errors = [...entry.parseErrors, ...entry.serverErrors];
        if (!elements.bulkCourse.value) errors.push("Select a course");
        if (!entry.question.trim()) errors.push("Question is required");
        if (entry.question.trim().length > 5000) errors.push("Question exceeds 5,000 characters");
        for (const key of optionKeys) {
            if (!entry.options[key].trim()) {
                errors.push(`Option ${key} is required`);
            } else if (entry.options[key].trim().length > 2000) {
                errors.push(`Option ${key} exceeds 2,000 characters`);
            }
        }
        if (!optionKeys.includes(entry.correctAnswer)) {
            errors.push("Correct answer must be A, B, C, or D");
        }
        if (entry.answerConflict && !entry.answerConflictConfirmed) {
            errors.push("Confirm the embedded or separate answer in the answer selector");
        }
        if (entry.reviewWarning && !entry.reviewConfirmed) {
            errors.push("Review and confirm the flagged parsing boundary");
        }
        if (!Number.isInteger(Number(entry.marks)) || Number(entry.marks) < 1) {
            errors.push("Marks must be a positive whole number");
        }
        return [...new Set(errors)];
    }

    function normalizedPrompt(value) {
        return value
            .normalize("NFC")
            .trim()
            .replace(/\s+/g, " ")
            .toLocaleLowerCase();
    }

    function findBulkDuplicate(index) {
        const entry = state.bulkQuestions[index];
        const normalized = normalizedPrompt(entry.question);
        if (!normalized || !elements.bulkCourse.value) return null;

        const existing = state.questions.find(
            (question) =>
                question.courseId === elements.bulkCourse.value &&
                normalizedPrompt(question.question) === normalized
        );
        if (existing) return "This question already exists in the selected course.";

        const earlier = state.bulkQuestions.findIndex(
            (candidate, candidateIndex) =>
                candidateIndex < index &&
                normalizedPrompt(candidate.question) === normalized
        );
        return earlier >= 0
            ? `This duplicates question ${earlier + 1} in the batch.`
            : null;
    }

    function createBulkField(label, value, index, field, optionKey = "") {
        const wrapper = document.createElement("label");
        wrapper.className = "question-form-field";
        const caption = document.createElement("span");
        caption.textContent = label;
        const tag =
            field === "correctAnswer"
                ? "select"
                : field === "marks"
                    ? "input"
                    : "textarea";
        const control = document.createElement(tag);
        control.className = "bulk-question-field";
        control.dataset.entryIndex = String(index);
        control.dataset.field = field;
        if (optionKey) control.dataset.optionKey = optionKey;
        if (field === "question" || field === "option") {
            control.rows = field === "question" ? 2 : 1;
            control.value = value;
        } else if (field === "marks") {
            control.type = "number";
            control.min = "1";
            control.step = "1";
            control.value = String(value);
        } else {
            if (
                field === "correctAnswer" &&
                state.bulkQuestions[index].answerConflict &&
                !state.bulkQuestions[index].answerConflictConfirmed
            ) {
                addOption(control, "", "Confirm or correct answer");
            }
            optionKeys.forEach((key) => addOption(control, key, key));
            control.value =
                state.bulkQuestions[index].answerConflict &&
                !state.bulkQuestions[index].answerConflictConfirmed
                    ? ""
                    : value;
        }
        control.disabled =
            state.bulkQuestions[index].serverStatus === "created";
        wrapper.append(caption, control);
        return wrapper;
    }

    function canRetryBulkEntry(entry) {
        const index = state.bulkQuestions.indexOf(entry);
        return entry.serverStatus !== "created" &&
            entry.serverStatus !== "duplicate" &&
            index >= 0 &&
            !findBulkDuplicate(index) &&
            validateBulkEntry(entry).length === 0;
    }

    function renderBulkQuestions() {
        elements.bulkPreview.replaceChildren();
        let readyCount = 0;
        let invalidCount = 0;

        state.bulkQuestions.forEach((entry, index) => {
            const errors = validateBulkEntry(entry);
            const duplicate = findBulkDuplicate(index);
            const isSaved = entry.serverStatus === "created";
            if (isSaved) readyCount += 1;
            else if (canRetryBulkEntry(entry)) readyCount += 1;
            else invalidCount += 1;

            const card = document.createElement("article");
            card.className = "bulk-question-entry";
            card.dataset.entryIndex = String(index);
            card.dataset.status = isSaved
                ? "saved"
                : entry.serverStatus === "duplicate"
                    ? "duplicate"
                    : errors.length
                        ? "invalid"
                        : duplicate
                            ? "duplicate"
                            : "valid";

            const header = document.createElement("div");
            header.className = "bulk-question-entry-header";
            const title = textElement(
                "strong",
                isSaved
                    ? `Question ${index + 1} · Saved`
                    : entry.serverStatus === "duplicate"
                        ? `Question ${index + 1} · Duplicate`
                        : errors.length
                            ? `Question ${index + 1} · Needs correction`
                            : duplicate
                                ? `Question ${index + 1} · Potential duplicate`
                                : `Question ${index + 1} · Ready`
            );
            const remove = textElement("button", "Remove");
            remove.type = "button";
            remove.className = "bulk-question-remove";
            remove.dataset.removeIndex = String(index);
            remove.disabled = isSaved;
            header.append(title, remove);
            card.append(header);
            card.append(
                createBulkField("Question", entry.question, index, "question")
            );

            const optionGrid = document.createElement("div");
            optionGrid.className = "bulk-question-options";
            optionKeys.forEach((key) =>
                optionGrid.append(
                    createBulkField(
                        `Option ${key}`,
                        entry.options[key],
                        index,
                        "option",
                        key
                    )
                )
            );
            card.append(optionGrid);

            const settings = document.createElement("div");
            settings.className = "question-form-grid";
            settings.append(
                createBulkField(
                    "Correct answer",
                    entry.correctAnswer,
                    index,
                    "correctAnswer"
                ),
                createBulkField("Marks", entry.marks, index, "marks")
            );
            card.append(settings);

            const messages = [
                ...errors,
                ...(duplicate && !isSaved ? [duplicate] : [])
            ];
            if (isSaved) {
                card.append(
                    textElement(
                        "p",
                        `Saved as question ID ${entry.savedId}.`,
                        "bulk-question-entry-errors"
                    )
                );
            } else if (messages.length) {
                card.append(
                    textElement(
                        "p",
                        [...new Set(messages)].join(" "),
                        "bulk-question-entry-errors"
                    )
                );
            }
            if (entry.reviewWarning && !entry.reviewConfirmed && !isSaved) {
                const reviewLabel = document.createElement("label");
                reviewLabel.className = "bulk-question-review";
                const review = document.createElement("input");
                review.type = "checkbox";
                review.dataset.reviewIndex = String(index);
                reviewLabel.append(
                    review,
                    textElement(
                        "span",
                        `I reviewed this question boundary: ${entry.reviewWarning}`
                    )
                );
                card.append(reviewLabel);
            }
            elements.bulkPreview.append(card);
        });

        const attentionCount = invalidCount + state.bulkImportErrors.length;
        elements.bulkSummary.textContent = state.bulkQuestions.length
            ? `${readyCount} parsed successfully · ${attentionCount} require attention${state.bulkImportErrors.length ? ` · ${state.bulkImportErrors.join(" ")}` : ""}`
            : "No questions parsed yet.";
        elements.bulkConfirm.disabled =
            state.bulkSaving ||
            state.bulkPreviewDirty ||
            !state.bulkQuestions.some(canRetryBulkEntry);
    }

    function previewBulkQuestions() {
        elements.bulkMessage.hidden = true;
        elements.bulkResult.hidden = true;
        if (!elements.bulkInput.value.trim()) {
            elements.bulkMessage.textContent =
                "Paste at least one question block before previewing.";
            elements.bulkMessage.hidden = false;
            return;
        }

        const parsed = window.ExamHubQuestionImportParser.parseQuestionImport({
            text: elements.bulkInput.value,
            answerKey: elements.bulkAnswerKey.value,
            answerMode: elements.bulkAnswerMode.value,
            format: state.bulkFormat,
        });
        state.bulkQuestions = parsed.entries;
        state.bulkImportErrors = parsed.errors;
        state.bulkPreviewDirty = false;
        if (!state.bulkQuestions.length && parsed.errors.length) {
            elements.bulkMessage.textContent = parsed.errors.join(" ");
            elements.bulkMessage.hidden = false;
        }
        renderBulkQuestions();
    }

    async function loadBulkQuestionFile() {
        const file = elements.bulkFile.files?.[0];
        if (!file) return;
        const extension = file.name.toLowerCase().split(".").pop();
        if (!["csv", "tsv"].includes(extension)) {
            elements.bulkMessage.textContent = "Choose a CSV or TSV file.";
            elements.bulkMessage.hidden = false;
            elements.bulkFile.value = "";
            return;
        }
        try {
            elements.bulkInput.value = await file.text();
            state.bulkFormat = extension;
            elements.bulkMessage.hidden = true;
            elements.bulkAnswerMode.value = "embedded";
            elements.bulkAnswerKeyField.hidden = true;
            previewBulkQuestions();
        } catch (error) {
            console.error("Unable to read question import file.", {
                message: error?.message || "Unknown file error",
            });
            elements.bulkMessage.textContent =
                "The selected file could not be read. Try saving it as UTF-8 CSV or TSV.";
            elements.bulkMessage.hidden = false;
        }
    }

    function downloadBulkQuestionTemplate() {
        const blob = new Blob(
            [window.ExamHubQuestionImportParser.toCsvTemplate()],
            { type: "text/csv;charset=utf-8" }
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "examhub-question-template.csv";
        link.click();
        URL.revokeObjectURL(url);
    }

    function markBulkPreviewDirty() {
        state.bulkPreviewDirty = true;
        elements.bulkConfirm.disabled = true;
        elements.bulkSummary.textContent =
            "Import details changed. Preview again before saving.";
    }

    function handleBulkPreviewInput(event) {
        const field = event.target.closest(".bulk-question-field");
        if (!field) return;
        const index = Number(field.dataset.entryIndex);
        const entry = state.bulkQuestions[index];
        if (!entry) return;

        const value = field.value;
        if (field.dataset.field === "option") {
            entry.options[field.dataset.optionKey] = value;
        } else {
            entry[field.dataset.field] = value;
        }
        if (field.dataset.field === "correctAnswer" && entry.answerConflict) {
            const resolvedMessage =
                window.ExamHubQuestionImportParser.resolveAnswerConflict(
                    entry,
                    value
                );
            if (resolvedMessage) {
                state.bulkImportErrors = state.bulkImportErrors.filter(
                    (message) => message !== resolvedMessage
                );
            }
        }
        entry.serverStatus = "";
        entry.serverErrors = [];
        if (!entry.answerConflictConfirmed && entry.answerConflict) {
            entry.parseErrors = [entry.answerConflict];
        } else {
            entry.parseErrors = [];
        }

        const card = field.closest(".bulk-question-entry");
        const duplicate = findBulkDuplicate(index);
        const errors = validateBulkEntry(entry);
        const messages = [...errors, ...(duplicate ? [duplicate] : [])];
        let message = card.querySelector(".bulk-question-entry-errors");
        if (!message && messages.length) {
            message = textElement("p", "", "bulk-question-entry-errors");
            card.append(message);
        }
        if (message) {
            message.textContent = messages.join(" ");
            message.hidden = !messages.length;
        }
        card.dataset.status = errors.length
            ? "invalid"
            : duplicate
                ? "duplicate"
                : "valid";
        card.querySelector(".bulk-question-entry-header strong").textContent =
            `Question ${index + 1} · ${
                errors.length
                    ? "Needs correction"
                    : duplicate
                        ? "Potential duplicate"
                        : "Ready"
            }`;
        renderBulkSummaryAndSaveState();
    }

    function renderBulkSummaryAndSaveState() {
        const readyCount = state.bulkQuestions.filter(canRetryBulkEntry).length;
        const savedCount = state.bulkQuestions.filter(
            (entry) => entry.serverStatus === "created"
        ).length;
        const invalidCount =
            state.bulkQuestions.length - readyCount - savedCount +
            state.bulkImportErrors.length;
        elements.bulkSummary.textContent =
            `${readyCount} parsed successfully · ${invalidCount} require attention.`;
        elements.bulkConfirm.disabled =
            state.bulkSaving || state.bulkPreviewDirty || readyCount === 0;
    }

    function handleBulkPreviewClick(event) {
        const button = event.target.closest("[data-remove-index]");
        if (!button) return;
        const index = Number(button.dataset.removeIndex);
        state.bulkQuestions.splice(index, 1);
        renderBulkQuestions();
    }

    function handleBulkReviewChange(event) {
        const checkbox = event.target.closest("input[data-review-index]");
        if (!checkbox) return;
        const entry = state.bulkQuestions[Number(checkbox.dataset.reviewIndex)];
        if (!entry) return;
        window.ExamHubQuestionImportParser.confirmParseReview(
            entry,
            checkbox.checked
        );
        renderBulkQuestions();
    }

    function openBulkQuestionConfirmation() {
        const readyCount = state.bulkQuestions.filter(canRetryBulkEntry).length;
        if (!readyCount || state.bulkSaving || state.bulkPreviewDirty) return;

        state.pendingAction = { action: "bulk" };
        elements.confirmTitle.textContent = "Save valid questions?";
        elements.confirmMessage.textContent =
            `${readyCount} question${readyCount === 1 ? "" : "s"} will be submitted. Invalid entries will be left out, and duplicates will be reported without being inserted.`;
        elements.confirmText.textContent = `Save ${readyCount} Questions`;
        elements.confirmIcon.textContent = "!";
        elements.confirmCard.dataset.action = "normal";
        elements.confirmError.hidden = true;
        elements.confirmError.textContent = "";
        openModal(elements.confirmModal);
    }

    async function performBulkQuestionSave() {
        if (state.bulkSaving) return;
        const sourceIndexes = [];
        const questions = [];
        state.bulkQuestions.forEach((entry, index) => {
            if (!canRetryBulkEntry(entry)) return;
            sourceIndexes.push(index);
            questions.push({
                courseId: elements.bulkCourse.value,
                question: entry.question.trim(),
                options: Object.fromEntries(
                    optionKeys.map((key) => [
                        key,
                        entry.options[key].trim()
                    ])
                ),
                correctAnswer: entry.correctAnswer,
                marks: Number(entry.marks)
            });
        });
        if (!questions.length) return;

        state.bulkSaving = true;
        elements.bulkConfirm.disabled = true;
        setConfirmBusy(true);
        elements.cancelAction.disabled = true;

        try {
            const response = await adminFetch(`${endpoints.questions}/bulk`, {
                method: "POST",
                body: { questions }
            });
            const result = response?.data;
            if (
                response?.success !== true ||
                !result ||
                !Array.isArray(result.items)
            ) {
                throw new Error(
                    "The bulk question endpoint returned an unexpected response."
                );
            }

            result.items.forEach((item) => {
                const entry = state.bulkQuestions[sourceIndexes[item.index]];
                if (!entry) return;
                entry.serverStatus = item.status;
                entry.serverErrors = Array.isArray(item.errors)
                    ? item.errors
                    : [];
                entry.savedId = item.id || null;
            });

            closeModal(elements.confirmModal);
            const skippedCount = state.bulkQuestions.filter(
                (entry, index) =>
                    !sourceIndexes.includes(index) &&
                    entry.serverStatus !== "created"
            ).length;
            const summary =
                `Created ${result.savedCount}; ${result.duplicateCount} duplicate; ` +
                `${result.failedCount} rejected by validation; ${skippedCount} invalid or duplicate entries skipped before submission.`;
            elements.bulkResult.textContent = summary;
            elements.bulkResult.classList.toggle(
                "is-error",
                result.duplicateCount > 0 || result.failedCount > 0
            );
            elements.bulkResult.hidden = false;
            renderBulkQuestions();
            if (result.savedCount > 0) {
                await loadQuestions();
            }
            showToast(summary);
        } catch (error) {
            console.error("Bulk question save failed:", {
                message: error?.message || "Unknown request error",
                name: error?.name || "Error"
            });
            closeModal(elements.confirmModal);
            elements.bulkResult.textContent =
                error.message || "The question batch could not be saved.";
            elements.bulkResult.classList.add("is-error");
            elements.bulkResult.hidden = false;
        } finally {
            state.bulkSaving = false;
            setConfirmBusy(false);
            elements.cancelAction.disabled = false;
            renderBulkSummaryAndSaveState();
        }
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
        if (modal === elements.bulkModal && state.bulkSaving) return;
        modal.hidden = true;
        modal.setAttribute("aria-hidden", "true");
        if (![elements.formModal, elements.viewModal, elements.confirmModal, elements.bulkModal].some((item) => !item.hidden)) {
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
                bulk: "Save Questions",
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
        if (action === "bulk") {
            await performBulkQuestionSave();
            return;
        }
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
        elements.bulkAdd.addEventListener("click", openBulkQuestionModal);
        elements.bulkAnswerMode.addEventListener("change", () => {
            elements.bulkAnswerKeyField.hidden =
                elements.bulkAnswerMode.value !== "separate";
            markBulkPreviewDirty();
        });
        elements.bulkInput.addEventListener("input", () => {
            state.bulkFormat = "text";
            markBulkPreviewDirty();
        });
        elements.bulkAnswerKey.addEventListener("input", markBulkPreviewDirty);
        elements.bulkFile.addEventListener("change", loadBulkQuestionFile);
        elements.bulkTemplate.addEventListener("click", downloadBulkQuestionTemplate);
        elements.bulkCourse.addEventListener("change", () => {
            state.bulkQuestions.forEach((entry) => {
                if (entry.serverStatus === "created") return;
                entry.serverStatus = "";
                entry.serverErrors = [];
            });
            renderBulkQuestions();
        });
        elements.bulkPreviewButton.addEventListener("click", previewBulkQuestions);
        elements.bulkConfirm.addEventListener("click", openBulkQuestionConfirmation);
        elements.bulkPreview.addEventListener("input", handleBulkPreviewInput);
        elements.bulkPreview.addEventListener("change", handleBulkPreviewInput);
        elements.bulkPreview.addEventListener("click", handleBulkPreviewClick);
        elements.bulkPreview.addEventListener("change", handleBulkReviewChange);
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
                if (
                    event.target === backdrop &&
                    !(backdrop === elements.bulkModal && state.bulkSaving)
                ) {
                    closeModal(backdrop);
                }
            });
            backdrop.querySelectorAll("[data-close-modal]").forEach((button) => {
                button.addEventListener("click", () => {
                    if (backdrop === elements.bulkModal && state.bulkSaving) return;
                    closeModal(backdrop);
                });
            });
        });

        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;
            const modal = [elements.confirmModal, elements.viewModal, elements.formModal, elements.bulkModal].find(
                (item) => !item.hidden
            );
            if (
                modal &&
                !state.saving &&
                !state.bulkSaving &&
                !elements.confirmButton.disabled
            ) {
                closeModal(modal);
            }
        });
    }

    initializeEvents();
    loadQuestions();
})();