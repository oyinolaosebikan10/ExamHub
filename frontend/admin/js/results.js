const RESULTS_API_URL = "/results";
const COURSES_API_URL = "/courses";
const EXAMS_API_URL = "/exams";
const PROGRAMS_API_URL = "/programs";

const state = {
    results: [],
    filteredResults: [],
    exams: [],
    courses: [],
    programs: [],
    examById: new Map(),
    courseById: new Map(),
    programById: new Map(),
    sortKey: "submittedAt",
    sortDirection: "desc",
    currentPreviewId: null,
    pendingRetake: null,
    authorizedRetakeKeys: new Set(),
    retakeToastTimeout: null,
};

const elements = {
    resultSearch: document.getElementById("resultSearch"),
    resultExamFilter: document.getElementById("resultExamFilter"),
    resultCourseFilter: document.getElementById("resultCourseFilter"),
    resultProgramFilter: document.getElementById("resultProgramFilter"),
    resultsLoading: document.getElementById("resultsLoading"),
    resultsError: document.getElementById("resultsError"),
    resultsErrorMessage: document.getElementById("resultsErrorMessage"),
    resultsEmpty: document.getElementById("resultsEmpty"),
    resultsEmptyTitle: document.getElementById("resultsEmptyTitle"),
    resultsEmptyMessage: document.getElementById("resultsEmptyMessage"),
    clearFiltersBtn: document.getElementById("clearResultsFiltersBtn"),
    resultsTableWrapper: document.getElementById("resultsTableWrapper"),
    resultsTableBody: document.getElementById("resultsTableBody"),
    resultsCount: document.getElementById("resultsCount"),
    totalResults: document.getElementById("totalResults"),
    averageScore: document.getElementById("averageScore"),
    highestScore: document.getElementById("highestScore"),
    lowestScore: document.getElementById("lowestScore"),
    refreshBtn: document.getElementById("refreshResultsBtn"),
    retryBtn: document.getElementById("retryResultsBtn"),
    previewModal: document.getElementById("resultPreviewModal"),
    previewBody: document.getElementById("resultPreviewBody"),
    closePreviewBtn: document.getElementById("closeResultPreviewBtn"),
    closePreviewButton: document.getElementById("closeResultPreviewButton"),
    downloadPdfBtn: document.getElementById("downloadResultPdfBtn"),
    retakeModal: document.getElementById("retakeConfirmationModal"),
    retakeMessage: document.getElementById("retakeConfirmationMessage"),
    retakeError: document.getElementById("retakeConfirmationError"),
    closeRetakeButton: document.getElementById("closeRetakeConfirmationButton"),
    cancelRetakeButton: document.getElementById("cancelRetakeConfirmationButton"),
    confirmRetakeButton: document.getElementById("confirmRetakeAuthorizationButton"),
    retakeToast: document.getElementById("retakeAuthorizationToast"),
    sortButtons: Array.from(document.querySelectorAll(".sort-trigger")),
};

function safeText(value, fallback = "—") {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed || fallback;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }

    return fallback;
}

function parseDateValue(value) {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === "object") {
        if (typeof value.toDate === "function") {
            try {
                const date = value.toDate();
                return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
            } catch {
                return null;
            }
        }

        if (typeof value._seconds === "number") {
            return new Date(value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1000000));
        }

        if (typeof value.seconds === "number") {
            return new Date(value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1000000));
        }
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
        minute: "2-digit",
    }).format(date);
}

function formatPercentage(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "—";
    }

    return `${number.toFixed(number % 1 === 0 ? 0 : 1)}%`;
}

function formatScore(score, totalMarks) {
    const scoreNumber = Number(score);
    const totalNumber = Number(totalMarks);

    if (!Number.isFinite(scoreNumber) && !Number.isFinite(totalNumber)) {
        return "—";
    }

    const safeScore = Number.isFinite(scoreNumber) ? scoreNumber : 0;
    const safeTotal = Number.isFinite(totalNumber) ? totalNumber : 0;

    return `${safeScore} / ${safeTotal}`;
}

function normalizeIdentifier(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const identifier = String(value).trim();
    return identifier || null;
}

function getExamById(examId) {
    if (!examId) {
        return null;
    }

    return state.examById.get(String(examId)) || null;
}

function getCourseById(courseId) {
    if (!courseId) {
        return null;
    }

    return state.courseById.get(String(courseId)) || null;
}

function getProgramById(programId) {
    if (!programId) {
        return null;
    }

    return state.programById.get(String(programId)) || null;
}

function resolveExamName(examId) {
    const exam = getExamById(examId);
    return exam && typeof exam.title === "string" && exam.title.trim() ? exam.title.trim() : "Unknown Exam";
}

function resolveCourseName(courseId) {
    const course = getCourseById(courseId);
    return course && typeof course.name === "string" && course.name.trim() ? course.name.trim() : "Unknown Course";
}

function resolveProgramNameForResult(result) {
    const exam = getExamById(result.examId);
    const programId = exam && exam.programId ? exam.programId : result.programId;
    const program = getProgramById(programId);
    return program && typeof program.name === "string" && program.name.trim() ? program.name.trim() : "Unknown Program";
}

function getResultSummaryValues(results) {
    if (!results.length) {
        return {
            total: 0,
            average: "—",
            highest: "—",
            lowest: "—",
        };
    }

    const percentages = results
        .map((result) => Number(result.percentage))
        .filter((value) => Number.isFinite(value));

    const total = results.length;
    let average = "—";
    let highest = "—";
    let lowest = "—";

    if (percentages.length) {
        const totalPercentage = percentages.reduce((sum, value) => sum + value, 0);
        const averageValue = totalPercentage / percentages.length;
        average = formatPercentage(averageValue);
        highest = formatPercentage(Math.max(...percentages));
        lowest = formatPercentage(Math.min(...percentages));
    }

    return {
        total,
        average,
        highest,
        lowest,
    };
}

function updateSummaryCards() {
    const summary = getResultSummaryValues(state.results);

    if (elements.totalResults) {
        elements.totalResults.textContent = String(summary.total);
    }

    if (elements.averageScore) {
        elements.averageScore.textContent = summary.average;
    }

    if (elements.highestScore) {
        elements.highestScore.textContent = summary.highest;
    }

    if (elements.lowestScore) {
        elements.lowestScore.textContent = summary.lowest;
    }
}

function setElementVisible(element, visible) {
    if (!element) {
        return;
    }

    element.hidden = !visible;
    element.classList.toggle("hidden", !visible);
}

function setLoadingState(show) {
    setElementVisible(elements.resultsLoading, show);

    if (show) {
        setElementVisible(elements.resultsError, false);
        setElementVisible(elements.resultsEmpty, false);
        setElementVisible(elements.resultsTableWrapper, false);
    }
}

function showErrorState(message) {
    setElementVisible(elements.resultsLoading, false);
    setElementVisible(elements.resultsTableWrapper, false);
    setElementVisible(elements.resultsEmpty, false);
    setElementVisible(elements.resultsError, true);

    if (elements.resultsErrorMessage) {
        elements.resultsErrorMessage.textContent = message || "We could not retrieve the latest result records.";
    }
}

function showEmptyState(message) {
    setElementVisible(elements.resultsLoading, false);
    setElementVisible(elements.resultsTableWrapper, false);
    setElementVisible(elements.resultsError, false);
    setElementVisible(elements.resultsEmpty, true);

    if (elements.resultsEmptyTitle) {
        elements.resultsEmptyTitle.textContent = "No results found";
    }

    if (elements.resultsEmptyMessage) {
        elements.resultsEmptyMessage.textContent = message || "There are no saved results for the current filters.";
    }

    if (elements.clearFiltersBtn) {
        const hasFilters =
            (elements.resultSearch?.value || "").trim() ||
            (elements.resultExamFilter?.value || "all") !== "all" ||
            (elements.resultCourseFilter?.value || "all") !== "all" ||
            (elements.resultProgramFilter?.value || "all") !== "all";

        setElementVisible(elements.clearFiltersBtn, hasFilters);
    }
}

function buildOptionsFromRecords(items, keyField, labelField, placeholderText) {
    const select = document.createElement("select");
    select.setAttribute("aria-label", placeholderText);

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = placeholderText;
    select.appendChild(allOption);

    const validItems = items.filter((item) => {
        const id = normalizeIdentifier(item?.[keyField]);
        if (!id) {
            return false;
        }

        return !!(typeof item?.[labelField] === "string" && item[labelField].trim());
    });

    validItems.forEach((item) => {
        const option = document.createElement("option");
        option.value = String(item[keyField]);
        option.textContent = item[labelField].trim();
        select.appendChild(option);
    });

    return select;
}

function populateFilterOptions() {
    const examOptions = [
        { value: "all", label: "All exams" },
        ...state.exams
            .filter((exam) => exam && exam.id && typeof exam.title === "string" && exam.title.trim())
            .map((exam) => ({ value: String(exam.id), label: exam.title.trim() }))
    ];

    const courseOptions = [
        { value: "all", label: "All courses" },
        ...state.courses
            .filter((course) => course && course.id && typeof course.name === "string" && course.name.trim())
            .map((course) => ({ value: String(course.id), label: course.name.trim() }))
    ];

    const programOptions = [
        { value: "all", label: "All programs" },
        ...state.programs
            .filter((program) => program && program.id && typeof program.name === "string" && program.name.trim())
            .map((program) => ({ value: String(program.id), label: program.name.trim() }))
    ];

    populateSelect(elements.resultExamFilter, examOptions, "all");
    populateSelect(elements.resultCourseFilter, courseOptions, "all");
    populateSelect(elements.resultProgramFilter, programOptions, "all");
}

function populateSelect(selectElement, options, defaultValue) {
    if (!selectElement) {
        return;
    }

    selectElement.innerHTML = "";

    options.forEach((option) => {
        const optionEl = document.createElement("option");
        optionEl.value = option.value;
        optionEl.textContent = option.label;
        if (option.value === defaultValue) {
            optionEl.selected = true;
        }
        selectElement.appendChild(optionEl);
    });
}

function normalizeResult(record) {
    const result = {
        id: normalizeIdentifier(record?.id) || normalizeIdentifier(record?.resultId),
        studentId: record?.studentId || null,
        fullName: typeof record?.fullName === "string" ? record.fullName.trim() : "",
        registrationNumber: typeof record?.registrationNumber === "string" ? record.registrationNumber.trim() : "",
        examId: normalizeIdentifier(record?.examId),
        courseId: normalizeIdentifier(record?.courseId),
        programId: normalizeIdentifier(record?.programId),
        enrollmentId: normalizeIdentifier(record?.enrollmentId),
        score: Number(record?.score),
        totalMarks: Number(record?.totalMarks),
        percentage: Number(record?.percentage),
        attemptNumber: Math.max(1, Number(record?.attemptNumber) || 1),
        isRetake:
            record?.isRetake === true ||
            Number(record?.attemptNumber) > 1,
        submittedAt: record?.submittedAt || null,
    };

    if (!result.id) {
        result.id = normalizeIdentifier(record?.sessionId) || null;
    }

    return result;
}

function sortResults(results) {
    const sorted = [...results];

    sorted.sort((a, b) => {
        let aValue = a[state.sortKey];
        let bValue = b[state.sortKey];

        if (state.sortKey === "student") {
            aValue = (a.fullName || "").toLowerCase();
            bValue = (b.fullName || "").toLowerCase();
        }

        if (state.sortKey === "exam") {
            aValue = resolveExamName(a.examId).toLowerCase();
            bValue = resolveExamName(b.examId).toLowerCase();
        }

        if (state.sortKey === "submittedAt") {
            aValue = parseDateValue(aValue)?.getTime?.() ?? 0;
            bValue = parseDateValue(bValue)?.getTime?.() ?? 0;
        }

        if (state.sortKey === "score" || state.sortKey === "percentage") {
            aValue = Number(aValue) || 0;
            bValue = Number(bValue) || 0;
        }

        if (state.sortKey === "student" || state.sortKey === "exam") {
            if (aValue < bValue) {
                return state.sortDirection === "asc" ? -1 : 1;
            }
            if (aValue > bValue) {
                return state.sortDirection === "asc" ? 1 : -1;
            }
            return 0;
        }

        if (aValue < bValue) {
            return state.sortDirection === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
            return state.sortDirection === "asc" ? 1 : -1;
        }
        return 0;
    });

    return sorted;
}

function getFilteredResults() {
    const searchTerm = (elements.resultSearch?.value || "").trim().toLowerCase();
    const examFilter = elements.resultExamFilter?.value || "all";
    const courseFilter = elements.resultCourseFilter?.value || "all";
    const programFilter = elements.resultProgramFilter?.value || "all";

    return sortResults(
        state.results.filter((result) => {
            const examName = resolveExamName(result.examId).toLowerCase();
            const courseName = resolveCourseName(result.courseId).toLowerCase();
            const programName = resolveProgramNameForResult(result).toLowerCase();
            const studentText = [result.fullName, result.registrationNumber, result.studentId].join(" ").toLowerCase();

            const matchesSearch = !searchTerm || [studentText, examName, courseName, programName].some((item) => item.includes(searchTerm));
            const matchesExam = examFilter === "all" || String(result.examId) === String(examFilter);
            const matchesCourse = courseFilter === "all" || String(result.courseId) === String(courseFilter);
            const programId = getExamById(result.examId)?.programId || result.programId;
            const matchesProgram = programFilter === "all" || String(programId) === String(programFilter);

            return matchesSearch && matchesExam && matchesCourse && matchesProgram;
        })
    );
}

function renderTable() {
    const filtered = getFilteredResults();
    state.filteredResults = filtered;

    if (elements.resultsCount) {
        elements.resultsCount.textContent = `${filtered.length} result${filtered.length === 1 ? "" : "s"}`;
    }

    if (elements.resultsTableBody) {
        elements.resultsTableBody.innerHTML = "";
    }

    if (!filtered.length) {
        showEmptyState("There are no saved results for the current filters.");
        return;
    }

    setElementVisible(elements.resultsTableWrapper, true);
    setElementVisible(elements.resultsEmpty, false);
    setElementVisible(elements.resultsError, false);

    filtered.forEach((result) => {
        const row = document.createElement("tr");

        const studentCell = document.createElement("td");
        studentCell.innerHTML = "";
        const studentName = document.createElement("div");
        studentName.className = "result-student-name";
        studentName.textContent = safeText(result.fullName, "Unknown Student");
        studentCell.appendChild(studentName);
        row.appendChild(studentCell);

        const registrationCell = document.createElement("td");
        registrationCell.textContent = safeText(result.registrationNumber, "—");
        row.appendChild(registrationCell);

        const examCell = document.createElement("td");
        examCell.textContent = resolveExamName(result.examId);
        row.appendChild(examCell);

        const attemptCell = document.createElement("td");
        attemptCell.textContent = result.isRetake
            ? `Attempt ${result.attemptNumber} (Retake)`
            : "Attempt 1";
        row.appendChild(attemptCell);

        const courseCell = document.createElement("td");
        courseCell.textContent = resolveCourseName(result.courseId);
        row.appendChild(courseCell);

        const programCell = document.createElement("td");
        programCell.textContent = resolveProgramNameForResult(result);
        row.appendChild(programCell);

        const scoreCell = document.createElement("td");
        scoreCell.textContent = formatScore(result.score, result.totalMarks);
        row.appendChild(scoreCell);

        const percentageCell = document.createElement("td");
        percentageCell.textContent = formatPercentage(result.percentage);
        row.appendChild(percentageCell);

        const dateCell = document.createElement("td");
        dateCell.textContent = formatDateTime(result.submittedAt);
        row.appendChild(dateCell);

        const actionCell = document.createElement("td");
        const actionGroup = document.createElement("div");
        actionGroup.className = "results-action-group";

        const viewBtn = document.createElement("button");
        viewBtn.type = "button";
        viewBtn.className = "table-action table-action-primary";
        viewBtn.textContent = "View";
        viewBtn.dataset.action = "view-result";
        viewBtn.dataset.resultId = result.id;

        const pdfBtn = document.createElement("button");
        pdfBtn.type = "button";
        pdfBtn.className = "table-action table-action-secondary";
        pdfBtn.textContent = "PDF";
        pdfBtn.dataset.action = "download-result";
        pdfBtn.dataset.resultId = result.id;

        actionGroup.appendChild(viewBtn);
        actionGroup.appendChild(pdfBtn);

        if (result.studentId && result.examId) {
            const retakeKey =
                getRetakeKey(result.studentId, result.examId);
            const retakeBtn = document.createElement("button");
            retakeBtn.type = "button";
            retakeBtn.className =
                "table-action table-action-retake";
            retakeBtn.textContent =
                state.authorizedRetakeKeys.has(retakeKey)
                    ? "Retake authorized"
                    : "Allow retake";
            retakeBtn.disabled =
                state.authorizedRetakeKeys.has(retakeKey);
            retakeBtn.dataset.action = "authorize-retake";
            retakeBtn.dataset.resultId = result.id;
            retakeBtn.setAttribute(
                "aria-label",
                `Allow ${safeText(result.fullName, "student")} to retake ${resolveExamName(result.examId)}`
            );
            actionGroup.appendChild(retakeBtn);
        }

        actionCell.appendChild(actionGroup);
        row.appendChild(actionCell);

        elements.resultsTableBody.appendChild(row);
    });
}

function bindEvents() {
    if (elements.resultSearch) {
        elements.resultSearch.addEventListener("input", renderTable);
    }

    [elements.resultExamFilter, elements.resultCourseFilter, elements.resultProgramFilter].forEach((element) => {
        element?.addEventListener("change", renderTable);
    });

    if (elements.refreshBtn) {
        elements.refreshBtn.addEventListener("click", () => loadResults());
    }

    if (elements.retryBtn) {
        elements.retryBtn.addEventListener("click", () => loadResults());
    }

    if (elements.clearFiltersBtn) {
        elements.clearFiltersBtn.addEventListener("click", clearFilters);
    }

    if (elements.previewModal) {
        elements.previewModal.addEventListener("click", (event) => {
            if (event.target === elements.previewModal) {
                closePreviewModal();
            }
        });
    }

    if (elements.closePreviewBtn) {
        elements.closePreviewBtn.addEventListener("click", closePreviewModal);
    }

    if (elements.closePreviewButton) {
        elements.closePreviewButton.addEventListener("click", closePreviewModal);
    }

    elements.retakeModal?.addEventListener("click", (event) => {
        if (event.target === elements.retakeModal) {
            closeRetakeConfirmation();
        }
    });

    elements.closeRetakeButton?.addEventListener(
        "click",
        closeRetakeConfirmation
    );
    elements.cancelRetakeButton?.addEventListener(
        "click",
        closeRetakeConfirmation
    );
    elements.confirmRetakeButton?.addEventListener(
        "click",
        authorizePendingRetake
    );

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && elements.previewModal && !elements.previewModal.classList.contains("hidden")) {
            closePreviewModal();
        }

        if (
            event.key === "Escape" &&
            elements.retakeModal &&
            !elements.retakeModal.classList.contains("hidden")
        ) {
            closeRetakeConfirmation();
        }
    });

    if (elements.downloadPdfBtn) {
        elements.downloadPdfBtn.addEventListener("click", () => {
            if (state.currentPreviewId) {
                downloadResultPdf(state.currentPreviewId);
            }
        });
    }

    if (elements.resultsTableBody) {
        elements.resultsTableBody.addEventListener("click", (event) => {
            const trigger = event.target.closest("[data-action]");

            if (!trigger) {
                return;
            }

            const resultId = trigger.dataset.resultId;
            const action = trigger.dataset.action;

            if (action === "authorize-retake") {
                const result = state.results.find(item =>
                    item.id === resultId
                );

                if (result) {
                    openRetakeConfirmation(result);
                }
                return;
            }

            if (!resultId) {
                return;
            }

            if (action === "view-result") {
                openResultPreview(resultId);
            }

            if (action === "download-result") {
                downloadResultPdf(resultId);
            }
        });
    }

    elements.sortButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const sortKey = button.dataset.sort;
            if (!sortKey) {
                return;
            }

            if (state.sortKey === sortKey) {
                state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
            } else {
                state.sortKey = sortKey;
                state.sortDirection = ["score", "percentage", "submittedAt"].includes(sortKey) ? "desc" : "asc";
            }

            renderTable();
        });
    });
}

function getRetakeKey(studentId, examId) {
    return JSON.stringify([
        String(studentId),
        String(examId)
    ]);
}

function openRetakeConfirmation(result) {
    state.pendingRetake = {
        studentId: result.studentId,
        examId: result.examId,
        fullName: safeText(result.fullName, "this student"),
        registrationNumber:
            safeText(result.registrationNumber, "—"),
        examTitle: resolveExamName(result.examId)
    };

    elements.retakeMessage.textContent =
        `Authorize ${state.pendingRetake.fullName} ` +
        `(${state.pendingRetake.registrationNumber}) to take ` +
        `${state.pendingRetake.examTitle} one more time? ` +
        "This authorization can be used for one retake only.";
    elements.retakeError.textContent = "";
    setElementVisible(elements.retakeError, false);
    elements.confirmRetakeButton.disabled = false;
    elements.confirmRetakeButton.textContent = "Allow retake";
    elements.retakeModal.classList.remove("hidden");
    elements.retakeModal.setAttribute("aria-hidden", "false");
}

function closeRetakeConfirmation() {
    if (!elements.retakeModal) {
        return;
    }

    elements.retakeModal.classList.add("hidden");
    elements.retakeModal.setAttribute("aria-hidden", "true");
    state.pendingRetake = null;
}

async function authorizePendingRetake() {
    const authorization = state.pendingRetake;

    if (!authorization || elements.confirmRetakeButton.disabled) {
        return;
    }

    elements.confirmRetakeButton.disabled = true;
    elements.cancelRetakeButton.disabled = true;
    elements.closeRetakeButton.disabled = true;
    elements.confirmRetakeButton.textContent = "Authorizing...";
    setElementVisible(elements.retakeError, false);

    try {
        const response = await adminFetch(
            "/exam-sessions/retake-authorizations",
            {
                method: "POST",
                body: {
                    studentId: authorization.studentId,
                    examId: authorization.examId
                }
            }
        );

        if (response?.success !== true) {
            throw new Error(
                response?.message ||
                "Unable to authorize this retake."
            );
        }

        state.authorizedRetakeKeys.add(
            getRetakeKey(
                authorization.studentId,
                authorization.examId
            )
        );
        closeRetakeConfirmation();
        renderTable();
        showRetakeToast(
            `Retake authorized for ${authorization.fullName} — ${authorization.examTitle}.`,
            "success"
        );
    } catch (error) {
        console.error("ExamHub retake authorization error:", error);
        elements.retakeError.textContent =
            error.message ||
            "Unable to authorize this retake.";
        setElementVisible(elements.retakeError, true);
    } finally {
        elements.confirmRetakeButton.disabled = false;
        elements.cancelRetakeButton.disabled = false;
        elements.closeRetakeButton.disabled = false;
        elements.confirmRetakeButton.textContent = "Allow retake";
    }
}

function showRetakeToast(message, type) {
    clearTimeout(state.retakeToastTimeout);
    elements.retakeToast.textContent = message;
    elements.retakeToast.classList.toggle(
        "error",
        type === "error"
    );
    setElementVisible(elements.retakeToast, true);
    state.retakeToastTimeout = setTimeout(() => {
        setElementVisible(elements.retakeToast, false);
    }, 5000);
}

function clearFilters() {
    if (elements.resultSearch) {
        elements.resultSearch.value = "";
    }

    if (elements.resultExamFilter) {
        elements.resultExamFilter.value = "all";
    }

    if (elements.resultCourseFilter) {
        elements.resultCourseFilter.value = "all";
    }

    if (elements.resultProgramFilter) {
        elements.resultProgramFilter.value = "all";
    }

    renderTable();
}

function loadReferenceData() {
    const requests = [
        adminFetch(COURSES_API_URL, { method: "GET" }),
        adminFetch(EXAMS_API_URL, { method: "GET" }),
        adminFetch(PROGRAMS_API_URL, { method: "GET" }),
    ];

    return Promise.allSettled(requests).then(([courseResult, examResult, programResult]) => {
        if (courseResult.status === "fulfilled") {
            const payload = courseResult.value;
            const items = Array.isArray(payload?.data) ? payload.data : [];
            state.courses = items;
            state.courseById = new Map(items.map((course) => [String(course.id), course]));
        } else {
            console.warn("ExamHub results page: unable to load courses for name mapping.", courseResult.reason);
        }

        if (examResult.status === "fulfilled") {
            const payload = examResult.value;
            const items = Array.isArray(payload?.data) ? payload.data : [];
            state.exams = items;
            state.examById = new Map(items.map((exam) => [String(exam.id), exam]));
        } else {
            console.warn("ExamHub results page: unable to load exams for name mapping.", examResult.reason);
        }

        if (programResult.status === "fulfilled") {
            const payload = programResult.value;
            const items = Array.isArray(payload?.data) ? payload.data : [];
            state.programs = items;
            state.programById = new Map(items.map((program) => [String(program.id), program]));
        } else {
            console.warn("ExamHub results page: unable to load programs for name mapping.", programResult.reason);
        }

        populateFilterOptions();
    });
}

async function loadResults() {
    setLoadingState(true);

    try {
        const response = await adminFetch(RESULTS_API_URL, { method: "GET" });

        if (!response || response.success !== true || !Array.isArray(response.data)) {
            throw new Error("The results endpoint returned an unexpected response.");
        }

        state.results = response.data.map(normalizeResult).filter((result) => result.id);

        await loadReferenceData();
        updateSummaryCards();
        setLoadingState(false);
        renderTable();
    } catch (error) {
        console.error("ExamHub results loading error:", error);
        showErrorState(error?.message || "Unable to load result records.");
    }
}

function showPreviewLoadingState() {
    if (!elements.previewBody) {
        return;
    }

    elements.previewBody.innerHTML = "";

    const loading = document.createElement("div");
    loading.className = "preview-state";
    loading.textContent = "Loading result preview...";
    elements.previewBody.appendChild(loading);
}

function openResultPreview(resultId) {
    if (!resultId) {
        return;
    }

    state.currentPreviewId = resultId;

    if (elements.previewModal) {
        elements.previewModal.classList.remove("hidden");
        elements.previewModal.setAttribute("aria-hidden", "false");
    }

    showPreviewLoadingState();

    adminFetch(`/results/reports/student/${encodeURIComponent(resultId)}/preview`, { method: "GET" })
        .then((response) => {
            const payload = response?.data || {};
            const result = payload?.student || {};
            const assessment = payload?.assessment || {};
            const performance = payload?.performance || {};
            const submission = payload?.submission || {};
            const exam = assessment.exam || {};
            const course = assessment.course || {};
            const program = assessment.program || {};

            const rows = [
                ["Student", result.name || "Unknown Student"],
                ["Registration Number", result.registrationNumber || "—"],
                ["Exam", exam.title || "Unknown Exam"],
                ["Course", course.name || "Unknown Course"],
                ["Program", program.name || "Unknown Program"],
                ["Score", formatScore(performance.score, performance.totalMarks)],
                ["Percentage", formatPercentage(performance.percentage)],
                ["Submitted At", formatDateTime(submission.submittedAt)],
            ];

            if (elements.previewBody) {
                elements.previewBody.innerHTML = "";

                const previewGrid = document.createElement("div");
                previewGrid.className = "results-preview-grid";

                rows.forEach(([label, value]) => {
                    const item = document.createElement("div");
                    item.className = "preview-item";

                    const title = document.createElement("div");
                    title.className = "preview-label";
                    title.textContent = label;

                    const detail = document.createElement("div");
                    detail.className = "preview-value";
                    detail.textContent = value || "—";

                    item.appendChild(title);
                    item.appendChild(detail);
                    previewGrid.appendChild(item);
                });

                elements.previewBody.appendChild(previewGrid);
            }
        })
        .catch((error) => {
            console.error("ExamHub result preview error:", error);

            if (elements.previewBody) {
                elements.previewBody.innerHTML = "";

                const errorBox = document.createElement("div");
                errorBox.className = "preview-state preview-error";
                errorBox.textContent = "Unable to load this result preview.";
                elements.previewBody.appendChild(errorBox);
            }
        });
}

function closePreviewModal() {
    if (elements.previewModal) {
        elements.previewModal.classList.add("hidden");
        elements.previewModal.setAttribute("aria-hidden", "true");
    }

    state.currentPreviewId = null;
}

async function downloadResultPdf(resultId) {
    if (!resultId) {
        return;
    }

    const token = localStorage.getItem("examhub_admin_token");

    if (!token) {
        console.error("ExamHub admin token missing; cannot download PDF.");
        return;
    }

    try {
        const response = await fetch(`${ADMIN_API_BASE_URL}/results/reports/student/${encodeURIComponent(resultId)}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error("Unable to download the result PDF.");
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
        console.error("ExamHub PDF download error:", error);
        if (elements.previewBody) {
            elements.previewBody.innerHTML = "";
            const errorBox = document.createElement("div");
            errorBox.className = "preview-state preview-error";
            errorBox.textContent = "The PDF could not be downloaded right now.";
            elements.previewBody.appendChild(errorBox);
            elements.previewModal?.classList.remove("hidden");
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (typeof setPageTitle === "function") {
        setPageTitle("Results");
    }

    bindEvents();
    loadResults();
});
