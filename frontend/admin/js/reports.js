(() => {
    "use strict";

    const state = {
        results: [],
        exams: new Map(),
        courses: new Map(),
        programs: new Map()
    };

    const elements = {
        search: document.getElementById("reportSearch"),
        exam: document.getElementById("reportExamFilter"),
        course: document.getElementById("reportCourseFilter"),
        program: document.getElementById("reportProgramFilter"),
        dateFrom: document.getElementById("reportDateFrom"),
        dateTo: document.getElementById("reportDateTo"),
        body: document.getElementById("reportsTableBody"),
        table: document.getElementById("reportsTableWrap"),
        loading: document.getElementById("reportsLoading"),
        error: document.getElementById("reportsError"),
        errorMessage: document.getElementById("reportsErrorMessage"),
        empty: document.getElementById("reportsEmpty"),
        emptyTitle: document.getElementById("reportsEmptyTitle"),
        emptyMessage: document.getElementById("reportsEmptyMessage"),
        count: document.getElementById("reportsCount"),
        feedback: document.getElementById("reportsFeedback"),
        csv: document.getElementById("exportCsvButton"),
        pdf: document.getElementById("downloadReportButton"),
        exportNote: document.getElementById("reportExportNote"),
        resultCount: document.getElementById("reportResultCount"),
        average: document.getElementById("reportAverage"),
        highest: document.getElementById("reportHighest"),
        examCount: document.getElementById("reportExamCount"),
        refresh: document.getElementById("refreshReportsButton"),
        retry: document.getElementById("retryReportsButton")
    };

    const asArray = (response, label) => {
        if (response?.success !== true || !Array.isArray(response.data)) {
            throw new Error(`The ${label} endpoint returned an unexpected response.`);
        }
        return response.data;
    };

    const safeText = (value) =>
        typeof value === "string" && value.trim() ? value.trim() : "—";

    const formatDate = (value) => {
        let date = null;
        if (value && typeof value === "object" && typeof value.toDate === "function") {
            date = value.toDate();
        } else if (value && typeof value === "object" && Number.isFinite(value._seconds)) {
            date = new Date(value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1000000));
        } else if (value) {
            date = new Date(value);
        }
        return date instanceof Date && Number.isFinite(date.getTime())
            ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(date)
            : "—";
    };

    const percentage = (value) => {
        const number = Number(value);
        return Number.isFinite(number) ? `${number.toFixed(number % 1 ? 1 : 0)}%` : "—";
    };

    const dateMillis = (value) => {
        if (value && typeof value === "object" && typeof value.toDate === "function") {
            return value.toDate().getTime();
        }
        if (value && typeof value === "object" && Number.isFinite(value._seconds)) {
            return value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1000000);
        }
        const date = value ? new Date(value) : null;
        return date && Number.isFinite(date.getTime()) ? date.getTime() : null;
    };

    const examFor = (result) => state.exams.get(String(result.examId)) || null;
    const examName = (result) => safeText(examFor(result)?.title);
    const courseName = (result) =>
        safeText(state.courses.get(String(result.courseId))?.name);
    const programName = (result) => {
        const programId = examFor(result)?.programId || result.programId;
        return safeText(state.programs.get(String(programId))?.name);
    };

    const populateFilter = (select, records, labelFor) => {
        const selected = select.value || "all";
        select.replaceChildren(new Option("All", "all"));
        records
            .filter((record) => record?.id && labelFor(record))
            .sort((a, b) => labelFor(a).localeCompare(labelFor(b)))
            .forEach((record) => select.add(new Option(labelFor(record), String(record.id))));
        select.options[0].textContent = `All ${select.id === "reportExamFilter" ? "exams" : select.id === "reportCourseFilter" ? "courses" : "programs"}`;
        select.value = Array.from(select.options).some((option) => option.value === selected) ? selected : "all";
    };

    const getFilteredResults = () => {
        const search = elements.search.value.trim().toLocaleLowerCase();
        return state.results.filter((result) => {
            const exam = examFor(result);
            const programId = exam?.programId || result.programId;
            const submittedAt = dateMillis(result.submittedAt);
            if (elements.exam.value !== "all" && String(result.examId) !== elements.exam.value) return false;
            if (elements.course.value !== "all" && String(result.courseId) !== elements.course.value) return false;
            if (elements.program.value !== "all" && String(programId) !== elements.program.value) return false;
            if (elements.dateFrom.value && (submittedAt === null || submittedAt < new Date(`${elements.dateFrom.value}T00:00:00`).getTime())) return false;
            if (elements.dateTo.value && (submittedAt === null || submittedAt > new Date(`${elements.dateTo.value}T23:59:59.999`).getTime())) return false;
            if (!search) return true;
            return [
                result.fullName,
                result.registrationNumber,
                examName(result),
                courseName(result)
            ].some((value) => String(value || "").toLocaleLowerCase().includes(search));
        }).sort((a, b) => {
            return (dateMillis(b.submittedAt) || 0) - (dateMillis(a.submittedAt) || 0);
        });
    };

    const setFeedback = (message, isError = false) => {
        elements.feedback.textContent = message;
        elements.feedback.hidden = !message;
        elements.feedback.classList.toggle("is-error", isError);
    };

    const setLoading = (loading) => {
        elements.loading.hidden = !loading;
        elements.refresh.disabled = loading;
        elements.retry.disabled = loading;
        if (loading) {
            elements.error.hidden = true;
            elements.empty.hidden = true;
            elements.table.hidden = true;
        }
    };

    const render = () => {
        const results = getFilteredResults();
        elements.body.replaceChildren();
        elements.table.hidden = results.length === 0;
        elements.empty.hidden = results.length !== 0;
        elements.emptyTitle.textContent = state.results.length ? "No results match these filters" : "No results yet";
        elements.emptyMessage.textContent = state.results.length
            ? "Adjust the search or filters to see saved result records."
            : "Saved examination results will appear here.";
        elements.count.textContent = `${results.length} result${results.length === 1 ? "" : "s"}`;
        elements.resultCount.textContent = String(results.length);
        const percentages = results.map((result) => Number(result.percentage)).filter(Number.isFinite);
        elements.average.textContent = percentages.length
            ? percentage(percentages.reduce((sum, value) => sum + value, 0) / percentages.length)
            : "—";
        elements.highest.textContent = percentages.length ? percentage(Math.max(...percentages)) : "—";
        elements.examCount.textContent = String(new Set(results.map((result) => result.examId).filter(Boolean)).size);
        elements.csv.disabled = results.length === 0;
        const pdfSupported = !elements.search.value.trim() &&
            elements.program.value === "all" &&
            !elements.dateFrom.value &&
            !elements.dateTo.value;
        elements.pdf.disabled = results.length === 0 || !pdfSupported;
        elements.exportNote.textContent = pdfSupported
            ? "PDF export supports the selected exam and course filters. CSV exports the exact visible rows."
            : "The report PDF endpoint does not support text search or program filters. CSV exports the exact visible rows.";

        results.forEach((result) => {
            const row = document.createElement("tr");
            [
                safeText(result.fullName),
                safeText(result.registrationNumber),
                examName(result),
                courseName(result),
                programName(result),
                `Attempt ${Math.max(1, Number(result.attemptNumber) || 1)}`,
                `${Number.isFinite(Number(result.score)) ? Number(result.score) : "—"} / ${Number.isFinite(Number(result.totalMarks)) ? Number(result.totalMarks) : "—"}`,
                percentage(result.percentage),
                formatDate(result.submittedAt)
            ].forEach((value) => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });
            elements.body.appendChild(row);
        });
    };

    const loadReferenceData = async () => {
        const endpoints = ["/exams", "/courses", "/programs"];
        const responses = await Promise.allSettled(endpoints.map((endpoint) => adminFetch(endpoint)));
        responses.forEach((entry, index) => {
            if (entry.status === "rejected") {
                console.warn(`Reports: unable to load ${endpoints[index]} name mapping.`, entry.reason);
                return;
            }
            const records = asArray(entry.value, endpoints[index]);
            const target = index === 0 ? state.exams : index === 1 ? state.courses : state.programs;
            records.forEach((record) => {
                if (record?.id) target.set(String(record.id), record);
            });
        });
    };

    const loadReports = async () => {
        setLoading(true);
        setFeedback("");
        try {
            const [resultsResponse] = await Promise.all([
                adminFetch("/results"),
                loadReferenceData()
            ]);
            state.results = asArray(resultsResponse, "results");
            populateFilter(elements.exam, Array.from(state.exams.values()), (record) => record.title);
            populateFilter(elements.course, Array.from(state.courses.values()), (record) => record.name);
            populateFilter(elements.program, Array.from(state.programs.values()), (record) => record.name);
            render();
        } catch (error) {
            console.error("Reports loading error:", error);
            elements.errorMessage.textContent = error.message || "Please try again.";
            elements.error.hidden = false;
            elements.table.hidden = true;
            elements.empty.hidden = true;
        } finally {
            setLoading(false);
        }
    };

    const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

    const exportCsv = () => {
        const headers = ["Student", "Registration number", "Exam", "Course", "Program", "Attempt", "Score", "Total marks", "Percentage", "Submitted"];
        const rows = getFilteredResults().map((result) => [
            result.fullName,
            result.registrationNumber,
            examName(result),
            courseName(result),
            programName(result),
            Math.max(1, Number(result.attemptNumber) || 1),
            result.score,
            result.totalMarks,
            result.percentage,
            formatDate(result.submittedAt)
        ]);
        const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
        const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "examhub-results-report.csv";
        link.click();
        URL.revokeObjectURL(url);
    };

    const downloadPdf = async () => {
        const query = new URLSearchParams();
        if (elements.exam.value !== "all") query.set("examId", elements.exam.value);
        if (elements.course.value !== "all") query.set("courseId", elements.course.value);
        const endpoint = `/results/reports/table${query.size ? `?${query}` : ""}`;
        elements.pdf.disabled = true;
        setFeedback("");
        try {
            const response = await fetch(`${ADMIN_API_BASE_URL}${endpoint}`, {
                headers: { Authorization: `Bearer ${getAdminToken()}` }
            });
            if (response.status === 401) {
                clearAdminSession();
                window.location.href = "./login.html";
                return;
            }
            if (!response.ok) {
                let message = "The PDF report could not be downloaded.";
                try {
                    const result = await response.json();
                    message = result?.message || message;
                } catch {
                    // Keep the user-facing fallback when the server did not return JSON.
                }
                throw new Error(message);
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "results-report.pdf";
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Reports PDF download error:", error);
            setFeedback(error.message || "The PDF report could not be downloaded.", true);
        } finally {
            elements.pdf.disabled = !getFilteredResults().length ||
                    Boolean(elements.search.value.trim()) ||
                    elements.program.value !== "all" ||
                    Boolean(elements.dateFrom.value) ||
                    Boolean(elements.dateTo.value);
        }
    };

    document.addEventListener("DOMContentLoaded", () => {
        setPageTitle("Reports");
        [elements.search, elements.exam, elements.course, elements.program, elements.dateFrom, elements.dateTo].forEach((element) => {
            element.addEventListener("input", render);
            element.addEventListener("change", render);
        });
        elements.refresh.addEventListener("click", loadReports);
        elements.retry.addEventListener("click", loadReports);
        elements.csv.addEventListener("click", exportCsv);
        elements.pdf.addEventListener("click", downloadPdf);
        loadReports();
    });
})();