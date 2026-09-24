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

    const allowedFields = [
        "name",
        "code",
        "address",
        "isActive"
    ];

    const dataToUpdate = {};

    // Only allow approved fields
    for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
            dataToUpdate[field] = updateData[field];
        }
    }

    if (Object.keys(dataToUpdate).length === 0) {
        throw new Error("No valid fields provided for update");
    }

    // Normalize name
    if (dataToUpdate.name !== undefined) {
        if (
            typeof dataToUpdate.name !== "string" ||
            !dataToUpdate.name.trim()
        ) {
            throw new Error("School name is required");
        }

        dataToUpdate.name = dataToUpdate.name.trim();
    }

    // Normalize and validate code
    if (dataToUpdate.code !== undefined) {
        if (
            typeof dataToUpdate.code !== "string" ||
            !dataToUpdate.code.trim()
        ) {
            throw new Error("School code is required");
        }

        dataToUpdate.code = dataToUpdate.code
            .trim()
            .toUpperCase();

        // Prevent another school from using the same code
        const existingSchool = await schoolsCollection
            .where("code", "==", dataToUpdate.code)
            .limit(2)
            .get();

        const duplicateExists = existingSchool.docs.some(
            doc => doc.id !== schoolId
        );

        if (duplicateExists) {
            throw new Error(
                "A school with this code already exists"
            );
        }
    }

    // Validate address if supplied
    if (dataToUpdate.address !== undefined) {
        if (
            dataToUpdate.address !== null &&
            typeof dataToUpdate.address !== "string"
        ) {
            throw new Error(
                "School address must be a string or null"
            );
        }
    }

    // Validate active status if supplied
    if (dataToUpdate.isActive !== undefined) {
        if (typeof dataToUpdate.isActive !== "boolean") {
            throw new Error(
                "isActive must be a boolean"
            );
        }
    }

    dataToUpdate.updatedAt = new Date();

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