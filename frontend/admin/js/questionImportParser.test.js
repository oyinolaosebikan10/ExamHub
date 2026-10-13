"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
    confirmParseReview,
    parseQuestionImport,
    resolveAnswerConflict,
} = require("./questionImportParser");

const questionWith = (heading, answer = "Answer: A") =>
    `${heading}\nA. Alpha\nB) Bravo\n(C) Charlie\nD - Delta\n${answer}`;

test("parses supported numbered and named question headings", () => {
    const headings = [
        "QUESTION: What is HTML?",
        "QUESTION What is HTML?",
        "question what is HTML?",
        "QUESTION 1: What is HTML?",
        "QUESTION 1",
        "QUESTION ONE",
        "Q1: What is HTML?",
        "Q. 1: What is HTML?",
        "1. What is HTML?",
        "1) What is HTML?",
        "1 - What is HTML?",
    ];
    for (const heading of headings) {
        const entry = parseQuestionImport({
            text: questionWith(heading),
        }).entries[0];
        const expectedQuestion =
            heading === "QUESTION 1" || heading === "QUESTION ONE"
                ? ""
                : heading === "question what is HTML?"
                    ? "what is HTML?"
                    : "What is HTML?";
        assert.equal(entry.question, expectedQuestion, heading);
        assert.deepEqual(entry.options, {
            A: "Alpha",
            B: "Bravo",
            C: "Charlie",
            D: "Delta",
        }, heading);
    }
});

test("parses option prefixes, capitalization, punctuation and inline questions", () => {
    const formats = ["A. Alpha", "A) Alpha", "A: Alpha", "(A) Alpha", "A - Alpha"];
    for (const option of formats) {
        const text = `Plain question text\n${option}\nB: Bravo\nC: Charlie\nD: Delta\nCorrect answer: Option A`;
        const entry = parseQuestionImport({ text }).entries[0];
        assert.equal(entry.question, "Plain question text");
        assert.equal(entry.options.A, "Alpha");
        assert.equal(entry.correctAnswer, "A");
        assert.deepEqual(entry.parseErrors, []);
    }
    const lowercase = parseQuestionImport({
        text: "q1: lowercase labels?\na. alpha\nb) bravo\n(c) charlie\nd - delta\ncorrect option: b",
    }).entries[0];
    assert.equal(lowercase.question, "lowercase labels?");
    assert.equal(lowercase.correctAnswer, "B");

    for (const answer of [
        "Answer: A",
        "Ans: A",
        "Correct Answer: A",
        "Correct Option: A",
        "Answer - A",
        "The answer is A",
    ]) {
        const entry = parseQuestionImport({
            text: `What is HTML? A. Alpha B) Bravo C: Charlie D - Delta ${answer}`,
        }).entries[0];
        assert.equal(entry.correctAnswer, "A", answer);
        assert.equal(entry.options.D, "Delta", answer);
    }

    const inline = parseQuestionImport({
        text: "QUESTION: Is HTML a markup language? A. Yes B. No C. Maybe D. Unknown ANSWER: A",
    }).entries[0];
    assert.equal(inline.question, "Is HTML a markup language?");
    assert.deepEqual(inline.options, {
        A: "Yes",
        B: "No",
        C: "Maybe",
        D: "Unknown",
    });
    assert.equal(inline.correctAnswer, "A");

    const packed = parseQuestionImport({
        text: "QUESTION 1: First? A. Alpha B. Beta C. Gamma D. Delta ANSWER: A QUESTION 2: Second? A. One B. Two C. Three D. Four ANSWER: D",
    });
    assert.deepEqual(packed.entries.map((entry) => entry.question), ["First?", "Second?"]);
    assert.deepEqual(packed.entries.map((entry) => entry.correctAnswer), ["A", "D"]);
});

test("parses multiline question wording and multiple question boundaries", () => {
    const parsed = parseQuestionImport({
        text: [
            "Q1: Which answer is correct?",
            "Choose the best response.",
            "A. First",
            "B. Second",
            "C. Third",
            "D. Fourth",
            "The answer is C",
            "2. Which option follows?",
            "A: One",
            "B: Two",
            "C: Three",
            "D: Four",
            "Ans - D",
        ].join("\n"),
    });
    assert.equal(parsed.entries.length, 2);
    assert.equal(parsed.entries[0].question, "Which answer is correct? Choose the best response.");
    assert.equal(parsed.entries[0].correctAnswer, "C");
    assert.equal(parsed.entries[1].correctAnswer, "D");
    assert.deepEqual(parsed.entries.map((entry) => entry.parseErrors), [[], []]);
});

test("continues a numbered heading whose question text starts on the next line", () => {
    const parsed = parseQuestionImport({
        text: "QUESTION ONE\nWhat does HTML stand for?\nA. HyperText Markup Language\nB. HighText Machine Language\nC. Hyper Transfer Markup Language\nD. Home Tool Markup Language\nAnswer: A",
    });
    assert.equal(parsed.entries.length, 1);
    assert.equal(parsed.entries[0].question, "What does HTML stand for?");
    assert.deepEqual(parsed.entries[0].parseErrors, []);
});

test("supports numbered, question-labelled and ordered separate answer keys", () => {
    const questions = `${questionWith("1. First?", "")}\n\n${questionWith("2. Second?", "")}`;
    const numbered = parseQuestionImport({
        text: questions,
        answerMode: "separate",
        answerKey: "1-A, 2-C",
    });
    assert.deepEqual(numbered.entries.map((entry) => entry.correctAnswer), ["A", "C"]);
    assert.deepEqual(numbered.errors, []);

    const labelled = parseQuestionImport({
        text: questions,
        answerMode: "separate",
        answerKey: "Question 1: B\nQuestion 2: D",
    });
    assert.deepEqual(labelled.entries.map((entry) => entry.correctAnswer), ["B", "D"]);

    const ordered = parseQuestionImport({
        text: questions,
        answerMode: "separate",
        answerKey: "A\nD",
    });
    assert.deepEqual(ordered.entries.map((entry) => entry.correctAnswer), ["A", "D"]);
});

test("flags conflicts, missing and invalid answer keys", () => {
    const text = questionWith("QUESTION: Conflict?", "Answer: A");
    const conflict = parseQuestionImport({
        text,
        answerMode: "separate",
        answerKey: "1-C",
    });
    assert.equal(conflict.entries[0].correctAnswer, "A");
    assert.match(conflict.entries[0].parseErrors.join(" "), /conflicts/);
    assert.match(conflict.errors.join(" "), /conflicts/);
    const conflictMessage = resolveAnswerConflict(conflict.entries[0], "C");
    assert.match(conflictMessage, /conflicts/);
    assert.equal(conflict.entries[0].correctAnswer, "C");
    assert.equal(conflict.entries[0].answerConflictConfirmed, true);
    assert.deepEqual(conflict.entries[0].parseErrors, []);

    const missing = parseQuestionImport({
        text: questionWith("QUESTION: Missing?", ""),
        answerMode: "separate",
    });
    assert.match(missing.entries[0].parseErrors.join(" "), /no correct answer/);

    const invalid = parseQuestionImport({
        text: questionWith("QUESTION: Invalid?", ""),
        answerMode: "separate",
        answerKey: "X",
    });
    assert.match(invalid.errors.join(" "), /invalid/);
    assert.match(invalid.entries[0].parseErrors.join(" "), /no correct answer/);

    const nonexistent = parseQuestionImport({
        text: questionWith("QUESTION: Only one?", ""),
        answerMode: "separate",
        answerKey: "2-A",
    });
    assert.match(nonexistent.errors.join(" "), /question 2/);
});

test("flags missing options, ambiguous boundaries and duplicate questions", () => {
    const malformed = parseQuestionImport({
        text: "QUESTION 1: Missing D?\nA. Alpha\nB. Bravo\nC. Charlie\nQUESTION 2: Next?\nA. One\nB. Two\nC. Three\nD. Four\nANSWER: A",
    });
    assert.match(malformed.entries[0].reviewWarning, /before the previous question/);
    assert.equal(malformed.entries[0].reviewConfirmed, false);
    assert.equal(confirmParseReview(malformed.entries[0], true), true);
    assert.equal(malformed.entries[0].reviewConfirmed, true);
    assert.equal(malformed.entries[0].options.D, "");

    const duplicates = parseQuestionImport({
        text: `${questionWith("1. Repeated?")}\n\n${questionWith("2. Repeated?")}`,
    });
    assert.match(duplicates.entries[1].parseErrors.join(" "), /duplicates an earlier question/);
});

test("imports CSV and pasted TSV using question, option, answer and marks columns", () => {
    const csv = parseQuestionImport({
        format: "csv",
        text: 'question,A,B,C,D,answer,marks\r\n"Which is HTML?","HyperText, Markup","Other","Third","Fourth",A,2',
    });
    assert.equal(csv.entries[0].question, "Which is HTML?");
    assert.equal(csv.entries[0].options.A, "HyperText, Markup");
    assert.equal(csv.entries[0].correctAnswer, "A");
    assert.equal(csv.entries[0].marks, "2");

    const tsv = parseQuestionImport({
        text: "question\tA\tB\tC\tD\tanswer\tmarks\nWhich is CSS?\tStyle\tMarkup\tQuery\tData\tA\t1",
    });
    assert.equal(tsv.format, "tsv");
    assert.equal(tsv.entries[0].question, "Which is CSS?");
    assert.equal(tsv.entries[0].options.A, "Style");
    assert.equal(tsv.entries[0].correctAnswer, "A");

    const brokenCsv = parseQuestionImport({
        format: "csv",
        text: 'question,A,B,C,D,answer\n"Unclosed question,A,B,C,D,A',
    });
    assert.match(brokenCsv.errors.join(" "), /unclosed quoted/);

    const badHeaders = parseQuestionImport({
        format: "csv",
        text: "question,A,B,C,answer\nPrompt,One,Two,Three,A",
    });
    assert.match(badHeaders.entries[0].parseErrors.join(" "), /all four option columns/);
});
