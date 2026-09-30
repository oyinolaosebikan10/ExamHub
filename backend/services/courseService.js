const { db } = require("../firebase/firebaseAdmin");

const coursesCollection = db.collection("courses");

/*
|--------------------------------------------------------------------------
| Create course
|--------------------------------------------------------------------------
*/

const createCourse = async (courseData) => {
    const { name, code, slug, description } = courseData;

    if (!name || !code || !slug) {
        throw new Error("Course name, code, and slug are required");
    }

    const courseRef = coursesCollection.doc(slug);

    const existingCourse = await courseRef.get();

    if (existingCourse.exists) {
        throw new Error("Course already exists");
    }

    const course = {
        name,
        code,
        slug,
        description: description || "",
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


/*
|--------------------------------------------------------------------------
| Get all courses
|--------------------------------------------------------------------------
| Admin only.
| Returns both active and inactive courses.
|--------------------------------------------------------------------------
*/

const getAllCourses = async () => {
    const snapshot = await coursesCollection.get();

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
| Get available courses
|--------------------------------------------------------------------------
| Public endpoint.
| Only active courses are returned.
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


/*
|--------------------------------------------------------------------------
| Get course by ID
|--------------------------------------------------------------------------
*/

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


/*
|--------------------------------------------------------------------------
| Update course
|--------------------------------------------------------------------------
*/

const updateCourse = async (courseId, courseData) => {
    if (!courseId) {
        throw new Error("Course ID is required");
    }

    const courseRef = coursesCollection.doc(courseId);

    const existingCourse = await courseRef.get();

    if (!existingCourse.exists) {
        throw new Error("Course not found");
    }

    const { name, code, description } = courseData;

    if (!name || !code) {
        throw new Error("Course name and code are required");
    }

    const updates = {
        name,
        code,
        description: description || "",
        updatedAt: new Date()
    };

    await courseRef.update(updates);

    return {
        id: courseId,
        ...existingCourse.data(),
        ...updates
    };
};


/*
|--------------------------------------------------------------------------
| Deactivate course
|--------------------------------------------------------------------------
*/

const deactivateCourse = async (courseId) => {
    if (!courseId) {
        throw new Error("Course ID is required");
    }

    const courseRef = coursesCollection.doc(courseId);

    const existingCourse = await courseRef.get();

    if (!existingCourse.exists) {
        throw new Error("Course not found");
    }

    await courseRef.update({
        isActive: false,
        updatedAt: new Date()
    });

    return {
        id: courseId,
        ...existingCourse.data(),
        isActive: false,
        updatedAt: new Date()
    };
};


/*
|--------------------------------------------------------------------------
| Reactivate course
|--------------------------------------------------------------------------
*/

const activateCourse = async (courseId) => {
    if (!courseId) {
        throw new Error("Course ID is required");
    }

    const courseRef = coursesCollection.doc(courseId);

    const existingCourse = await courseRef.get();

    if (!existingCourse.exists) {
        throw new Error("Course not found");
    }

    await courseRef.update({
        isActive: true,
        updatedAt: new Date()
    });

    return {
        id: courseId,
        ...existingCourse.data(),
        isActive: true,
        updatedAt: new Date()
    };
};


/*
|--------------------------------------------------------------------------
| Delete course
|--------------------------------------------------------------------------
| Permanent deletion.
|--------------------------------------------------------------------------
*/

const deleteCourse = async (courseId) => {
    if (!courseId) {
        throw new Error("Course ID is required");
    }

    const courseRef = coursesCollection.doc(courseId);

    const existingCourse = await courseRef.get();

    if (!existingCourse.exists) {
        throw new Error("Course not found");
    }

    await courseRef.delete();

    return {
        id: courseId,
        message: "Course deleted successfully"
    };
};


module.exports = {
    createCourse,
    getAllCourses,
    getAvailableCourses,
    getCourseById,
    updateCourse,
    deactivateCourse,
    activateCourse,
    deleteCourse
};