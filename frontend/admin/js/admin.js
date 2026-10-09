/*
|--------------------------------------------------------------------------
| ExamHub Admin Foundation
|--------------------------------------------------------------------------
*/

const ADMIN_API_BASE_URL =
    "https://examhub-cytw.onrender.com/api";

const ADMIN_TOKEN_KEY =
    "examhub_admin_token";

const ADMIN_USER_KEY =
    "examhub_admin_user";


/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

const getAdminToken = () => {

    return localStorage.getItem(
        ADMIN_TOKEN_KEY
    );

};


const getAdminUser = () => {

    const storedUser =
        localStorage.getItem(
            ADMIN_USER_KEY
        );


    if (!storedUser) {
        return null;
    }


    try {

        return JSON.parse(
            storedUser
        );

    } catch {

        return null;

    }

};


const clearAdminSession = () => {

    localStorage.removeItem(
        ADMIN_TOKEN_KEY
    );

    localStorage.removeItem(
        ADMIN_USER_KEY
    );

};


/*
|--------------------------------------------------------------------------
| Protect admin pages
|--------------------------------------------------------------------------
*/

const requireAdminAuth = () => {

    const token =
        getAdminToken();


    if (!token) {

        window.location.href =
            "./login.html";

        return false;

    }


    return true;

};


/*
|--------------------------------------------------------------------------
| API helper
|--------------------------------------------------------------------------
*/

const adminFetch = async (
    endpoint,
    options = {}
) => {

    const token =
        getAdminToken();


    if (!token) {

        clearAdminSession();

        window.location.href =
            "./login.html";


        throw new Error(
            "Authentication required."
        );

    }


    const requestOptions = {
        ...options
    };


    const headers = {
        ...(requestOptions.headers || {}),
        Authorization:
            `Bearer ${token}`
    };


    if (
        requestOptions.body &&
        typeof requestOptions.body !==
            "string"
    ) {

        headers["Content-Type"] =
            "application/json";


        requestOptions.body =
            JSON.stringify(
                requestOptions.body
            );

    }


    /*
     * Prevent a request from remaining stuck forever.
     */
    let controller = null;

    let timeoutId = null;


    if (!requestOptions.signal) {

        controller =
            new AbortController();

        requestOptions.signal =
            controller.signal;


        timeoutId =
            setTimeout(
                () => {

                    controller.abort();

                },
                20000
            );

    }


    let response;


    try {

        response =
            await fetch(
                `${ADMIN_API_BASE_URL}${endpoint}`,
                {
                    ...requestOptions,
                    headers
                }
            );

    } catch (error) {

        if (
            error?.name ===
            "AbortError"
        ) {

            throw new Error(
                "The request timed out. The ExamHub server did not respond within 20 seconds."
            );

        }


        throw new Error(
            error?.message ||
            "Unable to connect to the ExamHub server."
        );

    } finally {

        if (timeoutId) {

            clearTimeout(
                timeoutId
            );

        }

    }


    if (
        response.status === 401
    ) {

        clearAdminSession();

        window.location.href =
            "./login.html";


        throw new Error(
            "Your session has expired. Please sign in again."
        );

    }


    let result = null;


    try {

        result =
            await response.json();

    } catch {

        result = null;

    }


    if (!response.ok) {

        throw new Error(
            result?.message ||
            result?.error ||
            "The request could not be completed."
        );

    }


    return result;

};


/*
|--------------------------------------------------------------------------
| Logout
|--------------------------------------------------------------------------
*/

const logoutAdmin = () => {

    clearAdminSession();

    window.location.href =
        "./login.html";

};


/*
|--------------------------------------------------------------------------
| Navigation structure
|--------------------------------------------------------------------------
*/

const ADMIN_NAV_GROUPS = [

    {
        label:
            "Overview",

        items: [

            {
                label:
                    "Dashboard",

                href:
                    "./dashboard.html",

                icon:
                    "dashboard"
            }

        ]
    },


    {
        label:
            "Academic Management",

        items: [

            {
                label:
                    "Programs",

                href:
                    "./programs.html",

                icon:
                    "programs"
            },

            {
                label:
                    "Courses",

                href:
                    "./courses.html",

                icon:
                    "courses"
            },

            {
                label:
                    "Students",

                href:
                    "./students.html",

                icon:
                    "students"
            },

            {
                label:
                    "Enrollments",

                href:
                    "./enrollments.html",

                icon:
                    "enrollments"
            }

        ]
    },


    {
        label:
            "Examination",

        items: [

            {
                label:
                    "Question Bank",

                href:
                    "./questions.html",

                icon:
                    "questions"
            },

            {
                label:
                    "Exams",

                href:
                    "./exams.html",

                icon:
                    "exams"
            }

        ]
    },


    {
        label:
            "Results & Reporting",

        items: [

            {
                label:
                    "Results",

                href:
                    "./results.html",

                icon:
                    "results"
            },

            {
                label:
                    "Leaderboard",

                href:
                    "./leaderboard.html",

                icon:
                    "leaderboard"
            },

            {
                label:
                    "Reports",

                href:
                    "./reports.html",

                icon:
                    "reports"
            }

        ]
    },


    {
        label:
            "System",

        items: [

            {
                label:
                    "Settings",

                href:
                    "./settings.html",

                icon:
                    "settings"
            },

            {
                label:
                    "Notifications",

                href:
                    "./notifications.html",

                icon:
                    "notifications"
            }

        ]
    }

];


/*
|--------------------------------------------------------------------------
| Navigation icons
|--------------------------------------------------------------------------
*/

const getNavIcon = (
    icon
) => {

    const icons = {

        dashboard: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                <rect x="14" y="14" width="7" height="7" rx="1"></rect>
            </svg>
        `,


        programs: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"></path>
                <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20"></path>
                <path d="M8 7h8M8 11h6"></path>
            </svg>
        `,


        courses: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m4 7 8-4 8 4-8 4-8-4Z"></path>
                <path d="m4 12 8 4 8-4"></path>
                <path d="m4 17 8 4 8-4"></path>
            </svg>
        `,


        students: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="4"></circle>
                <path d="M4 21a8 8 0 0 1 16 0"></path>
            </svg>
        `,


        enrollments: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 7h12"></path>
                <path d="M8 12h12"></path>
                <path d="M8 17h12"></path>
                <path d="M4 7h.01M4 12h.01M4 17h.01"></path>
            </svg>
        `,


        questions: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9"></circle>
                <path d="M9.8 9a2.4 2.4 0 1 1 4.1 1.7c-.9.9-1.9 1.3-1.9 2.8"></path>
                <path d="M12 17h.01"></path>
            </svg>
        `,


        exams: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="3" width="14" height="18" rx="2"></rect>
                <path d="M9 7h6M9 11h6M9 15h3"></path>
            </svg>
        `,


        results: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m5 12 4 4L19 6"></path>
            </svg>
        `,


        leaderboard: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 20V10"></path>
                <path d="M12 20V4"></path>
                <path d="M19 20v-7"></path>
            </svg>
        `,


        reports: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 3h10l4 4v14H5V3Z"></path>
                <path d="M14 3v5h5"></path>
                <path d="M8 12h8M8 16h6"></path>
            </svg>
        `,


        settings: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.6v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.5-1H6v-2.6h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V5h2.6v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.6 1Z"></path>
            </svg>
        `,


        notifications: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
                <path d="M10 21h4"></path>
            </svg>
        `

    };


    return icons[icon] || "";

};


/*
|--------------------------------------------------------------------------
| Current page
|--------------------------------------------------------------------------
*/

const getCurrentPage = () => {

    const path =
        window.location.pathname;


    const filename =
        path.split("/").pop();


    return filename ||
        "dashboard.html";

};


/*
|--------------------------------------------------------------------------
| Render sidebar
|--------------------------------------------------------------------------
*/

const renderAdminSidebar = () => {

    const sidebar =
        document.getElementById(
            "adminSidebar"
        );


    if (!sidebar) {
        return;
    }


    const currentPage =
        getCurrentPage();


    const user =
        getAdminUser();


    const displayName =
        user?.fullName ||
        user?.name ||
        "Administrator";


    const email =
        user?.email ||
        "Administrator";


    sidebar.innerHTML = `

        <div class="sidebar-brand">

            <div class="sidebar-brand-mark">
                E
            </div>

            <div class="sidebar-brand-copy">

                <div class="sidebar-brand-name">
                    ExamHub
                </div>

                <div class="sidebar-brand-label">
                    Administration
                </div>

            </div>

        </div>


        <div class="sidebar-context">

            <div class="context-dot"></div>

            <div>

                <strong>
                    Examination Portal
                </strong>

                <span>
                    Management workspace
                </span>

            </div>

        </div>


        <nav class="sidebar-nav">

            ${
                ADMIN_NAV_GROUPS
                    .map(
                        group => {

                            const items =
                                group.items
                                    .map(
                                        item => {

                                            const active =
                                                item.href
                                                    .replace(
                                                        "./",
                                                        ""
                                                    ) ===
                                                currentPage;


                                            return `

                                                <a
                                                    href="${item.href}"
                                                    class="sidebar-link ${
                                                        active
                                                            ? "active"
                                                            : ""
                                                    }"
                                                >

                                                    <span class="nav-icon">
                                                        ${getNavIcon(
                                                            item.icon
                                                        )}
                                                    </span>

                                                    <span class="nav-label">
                                                        ${item.label}
                                                    </span>

                                                </a>

                                            `;

                                        }
                                    )
                                    .join("");


                            return `

                                <div class="nav-group">

                                    <div class="nav-section-label">
                                        ${group.label}
                                    </div>

                                    <div class="nav-group-items">
                                        ${items}
                                    </div>

                                </div>

                            `;

                        }
                    )
                    .join("")
            }

        </nav>


        <div class="sidebar-account">

            <div class="account-card">

                <div class="account-avatar">
                    ${getInitials(
                        displayName
                    )}
                </div>

                <div class="account-info">

                    <strong>
                        ${escapeHtml(
                            displayName
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            email
                        )}
                    </span>

                </div>

            </div>


            <button
                type="button"
                class="sidebar-logout"
                id="adminLogoutButton"
            >

                <span class="logout-icon">

                    <svg viewBox="0 0 24 24">

                        <path
                            d="M10 17l5-5-5-5"
                        ></path>

                        <path
                            d="M15 12H3"
                        ></path>

                        <path
                            d="M21 19V5a2 2 0 0 0-2-2h-6"
                        ></path>

                    </svg>

                </span>

                <span>
                    Sign out
                </span>

            </button>

        </div>

    `;


    const logoutButton =
        document.getElementById(
            "adminLogoutButton"
        );


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            logoutAdmin
        );

    }

};


/*
|--------------------------------------------------------------------------
| Render header
|--------------------------------------------------------------------------
*/

const renderAdminHeader = () => {

    const header =
        document.getElementById(
            "adminHeader"
        );


    if (!header) {
        return;
    }


    const user =
        getAdminUser();


    const email =
        user?.email ||
        "Administrator";


    const displayName =
        user?.fullName ||
        user?.name ||
        "Administrator";


    header.innerHTML = `

        <div class="header-left">

            <button
                type="button"
                class="mobile-menu-button"
                id="mobileMenuButton"
                aria-label="Open navigation"
            >

                <span></span>
                <span></span>
                <span></span>

            </button>


            <div class="header-title-block">

                <p class="header-eyebrow">
                    Administration
                </p>

                <h1 id="pageTitle">
                    Dashboard
                </h1>

            </div>

        </div>


        <div class="header-right">

            <div class="header-status">

                <span class="status-dot"></span>

                System active

            </div>


            <a
                href="./notifications.html"
                class="admin-notification-link"
                aria-label="Notifications"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
                    <path d="M10 21h4"></path>
                </svg>
                <span
                    id="adminNotificationCount"
                    class="admin-notification-count"
                    aria-live="polite"
                    hidden
                ></span>
            </a>


            <div class="header-divider"></div>


            <div class="admin-user">

                <div class="admin-avatar">
                    ${getInitials(
                        displayName
                    )}
                </div>


                <div class="admin-user-info">

                    <strong>
                        ${escapeHtml(
                            displayName
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            email
                        )}
                    </span>

                </div>

            </div>

        </div>

    `;


    const menuButton =
        document.getElementById(
            "mobileMenuButton"
        );


    const sidebar =
        document.getElementById(
            "adminSidebar"
        );


    const overlay =
        document.getElementById(
            "sidebarOverlay"
        );


    if (menuButton) {

        menuButton.addEventListener(
            "click",
            () => {

                sidebar?.classList.toggle(
                    "open"
                );

                overlay?.classList.toggle(
                    "visible"
                );

            }
        );

    }


    if (overlay) {

        overlay.addEventListener(
            "click",
            () => {

                sidebar?.classList.remove(
                    "open"
                );

                overlay.classList.remove(
                    "visible"
                );

            }
        );

    }

    refreshAdminNotificationCount();
    window.setInterval(
        refreshAdminNotificationCount,
        60000
    );

};


const refreshAdminNotificationCount = async () => {
    const badge = document.getElementById(
        "adminNotificationCount"
    );

    if (!badge) {
        return;
    }

    try {
        const response = await adminFetch(
            "/notifications/unread-count"
        );

        if (response?.success !== true) {
            throw new Error(
                "The unread notification count could not be loaded."
            );
        }

        const unreadCount = Number(
            response?.data?.unreadCount
        );

        if (!Number.isFinite(unreadCount) || unreadCount < 0) {
            throw new Error(
                "The server returned an invalid unread notification count."
            );
        }

        badge.textContent =
            unreadCount > 99 ? "99+" : String(unreadCount);
        badge.hidden = unreadCount === 0;
        badge.setAttribute(
            "aria-label",
            `${unreadCount} unread notifications`
        );
    } catch (error) {
        console.error(
            "Refresh admin notification count error:",
            error
        );
    }
};


/*
|--------------------------------------------------------------------------
| Utilities
|--------------------------------------------------------------------------
*/

const getInitials = (
    name
) => {

    if (!name) {
        return "A";
    }


    const parts =
        name
            .trim()
            .split(/\s+/);


    if (
        parts.length === 1
    ) {

        return parts[0]
            .charAt(0)
            .toUpperCase();

    }


    return (
        parts[0].charAt(0) +
        parts[
            parts.length - 1
        ].charAt(0)
    ).toUpperCase();

};


const escapeHtml = (
    value
) => {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

};


/*
|--------------------------------------------------------------------------
| Page title
|--------------------------------------------------------------------------
*/

const setPageTitle = (
    title
) => {

    const titleElement =
        document.getElementById(
            "pageTitle"
        );


    if (titleElement) {

        titleElement.textContent =
            title;

    }


    document.title =
        `${title} | ExamHub Admin`;

};


/*
|--------------------------------------------------------------------------
| Initialize
|--------------------------------------------------------------------------
*/

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (!requireAdminAuth()) {
            return;
        }


        renderAdminSidebar();

        renderAdminHeader();

    }
);