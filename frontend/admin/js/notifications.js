const notificationsPageElements = {
    list: document.getElementById("notificationsList"),
    loading: document.getElementById("notificationsLoading"),
    error: document.getElementById("notificationsError"),
    empty: document.getElementById("notificationsEmpty"),
    feedback: document.getElementById("notificationsFeedback"),
    listNote: document.getElementById("notificationsListNote"),
    refreshButton: document.getElementById(
        "refreshNotificationsButton"
    ),
    retryButton: document.getElementById(
        "retryNotificationsButton"
    ),
    markAllReadButton: document.getElementById(
        "markAllNotificationsReadButton"
    )
};

let adminNotifications = [];
let notificationsLoading = false;

const formatNotificationDate = (value) => {
    if (!value) {
        return "—";
    }

    let date;

    if (
        typeof value === "object" &&
        Number.isFinite(value._seconds)
    ) {
        date = new Date(value._seconds * 1000);
    } else if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {
        date = value.toDate();
    } else {
        date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
    });
};

const showNotificationsFeedback = (message, isError = false) => {
    notificationsPageElements.feedback.textContent = message;
    notificationsPageElements.feedback.classList.toggle(
        "is-error",
        isError
    );
    notificationsPageElements.feedback.hidden = !message;
};

const setNotificationsLoading = (loading) => {
    notificationsLoading = loading;
    notificationsPageElements.loading.hidden = !loading;
    notificationsPageElements.refreshButton.disabled = loading;
    notificationsPageElements.markAllReadButton.disabled =
        loading ||
        !adminNotifications.some((notification) =>
            notification.read !== true
        );
};

const makeNotificationAction = (
    label,
    className,
    action,
    notificationId
) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.dataset.action = action;
    button.dataset.notificationId = notificationId;
    return button;
};

const renderAdminNotifications = () => {
    const {
        list,
        empty,
        error,
        listNote,
        markAllReadButton
    } = notificationsPageElements;

    list.replaceChildren();
    error.hidden = true;
    empty.hidden = adminNotifications.length !== 0;
    listNote.hidden = adminNotifications.length < 50;

    adminNotifications.forEach((notification) => {
        const item = document.createElement("article");
        item.className = "notification-item";

        if (notification.read !== true) {
            item.classList.add("is-unread");
        }

        const content = document.createElement("div");
        content.className = "notification-item-content";

        const heading = document.createElement("div");
        heading.className = "notification-item-heading";

        const title = document.createElement("h3");
        title.textContent =
            typeof notification.title === "string"
                ? notification.title
                : "ExamHub activity";
        heading.appendChild(title);

        if (notification.read !== true) {
            const unreadBadge = document.createElement("span");
            unreadBadge.className = "notification-unread-badge";
            unreadBadge.textContent = "Unread";
            heading.appendChild(unreadBadge);
        }

        const message = document.createElement("p");
        message.textContent =
            typeof notification.message === "string"
                ? notification.message
                : "";

        const timestamp = document.createElement("time");
        timestamp.className = "notification-date";
        timestamp.textContent = formatNotificationDate(
            notification.createdAt
        );

        content.append(heading, message, timestamp);

        const actions = document.createElement("div");
        actions.className = "notification-item-actions";

        if (
            typeof notification.targetUrl === "string" &&
            /^\.\/[a-z0-9-]+\.html(?:\?[a-z0-9=&_-]*)?$/i.test(
                notification.targetUrl
            )
        ) {
            const openLink = document.createElement("a");
            openLink.className = "notification-open-link";
            openLink.href = notification.targetUrl;
            openLink.textContent = "Open";
            if (notification.read !== true) {
                openLink.dataset.action = "open-notification";
                openLink.dataset.notificationId = notification.id;
            }
            actions.appendChild(openLink);
        }

        if (notification.read !== true) {
            actions.appendChild(
                makeNotificationAction(
                    "Mark as read",
                    "notification-mark-read",
                    "mark-read",
                    notification.id
                )
            );
        }

        item.append(content, actions);
        list.appendChild(item);
    });

    markAllReadButton.disabled =
        notificationsLoading ||
        !adminNotifications.some((notification) =>
            notification.read !== true
        );
};

const loadAdminNotifications = async () => {
    setNotificationsLoading(true);
    adminNotifications = [];
    notificationsPageElements.error.hidden = true;
    notificationsPageElements.empty.hidden = true;
    notificationsPageElements.list.replaceChildren();
    showNotificationsFeedback("");

    try {
        const response = await adminFetch(
            "/notifications?limit=50"
        );

        if (
            response?.success !== true ||
            !Array.isArray(response?.data)
        ) {
            throw new Error(
                "The server returned an invalid notifications response."
            );
        }

        adminNotifications = response.data;
        renderAdminNotifications();
        await refreshAdminNotificationCount();
    } catch (error) {
        console.error(
            "Load admin notifications error:",
            error
        );
        notificationsPageElements.error.hidden = false;
        notificationsPageElements.empty.hidden = true;
        showNotificationsFeedback(
            error.message ||
                "Notifications could not be loaded. Please try again.",
            true
        );
    } finally {
        setNotificationsLoading(false);
    }
};

const markOneAdminNotificationRead = async (notificationId) => {
    const notification = adminNotifications.find(
        (item) => item.id === notificationId
    );

    if (!notification || notification.read === true) {
        return;
    }

    try {
        await adminFetch(
            `/notifications/${encodeURIComponent(notificationId)}/read`,
            { method: "PATCH" }
        );
        notification.read = true;
        renderAdminNotifications();
        await refreshAdminNotificationCount();
        showNotificationsFeedback("Notification marked as read.");
    } catch (error) {
        console.error(
            "Mark notification as read error:",
            error
        );
        showNotificationsFeedback(
            error.message ||
                "The notification could not be updated.",
            true
        );
        throw error;
    }
};

const markAllAdminNotificationsRead = async () => {
    if (
        notificationsLoading ||
        !adminNotifications.some((notification) =>
            notification.read !== true
        )
    ) {
        return;
    }

    notificationsPageElements.markAllReadButton.disabled = true;

    try {
        await adminFetch(
            "/notifications/read-all",
            { method: "PATCH" }
        );
        adminNotifications.forEach((notification) => {
            notification.read = true;
        });
        renderAdminNotifications();
        await refreshAdminNotificationCount();
        showNotificationsFeedback("All notifications marked as read.");
    } catch (error) {
        console.error(
            "Mark all notifications as read error:",
            error
        );
        showNotificationsFeedback(
            error.message ||
                "Notifications could not be updated.",
            true
        );
        notificationsPageElements.markAllReadButton.disabled = false;
    }
};

notificationsPageElements.list.addEventListener(
    "click",
    async (event) => {
        const target =
            event.target instanceof Element
                ? event.target
                : null;
        const action = target?.closest("[data-action]");

        if (!action) {
            return;
        }

        const notificationId =
            action.dataset.notificationId;
        const actionType = action.dataset.action;

        if (actionType === "mark-read") {
            action.disabled = true;
            try {
                await markOneAdminNotificationRead(notificationId);
            } catch {
                action.disabled = false;
            }
            return;
        }

        if (actionType === "open-notification") {
            event.preventDefault();
            try {
                await markOneAdminNotificationRead(notificationId);
                window.location.href = action.href;
            } catch {
                return;
            }
        }
    }
);

notificationsPageElements.refreshButton.addEventListener(
    "click",
    loadAdminNotifications
);
notificationsPageElements.retryButton.addEventListener(
    "click",
    loadAdminNotifications
);
notificationsPageElements.markAllReadButton.addEventListener(
    "click",
    markAllAdminNotificationsRead
);

document.addEventListener("DOMContentLoaded", () => {
    setPageTitle("Notifications");
    loadAdminNotifications();
});
