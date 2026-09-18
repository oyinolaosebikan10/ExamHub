const { db } = require("../firebase/firebaseAdmin");

const questionsCollection = db.collection("questions");
const coursesCollection = db.collection("courses");

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
    getQuestions,
    getQuestionById,
    updateQuestion,
    deleteQuestion
};