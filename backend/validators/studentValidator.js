const validateStudentRegistration = (data) => {
    const errors = {};

    const { fullName, phoneNumber, courseId, password, confirmPassword } = data;

    // Full name
    if (!fullName || !fullName.trim()) {
        errors.fullName = "Full name is required";
    } else {
        const nameParts = fullName.trim().split(/\s+/);

        if (nameParts.length < 2) {
            errors.fullName = "Please enter your first name and last name";
        }
    }

    // Phone number
    if (!phoneNumber || !phoneNumber.trim()) {
        errors.phoneNumber = "Phone number is required";
    } else {
        const cleanedPhone = phoneNumber.replace(/[\s()-]/g, "");

        const nigerianPhoneRegex = /^(?:\+234|0)(?:70|80|81|90|91)\d{8}$/;

        if (!nigerianPhoneRegex.test(cleanedPhone)) {
            errors.phoneNumber = "Please enter a valid Nigerian phone number";
        }
    }

    // Course
    if (!courseId || !courseId.trim()) {
        errors.courseId = "Course is required";
    }

    // Password
    if (!password) {
        errors.password = "Password is required";
    } else if (password.length < 6) {
        errors.password = "Password must be at least 6 characters";
    }

    // Confirm password
    if (!confirmPassword) {
        errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

module.exports = {
    validateStudentRegistration
};