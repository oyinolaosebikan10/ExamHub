(function (root, factory) {
    const parser = factory();

    if (typeof module === "object" && module.exports) {
        module.exports = parser;
    } else {
        root.ExamHubQuestionImportParser = parser;
    }
})(typeof globalThis === "object" ? globalThis : this, function () {
    "use strict";

    const optionKeys = ["A", "B", "C", "D"];

    const makeEntry = (index) => ({
        question: "",
        options: { A: "", B: "", C: "", D: "" },
        correctAnswer: "",
        embeddedAnswer: "",
        answerConflict: "",
        answerConflictConfirmed: false,
        marks: 1,
        parseErrors: [],
        reviewWarning: "",
        reviewConfirmed: false,
        serverStatus: "",
        serverErrors: [],
        savedId: null,
        sourceIndex: index,
    });

    const parseCsvRows = (text, delimiter = ",") => {
        const rows = [];
        let row = [];
        let cell = "";
        let quoted = false;

        for (let index = 0; index < text.length; index += 1) {
            const character = text[index];
            if (character === '"') {
                if (quoted && text[index + 1] === '"') {
                    cell += '"';
                    index += 1;
                } else {
                    quoted = !quoted;
                }
            } else if (character === delimiter && !quoted) {
                row.push(cell.trim());
                cell = "";
            } else if ((character === "\n" || character === "\r") && !quoted) {
                if (character === "\r" && text[index + 1] === "\n") index += 1;
                row.push(cell.trim());
                if (row.some(Boolean)) rows.push(row);
                row = [];
                cell = "";
            } else {
                cell += character;
            }
        }

        if (quoted) {
            throw new Error("The CSV contains an unclosed quoted value.");
        }
        row.push(cell.trim());
        if (row.some(Boolean)) rows.push(row);
        return rows;
    };

    const csvEntryFromRow = (row, headers, index) => {
        const get = (...names) => {
            for (const name of names) {
                const column = headers.indexOf(name);
                if (column >= 0) return row[column] || "";
            }
            return "";
        };
        const answer = get("answer", "correct answer", "correct option", "key");
        return {
            ...makeEntry(index),
            question: get("question", "prompt"),
            options: {
                A: get("a", "option a", "optiona"),
                B: get("b", "option b", "optionb"),
                C: get("c", "option c", "optionc"),
                D: get("d", "option d", "optiond"),
            },
            correctAnswer: answer.toUpperCase().replace(/^OPTION\s+/, "").trim(),
            embeddedAnswer: answer.toUpperCase().replace(/^OPTION\s+/, "").trim(),
            marks: get("marks") || 1,
        };
    };

    const parseTabular = (text, delimiter) => {
        const rows = parseCsvRows(text, delimiter);
        if (!rows.length) return null;
        const headers = rows[0].map((header) =>
            header.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
        );
        const hasQuestionHeader = headers.some((header) =>
            ["question", "prompt"].includes(header)
        );
        const hasOptionHeaders = optionKeys.every((key) =>
            headers.some((header) =>
                [key.toLowerCase(), `option ${key.toLowerCase()}`, `option${key.toLowerCase()}`].includes(header)
            )
        );
        const hasHeaders = hasQuestionHeader && hasOptionHeaders;
        if (hasQuestionHeader && !hasOptionHeaders) {
            return [{
                ...makeEntry(0),
                parseErrors: ["Spreadsheet header must include question and all four option columns A, B, C, and D."],
            }];
        }
        const effectiveHeaders = hasHeaders
            ? headers
            : ["question", "a", "b", "c", "d", "answer", "marks"];
        const dataRows = hasHeaders ? rows.slice(1) : rows;
        return dataRows.map((row, index) => csvEntryFromRow(row, effectiveHeaders, index));
    };

    const parseAnswerValue = (value) => {
        const match = value.match(/(?:OPTION\s*)?([A-D])\b/i);
        return match ? match[1].toUpperCase() : "";
    };

    const parseAnswerKey = (answerKey, entries) => {
        const errors = [];
        if (!answerKey.trim()) return errors;

        const explicitPattern =
            /(?:QUESTION\s*)?(\d+)\s*(?:[:.)-]\s*|\s+)(?:ANSWER\s*[:=-]?\s*)?(?:OPTION\s*)?([A-D])\b/gi;
        const explicitMatches = [...answerKey.matchAll(explicitPattern)];
        const normalizedKey = answerKey.replace(/\s+/g, " ").trim();
        const looksExplicit = /\d/.test(normalizedKey);

        if (looksExplicit) {
            const matchedText = explicitMatches
                .map((match) => match[0].replace(/\s+/g, " ").trim())
                .join(" ");
            const residue = normalizedKey
                .replace(explicitPattern, " ")
                .replace(/[,\s;|]+/g, "");
            if (!explicitMatches.length || residue) {
                errors.push("Some answer-key text could not be matched. Use entries such as 1-A, 2-C or Question 1: A.");
            }
            explicitMatches.forEach((match) => {
                const questionNumber = Number(match[1]);
                const answer = match[2].toUpperCase();
                const entry = entries[questionNumber - 1];
                if (!entry) {
                    errors.push(`Answer key refers to question ${questionNumber}, which was not parsed.`);
                    return;
                }
                assignAnswer(entry, answer, errors, `Question ${questionNumber}`);
            });
            if (matchedText && explicitMatches.length === 0) {
                errors.push("No numbered answers were found in the answer key.");
            }
            return errors;
        }

        const tokens = answerKey
            .split(/[\n,;]+/)
            .map((token) => token.trim())
            .filter(Boolean);
        tokens.forEach((token, index) => {
            const label = token.match(/^(?:QUESTION\s*)?(\d+)\s*[:.)-]\s*(.*)$/i);
            if (label) {
                const entry = entries[Number(label[1]) - 1];
                if (!entry) {
                    errors.push(`Answer key refers to question ${label[1]}, which was not parsed.`);
                    return;
                }
                const answer = parseAnswerValue(label[2]);
                if (!answer) {
                    errors.push(`Answer key for question ${label[1]} must be A, B, C, or D.`);
                    return;
                }
                assignAnswer(entry, answer, errors, `Question ${label[1]}`);
                return;
            }
            const answer = parseAnswerValue(token);
            if (!answer) {
                errors.push(`Answer "${token}" is invalid. Use A, B, C, or D.`);
                return;
            }
            const entry = entries[index];
            if (!entry) {
                errors.push(`Answer ${index + 1} has no matching parsed question.`);
                return;
            }
            assignAnswer(entry, answer, errors, `Question ${index + 1}`);
        });
        return errors;
    };

    const assignAnswer = (entry, answer, errors, label) => {
        if (entry.embeddedAnswer && entry.embeddedAnswer !== answer) {
            const message = `${label}: separate answer key (${answer}) conflicts with embedded answer (${entry.embeddedAnswer}). Confirm or correct the answer in the preview.`;
            entry.answerConflict = message;
            if (!entry.parseErrors.includes(message)) entry.parseErrors.push(message);
            entry.correctAnswer = entry.embeddedAnswer;
            errors.push(message);
            return;
        }
        entry.correctAnswer = answer;
    };

    const resolveAnswerConflict = (entry, answer) => {
        if (!entry?.answerConflict || !optionKeys.includes(answer)) return "";
        const message = entry.answerConflict;
        entry.correctAnswer = answer;
        entry.answerConflictConfirmed = true;
        entry.parseErrors = entry.parseErrors.filter((error) => error !== message);
        return message;
    };

    const confirmParseReview = (entry, confirmed) => {
        if (!entry?.reviewWarning) return false;
        entry.reviewConfirmed = Boolean(confirmed);
        return true;
    };

    const headingMatch = (line) => {
        const match = line.match(
            /^(?:QUESTION(?:\s+(?:\d+|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN))?|Q\s*\.?\s*\d+|\d+\s*[.)-])\s*(?::|[-.)])?\s*(.*)$/i
        );
        if (!match) return null;
        return { text: match[1].trim(), numbered: /^\d/.test(line) || /^Q\s*\.?\s*\d/i.test(line) };
    };

    const answerMatch = (line) =>
        line.match(/^(?:(?:THE\s+ANSWER\s+IS)|(?:(?:CORRECT\s+)?(?:ANSWER|ANS|OPTION))|(?:CORRECT\s+OPTION))\s*[:=-]?\s*(.*)$/i);

    const optionMatch = (line) =>
        line.match(/^\s*(?:\(([A-D])\)\s*|([A-D])\s*[.):\-]\s*)(.*)$/i);

    const splitInlineOptions = (line) => {
        const pattern = /(?:^|\s)(\([A-D]\)|[A-D]\s*[.):\-])\s*/gi;
        const matches = [...line.matchAll(pattern)];
        if (matches.length < 2) return [line];
        const markerStarts = matches.map(
            (match) => match.index + match[0].indexOf(match[1])
        );
        const parts = [];
        const prefix = line.slice(0, markerStarts[0]).trim();
        if (prefix) parts.push(prefix);
        markerStarts.forEach((start, index) => {
            const end = markerStarts[index + 1] ?? line.length;
            parts.push(line.slice(start, end).trim());
        });
        return parts;
    };

    const parseQuestionText = (text) => {
        const entries = [];
        let current = null;
        let currentField = "";
        let lineNumber = 0;

        const finish = () => {
            if (!current) return;
            entries.push(current);
            current = null;
            currentField = "";
        };
        const begin = (question = "") => {
            current = makeEntry(entries.length);
            current.question = question;
            currentField = question ? "question" : "";
        };
        const appendText = (field, textValue) => {
            if (!textValue) return;
            if (field === "question") {
                if (!current.question) {
                    current.parseErrors = current.parseErrors.filter(
                        (message) =>
                            !message.endsWith("question heading has no question text.")
                    );
                }
                current.question = [current.question, textValue].filter(Boolean).join(" ").trim();
            } else if (optionKeys.includes(field)) {
                current.options[field] = [current.options[field], textValue].filter(Boolean).join(" ").trim();
            }
        };

        const processLine = (rawLine, sourceLine = null) => {
            if (sourceLine === null) lineNumber += 1;
            const currentLineNumber = sourceLine ?? lineNumber;
            const line = rawLine.trim();
            if (!line) return;

            const inlineHeading = line.match(
                /\s+(?=(?:QUESTION(?:\s+(?:\d+|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN))?\s*[:.)-]|Q\s*\.?\s*\d+\s*[:.)-]|\d+\s*[.)-]))/i
            );
            if (inlineHeading && inlineHeading.index > 0) {
                processLine(line.slice(0, inlineHeading.index), currentLineNumber);
                processLine(line.slice(inlineHeading.index).trim(), currentLineNumber);
                return;
            }

            const inlineAnswer = line.match(
                /(?:THE\s+ANSWER\s+IS\s+|CORRECT\s+(?:ANSWER|OPTION)(?:\s+IS)?\s*[:=-]|ANSWER(?:\s+IS)?\s*[:=-]|ANS\s*[:=-])/i
            );
            if (inlineAnswer && inlineAnswer.index > 0) {
                processLine(line.slice(0, inlineAnswer.index), currentLineNumber);
                processLine(line.slice(inlineAnswer.index).trim(), currentLineNumber);
                return;
            }

            const parts = splitInlineOptions(line);
            if (parts.length > 1) {
                parts.forEach((part) => processLine(part, currentLineNumber));
                return;
            }

            const answer = answerMatch(line);
            if (answer) {
                if (!current) {
                    begin();
                    current.parseErrors.push(`Line ${currentLineNumber}: answer appeared before a question.`);
                }
                const parsed = parseAnswerValue(answer[1]);
                if (!parsed) current.parseErrors.push(`Line ${currentLineNumber}: answer must be A, B, C, or D.`);
                else {
                    current.correctAnswer = parsed;
                    current.embeddedAnswer = parsed;
                }
                currentField = "answer";
                return;
            }

            const option = optionMatch(line);
            if (option) {
                if (!current) {
                    begin();
                    current.reviewWarning = `Line ${currentLineNumber}: options appeared before a question; confirm the parsed boundary after reviewing this entry.`;
                }
                const key = (option[1] || option[2]).toUpperCase();
                if (current.options[key]) current.parseErrors.push(`Line ${currentLineNumber}: option ${key} is repeated.`);
                else current.options[key] = option[3].trim();
                currentField = key;
                return;
            }

            const heading = headingMatch(line);
            if (heading) {
                if (current) {
                    const complete = optionKeys.every((key) => current.options[key]);
                    if (!complete) {
                        current.reviewWarning = `Line ${currentLineNumber}: a new question heading appeared before the previous question had all four options; confirm the split after reviewing this entry.`;
                    }
                    finish();
                }
                begin(heading.text);
                if (!heading.text) current.parseErrors.push(`Line ${currentLineNumber}: question heading has no question text.`);
                return;
            }

            if (!current) {
                begin(line);
                return;
            }
            if (optionKeys.every((key) => current.options[key])) {
                const previousQuestion = current;
                if (!previousQuestion.correctAnswer) {
                    previousQuestion.reviewWarning =
                        `Line ${currentLineNumber}: an unlabelled question boundary followed complete options; confirm this question split after reviewing this entry.`;
                }
                finish();
                begin(line);
                return;
            }
            if (!optionKeys.some((key) => current.options[key])) {
                appendText("question", line);
            } else if (optionKeys.includes(currentField)) {
                appendText(currentField, line);
            } else {
                current.parseErrors.push(`Line ${currentLineNumber}: text could not be safely assigned to a question or option.`);
            }
        };

        text.replace(/\r\n?/g, "\n").split("\n").forEach((line) => processLine(line));
        finish();
        return entries;
    };

    const parseQuestionImport = ({ text = "", answerKey = "", answerMode = "embedded", format = "text" } = {}) => {
        const source = String(text);
        let entries;
        let detectedFormat = format;
        try {
            if (format === "csv") {
                entries = parseTabular(source, ",");
            } else if (format === "tsv" || source.split(/\r?\n/, 1)[0].includes("\t")) {
                entries = parseTabular(source, "\t");
                detectedFormat = "tsv";
            } else {
                entries = parseQuestionText(source);
            }
        } catch (error) {
            return {
                entries: [],
                errors: [error.message || "Unable to parse the selected question data."],
                format: detectedFormat,
            };
        }

        if (!entries || !entries.length) {
            return { entries: [], errors: ["No questions could be parsed. Add question text and options, then preview again."], format: detectedFormat };
        }
        const seenQuestions = new Set();
        entries.forEach((entry, index) => {
            const key = entry.question.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
            if (key && seenQuestions.has(key)) {
                entry.parseErrors.push(`Question ${index + 1} duplicates an earlier question in this batch.`);
            }
            if (key) seenQuestions.add(key);
        });
        const errors = answerMode === "separate"
            ? parseAnswerKey(String(answerKey), entries)
            : [];
        entries.forEach((entry, index) => {
            entry.sourceIndex = index;
            if (answerMode === "separate" && !entry.correctAnswer) {
                entry.parseErrors.push(`Question ${index + 1}: no correct answer was supplied.`);
            }
        });
        return { entries, errors: [...new Set(errors)], format: detectedFormat };
    };

    const toCsvTemplate = () =>
        "question,A,B,C,D,answer,marks\r\n\"What does HTML stand for?\",\"HyperText Markup Language\",\"HighText Machine Language\",\"Hyper Transfer Markup Language\",\"Home Tool Markup Language\",A,1\r\n";

    return {
        parseQuestionImport,
        parseAnswerKey,
        parseQuestionText,
        parseTabular,
        confirmParseReview,
        resolveAnswerConflict,
        toCsvTemplate,
    };
});
