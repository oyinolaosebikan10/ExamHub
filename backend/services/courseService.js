const { db } = require("../firebase/firebaseAdmin");

const coursesCollection = db.collection("courses");

const createCourse = async (courseData) => {
    const { name, code, slug, description } = courseData;

    const courseRef = coursesCollection.doc(slug);

    const existingCourse = await courseRef.get();

    if (existingCourse.exists) {
        throw new Error("Course already exists");
    }

    const course = {
        name,
        code,
        slug,
        description,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    await courseRef.set(course);

    return {
        id: courseRef.id,
        ...course
    };
};

const getAllCourses = async () => {
    const snapshot = await coursesCollection
        .where("isActive", "==", true)
        .get();

    const courses = [];

    snapshot.forEach((doc) => {
        courses.push({
            id: doc.id,
            ...doc.data()
        });
    });

    return courses;
};

/*
|--------------------------------------------------------------------------
| Public course list
|--------------------------------------------------------------------------
| Used by student registration.
| Only safe course information is returned.
|--------------------------------------------------------------------------
*/

const getAvailableCourses = async () => {
    const snapshot = await coursesCollection
        .where("isActive", "==", true)
        .get();

    return snapshot.docs.map((doc) => {
        const course = doc.data();

        return {
            id: doc.id,
            name: course.name,
            code: course.code,
            slug: course.slug,
            description: course.description
        };
    });
};

const getCourseById = async (courseId) => {
    if (!courseId) {
        throw new Error("Course ID is required");
    }

    const courseDoc = await coursesCollection
        .doc(courseId)
        .get();

    if (!courseDoc.exists) {
        throw new Error("Course not found");
    }

    return {
        id: courseDoc.id,
        ...courseDoc.data()
    };
};

module.exports = {
    createCourse,
    getAllCourses,
    getAvailableCourses,
    getCourseById
};