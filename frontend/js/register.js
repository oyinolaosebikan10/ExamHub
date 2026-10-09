const registerForm = document.getElementById("registerForm");

const fullNameInput = document.getElementById("fullName");
const phoneInput = document.getElementById("phoneNumber");
const programSelect = document.getElementById("programId");
const courseSelect = document.getElementById("courseId");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

const registerButton = document.getElementById("registerButton");

const formMessage = document.getElementById("formMessage");

const successModal = document.getElementById("successModal");
const registrationNumberElement =
    document.getElementById("registrationNumber");
const copyRegistrationNumberButton =
    document.getElementById("copyRegistrationNumberButton");
const registrationCopyFeedback =
    document.getElementById("registrationCopyFeedback");
const registrationNumberAcknowledged =
    document.getElementById("registrationNumberAcknowledged");
const continueToLoginButton =
    document.getElementById("continueToLoginButton");

let programs = [];
let courses = [];

copyRegistrationNumberButton.addEventListener(
    "click",
    async () => {
        const registrationNumber =
            registrationNumberElement.textContent.trim();

        if (!registrationNumber || registrationNumber === "—") {
            registrationCopyFeedback.textContent =
                "Select and copy your registration number above.";
            registrationCopyFeedback.classList.add("is-error");
            return;
        }

        if (!navigator.clipboard?.writeText) {
            registrationCopyFeedback.textContent =
                "Copy isn't available here. Select and copy your registration number above.";
            registrationCopyFeedback.classList.add("is-error");
            return;
        }

        try {
            await navigator.clipboard.writeText(registrationNumber);
            registrationCopyFeedback.textContent = "Copied!";
            registrationCopyFeedback.classList.remove("is-error");
        } catch (error) {
            console.error(
                "Unable to copy registration number:",
                error
            );

            registrationCopyFeedback.textContent =
                "Copy wasn't available. Select and copy your registration number above.";
            registrationCopyFeedback.classList.add("is-error");
        }
    }
);

registrationNumberAcknowledged.addEventListener(
    "change",
    () => {
        continueToLoginButton.disabled =
            !registrationNumberAcknowledged.checked;
    }
);

continueToLoginButton.addEventListener(
    "click",
    () => {
        if (!registrationNumberAcknowledged.checked) {
            return;
        }

        window.location.href = "./login.html";
    }
);


/* =========================================
   INITIALIZE
========================================= */

document.addEventListener("DOMContentLoaded", async () => {
    setupPasswordToggles();

    await Promise.all([
        loadPrograms(),
        loadCourses()
    ]);
});


/* =========================================
   LOAD PROGRAMS
========================================= */

async function loadPrograms() {
    programSelect.disabled = true;

    programSelect.innerHTML = `
        <option value="">
            Loading programs...
        </option>
    `;

    try {

        const response =
            await apiGet("/programs/available/registration");

        programs = Array.isArray(response.data)
            ? response.data
            : [];

        if (programs.length === 0) {

            programSelect.innerHTML = `
                <option value="">
                    No programs currently available
                </option>
            `;

            return;
        }

        programSelect.innerHTML = `
            <option value="">
                Select an examination program
            </option>
        `;

        programs.forEach((program) => {

            const option =
                document.createElement("option");

            const programId =
                program.id ||
                program.programId;

            option.value = programId;

            option.textContent =
                program.name ||
                "Unnamed program";

            programSelect.appendChild(option);
        });

        programSelect.disabled = false;

    } catch (error) {

        console.error(
            "Unable to load programs:",
            error
        );

        programSelect.innerHTML = `
            <option value="">
                Unable to load programs
            </option>
        `;

        showFormMessage(
            "Unable to load available programs. Please refresh the page and try again.",
            "error"
        );
    }
}


/* =========================================
   LOAD COURSES
========================================= */

async function loadCourses() {

    courseSelect.disabled = true;

    courseSelect.innerHTML = `
        <option value="">
            Loading courses...
        </option>
    `;

    try {

        const response =
            await apiGet("/courses/available");

        courses = Array.isArray(response.data)
            ? response.data
            : [];

        const activeCourses =
            courses.filter((course) =>
                course.isActive !== false
            );

        if (activeCourses.length === 0) {

            courseSelect.innerHTML = `
                <option value="">
                    No courses currently available
                </option>
            `;

            return;
        }

        courseSelect.innerHTML = `
            <option value="">
                Select a course
            </option>
        `;

        activeCourses.forEach((course) => {

            const option =
                document.createElement("option");

            const courseId =
                course.id ||
                course.courseId;

            option.value = courseId;

            option.textContent =
                course.name ||
                course.title ||
                course.code ||
                "Unnamed course";

            courseSelect.appendChild(option);
        });

        courseSelect.disabled = false;

    } catch (error) {

        console.error(
            "Unable to load courses:",
            error
        );

        courseSelect.innerHTML = `
            <option value="">
                Unable to load courses
            </option>
        `;

        showFormMessage(
            "Unable to load courses. Please refresh the page and try again.",
            "error"
        );
    }
}


/* =========================================
   PASSWORD TOGGLES
========================================= */

function setupPasswordToggles() {

    const toggleButtons =
        document.querySelectorAll(".password-toggle");

    toggleButtons.forEach((button) => {

        button.addEventListener("click", () => {

            const targetId =
                button.dataset.target;

            const input =
                document.getElementById(targetId);

            if (!input) return;

            if (input.type === "password") {

                input.type = "text";
                button.textContent = "Hide";

            } else {

                input.type = "password";
                button.textContent = "Show";
            }
        });
    });
}


/* =========================================
   FORM SUBMISSION
========================================= */

registerForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        clearErrors();
        hideFormMessage();

        const formData = {
            fullName: fullNameInput.value.trim(),
            phoneNumber: phoneInput.value.trim(),
            programId: programSelect.value,
            courseId: courseSelect.value,
            password: passwordInput.value,
            confirmPassword: confirmPasswordInput.value
        };

        const isValid =
            validateForm(formData);

        if (!isValid) {
            return;
        }

        setSubmitting(true);

        try {

            const response =
                await apiPost(
                    "/auth/student/register",
                    formData
                );

            const registrationNumber =
                response?.data?.registrationNumber;

            if (!registrationNumber) {

                showFormMessage(
                    "Registration completed, but your registration number could not be displayed. Please contact the administrator.",
                    "error"
                );

                return;
            }

            registrationNumberElement.textContent =
                registrationNumber;

            registrationNumberAcknowledged.checked = false;
            continueToLoginButton.disabled = true;
            registrationCopyFeedback.textContent = "";
            registrationCopyFeedback.classList.remove("is-error");

            successModal.classList.remove("show");
            successModal.classList.add("active");
            successModal.setAttribute(
                "aria-hidden",
                "false"
            );

            registerForm.reset();

        } catch (error) {

            console.error(
                "Registration error:",
                error
            );

            handleRegistrationError(error);

        } finally {

            setSubmitting(false);
        }
    }
);


/* =========================================
   VALIDATION
========================================= */

function validateForm(data) {

    let valid = true;

    if (!data.fullName) {

        setFieldError(
            "fullName",
            "Please enter your full name."
        );

        valid = false;

    } else if (
        data.fullName.trim().split(/\s+/).length < 2
    ) {

        setFieldError(
            "fullName",
            "Please enter your first name and last name."
        );

        valid = false;
    }


    if (!data.phoneNumber) {

        setFieldError(
            "phoneNumber",
            "Phone number is required."
        );

        valid = false;
    }


    if (!data.programId) {

        setFieldError(
            "programId",
            "Please select an examination program."
        );

        valid = false;
    }


    if (!data.courseId) {

        setFieldError(
            "courseId",
            "Please select a course."
        );

        valid = false;
    }


    if (!data.password) {

        setFieldError(
            "password",
            "Password is required."
        );

        valid = false;

    } else if (data.password.length < 6) {

        setFieldError(
            "password",
            "Password must be at least 6 characters."
        );

        valid = false;
    }


    if (!data.confirmPassword) {

        setFieldError(
            "confirmPassword",
            "Please confirm your password."
        );

        valid = false;

    } else if (
        data.password !== data.confirmPassword
    ) {

        setFieldError(
            "confirmPassword",
            "Passwords do not match."
        );

        valid = false;
    }


    return valid;
}


/* =========================================
   BACKEND ERRORS
========================================= */

function handleRegistrationError(error) {

    const data = error?.data;

    if (
        data?.errors &&
        typeof data.errors === "object"
    ) {

        Object.entries(data.errors)
            .forEach(([field, message]) => {

                setFieldError(
                    field,
                    message
                );
            });

        showFormMessage(
            "Please correct the highlighted fields.",
            "error"
        );

        return;
    }


    if (error?.status === 409) {

        showFormMessage(
            data?.message ||
            "A student with these registration details already exists for this program and course.",
            "error"
        );

        return;
    }


    showFormMessage(
        data?.message ||
        "Unable to complete registration. Please try again.",
        "error"
    );
}


/* =========================================
   FIELD ERRORS
========================================= */

function setFieldError(field, message) {

    const input =
        document.getElementById(field);

    const errorElement =
        document.getElementById(
            `${field}Error`
        );

    if (input) {
        input.classList.add("field-invalid");
    }

    if (errorElement) {
        errorElement.textContent = message;
    }
}


function clearErrors() {

    const invalidFields =
        document.querySelectorAll(
            ".field-invalid"
        );

    invalidFields.forEach((field) => {
        field.classList.remove(
            "field-invalid"
        );
    });

    const errors =
        document.querySelectorAll(
            ".field-error"
        );

    errors.forEach((error) => {
        error.textContent = "";
    });
}


/* =========================================
   FORM MESSAGE
========================================= */

function showFormMessage(
    message,
    type = "error"
) {

    formMessage.textContent = message;

    formMessage.className =
        `form-message show ${type}`;
}


function hideFormMessage() {

    formMessage.textContent = "";

    formMessage.className =
        "form-message";
}


/* =========================================
   SUBMITTING STATE
========================================= */

function setSubmitting(isSubmitting) {

    registerButton.disabled =
        isSubmitting;

    if (isSubmitting) {

        registerButton.textContent =
            "Creating account...";

    } else {

        registerButton.textContent =
            "Create account";
    }
}