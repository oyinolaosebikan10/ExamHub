require("dotenv").config();

const {
    createAdminUser
} = require("../services/authService");

const seedAdmin = async () => {
    try {
        const admin = await createAdminUser({
            fullName: process.env.ADMIN_NAME,
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD
        });

        console.log("Admin created successfully:");
        console.log(admin);

        process.exit(0);

    } catch (error) {
        console.error("Error creating admin:", error);
        process.exit(1);
    }
};

seedAdmin();