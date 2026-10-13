const { db } = require("../firebase/firebaseAdmin");

const questionsCollection = db.collection("questions");
const coursesCollection = db.collection("courses");

const normalizeQuestionText = (value) =>
    value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase();

const validateBulkQuestion = (record, index) => {
    const errors = [];
    const courseId =
        typeof record?.courseId === "string"
            ? record.courseId.trim()
            : "";
    const question =
        typeof record?.question === "string"
            ? record.question.trim()
            : "";
    const options =
        record?.options &&
        typeof record.options === "object" &&
        !Array.isArray(record.options)
            ? record.options
            : {};
    const correctAnswer =
        typeof record?.correctAnswer === "string"
            ? record.correctAnswer.trim().toUpperCase()
            : "";
    const marks = Number(record?.marks);

    if (!courseId) errors.push("Course is required");
    if (!question) errors.push("Question is required");
    if (question.length > 5000) errors.push("Question exceeds 5,000 characters");

    for (const key of ["A", "B", "C", "D"]) {
        if (typeof options[key] !== "string" || !options[key].trim()) {
            errors.push(`Option ${key} is required`);
        } else if (options[key].trim().length > 2000) {
            errors.push(`Option ${key} exceeds 2,000 characters`);
        }
    }

    if (!["A", "B", "C", "D"].includes(correctAnswer)) {
        errors.push("Correct answer must be A, B, C, or D");
    }
    if (!Number.isInteger(marks) || marks < 1) {
        errors.push("Marks must be a positive whole number");
    }

    return {
        index,
        courseId,
        question,
        options: Object.fromEntries(
            ["A", "B", "C", "D"].map((key) => [
                key,
                typeof options[key] === "string"
                    ? options[key].trim()
                    : ""
            ])
        ),
        correctAnswer,
        marks,
        errors
    };
};

const bulkCreateQuestions = async (records) => {
    if (!Array.isArray(records) || records.length === 0) {
        throw new Error("At least one question is required");
    }
    if (records.length > 300) {
        throw new Error("A batch may contain no more than 300 questions");
    }

    const validated = records.map(validateBulkQuestion);
    const courseIds = [
        ...new Set(
            validated
                .filter((item) => item.courseId && item.errors.length === 0)
                .map((item) => item.courseId)
        )
    ];
    const courseChecks = await Promise.all(
        courseIds.map(async (courseId) => [
            courseId,
            await coursesCollection.doc(courseId).get()
        ])
    );
    const existingCourses = new Map(courseChecks);

    validated.forEach((item) => {
        if (
            item.errors.length === 0 &&
            !existingCourses.get(item.courseId)?.exists
        ) {
            item.errors.push("Selected course does not exist");
        }
    });

    const items = validated.map((item) => ({
        index: item.index,
        status: item.errors.length ? "invalid" : "pending",
        errors: [...item.errors],
        id: null
    }));

    const eligible = validated.filter(
        (item) => item.errors.length === 0
    );

    if (eligible.length === 0) {
        return {
            items,
            savedCount: 0,
            duplicateCount: 0,
            failedCount: items.length
        };
    }

    await db.runTransaction(async (transaction) => {
        const courseQueries = new Map(
            [...new Set(eligible.map((item) => item.courseId))].map(
                (courseId) => [
                    courseId,
                    questionsCollection
                        .where("courseId", "==", courseId)
                ]
            )
        );
        const existingQuestionSnapshots = await Promise.all(
            [...courseQueries.values()].map((query) =>
                transaction.get(query)
            )
        );
        const existingByCourse = new Map();
        [...courseQueries.keys()].forEach((courseId, index) => {
            existingByCourse.set(
                courseId,
                new Set(
                    existingQuestionSnapshots[index].docs
                        .map((doc) =>
                            normalizeQuestionText(doc.data().question || "")
                        )
                )
            );
        });

        const batchKeys = new Set();
        const toCreate = [];

        eligible.forEach((item) => {
            const key =
                `${item.courseId}\u0000${normalizeQuestionText(item.question)}`;
            const isDuplicate =
                existingByCourse.get(item.courseId).has(
                    normalizeQuestionText(item.question)
                ) ||
                batchKeys.has(key);

            if (isDuplicate) {
                items[item.index] = {
                    index: item.index,
                    status: "duplicate",
                    errors: ["A question with the same text already exists for this course"],
                    id: null
                };
                return;
            }

            batchKeys.add(key);
            const ref = questionsCollection.doc();
            const now = new Date();
            toCreate.push({
                item,
                ref,
                data: {
                    courseId: item.courseId,
                    question: item.question,
                    options: item.options,
                    correctAnswer: item.correctAnswer,
                    marks: item.marks,
                    isActive: true,
                    createdAt: now,
                    updatedAt: now
                }
            });
        });

        toCreate.forEach(({ item, ref, data }) => {
            transaction.create(ref, data);
            items[item.index] = {
                index: item.index,
                status: "created",
                errors: [],
                id: ref.id
            };
        });
    });

    return {
        items,
        savedCount: items.filter((item) => item.status === "created").length,
        duplicateCount: items.filter((item) => item.status === "duplicate").length,
        failedCount: items.filter((item) =>
            item.status === "invalid"
        ).length
    };
};

const createQuestion = async (questionData) => {
    const {
        courseId,
        question,
        options,
        correctAnswer,
        marks
    } = questionData;

    // Check that the course exists
    const courseDoc = await coursesCollection.doc(courseId).get();

    if (!courseDoc.exists) {
        throw new Error("Selected course does not exist");
    }

    const questionRef = questionsCollection.doc();

    const questionToSave = {
        courseId,
        question,
        options,
        correctAnswer,
        marks,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    await questionRef.set(questionToSave);

    return {
        id: questionRef.id,
        ...questionToSave
    };
};

const getQuestions = async (courseId = null) => {
    let query = questionsCollection;

    if (courseId) {
        query = query.where("courseId", "==", courseId);
    }

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

const getQuestionById = async (questionId) => {
    const questionDoc = await questionsCollection.doc(questionId).get();

    if (!questionDoc.exists) {
        throw new Error("Question not found");
    }

    return {
        id: questionDoc.id,
        ...questionDoc.data()
    };
};

const updateQuestion = async (questionId, updateData ={}) => {
    const questionRef = questionsCollection.doc(questionId);

    const questionDoc = await questionRef.get();

    if (!questionDoc.exists) {
        throw new Error("Question not found");
    }

    // If courseId is being changed, make sure the new course exists
    if (updateData.courseId) {
        const courseDoc = await coursesCollection
            .doc(updateData.courseId)
            .get();

        if (!courseDoc.exists) {
            throw new Error("Selected course does not exist");
        }
    }

    const dataToUpdate = {
        ...updateData,
        updatedAt: new Date()
    };

    await questionRef.update(dataToUpdate);

    const updatedDoc = await questionRef.get();

    return {
        id: updatedDoc.id,
        ...updatedDoc.data()
    };
};

const deleteQuestion = async (questionId) => {
    const questionRef = questionsCollection.doc(questionId);

    const questionDoc = await questionRef.get();

    if (!questionDoc.exists) {
        throw new Error("Question not found");
    }

    await questionRef.delete();

    return true;
};

module.exports = {
    createQuestion,
    bulkCreateQuestions,
    getQuestions,
    getQuestionById,
    updateQuestion,
    deleteQuestion
};