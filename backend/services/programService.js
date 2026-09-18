const { db } = require("../firebase/firebaseAdmin");

const programsCollection = db.collection("programs");
const schoolsCollection = db.collection("schools");

/**
 * Convert Firestore Timestamp, Date, or date string into a Date.
 */
const toDate = (value) => {
    if (!value) return null;

    if (value instanceof Date) {
        return value;
    }

    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {
        return value.toDate();
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
};

/**
 * Validate the four program dates.
 */
const validateProgramDates = ({
    registrationStart,
    registrationEnd,
    examStart,
    examEnd
}) => {
    const registrationStartDate = toDate(registrationStart);
    const registrationEndDate = toDate(registrationEnd);
    const examStartDate = toDate(examStart);
    const examEndDate = toDate(examEnd);

    if (
        !registrationStartDate ||
        !registrationEndDate ||
        !examStartDate ||
        !examEndDate
    ) {
        throw new Error(
            "All program dates are required"
        );
    }

    if (registrationStartDate >= registrationEndDate) {
        throw new Error(
            "Registration start must be before registration end"
        );
    }

    if (registrationEndDate >= examStartDate) {
        throw new Error(
            "Registration must end before the exam starts"
        );
    }

    if (examStartDate >= examEndDate) {
        throw new Error(
            "Exam start must be before exam end"
        );
    }

    return {
        registrationStartDate,
        registrationEndDate,
        examStartDate,
        examEndDate
    };
};

/**
 * Validate that a school exists and is active.
 */
const validateSchool = async (schoolId, action = "create") => {
    if (!schoolId) {
        throw new Error(
            "School is required for a school-hosted program"
        );
    }

    const schoolDoc = await schoolsCollection
        .doc(schoolId)
        .get();

    if (!schoolDoc.exists) {
        throw new Error("School not found");
    }

    const school = schoolDoc.data();

    if (school.isActive === false) {
        throw new Error(
            action === "update"
                ? "Cannot update a program to an inactive school"
                : "Cannot create a program for an inactive school"
        );
    }

    return school;
};

/**
 * Create a program.
 */
const createProgram = async ({
    name,
    description = null,
    venueType,
    schoolId = null,
    registrationStart,
    registrationEnd,
    examStart,
    examEnd
}) => {
    if (!name || !name.trim()) {
        throw new Error("Program name is required");
    }

    if (!["school", "organization"].includes(venueType)) {
        throw new Error(
            "Venue type must be either school or organization"
        );
    }

    const dates = validateProgramDates({
        registrationStart,
        registrationEnd,
        examStart,
        examEnd
    });

    if (venueType === "school") {
        await validateSchool(schoolId, "create");
    }

    if (venueType === "organization") {
        schoolId = null;
    }

    const programRef = programsCollection.doc();

    const programData = {
        name: name.trim(),

        description:
            typeof description === "string" && description.trim()
                ? description.trim()
                : null,

        venueType,
        schoolId,

        registrationStart: dates.registrationStartDate,
        registrationEnd: dates.registrationEndDate,

        examStart: dates.examStartDate,
        examEnd: dates.examEndDate,

        resultVisibility: "hidden",
        resultDownloadEnabled: false,

        status: "upcoming",

        createdAt: new Date(),
        updatedAt: new Date()
    };

    await programRef.set(programData);

    return {
        id: programRef.id,
        ...programData
    };
};

/**
 * Get all programs.
 */
const getAllPrograms = async () => {
    const snapshot = await programsCollection.get();

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    }));
};

/**
 * Get a single program.
 */
const getProgramById = async (programId) => {
    if (!programId) {
        throw new Error("Program not found");
    }

    const programDoc = await programsCollection
        .doc(programId)
        .get();

    if (!programDoc.exists) {
        throw new Error("Program not found");
    }

    return {
        id: programDoc.id,
        ...programDoc.data()
    };
};

/**
 * Update a program.
 */
const updateProgram = async (
    programId,
    updateData = {}
) => {
    if (!programId) {
        throw new Error("Program not found");
    }

    const programRef = programsCollection.doc(programId);

    const programDoc = await programRef.get();

    if (!programDoc.exists) {
        throw new Error("Program not found");
    }

    const currentProgram = programDoc.data();

    /*
     * Validate result visibility.
     */
    if (
        updateData.resultVisibility !== undefined &&
        !["hidden", "visible"].includes(
            updateData.resultVisibility
        )
    ) {
        throw new Error(
            "Result visibility must be either hidden or visible"
        );
    }

    /*
     * Validate result download setting.
     */
    if (
        updateData.resultDownloadEnabled !== undefined &&
        typeof updateData.resultDownloadEnabled !== "boolean"
    ) {
        throw new Error(
            "Result download setting must be true or false"
        );
    }

    /*
     * Determine the final venue type.
     */
    const venueType =
        updateData.venueType !== undefined
            ? updateData.venueType
            : currentProgram.venueType;

    if (
        !["school", "organization"].includes(venueType)
    ) {
        throw new Error(
            "Venue type must be either school or organization"
        );
    }

    /*
     * Determine the final school.
     *
     * Organization programs must never retain a schoolId.
     */
    let finalSchoolId =
        updateData.schoolId !== undefined
            ? updateData.schoolId
            : currentProgram.schoolId;

    if (venueType === "school") {
        await validateSchool(finalSchoolId, "update");
    }

    if (venueType === "organization") {
        finalSchoolId = null;
    }

    /*
     * Determine the final dates before updating.
     *
     * This means updating only one date still validates
     * the complete final program timeline.
     */
    const finalRegistrationStart =
        updateData.registrationStart !== undefined
            ? updateData.registrationStart
            : currentProgram.registrationStart;

    const finalRegistrationEnd =
        updateData.registrationEnd !== undefined
            ? updateData.registrationEnd
            : currentProgram.registrationEnd;

    const finalExamStart =
        updateData.examStart !== undefined
            ? updateData.examStart
            : currentProgram.examStart;

    const finalExamEnd =
        updateData.examEnd !== undefined
            ? updateData.examEnd
            : currentProgram.examEnd;

    const dates = validateProgramDates({
        registrationStart: finalRegistrationStart,
        registrationEnd: finalRegistrationEnd,
        examStart: finalExamStart,
        examEnd: finalExamEnd
    });

    /*
     * Build the update object explicitly.
     *
     * This prevents unexpected fields from being written
     * directly into the program document.
     */
    const dataToUpdate = {
        updatedAt: new Date()
    };

    if (updateData.name !== undefined) {
        if (
            typeof updateData.name !== "string" ||
            !updateData.name.trim()
        ) {
            throw new Error("Program name is required");
        }

        dataToUpdate.name = updateData.name.trim();
    }

    if (updateData.description !== undefined) {
        dataToUpdate.description =
            typeof updateData.description === "string" &&
            updateData.description.trim()
                ? updateData.description.trim()
                : null;
    }

    if (updateData.venueType !== undefined) {
        dataToUpdate.venueType = venueType;
    }

    if (
        updateData.schoolId !== undefined ||
        updateData.venueType !== undefined
    ) {
        dataToUpdate.schoolId = finalSchoolId;
    }

    /*
     * Store the complete validated date values.
     */
    if (
        updateData.registrationStart !== undefined ||
        updateData.registrationEnd !== undefined ||
        updateData.examStart !== undefined ||
        updateData.examEnd !== undefined
    ) {
        dataToUpdate.registrationStart =
            dates.registrationStartDate;

        dataToUpdate.registrationEnd =
            dates.registrationEndDate;

        dataToUpdate.examStart =
            dates.examStartDate;

        dataToUpdate.examEnd =
            dates.examEndDate;
    }

    if (updateData.resultVisibility !== undefined) {
        dataToUpdate.resultVisibility =
            updateData.resultVisibility;
    }

    if (
        updateData.resultDownloadEnabled !== undefined
    ) {
        dataToUpdate.resultDownloadEnabled =
            updateData.resultDownloadEnabled;
    }

    await programRef.update(dataToUpdate);

    const updatedDoc = await programRef.get();

    return {
        id: updatedDoc.id,
        ...updatedDoc.data()
    };
};

/**
 * Determine the current availability of a program.
 */
const getProgramAvailability = (program) => {
    const now = new Date();

    const registrationStart =
        toDate(program.registrationStart);

    const registrationEnd =
        toDate(program.registrationEnd);

    const examStart =
        toDate(program.examStart);

    const examEnd =
        toDate(program.examEnd);

    if (
        !registrationStart ||
        !registrationEnd ||
        !examStart ||
        !examEnd
    ) {
        return {
            status: "invalid",
            registrationOpen: false,
            examOpen: false
        };
    }

    if (now < registrationStart) {
        return {
            status: "upcoming",
            registrationOpen: false,
            examOpen: false
        };
    }

    if (
        now >= registrationStart &&
        now <= registrationEnd
    ) {
        return {
            status: "registration-open",
            registrationOpen: true,
            examOpen: false
        };
    }

    if (
        now >= examStart &&
        now <= examEnd
    ) {
        return {
            status: "ongoing",
            registrationOpen: false,
            examOpen: true
        };
    }

    if (now > examEnd) {
        return {
            status: "completed",
            registrationOpen: false,
            examOpen: false
        };
    }

    return {
        status: "registration-closed",
        registrationOpen: false,
        examOpen: false
    };
};

/**
 * Get programs currently open for registration.
 */
const getAvailableProgramsForRegistration = async () => {
    const snapshot = await programsCollection.get();

    const programs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    }));

    return programs
        .map((program) => ({
            ...program,
            ...getProgramAvailability(program)
        }))
        .filter((program) => program.registrationOpen);
};

/**
 * Determine whether results have been released
 * and whether students are allowed to download them.
 */
const getProgramResultAvailability = (program) => {
    const resultsReleased =
        program.resultVisibility === "visible";

    const downloadEnabled =
        resultsReleased &&
        program.resultDownloadEnabled === true;

    return {
        resultsReleased,
        downloadEnabled
    };
};

module.exports = {
    programsCollection,
    createProgram,
    getAllPrograms,
    getProgramById,
    updateProgram,
    getProgramAvailability,
    getAvailableProgramsForRegistration,
    getProgramResultAvailability
};