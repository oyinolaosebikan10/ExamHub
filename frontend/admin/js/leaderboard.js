(() => {
    "use strict";

    const state = {
        records: [],
        exams: new Map(),
        courses: new Map(),
        programs: new Map()
    };

    const elements = {
        search: document.getElementById("leaderboardSearch"),
        exam: document.getElementById("leaderboardExamFilter"),
        course: document.getElementById("leaderboardCourseFilter"),
        program: document.getElementById("leaderboardProgramFilter"),
        body: document.getElementById("leaderboardTableBody"),
        table: document.getElementById("leaderboardTableWrap"),
        loading: document.getElementById("leaderboardLoading"),
        error: document.getElementById("leaderboardError"),
        errorMessage: document.getElementById("leaderboardErrorMessage"),
        empty: document.getElementById("leaderboardEmpty"),
        emptyTitle: document.getElementById("leaderboardEmptyTitle"),
        emptyMessage: document.getElementById("leaderboardEmptyMessage"),
        count: document.getElementById("leaderboardCount"),
        entryCount: document.getElementById("leaderboardEntryCount"),
        studentCount: document.getElementById("leaderboardStudentCount"),
        examCount: document.getElementById("leaderboardExamCount"),
        topScore: document.getElementById("leaderboardTopScore"),
        refresh: document.getElementById("refreshLeaderboardButton"),
        retry: document.getElementById("retryLeaderboardButton")
    };

    const apiArray = (response, label) => {
        if (response?.success !== true || !Array.isArray(response.data)) {
            throw new Error(`The ${label} endpoint returned an unexpected response.`);
        }
        return response.data;
    };

    const text = (value) =>
        typeof value === "string" && value.trim() ? value.trim() : "—";

    const dateMillis = (value) => {
        if (value && typeof value === "object" && typeof value.toDate === "function") {
            return value.toDate().getTime();
        }
        if (value && typeof value === "object" && Number.isFinite(value._seconds)) {
            return value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1000000);
        }
        const date = value ? new Date(value) : null;
        return date && Number.isFinite(date.getTime()) ? date.getTime() : 0;
    };

    const displayDate = (value) => {
        const millis = dateMillis(value);
        return millis
            ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(millis)
            : "—";
    };

    const percentage = (value) => {
        const number = Number(value);
        return Number.isFinite(number) ? `${number.toFixed(number % 1 ? 1 : 0)}%` : "—";
    };

    const exam = (record) => state.exams.get(String(record.examId)) || null;
    const examName = (record) => text(exam(record)?.title);
    const courseName = (record) => text(state.courses.get(String(record.courseId))?.name);
    const programName = (record) => {
        const programId = exam(record)?.programId || record.programId;
        return text(state.programs.get(String(programId))?.name);
    };
    const studentKey = (record) => record.studentId || record.registrationNumber;

    const chooseBestAttempt = (left, right) => {
        const leftScore = Number(left.score);
        const rightScore = Number(right.score);
        if (leftScore !== rightScore) return leftScore > rightScore ? left : right;
        const leftPercentage = Number(left.percentage);
        const rightPercentage = Number(right.percentage);
        if (leftPercentage !== rightPercentage) return leftPercentage > rightPercentage ? left : right;
        const leftDate = dateMillis(left.submittedAt);
        const rightDate = dateMillis(right.submittedAt);
        if (leftDate !== rightDate) return leftDate > rightDate ? left : right;
        return Number(left.attemptNumber || 1) >= Number(right.attemptNumber || 1) ? left : right;
    };

    const buildRankings = () => {
        const bestByStudentAndExam = new Map();
        state.records.forEach((record) => {
            const examId = record.examId && String(record.examId);
            const identity = studentKey(record);
            const scorePercentage = Number(record.percentage);
            if (!examId || !identity || !Number.isFinite(scorePercentage) || !Number.isFinite(Number(record.score))) return;
            const key = JSON.stringify([examId, String(identity)]);
            const existing = bestByStudentAndExam.get(key);
            bestByStudentAndExam.set(key, existing ? chooseBestAttempt(existing, record) : record);
        });

        const grouped = new Map();
        bestByStudentAndExam.forEach((record) => {
            if (!grouped.has(String(record.examId))) grouped.set(String(record.examId), []);
            grouped.get(String(record.examId)).push(record);
        });

        const ranked = [];
        grouped.forEach((records) => {
            records.sort((left, right) =>
                Number(right.score) - Number(left.score) ||
                Number(right.percentage) - Number(left.percentage) ||
                text(left.fullName).localeCompare(text(right.fullName)) ||
                text(left.registrationNumber).localeCompare(text(right.registrationNumber))
            );
            let previousPercentage = null;
            let previousScore = null;
            let rank = 0;
            records.forEach((record, index) => {
                if (Number(record.score) !== previousScore || Number(record.percentage) !== previousPercentage) {
                    rank = index + 1;
                    previousPercentage = Number(record.percentage);
                    previousScore = Number(record.score);
                }
                ranked.push({ ...record, rank });
            });
        });
        return ranked.sort((left, right) =>
            examName(left).localeCompare(examName(right)) ||
            left.rank - right.rank ||
            text(left.fullName).localeCompare(text(right.fullName))
        );
    };

    const filteredRankings = () => {
        const search = elements.search.value.trim().toLocaleLowerCase();
        return buildRankings().filter((record) => {
            const currentExam = exam(record);
            const programId = currentExam?.programId || record.programId;
            if (elements.exam.value !== "all" && String(record.examId) !== elements.exam.value) return false;
            if (elements.course.value !== "all" && String(record.courseId) !== elements.course.value) return false;
            if (elements.program.value !== "all" && String(programId) !== elements.program.value) return false;
            return !search || [record.fullName, record.registrationNumber]
                .some((value) => String(value || "").toLocaleLowerCase().includes(search));
        });
    };

    const populate = (select, records, labelField, label) => {
        const selected = select.value || "all";
        select.replaceChildren(new Option(`All ${label}`, "all"));
        records
            .filter((record) => record?.id && typeof record[labelField] === "string" && record[labelField].trim())
            .sort((left, right) => left[labelField].localeCompare(right[labelField]))
            .forEach((record) => select.add(new Option(record[labelField], String(record.id))));
        select.value = Array.from(select.options).some((option) => option.value === selected)
            ? selected
            : "all";
    };

    const render = () => {
        const records = filteredRankings();
        elements.body.replaceChildren();
        elements.table.hidden = records.length === 0;
        elements.empty.hidden = records.length !== 0;
        elements.emptyTitle.textContent = state.records.length
            ? "No rankings match these filters"
            : "No rankings yet";
        elements.emptyMessage.textContent = state.records.length
            ? "Adjust the search or filters to view ranked results."
            : "Persisted completed exam results will appear here.";
        elements.count.textContent = `${records.length} entr${records.length === 1 ? "y" : "ies"}`;
        elements.entryCount.textContent = String(records.length);
        elements.studentCount.textContent = String(new Set(records.map(studentKey)).size);
        elements.examCount.textContent = String(new Set(records.map((record) => record.examId)).size);
        const percentages = records.map((record) => Number(record.percentage)).filter(Number.isFinite);
        elements.topScore.textContent = percentages.length ? percentage(Math.max(...percentages)) : "—";

        records.forEach((record) => {
            const row = document.createElement("tr");
            if (record.rank === 1) row.classList.add("leaderboard-top-row");
            const values = [
                `#${record.rank}`,
                text(record.fullName),
                text(record.registrationNumber),
                examName(record),
                courseName(record),
                programName(record),
                `${Number.isFinite(Number(record.score)) ? Number(record.score) : "—"} / ${Number.isFinite(Number(record.totalMarks)) ? Number(record.totalMarks) : "—"}`,
                percentage(record.percentage),
                `${Math.max(1, Number(record.attemptNumber) || 1)}${record.submittedAt ? ` · ${displayDate(record.submittedAt)}` : ""}`
            ];
            values.forEach((value, index) => {
                const cell = document.createElement("td");
                cell.textContent = value;
                if (index === 0) cell.className = "rank-cell";
                row.appendChild(cell);
            });
            elements.body.appendChild(row);
        });
    };

    const loadLeaderboard = async () => {
        elements.loading.hidden = false;
        elements.error.hidden = true;
        elements.empty.hidden = true;
        elements.table.hidden = true;
        elements.refresh.disabled = true;
        elements.retry.disabled = true;
        try {
            const response = await adminFetch("/results");
            state.records = apiArray(response, "results");
            const [examResponse, courseResponse, programResponse] = await Promise.allSettled([
                adminFetch("/exams"),
                adminFetch("/courses"),
                adminFetch("/programs")
            ]);
            [
                [examResponse, state.exams, "exams"],
                [courseResponse, state.courses, "courses"],
                [programResponse, state.programs, "programs"]
            ].forEach(([entry, map, label]) => {
                if (entry.status === "rejected") {
                    console.warn(`Leaderboard: unable to load ${label} labels.`, entry.reason);
                    return;
                }
                apiArray(entry.value, label).forEach((record) => {
                    if (record?.id) map.set(String(record.id), record);
                });
            });
            populate(elements.exam, Array.from(state.exams.values()), "title", "exams");
            populate(elements.course, Array.from(state.courses.values()), "name", "courses");
            populate(elements.program, Array.from(state.programs.values()), "name", "programs");
            render();
        } catch (error) {
            console.error("Leaderboard loading error:", error);
            elements.errorMessage.textContent = error.message || "Please try again.";
            elements.error.hidden = false;
        } finally {
            elements.loading.hidden = true;
            elements.refresh.disabled = false;
            elements.retry.disabled = false;
        }
    };

    document.addEventListener("DOMContentLoaded", () => {
        setPageTitle("Leaderboard");
        [elements.search, elements.exam, elements.course, elements.program].forEach((control) => {
            control.addEventListener("input", render);
            control.addEventListener("change", render);
        });
        elements.refresh.addEventListener("click", loadLeaderboard);
        elements.retry.addEventListener("click", loadLeaderboard);
        loadLeaderboard();
    });
})();