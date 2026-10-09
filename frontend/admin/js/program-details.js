(() => {
    "use strict";

    let currentProgram = null;


    /* =========================================================
       DOM REFERENCES
       ========================================================= */

    const loadingState =
        document.getElementById("programLoadingState");

    const errorState =
        document.getElementById("programErrorState");

    const errorMessage =
        document.getElementById("programErrorMessage");

    const content =
        document.getElementById("programContent");

    const programPageTitle =
        document.getElementById("programPageTitle");

    const programName =
        document.getElementById("programName");

    const programHeroDescription =
        document.getElementById("programHeroDescription");

    const programStatus =
        document.getElementById("programStatus");

    const programLifecycleStatus =
        document.getElementById("programLifecycleStatus");

    const programInfoName =
        document.getElementById("programInfoName");

    const programVenueType =
        document.getElementById("programVenueType");

    const programVenueName =
        document.getElementById("programVenueName");

    const programId =
        document.getElementById("programId");


    /* Overview metadata */

    const programOverviewVenueType =
        document.getElementById("programOverviewVenueType");

    const programOverviewVenueName =
        document.getElementById("programOverviewVenueName");

    const programOverviewId =
        document.getElementById("programOverviewId");


    /* Schedule */

    const registrationStart =
        document.getElementById("registrationStart");

    const registrationEnd =
        document.getElementById("registrationEnd");

    const examStart =
        document.getElementById("examStart");

    const examEnd =
        document.getElementById("examEnd");


    /* Other */

    const programDescription =
        document.getElementById("programDescription");

    const resultVisibilityBadge =
        document.getElementById("resultVisibilityBadge");

    const resultDownloadBadge =
        document.getElementById("resultDownloadBadge");

    const editProgramButton =
        document.getElementById("editProgramButton");

    const backToProgramsButton =
        document.getElementById("backToProgramsButton");

    const retryProgramButton =
        document.getElementById("retryProgramButton");


    /* =========================================================
       INITIALIZATION
       ========================================================= */

    document.addEventListener(
        "DOMContentLoaded",
        init
    );


    async function init() {
        const params =
            new URLSearchParams(window.location.search);

        const programIdFromUrl =
            params.get("id");

        if (!programIdFromUrl) {
            showError(
                "No program ID was provided."
            );

            return;
        }

        bindEvents();

        await loadProgram(programIdFromUrl);
    }


    /* =========================================================
       EVENTS
       ========================================================= */

    function bindEvents() {

        if (backToProgramsButton) {
            backToProgramsButton.addEventListener(
                "click",
                () => {
                    window.location.href =
                        "./programs.html";
                }
            );
        }


        if (retryProgramButton) {
            retryProgramButton.addEventListener(
                "click",
                async () => {

                    const params =
                        new URLSearchParams(
                            window.location.search
                        );

                    const id =
                        params.get("id");

                    if (id) {
                        await loadProgram(id);
                    }
                }
            );
        }


        if (editProgramButton) {
            editProgramButton.addEventListener(
                "click",
                () => {

                    if (!currentProgram?.id) {
                        return;
                    }

                    window.location.href =
                        `./programs.html?edit=${encodeURIComponent(
                            currentProgram.id
                        )}`;
                }
            );
        }
    }


    /* =========================================================
       LOAD PROGRAM
       ========================================================= */

    async function loadProgram(id) {

        showLoading();

        try {

            const response =
                await adminFetch(
                    `/programs/${encodeURIComponent(id)}`
                );


            const program =
                extractProgramFromResponse(response);


            if (!program) {
                throw new Error(
                    "The server returned no program data."
                );
            }


            currentProgram = program;

            renderProgram(program);

            showContent();

        } catch (error) {

            console.error(
                "ExamHub program details error:",
                error
            );

            showError(
                getErrorMessage(error)
            );
        }
    }


    /* =========================================================
       RESPONSE EXTRACTION
       ========================================================= */

    function extractProgramFromResponse(response) {

        if (!response) {
            return null;
        }


        /*
         * {
         *   success: true,
         *   data: {
         *      program: {...}
         *   }
         * }
         */

        if (
            response.data &&
            response.data.program
        ) {
            return response.data.program;
        }


        /*
         * {
         *   success: true,
         *   data: {...program}
         * }
         */

        if (
            response.data &&
            typeof response.data === "object" &&
            !Array.isArray(response.data) &&
            response.data.id
        ) {
            return response.data;
        }


        /*
         * {
         *   success: true,
         *   program: {...}
         * }
         */

        if (response.program) {
            return response.program;
        }


        /*
         * Direct program object.
         */

        if (response.id) {
            return response;
        }


        return null;
    }


    /* =========================================================
       RENDER PROGRAM
       ========================================================= */

    function renderProgram(program) {

        const name =
            getSafeValue(
                program.name ||
                program.title ||
                program.programName,
                "Unnamed Program"
            );


        const description =
            getSafeValue(
                program.description,
                "No description provided."
            );


        const venue =
            getVenueDetails(program);


        const status =
            getProgramStatus(program);


        /* Page heading */

        if (programPageTitle) {
            programPageTitle.textContent = name;
        }


        if (programHeroDescription) {
            programHeroDescription.textContent =
                description;
        }


        if (programStatus) {
            setStatusBadge(
                programStatus,
                status
            );
        }

        if (programLifecycleStatus) {
            const isActive = program.isActive !== false;
            programLifecycleStatus.textContent = isActive
                ? "Active"
                : "Inactive";
            programLifecycleStatus.className = isActive
                ? "status-badge status-success"
                : "status-badge status-danger";
        }


        /* Overview */

        if (programName) {
            programName.textContent = name;
        }

        if (programOverviewVenueType) {
            programOverviewVenueType.textContent =
                venue.type;
        }

        if (programOverviewVenueName) {
            programOverviewVenueName.textContent =
                venue.name;
        }

        if (programOverviewId) {
            programOverviewId.textContent =
                getSafeValue(
                    program.id,
                    "—"
                );
        }


        /* Program Information */

        if (programInfoName) {
            programInfoName.textContent =
                name;
        }

        if (programVenueType) {
            programVenueType.textContent =
                venue.type;
        }

        if (programVenueName) {
            programVenueName.textContent =
                venue.name;
        }

        if (programId) {
            programId.textContent =
                getSafeValue(
                    program.id,
                    "—"
                );
        }


        /* Schedule */

        if (registrationStart) {
            registrationStart.textContent =
                formatDateTime(
                    program.registrationStart
                );
        }

        if (registrationEnd) {
            registrationEnd.textContent =
                formatDateTime(
                    program.registrationEnd
                );
        }

        if (examStart) {
            examStart.textContent =
                formatDateTime(
                    program.examStart
                );
        }

        if (examEnd) {
            examEnd.textContent =
                formatDateTime(
                    program.examEnd
                );
        }


        /* Description */

        if (programDescription) {
            programDescription.textContent =
                description;
        }


        /* Result settings */

        renderResultSettings(program);
    }


    /* =========================================================
       VENUE
       ========================================================= */

    function getVenueDetails(program) {

        const venueType =
            String(
                program.venueType ||
                program.venue?.type ||
                ""
            ).trim().toLowerCase();


        const schoolName =
            program.schoolName ||
            program.school?.name ||
            program.school?.schoolName ||
            "";


        const organizationName =
            program.organizationName ||
            program.organization?.name ||
            "";


        let typeLabel =
            "—";

        let venueName =
            "—";


        if (venueType === "school") {

            typeLabel =
                "School";

            venueName =
                schoolName ||
                program.venueName ||
                "School venue";

        } else if (
            venueType === "organization"
        ) {

            typeLabel =
                "Organization Facility";

            venueName =
                organizationName ||
                program.venueName ||
                "Organization facility";

        } else {

            typeLabel =
                formatLabel(
                    program.venueType
                );

            venueName =
                program.venueName ||
                program.venue?.name ||
                "—";
        }


        return {
            type: typeLabel,
            name: venueName
        };
    }


    /* =========================================================
       PROGRAM STATUS
       ========================================================= */

    function getProgramStatus(program) {

        const now =
            new Date();


        const registrationStartDate =
            parseDate(
                program.registrationStart
            );

        const registrationEndDate =
            parseDate(
                program.registrationEnd
            );

        const examStartDate =
            parseDate(
                program.examStart
            );

        const examEndDate =
            parseDate(
                program.examEnd
            );


        if (
            examEndDate &&
            now >= examEndDate
        ) {
            return {
                label: "Completed",
                className: "status-neutral"
            };
        }


        if (
            examStartDate &&
            now >= examStartDate &&
            (!examEndDate || now < examEndDate)
        ) {
            return {
                label: "Ongoing",
                className: "status-success"
            };
        }


        if (
            registrationStartDate &&
            now >= registrationStartDate &&
            (!registrationEndDate ||
                now < registrationEndDate)
        ) {
            return {
                label: "Registration Open",
                className: "status-success"
            };
        }


        if (
            registrationStartDate &&
            now < registrationStartDate
        ) {
            return {
                label: "Upcoming",
                className: "status-warning"
            };
        }


        if (
            registrationEndDate &&
            now > registrationEndDate &&
            examStartDate &&
            now < examStartDate
        ) {
            return {
                label: "Registration Closed",
                className: "status-warning"
            };
        }


        return {
            label: "Scheduled",
            className: "status-neutral"
        };
    }


    /* =========================================================
       RESULT SETTINGS
       ========================================================= */

    function renderResultSettings(program) {

        const visibility =
            String(
                program.resultVisibility ||
                ""
            ).trim().toLowerCase();


        let visibilityLabel =
            "—";

        let visibilityClass =
            "status-neutral";


        if (
            visibility === "immediate"
        ) {
            visibilityLabel =
                "Immediate";

            visibilityClass =
                "status-success";

        } else if (
            visibility === "after_exam"
        ) {
            visibilityLabel =
                "After Exam";

            visibilityClass =
                "status-warning";

        } else if (
            visibility === "manual"
        ) {
            visibilityLabel =
                "Manual";

            visibilityClass =
                "status-neutral";

        } else if (
            visibility
        ) {
            visibilityLabel =
                formatLabel(
                    program.resultVisibility
                );
        }


        if (resultVisibilityBadge) {

            resultVisibilityBadge.textContent =
                visibilityLabel;

            resultVisibilityBadge.className =
                `status-badge ${visibilityClass}`;
        }


        const downloadEnabled =
            program.resultDownloadEnabled === true ||
            program.resultDownloadEnabled === "true";


        if (resultDownloadBadge) {

            resultDownloadBadge.textContent =
                downloadEnabled
                    ? "Enabled"
                    : "Disabled";

            resultDownloadBadge.className =
                downloadEnabled
                    ? "status-badge status-success"
                    : "status-badge status-neutral";
        }
    }


    /* =========================================================
       DATE HELPERS
       ========================================================= */

    function parseDate(value) {

        if (!value) {
            return null;
        }


        /*
         * Already a JavaScript Date
         */

        if (
            value instanceof Date
        ) {
            return Number.isNaN(
                value.getTime()
            )
                ? null
                : value;
        }


        /*
         * Firestore Timestamp object
         *
         * This handles an actual Timestamp instance.
         */

        if (
            typeof value === "object" &&
            typeof value.toDate === "function"
        ) {
            const date =
                value.toDate();

            return Number.isNaN(
                date.getTime()
            )
                ? null
                : date;
        }


        /*
         * Firestore Timestamp serialized by
         * Express / JSON.
         *
         * Depending on how the object is
         * serialized, Firestore timestamps
         * can arrive as either:
         *
         * {
         *     seconds: 1234567890
         * }
         *
         * or:
         *
         * {
         *     _seconds: 1234567890
         * }
         */

        if (
            typeof value === "object" &&
            typeof value.seconds === "number"
        ) {
            const date =
                new Date(
                    value.seconds * 1000
                );

            return Number.isNaN(
                date.getTime()
            )
                ? null
                : date;
        }


        if (
            typeof value === "object" &&
            typeof value._seconds === "number"
        ) {
            const date =
                new Date(
                    value._seconds * 1000
                );

            return Number.isNaN(
                date.getTime()
            )
                ? null
                : date;
        }


        /*
         * Numeric Unix timestamp.
         */

        if (
            typeof value === "number"
        ) {
            const milliseconds =
                value < 10000000000
                    ? value * 1000
                    : value;

            const date =
                new Date(milliseconds);

            return Number.isNaN(
                date.getTime()
            )
                ? null
                : date;
        }


        /*
         * ISO / normal date string.
         */

        const date =
            new Date(value);


        return Number.isNaN(
            date.getTime()
        )
            ? null
            : date;
    }


    function formatDateTime(value) {

        const date =
            parseDate(value);


        if (!date) {
            return "—";
        }


        return new Intl.DateTimeFormat(
            "en-NG",
            {
                dateStyle: "medium",
                timeStyle: "short"
            }
        ).format(date);
    }


    /* =========================================================
       LABEL HELPERS
       ========================================================= */

    function formatLabel(value) {

        if (!value) {
            return "—";
        }


        return String(value)
            .replace(/[_-]+/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .replace(/\b\w/g, char =>
                char.toUpperCase()
            );
    }


    function getSafeValue(
        value,
        fallback = "—"
    ) {

        if (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
        ) {
            return fallback;
        }


        return String(value);
    }


    function getErrorMessage(error) {

        if (
            error &&
            typeof error.message === "string" &&
            error.message.trim()
        ) {
            return error.message;
        }


        return "Something went wrong while loading this program.";
    }


    /* =========================================================
       STATUS BADGE
       ========================================================= */

    function setStatusBadge(
        element,
        status
    ) {

        if (!element) {
            return;
        }


        element.textContent =
            status.label;


        element.className =
            `status-badge ${status.className}`;
    }


    /* =========================================================
       PAGE STATES
       ========================================================= */

    function showLoading() {

        if (loadingState) {
            loadingState.hidden = false;
        }

        if (errorState) {
            errorState.hidden = true;
        }

        if (content) {
            content.hidden = true;
        }
    }


    function showContent() {

        if (loadingState) {
            loadingState.hidden = true;
        }

        if (errorState) {
            errorState.hidden = true;
        }

        if (content) {
            content.hidden = false;
        }
    }


    function showError(message) {

        if (loadingState) {
            loadingState.hidden = true;
        }

        if (content) {
            content.hidden = true;
        }

        if (errorState) {
            errorState.hidden = false;
        }

        if (errorMessage) {
            errorMessage.textContent =
                message;
        }
    }

})();