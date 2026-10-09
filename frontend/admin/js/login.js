const API_BASE_URL =
    "https://examhub-cytw.onrender.com/api";

const ADMIN_TOKEN_KEY = "examhub_admin_token";
const ADMIN_USER_KEY = "examhub_admin_user";

const form = document.getElementById("adminLoginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginButton = document.getElementById("loginButton");
const loginButtonText = document.getElementById("loginButtonText");
const loginSpinner = document.getElementById("loginSpinner");

const loginError = document.getElementById("loginError");
const togglePassword = document.getElementById("togglePassword");


/*
|--------------------------------------------------------------------------
| If already logged in, go to dashboard
|--------------------------------------------------------------------------
*/

const existingToken = localStorage.getItem(ADMIN_TOKEN_KEY);

if (existingToken) {
    window.location.href = "./dashboard.html";
}


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const showError = (message) => {
    loginError.textContent = message;
    loginError.hidden = false;
};

const hideError = () => {
    loginError.textContent = "";
    loginError.hidden = true;
};

const setLoading = (loading) => {
    loginButton.disabled = loading;

    loginButtonText.hidden = loading;
    loginSpinner.hidden = !loading;
};


/*
|--------------------------------------------------------------------------
| Toggle password visibility
|--------------------------------------------------------------------------
*/

togglePassword.addEventListener("click", () => {
    const isPassword =
        passwordInput.type === "password";

    passwordInput.type =
        isPassword ? "text" : "password";

    togglePassword.textContent =
        isPassword ? "Hide" : "Show";

    togglePassword.setAttribute(
        "aria-label",
        isPassword
            ? "Hide password"
            : "Show password"
    );
});


/*
|--------------------------------------------------------------------------
| Admin login
|--------------------------------------------------------------------------
*/

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    hideError();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email) {
        showError("Please enter your email address.");
        emailInput.focus();
        return;
    }

    if (!password) {
        showError("Please enter your password.");
        passwordInput.focus();
        return;
    }

    setLoading(true);

    try {
        const response = await fetch(
            `${API_BASE_URL}/auth/admin/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        let result = null;

        try {
            result = await response.json();
        } catch {
            result = null;
        }

        if (!response.ok) {
            throw new Error(
                result?.message ||
                "Unable to sign in. Please check your credentials."
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Support the existing API response structure
        |--------------------------------------------------------------------------
        */

        const data = result?.data || result || {};

        const token =
            data.token ||
            data.accessToken ||
            result?.token;

        const user =
            data.user ||
            data.admin ||
            {
                role: "admin",
                email
            };

        if (!token) {
            throw new Error(
                "Login succeeded, but no authentication token was returned."
            );
        }

        if (
            user.role &&
            user.role !== "admin"
        ) {
            throw new Error(
                "This account does not have administrator access."
            );
        }

        localStorage.setItem(
            ADMIN_TOKEN_KEY,
            token
        );

        localStorage.setItem(
            ADMIN_USER_KEY,
            JSON.stringify(user)
        );

        window.location.href =
            "./dashboard.html";

    } catch (error) {
        console.error("Admin login error:", error);

        showError(
            error.message ||
            "Something went wrong while signing in."
        );

    } finally {
        setLoading(false);
    }
});