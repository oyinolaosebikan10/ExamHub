/* ============================================================
   EXAMHUB ADMIN — PROGRAMS
   ============================================================ */

const PROGRAMS_API_URL =
    "/programs";

const SCHOOLS_API_URL =
    "/schools";


/* ============================================================
   STATE
   ============================================================ */

let programs = [];
let schools = [];

let editingProgramId = null;
let pendingLifecycleAction = null;
let lifecycleActionInProgress = false;
let lifecycleTrigger = null;
let lifecycleToastTimer = null;


/* ============================================================
   DOM ELEMENTS
   ============================================================ */

const programSearch =
    document.getElementById("programSearch");

const statusFilter =
    document.getElementById("statusFilter");

const lifecycleFilter =
    document.getElementById("lifecycleFilter");

const programsTableBody =
    document.getElementById("programsTableBody");

const programsTableWrapper =
    document.getElementById("programsTableWrapper");

const programsLoading =
    document.getElementById("programsLoading");

const programsEmpty =
    document.getElementById("programsEmpty");

const programsError =
    document.getElementById("programsError");

const programsErrorText =
    document.getElementById("programsErrorText");

const programCount =
    document.getElementById("programCount");

const totalPrograms =
    document.getElementById("totalPrograms");

const registrationOpenPrograms =
    document.getElementById("registrationOpenPrograms");

const upcomingPrograms =
    document.getElementById("upcomingPrograms");

const ongoingPrograms =
    document.getElementById("ongoingPrograms");

const refreshProgramsBtn =
    document.getElementById("refreshProgramsBtn");

const retryProgramsBtn =
    document.getElementById("retryProgramsBtn");

const openCreateProgramBtn =
    document.getElementById("openCreateProgramBtn");

const emptyCreateProgramBtn =
    document.getElementById("emptyCreateProgramBtn");

const programModal =
    document.getElementById("programModal");

const closeProgramModalBtn =
    document.getElementById("closeProgramModalBtn");

const cancelProgramBtn =
    document.getElementById("cancelProgramBtn");

const programForm =
    document.getElementById("programForm");

const programModalTitle =
    document.getElementById("programModalTitle");

const programModalDescription =
    document.getElementById("programModalDescription");

const programId =
    document.getElementById("programId");

const programName =
    document.getElementById("programName");

const programDescription =
    document.getElementById("programDescription");

const venueType =
    document.getElementById("venueType");

const schoolFieldGroup =
    document.getElementById("schoolFieldGroup");

const schoolId =
    document.getElementById("schoolId");

const registrationStart =
    document.getElementById("registrationStart");

const registrationEnd =
    document.getElementById("registrationEnd");

const examStart =
    document.getElementById("examStart");

const examEnd =
    document.getElementById("examEnd");

const resultVisibility =
    document.getElementById("resultVisibility");

const resultDownloadEnabled =
    document.getElementById("resultDownloadEnabled");

const programFormMessage =
    document.getElementById("programFormMessage");

const saveProgramBtn =
    document.getElementById("saveProgramBtn");

const saveProgramText =
    document.getElementById("saveProgramText");

const saveProgramSpinner =
    document.getElementById("saveProgramSpinner");

const lifecycleConfirmModal =
    document.getElementById("programLifecycleConfirmModal");

const lifecycleConfirmTitle =
    document.getElementById("programLifecycleConfirmTitle");

const lifecycleConfirmMessage =
    document.getElementById("programLifecycleConfirmMessage");

const lifecycleConfirmError =
    document.getElementById("programLifecycleConfirmError");

const cancelLifecycleBtn =
    document.getElementById("cancelProgramLifecycleBtn");

const confirmLifecycleBtn =
    document.getElementById("confirmProgramLifecycleBtn");

const confirmLifecycleText =
    document.getElementById("confirmProgramLifecycleText");

const confirmLifecycleSpinner =
    document.getElementById("confirmProgramLifecycleSpinner");

const lifecycleToast =
    document.getElementById("programLifecycleToast");


/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setProgramsPageTitle();

        bindProgramEvents();

        await Promise.all([
            loadSchools(),
            loadPrograms()
        ]);

        handleInitialEditRequest();

    }
);


/* ============================================================
   PAGE TITLE
   ============================================================ */

function setProgramsPageTitle() {

    if (
        typeof setPageTitle === "function"
    ) {
        setPageTitle("Programs");
    }

}


/* ============================================================
   INITIAL EDIT REQUEST
   ============================================================ */

function handleInitialEditRequest() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const editId =
        params.get("edit");


    if (!editId) {
        return;
    }


    const program =
        programs.find(
            item =>
                String(item.id) ===
                String(editId)
        );


    if (!program) {

        console.warn(
            "ExamHub: Program requested for editing was not found:",
            editId
        );

        return;

    }


    editProgram(program.id);

}


/* ============================================================
   EVENT BINDINGS
   ============================================================ */

function bindProgramEvents() {

    openCreateProgramBtn?.addEventListener(
        "click",
        openCreateProgramModal
    );

    emptyCreateProgramBtn?.addEventListener(
        "click",
        openCreateProgramModal
    );

    closeProgramModalBtn?.addEventListener(
        "click",
        closeProgramModal
    );

    cancelProgramBtn?.addEventListener(
        "click",
        closeProgramModal
    );

    refreshProgramsBtn?.addEventListener(
        "click",
        loadPrograms
    );

    retryProgramsBtn?.addEventListener(
        "click",
        loadPrograms
    );

    programSearch?.addEventListener(
        "input",
        renderPrograms
    );

    statusFilter?.addEventListener(
        "change",
        renderPrograms
    );

    lifecycleFilter?.addEventListener(
        "change",
        renderPrograms
    );

    venueType?.addEventListener(
        "change",
        handleVenueTypeChange
    );

    resultVisibility?.addEventListener(
        "change",
        handleResultVisibilityChange
    );

    programForm?.addEventListener(
        "submit",
        handleProgramSubmit
    );

    cancelLifecycleBtn?.addEventListener(
        "click",
        closeLifecycleConfirmModal
    );

    confirmLifecycleBtn?.addEventListener(
        "click",
        performLifecycleAction
    );

    lifecycleConfirmModal?.addEventListener(
        "click",
        event => {
            if (
                event.target === lifecycleConfirmModal &&
                !lifecycleActionInProgress
            ) {
                closeLifecycleConfirmModal();
            }
        }
    );

    programModal?.addEventListener(
        "click",
        event => {

            if (
                event.target === programModal
            ) {
                closeProgramModal();
            }

        }
    );

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                lifecycleConfirmModal &&
                !lifecycleConfirmModal.classList.contains("hidden") &&
                !lifecycleActionInProgress
            ) {
                closeLifecycleConfirmModal();
                return;
            }

            if (
                event.key === "Escape" &&
                programModal &&
                !programModal.classList.contains("hidden")
            ) {
                closeProgramModal();
            }

        }
    );

}


/* ============================================================
   LOAD PROGRAMS
   ============================================================ */

async function loadPrograms() {
        setProgramsLoadingState();

    try {

        const result =
            await adminFetch(
                PROGRAMS_API_URL,
                {
                    method: "GET"
                }
            );


        /*
         * Keep this log temporarily.
         *
         * It lets us see exactly what the deployed
         * backend returns from GET /api/programs.
         */
        console.log(
            "ExamHub GET /programs response:",
            result
        );


        programs =
            extractProgramsFromResponse(
                result
            );


        console.log(
            "ExamHub programs extracted:",
            programs
        );


        updateProgramSummary();

        renderPrograms();


    } catch (error) {

        console.error(
            "Failed to load programs:",
            error
        );

        programs = [];

        updateProgramSummary();

        showProgramsError(
            error?.message ||
            "Unable to load programs."
        );


    } finally {

        /*
         * Always stop the loading state.
         *
         * This prevents the page from remaining stuck on
         * "Loading programs..." after success OR failure.
         */
        hideProgramsLoading();

    }

}


/* ============================================================
   EXTRACT PROGRAMS FROM API RESPONSE
   ============================================================ */

function extractProgramsFromResponse(result) {

    /*
     * Possible backend response formats supported:
     *
     * 1. [ ...programs ]
     *
     * 2. { data: [ ...programs ] }
     *
     * 3. { programs: [ ...programs ] }
     *
     * 4. { data: { programs: [ ...programs ] } }
     *
     * 5. { items: [ ...programs ] }
     *
     * 6. { results: [ ...programs ] }
     */

    if (Array.isArray(result)) {
        return result;
    }


    if (
        result &&
        Array.isArray(result.data)
    ) {
        return result.data;
    }


    if (
        result &&
        Array.isArray(result.programs)
    ) {
        return result.programs;
    }


    if (
        result &&
        result.data &&
        Array.isArray(result.data.programs)
    ) {
        return result.data.programs;
    }


    if (
        result &&
        Array.isArray(result.items)
    ) {
        return result.items;
    }


    if (
        result &&
        Array.isArray(result.results)
    ) {
        return result.results;
    }


    return [];

}


/* ============================================================
   LOAD SCHOOLS
   ============================================================ */

async function loadSchools() {

    try {

        const result =
            await adminFetch(
                SCHOOLS_API_URL,
                {
                    method: "GET"
                }
            );


        console.log(
            "ExamHub GET /schools response:",
            result
        );


        schools =
            extractSchoolsFromResponse(
                result
            );


        populateSchoolSelect();


    } catch (error) {

        console.error(
            "Failed to load schools:",
            error
        );

        schools = [];

        populateSchoolSelect();

    }

}


/* ============================================================
   EXTRACT SCHOOLS
   ============================================================ */

function extractSchoolsFromResponse(result) {

    if (Array.isArray(result)) {
        return result;
    }


    if (
        result &&
        Array.isArray(result.data)
    ) {
        return result.data;
    }


    if (
        result &&
        Array.isArray(result.schools)
    ) {
        return result.schools;
    }


    if (
        result &&
        result.data &&
        Array.isArray(result.data.schools)
    ) {
        return result.data.schools;
    }


    if (
        result &&
        Array.isArray(result.items)
    ) {
        return result.items;
    }


    return [];

}


/* ============================================================
   SCHOOL SELECT
   ============================================================ */

function populateSchoolSelect() {

    if (!schoolId) {
        return;
    }

    schoolId.innerHTML = `
        <option value="">Select school</option>
    `;

    schools.forEach(
        school => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                school.id;

            option.textContent =
                school.name +
                (
                    school.code
                        ? ` (${school.code})`
                        : ""
                );

            schoolId.appendChild(
                option
            );

        }
    );

}


/* ============================================================
   SUMMARY
   ============================================================ */

function updateProgramSummary() {

    const statuses =
        programs.map(
            program =>
                getProgramStatus(
                    program
                )
        );


    const total =
        programs.length;


    const registrationOpen =
        statuses.filter(
            status =>
                status.key ===
                "registration-open"
        ).length;


    const upcoming =
        statuses.filter(
            status =>
                status.key ===
                "upcoming"
        ).length;


    const ongoing =
        statuses.filter(
            status =>
                        status.key ===
                "ongoing"
        ).length;


    if (totalPrograms) {
        totalPrograms.textContent =
            total;
    }


    if (registrationOpenPrograms) {
        registrationOpenPrograms.textContent =
            registrationOpen;
    }


    if (upcomingPrograms) {
        upcomingPrograms.textContent =
            upcoming;
    }


    if (ongoingPrograms) {
        ongoingPrograms.textContent =
            ongoing;
    }

}


/* ============================================================
   RENDER PROGRAMS
   ============================================================ */

function renderPrograms() {

    const searchTerm =
        (
            programSearch?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const selectedStatus =
        statusFilter?.value ||
        "all";

    const selectedLifecycle =
        lifecycleFilter?.value ||
        "all";


    const filteredPrograms =
        programs.filter(
            program => {

                const status =
                    getProgramStatus(
                        program
                    );


                const searchableText = [

                    program.name,

                    program.description,

                    program.schoolName,

                    program.school?.name,

                    program.school?.code,

                    program.venueType

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !searchTerm ||
                    searchableText.includes(
                        searchTerm
                    );


                const matchesStatus =
                    selectedStatus === "all" ||
                    status.key ===
                        selectedStatus;

                const lifecycle =
                    program.isActive === false
                        ? "inactive"
                        : "active";

                const matchesLifecycle =
                    selectedLifecycle === "all" ||
                    lifecycle === selectedLifecycle;


                return (
                    matchesSearch &&
                    matchesStatus &&
                    matchesLifecycle
                );

            }
        );


    if (programCount) {

        programCount.textContent =
            `${filteredPrograms.length} ${
                filteredPrograms.length === 1
                    ? "program"
                    : "programs"
            }`;

    }


    if (!filteredPrograms.length) {

        programsTableWrapper?.classList.add(
            "hidden"
        );

        programsEmpty?.classList.remove(
            "hidden"
        );

        programsError?.classList.add(
            "hidden"
        );

        hideProgramsLoading();


        if (programsTableBody) {
            programsTableBody.innerHTML = "";
        }

        return;

    }


    programsTableWrapper?.classList.remove(
        "hidden"
    );

    programsEmpty?.classList.add(
        "hidden"
    );

    programsError?.classList.add(
        "hidden"
    );

    hideProgramsLoading();


    if (programsTableBody) {

        programsTableBody.innerHTML =
            filteredPrograms
                .map(
                    renderProgramRow
                )
                .join("");

    }

}


/* ============================================================
   PROGRAM ROW
   ============================================================ */

function renderProgramRow(program) {

    const status =
        getProgramStatus(
            program
        );


    const venue =
        getVenueDisplay(
            program
        );


    const registration =
        formatPeriod(
            program.registrationStart,
            program.registrationEnd
        );


    const examination =
        formatPeriod(
            program.examStart,
            program.examEnd
        );


    const resultVisible =
        program.resultVisibility ===
        "visible";


    const resultDownload =
        Boolean(
            program.resultDownloadEnabled
        );


    return `
        <tr>

            <td class="program-name-cell">

                <div class="program-name">
                    ${escapeHtml(
                        program.name ||
                        "Untitled Program"
                    )}
                </div>

                ${
                    program.description
                        ? `
                            <div class="program-description">
                                ${escapeHtml(
                                    program.description
                                )}
                            </div>
                        `
                        : ""
                }

            </td>


            <td class="venue-cell">

                <div class="venue-type">
                    ${escapeHtml(
                        venue.type
                    )}
                </div>

                <div class="venue-name">
                    ${escapeHtml(
                        venue.name
                    )}
                </div>

            </td>


            <td class="date-cell">

                <div class="date-primary">
                    ${escapeHtml(
                        registration.primary
                    )}
                </div>

                <div class="date-secondary">
                    ${escapeHtml(
                        registration.secondary
                    )}
                </div>

            </td>


            <td class="date-cell">

                <div class="date-primary">
                    ${escapeHtml(
                        examination.primary
                    )}
                </div>

                <div class="date-secondary">
                    ${escapeHtml(
                        examination.secondary
                    )}
                </div>

            </td>


            <td>

                <span
                    class="status-badge status-${status.key}"
                >
                    ${escapeHtml(
                        status.label
                    )}
                </span>

            </td>

            <td>
                <span
                    class="lifecycle-badge lifecycle-${
                        program.isActive === false
                            ? "inactive"
                            : "active"
                    }"
                    aria-label="Lifecycle: ${
                        program.isActive === false
                            ? "Inactive"
                            : "Active"
                    }"
                >
                    ${
                        program.isActive === false
                            ? "Inactive"
                            : "Active"
                    }
                </span>
            </td>


            <td>

                <div
                    class="
                        result-status
                        ${
                            resultVisible
                                ? "result-released"
                                : "result-hidden"
                        }
                    "
                >
                    ${
                        resultVisible
                            ? "Visible"
                            : "Hidden"
                    }
                </div>

                <div class="result-download">
                    ${    
                        resultVisible && resultDownload
                            ? "Downloads enabled"
                            : "Downloads disabled"
                    }
                </div>

            </td>


            <td class="actions-column">

                <div class="row-actions">

                    <button
                        type="button"
                        class="row-action"
                        title="View program"
                        aria-label="View program"
                        data-action="view"
                        data-id="${escapeHtml(
                            program.id
                        )}"
                    >
                        ${viewIcon()}
                    </button>


                    <button
                        type="button"
                        class="row-action"
                        title="Edit program"
                        aria-label="Edit program"
                        data-action="edit"
                        data-id="${escapeHtml(
                            program.id
                        )}"
                    >
                        ${editIcon()}
                    </button>

                    <button
                        type="button"
                        class="row-action lifecycle-action"
                        title="${
                            program.isActive === false
                                ? "Reactivate program"
                                : "Deactivate program"
                        }"
                        aria-label="${
                            program.isActive === false
                                ? "Reactivate"
                                : "Deactivate"
                        } ${escapeHtml(program.name || "program")}"
                        data-action="${
                            program.isActive === false
                                ? "reactivate"
                                : "deactivate"
                        }"
                        data-id="${escapeHtml(program.id)}"
                        ${lifecycleActionInProgress ? "disabled" : ""}
                    >
                        ${
                            program.isActive === false
                                ? "Reactivate"
                                : "Deactivate"
                        }
                    </button>

                </div>

            </td>

        </tr>
    `;

}


/* ============================================================
   TABLE ACTION HANDLING
   ============================================================ */

document.addEventListener(
    "click",
    event => {

        const actionButton =
            event.target.closest(
                ".row-action"
            );


        if (!actionButton) {
            return;
        }


        const action =
            actionButton.dataset.action;


        const id =
            actionButton.dataset.id;


        if (!id) {
            return;
        }


        if (action === "view") {

            window.location.href =
                `./program-details.html?id=${encodeURIComponent(
                    id
                )}`;

            return;

        }


        if (action === "edit") {

            editProgram(id);

            return;
        }

        if (action === "deactivate" || action === "reactivate") {
            openLifecycleConfirmModal(id, action, actionButton);
        }

    }
);

function openLifecycleConfirmModal(programIdValue, action, trigger) {
    const program = programs.find(item => item.id === programIdValue);

    if (
        !program ||
        !lifecycleConfirmModal ||
        lifecycleActionInProgress ||
        !lifecycleConfirmTitle ||
        !lifecycleConfirmMessage ||
        !lifecycleConfirmError ||
        !confirmLifecycleText ||
        !confirmLifecycleBtn ||
        !confirmLifecycleSpinner ||
        !cancelLifecycleBtn
    ) {
        return;
    }

    lifecycleTrigger = trigger;
    pendingLifecycleAction = {
        programId: programIdValue,
        action
    };

    const isDeactivation = action === "deactivate";
    lifecycleConfirmTitle.textContent = isDeactivation
        ? "Deactivate Program?"
        : "Reactivate Program?";
    lifecycleConfirmMessage.textContent = isDeactivation
        ? `${program.name || "This program"} will be unavailable for new exams, enrollments, registration, and exam sessions. Existing records will be preserved.`
        : `${program.name || "This program"} will be marked active. Schedule restrictions on registration and exams will still apply.`;
    confirmLifecycleText.textContent = isDeactivation ? "Deactivate Program" : "Reactivate Program";
    lifecycleConfirmError.textContent = "";
    lifecycleConfirmError.classList.add("hidden");
    lifecycleConfirmModal.classList.remove("hidden");
    lifecycleConfirmModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    confirmLifecycleBtn.focus();
}

function closeLifecycleConfirmModal() {
    if (!lifecycleConfirmModal || lifecycleActionInProgress) {
        return;
    }

    lifecycleConfirmModal.classList.add("hidden");
    lifecycleConfirmModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    pendingLifecycleAction = null;
    lifecycleConfirmError.textContent = "";
    lifecycleConfirmError.classList.add("hidden");
    if (lifecycleTrigger?.isConnected) {
        lifecycleTrigger.focus();
    }
    lifecycleTrigger = null;
}

function setLifecycleActionBusy(isBusy) {
    lifecycleActionInProgress = isBusy;
    confirmLifecycleBtn.disabled = isBusy;
    cancelLifecycleBtn.disabled = isBusy;
    confirmLifecycleSpinner.classList.toggle("hidden", !isBusy);
    confirmLifecycleText.textContent = isBusy
        ? "Saving..."
        : pendingLifecycleAction?.action === "deactivate"
            ? "Deactivate Program"
            : "Reactivate Program";
}

async function performLifecycleAction() {
    if (!pendingLifecycleAction || lifecycleActionInProgress) {
        return;
    }

    const { programId: targetProgramId, action } = pendingLifecycleAction;
    setLifecycleActionBusy(true);

    try {
        await adminFetch(
            `${PROGRAMS_API_URL}/${encodeURIComponent(targetProgramId)}/${action}`,
            { method: "PATCH" }
        );

        const program = programs.find(item => item.id === targetProgramId);
        if (program) {
            program.isActive = action === "reactivate";
            updateProgramSummary();
            renderPrograms();
        }

        setLifecycleActionBusy(false);
        closeLifecycleConfirmModal();
        const nextTrigger = Array.from(
            programsTableBody?.querySelectorAll(".lifecycle-action") || []
        ).find(button => button.dataset.id === targetProgramId);
        if (nextTrigger) {
            nextTrigger.focus();
        }
        showLifecycleToast(
            action === "deactivate"
                ? "Program deactivated. Existing records have been preserved."
                : "Program reactivated."
        );
    } catch (error) {
        console.error("Failed to update program lifecycle:", error);
        lifecycleConfirmError.textContent = friendlyLifecycleError(error, action);
        lifecycleConfirmError.classList.remove("hidden");
        setLifecycleActionBusy(false);
    } finally {
        if (lifecycleActionInProgress) setLifecycleActionBusy(false);
    }
}

function friendlyLifecycleError(error, action) {
    const message = typeof error?.message === "string"
        ? error.message.toLowerCase()
        : "";

    if (message.includes("already")) {
        return `This program is already ${
            action === "deactivate" ? "inactive" : "active"
        }. Refresh the list to see its latest state.`;
    }

    if (message.includes("not found")) {
        return "This program could not be found. Refresh the list and try again.";
    }

    return `Unable to ${action} this program. Please try again.`;
}

function showLifecycleToast(message) {
    if (!lifecycleToast) return;

    window.clearTimeout(lifecycleToastTimer);
    lifecycleToast.textContent = message;
    lifecycleToast.classList.remove("hidden");
    lifecycleToastTimer = window.setTimeout(() => {
        lifecycleToast.classList.add("hidden");
    }, 4000);
}


/* ============================================================
   OPEN CREATE MODAL
   ============================================================ */

function openCreateProgramModal() {

    editingProgramId = null;

    programForm?.reset();


    if (programId) {
        programId.value = "";
    }


    if (resultVisibility) {
        resultVisibility.value =
            "hidden";
    }


    if (resultDownloadEnabled) {

        resultDownloadEnabled.checked =
            false;

        resultDownloadEnabled.disabled =
            true;

    }


    if (programModalTitle) {

        programModalTitle.textContent =
            "Create Program";

    }


    if (programModalDescription) {

        programModalDescription.textContent =
            "Set up the program information, schedule, venue, and result access.";

    }


    if (saveProgramText) {

        saveProgramText.textContent =
            "Create Program";

    }


    handleVenueTypeChange();

    clearFormMessage();

    showProgramModal();

}


/* ============================================================
   EDIT PROGRAM
   ============================================================ */

function editProgram(id) {

    const program =
        programs.find(
            item =>
                item.id === id
        );


    if (!program) {
        return;
    }


    editingProgramId =
        program.id;


    if (programId) {

        programId.value =
            program.id || "";

    }


    if (programName) {

        programName.value =
            program.name || "";

    }


    if (programDescription) {

        programDescription.value =
            program.description || "";

    }


    if (venueType) {

        venueType.value =
            program.venueType || "";

    }


    if (schoolId) {

        schoolId.value =
            program.schoolId || "";

    }


    if (registrationStart) {

        registrationStart.value =
            toDateTimeLocal(
                program.registrationStart
            );

    }


    if (registrationEnd) {

        registrationEnd.value =
            toDateTimeLocal(
                program.registrationEnd
            );

    }


    if (examStart) {

        examStart.value =
            toDateTimeLocal(
                program.examStart
            );

    }


    if (examEnd) {

        examEnd.value =
            toDateTimeLocal(
                program.examEnd
            );

    }


    if (resultVisibility) {

        resultVisibility.value =
            program.resultVisibility ===
            "visible"
                ? "visible"
                : "hidden";

    }


    if (resultDownloadEnabled) {

        resultDownloadEnabled.checked =
            Boolean(
                program.resultDownloadEnabled
            );

    }


    if (programModalTitle) {

        programModalTitle.textContent =
            "Edit Program";

    }


    if (programModalDescription) {

        programModalDescription.textContent =
            "Update the program schedule, venue, and result access settings.";

    }


    if (saveProgramText) {

        saveProgramText.textContent =
            "Save Changes";

    }


    handleVenueTypeChange();

    handleResultVisibilityChange();

    clearFormMessage();

    showProgramModal();

    }

/* ============================================================
   MODAL
   ============================================================ */

function showProgramModal() {

    if (!programModal) {
        return;
    }


    programModal.classList.remove(
        "hidden"
    );


    programModal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "modal-open"
    );


    setTimeout(
        () => {
            programName?.focus();
        },
        50
    );

}


function closeProgramModal() {

    if (!programModal) {
        return;
    }


    programModal.classList.add(
        "hidden"
    );


    programModal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.classList.remove(
        "modal-open"
    );


    clearFormMessage();

    editingProgramId = null;

}


/* ============================================================
   VENUE
   ============================================================ */

function handleVenueTypeChange() {

    const selectedVenue =
        venueType?.value;


    const requiresSchool =
        selectedVenue === "school";


    if (schoolFieldGroup) {

        schoolFieldGroup.classList.toggle(
            "hidden",
            !requiresSchool
        );

    }


    if (schoolId) {

        schoolId.required =
            requiresSchool;


        if (!requiresSchool) {
            schoolId.value = "";
        }

    }

}


/* ============================================================
   RESULT VISIBILITY
   ============================================================ */

function handleResultVisibilityChange() {

    if (
        !resultVisibility ||
        !resultDownloadEnabled
    ) {
        return;
    }


    const visible =
        resultVisibility.value ===
        "visible";


    resultDownloadEnabled.disabled =
        !visible;


    if (!visible) {

        resultDownloadEnabled.checked =
            false;

    }

}


/* ============================================================
   SUBMIT PROGRAM
   ============================================================ */

async function handleProgramSubmit(
    event
) {

    event.preventDefault();

    clearFormMessage();


    const validation =
        validateProgramForm();


    if (!validation.valid) {

        showFormMessage(
            validation.message,
            "error"
        );

        return;

    }


    const payload =
        buildProgramPayload();


    setSavingState(true);


    try {

        let result;


        if (editingProgramId) {

            result =
                await adminFetch(
                    `${PROGRAMS_API_URL}/${encodeURIComponent(
                        editingProgramId
                    )}`,
                    {
                        method: "PATCH",
                        body: payload
                    }
                );

        } else {

            result =
                await adminFetch(
                    PROGRAMS_API_URL,
                    {
                        method: "POST",
                        body: payload
                    }
                );

        }


        const savedProgram =
            extractSingleProgramFromResponse(
                result
            );


        if (savedProgram?.id) {

            if (editingProgramId) {

                const index =
                    programs.findIndex(
                        item =>
                            item.id ===
                            editingProgramId
                    );


                if (index !== -1) {

                    programs[index] =
                        savedProgram;

                }

            } else {

                programs.unshift(
                    savedProgram
                );

            }

        }


        updateProgramSummary();

        renderPrograms();


        showFormMessage(
            editingProgramId
                ? "Program updated successfully."
                : "Program created successfully.",
            "success"
        );


        setTimeout(
            () => {
                closeProgramModal();
            },
            700
        );


    } catch (error) {

        console.error(
            "Failed to save program:",
            error
        );


        showFormMessage(
            error?.message ||
            "Unable to save the program.",
            "error"
        );


    } finally {

        setSavingState(false);

    }

}


/* ============================================================
   EXTRACT SINGLE PROGRAM
   ============================================================ */

function extractSingleProgramFromResponse(
    result
) {

    if (
        result &&
        result.data &&
        !Array.isArray(result.data) &&
        result.data.id
    ) {
        return result.data;
    }


    if (
        result &&
        result.program &&
        result.program.id
    ) {
        return result.program;
    }


    if (
        result &&
        result.data &&
        result.data.program &&
        result.data.program.id
    ) { 
                return result.data.program;
    }


    if (
        result &&
        result.id
    ) {
        return result;
    }


    return null;

}


/* ============================================================
   PAYLOAD
   ============================================================ */

function buildProgramPayload() {

    const visibility =
        resultVisibility?.value ===
        "visible"
            ? "visible"
            : "hidden";


    return {

        name:
            programName.value.trim(),

        description:
            programDescription.value.trim() ||
            null,

        venueType:
            venueType.value,

        schoolId:
            venueType.value === "school"
                ? schoolId.value
                : null,

        registrationStart:
            registrationStart.value,

        registrationEnd:
            registrationEnd.value,

        examStart:
            examStart.value,

        examEnd:
            examEnd.value,

        resultVisibility:
            visibility,

        resultDownloadEnabled:
            visibility === "visible" &&
            Boolean(
                resultDownloadEnabled.checked
            )

    };

}


/* ============================================================
   VALIDATION
   ============================================================ */

function validateProgramForm() {

    const name =
        programName?.value.trim();


    const selectedVenue =
        venueType?.value;


    const registrationStartValue =
        registrationStart?.value;


    const registrationEndValue =
        registrationEnd?.value;


    const examStartValue =
        examStart?.value;


    const examEndValue =
        examEnd?.value;


    if (!name) {

        return {
            valid: false,
            message:
                "Program name is required."
        };

    }


    if (!selectedVenue) {

        return {
            valid: false,
            message:
                "Please select a venue type."
        };

    }


    if (
        !["school", "organization"].includes(
            selectedVenue
        )
    ) {

        return {
            valid: false,
            message:
                "Please select a valid venue type."
        };

    }


    if (
        selectedVenue === "school" &&
        !schoolId?.value
    ) {

        return {
            valid: false,
            message:
                "Please select a school."
        };

    }


    if (
        !registrationStartValue ||
        !registrationEndValue ||
        !examStartValue ||
        !examEndValue
    ) {

        return {
            valid: false,
            message:
                "Please complete all required date and time fields."
        };

    }


    const registrationStartDate =
        new Date(
            registrationStartValue
        );


    const registrationEndDate =
        new Date(
            registrationEndValue
        );


    const examStartDate =
        new Date(
            examStartValue
        );


    const examEndDate =
        new Date(
            examEndValue
        );


    if (
        Number.isNaN(
            registrationStartDate.getTime()
        ) ||
        Number.isNaN(
            registrationEndDate.getTime()
        ) ||
        Number.isNaN(
            examStartDate.getTime()
        ) ||
        Number.isNaN(
            examEndDate.getTime()
        )
    ) {

        return {
            valid: false,
            message:
                "Please enter valid date and time values."
        };

    }


    if (
        registrationStartDate >=
        registrationEndDate
    ) {

        return {
            valid: false,
            message:
                "Registration start must be before registration end."
        };

    }


    if (
        examStartDate >=
        examEndDate
    ) {

        return {
            valid: false,
            message:
                "Examination start must be before examination end."
        };

    }


    if (
        registrationEndDate >
        examStartDate
    ) {

        return {
            valid: false,
            message:
                "Registration must end before or at the examination start time."
        };

    }


    return {
        valid: true
    };

}


/* ============================================================
   SAVING STATE
   ============================================================ */

function setSavingState(
    isSaving
) {

    if (saveProgramBtn) {

        saveProgramBtn.disabled =
            isSaving;

    }


    if (saveProgramText) {

        saveProgramText.classList.toggle(
            "hidden",
            isSaving
        );

    }


    if (saveProgramSpinner) {

        saveProgramSpinner.classList.toggle(
            "hidden",
            !isSaving
        );

    }

}


/* ============================================================
   PROGRAM STATUS
   ============================================================ */

function getProgramStatus(
    program
) {

    const registrationStart =
        toDate(
            program.registrationStart
        );


    const registrationEnd =
        toDate(
            program.registrationEnd
        );

    const examStart =
        toDate(
            program.examStart
        );


    const examEnd =
        toDate(
            program.examEnd
        );

    if (
        !registrationStart ||
        !registrationEnd ||
        !examStart ||
        !examEnd
    ) {

        return {
            key: "invalid",
            label: "Invalid"
        };

    }


    if (
        registrationStart >=
            registrationEnd ||
        examStart >=
            examEnd ||
        registrationEnd >
            examStart
    ) {

        return {
            key: "invalid",
            label: "Invalid"
        };

    }


    const now =
        new Date();


    if (
        now <
        registrationStart
    ) {

        return {
            key: "upcoming",
            label: "Upcoming"
        };

    }


    if (
        now >=
            registrationStart &&
        now <=
            registrationEnd
    ) {

        return {
            key: "registration-open",
            label: "Registration open"
        };

    }


    if (
        now >
            registrationEnd &&
        now <
            examStart
    ) {

        return {
            key: "registration-closed",
            label: "Registration closed"
        };

    }


    if (
        now >=
            examStart &&
        now <=
            examEnd
    ) {

        return {
            key: "ongoing",
            label: "Ongoing"
        };

    }


    if (
        now >
        examEnd
    ) {

        return {
            key: "completed",
            label: "Completed"
        };

    }


    return {
        key: "invalid",
        label: "Invalid"
    };

}


/* ============================================================
   VENUE DISPLAY
   ============================================================ */

function getVenueDisplay(
    program
) {

    const type =
        program.venueType ||
        "Not specified";


    if (type === "school") {

        const school =
            program.schoolName ||
            program.school?.name ||
            findSchoolName(
                program.schoolId
            );


        return {
            type: "School",
            name:
                school ||
                "School not specified"
        };

    }


    if (type === "organization") {

        return {
            type: "Organization Facility",
            name:
                program.venueName ||
                program.organizationName ||
                "Organization Facility"
        };

    }


    return {
        type:
            formatLabel(type),

        name:
            "Not specified"
    };

}


function findSchoolName(id) {

    if (!id) {
        return "";
    }


    const school =
        schools.find(
            item =>
                item.id === id
        );


    return school?.name || "";

}


/* ============================================================
   DATE HELPERS
   ============================================================ */

function toDate(value) {

    if (!value) {
        return null;
    }


    if (
        value instanceof Date
    ) {
        return value;
    }


    if (
        typeof value === "object" &&
        typeof value._seconds ===
            "number"
    ) {

        return new Date(
            value._seconds * 1000
        );

    }


    if (
        typeof value === "object" &&
        typeof value.seconds ===
            "number"
    ) {

        return new Date(
            value.seconds * 1000
        );

    }


    const date =
        new Date(value);


    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;

}


function toDateTimeLocal(
    value
) {

    const date =
        toDate(value);


    if (!date) {
        return "";
    }


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    const hours =
        String(
            date.getHours()
        ).padStart(
            2,
            "0"
        );


    const minutes =
        String(
            date.getMinutes()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}T${hours}:${minutes}`;

}


function formatPeriod(
    startValue,
    endValue
) {

    const start =
        toDate(
                        startValue
        );


    const end =
        toDate(
            endValue
        );


    if (!start || !end) {

        return {
            primary:
                "Not scheduled",

            secondary:
                ""
        };

    }


    const sameDay =
        start.toDateString() ===
        end.toDateString();


    if (sameDay) {

        return {

            primary:
                formatDate(start),

            secondary:
                `${formatTime(start)} – ${formatTime(end)}`

        };

    }


    return {

        primary:
            `${formatDate(start)} – ${formatDate(end)}`,

        secondary:
            `${formatTime(start)} – ${formatTime(end)}`

    };

}


function formatDate(
    date
) {

    return new Intl.DateTimeFormat(
        undefined,
        {
            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric"
        }
    ).format(date);

}


function formatTime(
    date
) {

    return new Intl.DateTimeFormat(
        undefined,
        {
            hour:
                "numeric",

            minute:
                "2-digit"
        }
    ).format(date);

}


/* ============================================================
   UI STATES
   ============================================================ */

function setProgramsLoadingState() {

    if (programsLoading) {

        programsLoading.classList.remove(
            "hidden"
        );

        programsLoading.style.display =
            "";

    }


    programsTableWrapper?.classList.add(
        "hidden"
    );

    programsEmpty?.classList.add(
        "hidden"
    );

    programsError?.classList.add(
        "hidden"
    );

}


function hideProgramsLoading() {

    if (!programsLoading) {
        return;
    }


    programsLoading.classList.add(
        "hidden"
    );

    programsLoading.style.display =
        "none";

}


function showProgramsError(
    message
) {

    hideProgramsLoading();


    programsTableWrapper?.classList.add(
        "hidden"
    );

    programsEmpty?.classList.add(
        "hidden"
    );

    programsError?.classList.remove(
        "hidden"
    );


    if (programsErrorText) {

        programsErrorText.textContent =
            message;

    }

}


/* ============================================================
   FORM MESSAGES
   ============================================================ */

function showFormMessage(
    message,
    type = "error"
) {

    if (!programFormMessage) {
        return;
    }


    programFormMessage.textContent =
        message;


    programFormMessage.className =
        `form-message ${type}`;

}


function clearFormMessage() {

    if (!programFormMessage) {
        return;
    }


    programFormMessage.textContent =
        "";


    programFormMessage.className =
        "form-message hidden";

}


/* ============================================================
   HELPERS
   ============================================================ */

function formatLabel(
    value
) {

    return String(
        value || ""
    )
        .replace(
            /[-_]/g,
            " "
        )
        .replace(
            /\b\w/g,
            character =>
                character.toUpperCase()
        );

}


/* ============================================================
   ICONS
   ============================================================ */

function viewIcon() {

    return `
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
        >
            <path
                d="M2.5 12s3.5-6 9.5-6
                   9.5 6 9.5 6
                   -3.5 6-9.5 6
                   -9.5-6-9.5-6Z"
            ></path>

            <circle
                cx="12"
                cy="12"
                r="2.5"
            ></circle>
        </svg>
    `;

}


function editIcon() {

    return `
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
        >
            <path
                d="M12 20h9"
            ></path>

            <path
                d="M16.5 3.5
                   a2.1 2.1 0 0 1 3 3
                   L8 18
                   l-4 1
                   1-4Z"
            ></path>
        </svg>
    `;

}


/* ============================================================
   MODAL BODY LOCK
   ============================================================ */

if (
    !document.getElementById(
        "programs-modal-body-style"
    )
) {

    const style =
        document.createElement(
            "style"
        );


    style.id =
        "programs-modal-body-style";


    style.textContent = `
        body.modal-open {
            overflow: hidden;
        }
    `;


    document.head.appendChild(
        style
    );

}
