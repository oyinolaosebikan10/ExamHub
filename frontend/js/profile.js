/* ============================================
   STUDENT PROFILE
============================================ */


/* ============================================
   ELEMENTS
============================================ */

const profileLoading =
    document.getElementById(
        "profileLoading"
    );

const profileContent =
    document.getElementById(
        "profileContent"
    );

const profileError =
    document.getElementById(
        "profileError"
    );


/* Navigation */

const navStudentName =
    document.getElementById(
        "navStudentName"
    );

const navRegistrationNumber =
    document.getElementById(
        "navRegistrationNumber"
    );


/* Sidebar */

const studentMenuButton =
    document.getElementById(
        "studentMenuButton"
    );

const studentMenuClose =
    document.getElementById(
        "studentMenuClose"
    );

const studentSidebar =
    document.getElementById(
        "studentSidebar"
    );

const studentSidebarOverlay =
    document.getElementById(
        "studentSidebarOverlay"
    );

const sidebarInitials =
    document.getElementById(
        "sidebarInitials"
    );

const sidebarStudentName =
    document.getElementById(
        "sidebarStudentName"
    );

const sidebarRegistrationNumber =
    document.getElementById(
        "sidebarRegistrationNumber"
    );

const sidebarLogoutButton =
    document.getElementById(
        "sidebarLogoutButton"
    );


/* Profile */

const fullName =
    document.getElementById(
        "fullName"
    );

const phoneNumber =
    document.getElementById(
        "phoneNumber"
    );

const registrationNumber =
    document.getElementById(
        "registrationNumber"
    );

const courseName =
    document.getElementById(
        "courseName"
    );

const accountStatus =
    document.getElementById(
        "accountStatus"
    );

const createdAt =
    document.getElementById(
        "createdAt"
    );


/* ============================================
   AUTH
============================================ */

const token =
    localStorage.getItem(
        "examhub_token"
    );

const storedUser =
    localStorage.getItem(
        "examhub_user"
    );

if (!token || !storedUser) {

    window.location.href =
        "../login.html";
}


/* ============================================
   SIDEBAR
============================================ */

function openStudentSidebar() {

    studentSidebar.classList.add(
        "open"
    );

    studentSidebarOverlay.classList.add(
        "visible"
    );

    studentSidebar.setAttribute(
        "aria-hidden",
        "false"
    );

    studentMenuButton.setAttribute(
        "aria-expanded",
        "true"
    );

    document.body.classList.add(
        "sidebar-open"
    );
}


function closeStudentSidebar() {

    studentSidebar.classList.remove(
        "open"
    );

    studentSidebarOverlay.classList.remove(
        "visible"
    );

    studentSidebar.setAttribute(
        "aria-hidden",
        "true"
    );

    studentMenuButton.setAttribute(
        "aria-expanded",
        "false"
    );

    document.body.classList.remove(
        "sidebar-open"
    );
}


studentMenuButton.addEventListener(
    "click",
    openStudentSidebar
);

studentMenuClose.addEventListener(
    "click",
    closeStudentSidebar
);

studentSidebarOverlay.addEventListener(
    "click",
    closeStudentSidebar
);


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            studentSidebar.classList.contains(
                "open"
            )
        ) {
            closeStudentSidebar();
        }

    }
);


/* ============================================
   ACTIVE NAVIGATION
============================================ */

function setActiveStudentNav() {

    const currentPage =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();

    document
        .querySelectorAll(
            "[data-page]"
        )
        .forEach(link => {

            if (
                link.dataset.page
                    .toLowerCase() ===
                currentPage
            ) {

                link.classList.add(
                    "active"
                );
            }

        });
}


/* ============================================
   INITIALS
============================================ */

function getInitials(name) {

    if (!name) {
        return "ST";
    }

    const parts =
        name
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (parts.length === 1) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();
    }

    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();
}


/* ============================================
   FORMAT DATE
============================================ */

function formatDate(value) {

    if (!value) {
        return "—";
    }


    let date;


    if (
        typeof value === "object" &&
        value?._seconds
    ) {

        date =
            new Date(
                value._seconds * 1000
            );

    } else {

        date =
            new Date(value);
    }


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }


    return date.toLocaleDateString(
        undefined,
        {
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );
}


/* ============================================
   LOAD PROFILE
============================================ */

async function loadProfile() {

    profileLoading.classList.remove(
        "hidden"
    );

    profileContent.classList.add(
        "hidden"
    );

    profileError.classList.add(
        "hidden"
    );


    try {

        const [
            profileResponse,
            coursesResponse
        ] = await Promise.all([

            apiGet(
                "/students/me"
            ),

            apiGet(
                "/courses/available"
            )

        ]);


        const profile =
            profileResponse?.data;

        const courses =
            coursesResponse?.data || [];


        if (!profile) {

            throw new Error(
                "Student profile was not returned."
            );
        }


        const course =
            courses.find(
                item =>
                    item.id ===
                    profile.courseId
            );


        /* Profile fields */

        fullName.textContent =
            profile.fullName ||
            "—";

        phoneNumber.textContent =
            profile.phoneNumber ||
            "—";

        registrationNumber.textContent =
            profile.registrationNumber ||
            "—";

        courseName.textContent =
            course?.name ||
            profile.courseId ||
            "—";


        /* Account status */

        const active =
            profile.isActive === true &&
            profile.status === "active";


        if (active) {

            accountStatus.textContent =
                "Active";

            accountStatus.className =
                "badge badge-success";

        } else {

            accountStatus.textContent =
                "Inactive";

            accountStatus.className =
                "badge badge-danger";
        }


        createdAt.textContent =
            formatDate(
                profile.createdAt
            );


        /* Navigation */

        const firstName =
            profile.fullName
                ?.split(/\s+/)[0] ||
            "Student";

        navStudentName.textContent =
            firstName;

        navRegistrationNumber.textContent =
            profile.registrationNumber ||
            "—";


        /* Sidebar */

        sidebarInitials.textContent =
            getInitials(
                profile.fullName
            );

        sidebarStudentName.textContent =
            profile.fullName ||
            "Student";

        sidebarRegistrationNumber.textContent =
            profile.registrationNumber ||
            "—";


        profileContent.classList.remove(
            "hidden"
        );

    } catch (error) {

        console.error(
            "Load student profile error:",
            error
        );


        if (error.status === 401) {

            handleLogout();

            return;
        }


        profileError.textContent =
            error.data?.message ||
            error.message ||
            "Unable to load your profile.";

        profileError.classList.remove(
            "hidden"
        );

    } finally {

        profileLoading.classList.add(
            "hidden"
        );
    }
}


/* ============================================
   LOGOUT
============================================ */

function handleLogout() {

    localStorage.removeItem(
        "examhub_token"
    );

    localStorage.removeItem(
        "examhub_user"
    );


    sessionStorage.removeItem(
        "examhub_pending_exam"
    );

    sessionStorage.removeItem(
        "examhub_exam_session"
    );

    sessionStorage.removeItem(
        "examhub_exam_result"
    );


    window.location.href =
        "../login.html";
}


sidebarLogoutButton.addEventListener(
    "click",
    handleLogout
);


/* ============================================
   INIT
============================================ */

setActiveStudentNav();
loadProfile();