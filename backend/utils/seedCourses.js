const { db } = require("../firebase/firebaseAdmin");

const courses = [
    {
        name: "Web Design & Coding",
        code: "WD",
        slug: "web-design",
        description: "Web design and coding examination",
        isActive: true
    },
    {
        name: "Robotics",
        code: "RO",
        slug: "robotics",
        description: "Robotics examination",
        isActive: true
    },
    {
        name: "Graphic Design",
        code: "GD",
        slug: "graphic-design",
        description: "Graphic design examination",
        isActive: true
    },
    {
        name: "Video Editing",
        code: "VE",
        slug: "video-editing",
        description: "Video editing examination",
        isActive: true
    }
];

const seedCourses = async () => {
    try {
        const batch = db.batch();

        courses.forEach((course) => {
            const courseRef = db.collection("courses").doc(course.slug);

            batch.set(courseRef, {
                ...course,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        });

        await batch.commit();

        console.log("Courses seeded successfully.");

    } catch (error) {
        console.error("Error seeding courses:", error);
    }
};

seedCourses();