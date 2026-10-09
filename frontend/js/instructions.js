const instructionsLoading = document.getElementById("instructionsLoading");
const instructionsContent = document.getElementById("instructionsContent");
const instructionsError = document.getElementById("instructionsError");

const examTitle = document.getElementById("examTitle");
const examDuration = document.getElementById("examDuration");
const examQuestionCount = document.getElementById("examQuestionCount");

const confirmInstructions = document.getElementById("confirmInstructions");
const startExamButton = document.getElementById("startExamButton");

const token = localStorage.getItem("examhub_token");
const pendingExam = sessionStorage.getItem("examhub_pending_exam");

if (!token || !pendingExam) {
    window.location.href = "./dashboard.html";
}

let exam = null;

function showError(message) {
    instructionsError.textContent = message;
    instructionsError.classList.remove("hidden");
}

function loadExam() {
    try {
        exam = JSON.parse(pendingExam);

        if (!exam?.id) {
            throw new Error("Invalid examination information.");
        }

        examTitle.textContent = exam.title || "Examination";
        examDuration.textContent = `${exam.durationMinutes} minutes`;
        examQuestionCount.textContent = exam.questionCount;

        instructionsLoading.classList.add("hidden");
        instructionsContent.classList.remove("hidden");

    } catch (error) {
        instructionsLoading.classList.add("hidden");
        showError("Unable to load the examination information.");
    }
}

confirmInstructions.addEventListener("change", () => {
    startExamButton.disabled = !confirmInstructions.checked;
});

startExamButton.addEventListener("click", async () => {
    if (!exam || !confirmInstructions.checked) {
        return;
    }

    startExamButton.disabled = true;
    startExamButton.innerHTML = `
        <span class="spinner"></span>
        Starting...
    `;

    try {
        const response = await apiPost("/exam-sessions", {
            examId: exam.id
        });

        const session = response?.data;

        if (!session?.sessionId) {
            throw new Error("Invalid examination session response.");
        }

        sessionStorage.setItem(
    "examhub_exam_session",
    JSON.stringify({
        ...session,
        examTitle: exam.title
    })
);

        sessionStorage.removeItem("examhub_pending_exam");

        window.location.href = "./exam.html";

    } catch (error) {
        console.error("Start exam error:", error);

        showError(
            error.data?.message ||
            "Unable to start the examination. Please try again."
        );

        startExamButton.disabled = false;
        startExamButton.textContent = "Start examination";
    }
});

loadExam();