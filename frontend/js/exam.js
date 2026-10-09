const sessionData = sessionStorage.getItem("examhub_exam_session");

if (!localStorage.getItem("examhub_token") || !sessionData) {
    window.location.href = "./dashboard.html";
}

let examSession;

try {
    examSession = JSON.parse(sessionData);
} catch {
    window.location.href = "./dashboard.html";
}

const questions = examSession.questions || [];
const answers = {};
let currentQuestionIndex = 0;
let submitting = false;
let saveTimeout = null;

const examTitle = document.getElementById("examTitle");
const examTimer = document.getElementById("examTimer");

const questionNumber = document.getElementById("questionNumber");
const questionTotal = document.getElementById("questionTotal");
const questionText = document.getElementById("questionText");
const optionsContainer = document.getElementById("optionsContainer");

const previousButton = document.getElementById("previousButton");
const nextButton = document.getElementById("nextButton");

const questionNavigator = document.getElementById("questionNavigator");
const answeredCount = document.getElementById("answeredCount");
const saveStatus = document.getElementById("saveStatus");

const submitExamButton = document.getElementById("submitExamButton");

const submitModal = document.getElementById("submitModal");
const cancelSubmitButton = document.getElementById("cancelSubmitButton");
const confirmSubmitButton = document.getElementById("confirmSubmitButton");

examTitle.textContent = examSession.examTitle || "Examination";
questionTotal.textContent = `of ${questions.length}`;

function getQuestionId(question) {
    return question.id || question.questionId;
}

function getQuestionText(question) {
    return question.question || question.questionText || question.text || "Question";
}

function getOptions(question) {
    const optionKeys = ["A", "B", "C", "D"];

    if (
        question.options &&
        typeof question.options === "object" &&
        !Array.isArray(question.options)
    ) {
        return optionKeys
            .filter((key) => typeof question.options[key] === "string")
            .map((key) => ({
                key,
                text: question.options[key]
            }));
    }

    if (Array.isArray(question.options)) {
        return question.options.map((option, index) => ({
            key: optionKeys[index],
            text:
                typeof option === "string"
                    ? option
                    : option.value || option.text || option.label
        })).filter((option) => option.key && typeof option.text === "string");
    }

    return [];
}

function renderQuestionNavigator() {
    questionNavigator.innerHTML = "";

    questions.forEach((question, index) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "question-number";
        button.textContent = index + 1;

        const id = getQuestionId(question);

        if (index === currentQuestionIndex) {
            button.classList.add("current");
        }

        if (answers[id] !== undefined) {
            button.classList.add("answered");
        }

        button.addEventListener("click", () => {
            currentQuestionIndex = index;
            renderQuestion();
        });

        questionNavigator.appendChild(button);
    });

    const answered = Object.keys(answers).length;
    answeredCount.textContent = `${answered}/${questions.length}`;
}

function renderQuestion() {
    const question = questions[currentQuestionIndex];

    if (!question) {
        return;
    }

    const id = getQuestionId(question);
    const options = getOptions(question);

    questionNumber.textContent = currentQuestionIndex + 1;
    questionText.textContent = getQuestionText(question);

    optionsContainer.innerHTML = "";

    options.forEach((option, index) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "option";

        const marker = document.createElement("span");
        marker.className = "option-marker";
        marker.textContent = option.key;

        const text = document.createElement("span");
        text.className = "option-text";
        text.textContent = option.text;

        button.appendChild(marker);
        button.appendChild(text);

        if (answers[id] === option.key) {
            button.classList.add("selected");
        }

        button.addEventListener("click", () => {
            answers[id] = option.key;

            renderQuestion();
            saveAnswers();
        });

        optionsContainer.appendChild(button);
    });

    previousButton.disabled = currentQuestionIndex === 0;

    nextButton.textContent =
        currentQuestionIndex === questions.length - 1
            ? "Review →"
            : "Next →";

    renderQuestionNavigator();
}

async function saveAnswers() {
    if (submitting) {
        return;
    }

    saveStatus.textContent = "Saving...";
    saveStatus.style.color = "";

    clearTimeout(saveTimeout);

    saveTimeout = setTimeout(async () => {
        try {
            await apiPatch(
                `/exam-sessions/${examSession.sessionId}/answers`,
                { answers }
            );

            saveStatus.textContent = "Saved";
        } catch (error) {
            console.error("Save answers error:", error);

            saveStatus.textContent = "Not saved";

            if (error.status === 401) {
                window.location.href = "../login.html";
            }
        }
    }, 300);
}

previousButton.addEventListener("click", () => {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
    }
});

nextButton.addEventListener("click", () => {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    }
});

function openSubmitModal() {
    submitModal.classList.remove("hidden");
}

function closeSubmitModal() {
    submitModal.classList.add("hidden");
}

submitExamButton.addEventListener("click", openSubmitModal);
cancelSubmitButton.addEventListener("click", closeSubmitModal);

async function submitExam(autoSubmitted = false) {
    if (submitting) {
        return;
    }

    clearTimeout(saveTimeout);

    submitting = true;

    confirmSubmitButton.disabled = true;
    submitExamButton.disabled = true;

    try {
        const response = await apiPost(
            `/exam-sessions/${examSession.sessionId}/submit`,
            {
                answers
            }
        );

        sessionStorage.setItem(
            "examhub_exam_result",
            JSON.stringify({
                sessionId:
                    response.data?.sessionId || examSession.sessionId,
                status:
                    response.data?.status || "submitted",
                submittedAt:
                    response.data?.submittedAt || null,
                autoSubmitted:
                    response.data?.autoSubmitted ?? autoSubmitted,
                submissionConfirmation: true
            })
        );

        sessionStorage.removeItem("examhub_exam_session");
        sessionStorage.removeItem("examhub_pending_exam");

        window.location.href = "./result.html";

    } catch (error) {
        console.error("Submit exam error:", error);

        /*
         * If the backend says the exam has already been submitted,
         * don't allow the student to keep interacting with it.
         */
        if (
            error.data?.message ===
            "This exam has already been submitted"
        ) {
            sessionStorage.setItem(
                "examhub_exam_result",
                JSON.stringify({
                    sessionId: examSession.sessionId,
                    status: "submitted",
                    autoSubmitted: null,
                    submissionConfirmation: true
                })
            );

            sessionStorage.removeItem("examhub_exam_session");
            sessionStorage.removeItem("examhub_pending_exam");

            window.location.href = "./result.html";
            return;
        }

        submitting = false;

        confirmSubmitButton.disabled = false;
        submitExamButton.disabled = false;

        closeSubmitModal();

        alert(
            error.data?.message ||
            "Unable to submit your examination. Please try again."
        );
    }
}

confirmSubmitButton.addEventListener("click", () => {
    submitExam(false);
});

let timerInterval;

function startTimer() {
    const expiresAt = new Date(examSession.expiresAt).getTime();

    function updateTimer() {
        const remaining = Math.max(
            0,
            expiresAt - Date.now()
        );

        const totalSeconds = Math.floor(remaining / 1000);

        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        examTimer.textContent =
            `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

        if (remaining <= 0) {
            clearInterval(timerInterval);
            submitExam(true);
        }
    }

    updateTimer();

    timerInterval = setInterval(updateTimer, 1000);
}

window.addEventListener("beforeunload", (event) => {
    if (!submitting) {
        event.preventDefault();
        event.returnValue = "";
    }
});

if (questions.length === 0) {
    alert("No examination questions were provided.");
    window.location.href = "./dashboard.html";
} else {
    renderQuestion();
    startTimer();
}