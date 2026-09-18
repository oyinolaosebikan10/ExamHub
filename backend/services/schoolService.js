 const { db } = require("../firebase/firebaseAdmin");

const schoolsCollection = db.collection("schools");

const createSchool = async ({
    name,
    code,
    address = null
}) => {
    const normalizedName = name.trim();
    const normalizedCode = code.trim().toUpperCase();

    const existingSchool = await schoolsCollection
        .where("code", "==", normalizedCode)
        .limit(1)
        .get();

    if (!existingSchool.empty) {
        throw new Error("A school with this code already exists");
    }

    const schoolRef = schoolsCollection.doc();

    const schoolData = {
        name: normalizedName,
        code: normalizedCode,
        address,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    await schoolRef.set(schoolData);

    return {
        id: schoolRef.id,
        ...schoolData
    };
};

const getAllSchools = async () => {
    const snapshot = await schoolsCollection.get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

const getSchoolById = async (schoolId) => {
    const schoolDoc = await schoolsCollection
        .doc(schoolId)
        .get();

    if (!schoolDoc.exists) {
        throw new Error("School not found");
    }

    return {
        id: schoolDoc.id,
        ...schoolDoc.data()
    };
};

const updateSchool = async (schoolId, updateData = {}) => {
    const schoolRef = schoolsCollection.doc(schoolId);

    const schoolDoc = await schoolRef.get();

    if (!schoolDoc.exists) {
        throw new Error("School not found");
    }

    const dataToUpdate = {
        ...updateData,
        updatedAt: new Date()
    };

    if (dataToUpdate.name) {
        dataToUpdate.name = dataToUpdate.name.trim();
    }

    if (dataToUpdate.code) {
        dataToUpdate.code = dataToUpdate.code
            .trim()
            .toUpperCase();
    }

    await schoolRef.update(dataToUpdate);

    const updatedDoc = await schoolRef.get();

    return {
        id: updatedDoc.id,
        ...updatedDoc.data()
    };
};

module.exports = {
    schoolsCollection,
    createSchool,
    getAllSchools,
    getSchoolById,
    updateSchool
};