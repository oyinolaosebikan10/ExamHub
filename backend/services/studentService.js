const { db } = require("../firebase/firebaseAdmin");

const studentsCollection = db.collection("students");
const enrollmentsCollection = db.collection("enrollments");
const programsCollection = db.collection("programs");
const schoolsCollection = db.collection("schools");
const resultsCollection = db.collection("results");
const examsCollection = db.collection("exams");
const coursesCollection = db.collection("courses");

const getDateMillis = (value) => {
    if (value && typeof value.toDate === "function") {
        return value.toDate().getTime();
    }

    const date = value instanceof Date ? value : new Date(value || 0);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const getSafeStudentRecord = (doc) => {
    const data = doc.data();
    const isActive =
        typeof data.isActive === "boolean"
            ? data.isActive
            : data.status === "active"
                ? true
                : data.status === "inactive"
                    ? false
                    : null;

    return {
        id: doc.id,
        fullName: data.fullName || null,
        registrationNumber: data.registrationNumber || null,
        phoneNumber: data.phoneNumber || null,
        courseId: data.courseId || null,
        status: data.status || null,
        isActive,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null
    };
};

const getStudentAcademicAssociations = async (studentIds) => {
    const [enrollmentSnapshot, programsSnapshot, schoolsSnapshot] =
        await Promise.all([
            enrollmentsCollection.get(),
            programsCollection.get(),
            schoolsCollection.get()
        ]);

    const programs = new Map(
        programsSnapshot.docs.map((doc) => [
            doc.id,
            { id: doc.id, ...doc.data() }
        ])
    );
    const schools = new Map(
        schoolsSnapshot.docs.map((doc) => [
            doc.id,
            { id: doc.id, ...doc.data() }
        ])
    );
    const requestedIds = new Set(studentIds);
    const associations = new Map(
        studentIds.map((studentId) => [studentId, []])
    );

    enrollmentSnapshot.docs.forEach((doc) => {
        const enrollment = doc.data();

        if (!requestedIds.has(enrollment.studentId)) {
            return;
        }

        const program = programs.get(enrollment.programId);
        const schoolId =
            enrollment.schoolId ||
            (program?.venueType === "school"
                ? program.schoolId
                : null);
        const school = schoolId ? schools.get(schoolId) : null;
        const entries = associations.get(enrollment.studentId);

        entries.push({
            enrollmentId: doc.id,
            programId: program?.id || enrollment.programId || null,
            programName: program?.name || null,
            venueType: program?.venueType || null,
            schoolId: school?.id || schoolId || null,
            schoolName: school?.name || null,
            courseId: enrollment.courseId || null,
            enrollmentStatus: enrollment.status || null
        });
    });

    return associations;
};

const getAdminStudentDirectory = async ({
    search = "",
    status = "all",
    programId = "",
    schoolId = "",
    organization = "",
    studentId = "",
    page = 1,
    limit = 50,
    paginate = true
} = {}) => {
    const studentSnapshot = await studentsCollection.get();
    const studentDocs = studentSnapshot.docs;
    const allStudents = studentDocs.map(getSafeStudentRecord);
    const associations = await getStudentAcademicAssociations(
        studentDocs.map((doc) => doc.id)
    );
    const normalizedSearch = String(search).trim().toLocaleLowerCase();

    const matchingStudents = studentDocs
        .map((doc) => ({
            ...getSafeStudentRecord(doc),
            associations: associations.get(doc.id) || []
        }))
        .filter((student) => {
            if (studentId && student.id !== studentId) {
                return false;
            }

            const matchesSearch =
                !normalizedSearch ||
                [
                    student.fullName,
                    student.registrationNumber,
                    student.phoneNumber,
                    student.id
                ].some((value) =>
                    String(value || "")
                        .toLocaleLowerCase()
                        .includes(normalizedSearch)
                );
            const matchesStatus =
                status === "all" ||
                (status === "active" && student.isActive === true) ||
                (status === "inactive" && student.isActive === false);
            const matchesAssociations =
                !programId && !schoolId && !organization
                    ? true
                    : student.associations.some((association) =>
                        (!programId ||
                            association.programId === programId) &&
                        (!schoolId ||
                            association.schoolId === schoolId) &&
                        (!organization ||
                            (organization === "organization" &&
                                association.venueType === "organization"))
                    );

            return matchesSearch && matchesStatus && matchesAssociations;
        })
        .sort((left, right) =>
            getDateMillis(right.createdAt) -
            getDateMillis(left.createdAt)
        );

    const activeCount = allStudents.filter(
        (student) => student.isActive === true
    ).length;
    const inactiveCount = allStudents.filter(
        (student) => student.isActive === false
    ).length;
    const representedCourses = new Set(
        allStudents
            .map((student) => student.courseId)
            .filter(Boolean)
    ).size;
    const safeLimit = Math.min(
        100,
        Math.max(1, Number.parseInt(limit, 10) || 50)
    );
    const requestedPage = Math.max(
        1,
        Number.parseInt(page, 10) || 1
    );
    const total = matchingStudents.length;
    const totalPages = Math.ceil(total / safeLimit);
    const safePage = paginate
        ? Math.min(requestedPage, Math.max(totalPages, 1))
        : 1;
    const start = paginate ? (safePage - 1) * safeLimit : 0;
    const data = paginate
        ? matchingStudents.slice(start, start + safeLimit)
        : matchingStudents;

    return {
        data,
        count: total,
        summary: {
            total: allStudents.length,
            active: activeCount,
            inactive: inactiveCount,
            representedCourses
        },
        pagination: {
            page: safePage,
            limit: safeLimit,
            totalPages
        }
    };
};

const getAdminStudentDetails = async (studentId) => {
    const studentDoc = await studentsCollection.doc(studentId).get();

    if (!studentDoc.exists) {
        throw new Error("Student not found");
    }

    const student = getSafeStudentRecord(studentDoc);
    const [associations, resultSnapshot, courseDoc] = await Promise.all([
        getStudentAcademicAssociations([studentId]),
        resultsCollection
            .where("studentId", "==", studentId)
            .get(),
        student.courseId
            ? coursesCollection.doc(student.courseId).get()
            : Promise.resolve(null)
    ]);

    const examIds = [
        ...new Set(
            resultSnapshot.docs
                .map((doc) => doc.data().examId)
                .filter(Boolean)
        )
    ];
    const examDocs = await Promise.all(
        examIds.map((examId) =>
            examsCollection.doc(examId).get()
        )
    );
    const examNames = new Map(
        examDocs
            .filter((doc) => doc.exists)
            .map((doc) => [
                doc.id,
                doc.data().title || null
            ])
    );

    const resultRecords = resultSnapshot.docs
        .map((doc) => {
            const result = doc.data();
            return {
                id: doc.id,
                examId: result.examId || null,
                examName: examNames.get(result.examId) || null,
                courseId: result.courseId || null,
                enrollmentId: result.enrollmentId || null,
                score: result.score ?? null,
                totalMarks: result.totalMarks ?? null,
                percentage: result.percentage ?? null,
                attemptNumber: result.attemptNumber || 1,
                isRetake: result.isRetake === true,
                submittedAt: result.submittedAt || null
            };
        })
        .sort((left, right) =>
            getDateMillis(right.submittedAt) -
            getDateMillis(left.submittedAt)
        );

    return {
        ...student,
        courseName:
            courseDoc?.exists
                ? courseDoc.data().name || null
                : null,
        associations: associations.get(studentId) || [],
        results: resultRecords
    };
};


// =========================================================
// GENERATE REGISTRATION NUMBER
// =========================================================

const generateRegistrationNumber = async (
    fullName,
    courseCode
) => {

    const nameParts =
        fullName.trim().split(/\s+/);

    const firstInitial =
        nameParts[0][0].toUpperCase();

    const lastInitial =
        nameParts[nameParts.length - 1][0].toUpperCase();

    while (true) {

        const randomNumber =
            Math.floor(
                1000 + Math.random() * 9000
            );

        const registrationNumber =
            `${firstInitial}${lastInitial}/${courseCode}/${randomNumber}`;

        const existingStudent =
            await studentsCollection
                .where(
                    "registrationNumber",
                    "==",
                    registrationNumber
                )
                .limit(1)
                .get();

        if (existingStudent.empty) {
            return registrationNumber;
        }
    }
};


// =========================================================
// UPDATE STUDENT STATUS
// =========================================================

const updateStudentStatus = async (
    studentId,
    isActive
) => {

    const studentRef =
        studentsCollection.doc(studentId);

    const studentDoc =
        await studentRef.get();

    if (!studentDoc.exists) {
        throw new Error("Student not found");
    }

    if (typeof isActive !== "boolean") {
        throw new Error(
            "isActive must be true or false"
        );
    }

    await studentRef.update({

        isActive,

        status:
            isActive
                ? "active"
                : "inactive",

        updatedAt:
            new Date()

    });

    const updatedDoc =
        await studentRef.get();

    return getSafeStudentRecord(updatedDoc);
};


// =========================================================
// GET STUDENT PROFILE
// =========================================================

const getStudentProfile = async (
    userId
) => {

    const snapshot =
        await studentsCollection
            .where(
                "userId",
                "==",
                userId
            )
            .limit(1)
            .get();


    if (snapshot.empty) {

        throw new Error(
            "Student not found"
        );
    }


    const studentDoc =
        snapshot.docs[0];

    const student =
        studentDoc.data();


    /*
     * Only return information that is
     * appropriate for the student's profile.
     *
     * Sensitive fields such as passwordHash
     * are intentionally excluded.
     */

    return {

        studentId:
            studentDoc.id,

        fullName:
            student.fullName || null,

        registrationNumber:
            student.registrationNumber || null,

        phoneNumber:
            student.phoneNumber || null,

        courseId:
            student.courseId || null,

        status:
            student.status || null,

        isActive:
            student.isActive !== false,

        createdAt:
            student.createdAt || null,

        updatedAt:
            student.updatedAt || null
    };
};


module.exports = {

    studentsCollection,

    generateRegistrationNumber,

    updateStudentStatus,

    getStudentProfile,
    getAdminStudentDirectory,
    getAdminStudentDetails

};