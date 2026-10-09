const loginForm = document.getElementById("loginForm");
const loginIdentifier = document.getElementById("loginIdentifier");
const loginPassword = document.getElementById("loginPassword");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");
const togglePassword = document.getElementById("togglePassword");


// =========================================================
// PASSWORD VISIBILITY
// =========================================================

togglePassword.addEventListener("click", () => {
    const isPassword = loginPassword.type === "password";

    loginPassword.type = isPassword ? "text" : "password";
    togglePassword.textContent = isPassword ? "Hide" : "Show";
});


// =========================================================
// ERROR HANDLING
// =========================================================

function showLoginError(message) {
    loginError.textContent = message;
    loginError.classList.remove("hidden");
}

function hideLoginError() {
    loginError.textContent = "";
    loginError.classList.add("hidden");
}


// =========================================================
// LOADING STATE
// =========================================================

function setLoginLoading(loading) {
    loginButton.disabled = loading;

    if (loading) {
        loginButton.innerHTML = `
            <span class="spinner"></span>
            Signing in...
        `;
    } else {
        loginButton.textContent = "Sign in";
    }
}


// =========================================================
// SAVE AUTHENTICATION
// =========================================================

function saveAuthentication(data) {
    const result = data?.data;

    if (!result?.token || !result?.user) {
        throw new Error("Invalid login response from the server.");
    }

    localStorage.setItem("examhub_token", result.token);
    localStorage.setItem(
        "examhub_user",
        JSON.stringify(result.user)
    );

    return result.user;
}


// =========================================================
// REDIRECT
// =========================================================

function redirectAfterLogin(user) {

    if (user.role === "admin") {
        window.location.href = "./admin/dashboard.html";
        return;
    }

    window.location.href = "./student/dashboard.html";
}


// =========================================================
// LOGIN
// =========================================================

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    hideLoginError();

    const registrationNumber =
        loginIdentifier.value.trim().toUpperCase();

    const password =
        loginPassword.value;

    if (!registrationNumber || !password) {
        showLoginError("Please enter your registration number and password.");
        return;
    }

    setLoginLoading(true);

    try {

        const response = await apiPost(
            "/auth/student/login",
            {
                registrationNumber,
                password
            }
        );

        const user = saveAuthentication(response);

        redirectAfterLogin(user);

    } catch (error) {

        if (error.status === 401) {
            showLoginError(
                "Invalid registration number or password."
            );
        } else if (error.status === 403) {
            showLoginError(
                error.data?.message ||
                "Your account is currently inactive."
            );
        } else {
            showLoginError(
                error.data?.message ||
                "Unable to sign in right now. Please try again."
            );
        }

    } finally {

        setLoginLoading(false);

    }

});