const {
    getAdminNotifications,
    getUnreadAdminNotificationCount,
    markAdminNotificationRead,
    markAllAdminNotificationsRead
} = require("../services/adminNotificationService");

const getAdminNotificationsController = async (req, res) => {
    try {
        const notifications = await getAdminNotifications(
            req.query.limit
        );

        return res.status(200).json({
            success: true,
            data: notifications
        });
    } catch (error) {
        console.error("Get admin notifications error:", error);

        const errorCode =
            typeof error?.code === "string" ||
            typeof error?.code === "number"
                ? String(error.code).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40)
                : "";

        return res.status(500).json({
            success: false,
            message: errorCode
                ? `Unable to load notifications (service error ${errorCode}).`
                : "Unable to load notifications. Please try again."
        });
    }
};

const getUnreadAdminNotificationCountController = async (req, res) => {
    try {
        const unreadCount =
            await getUnreadAdminNotificationCount();

        return res.status(200).json({
            success: true,
            data: { unreadCount }
        });
    } catch (error) {
        console.error("Get unread notification count error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load unread notification count"
        });
    }
};

const markAdminNotificationReadController = async (req, res) => {
    try {
        const notification =
            await markAdminNotificationRead(
                req.params.notificationId
            );

        return res.status(200).json({
            success: true,
            message: "Notification marked as read",
            data: notification
        });
    } catch (error) {
        console.error("Mark admin notification read error:", error);

        if (error.message === "Notification not found") {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to update notification"
        });
    }
};

const markAllAdminNotificationsReadController = async (req, res) => {
    try {
        const result =
            await markAllAdminNotificationsRead();

        return res.status(200).json({
            success: true,
            message: "All notifications marked as read",
            data: result
        });
    } catch (error) {
        console.error("Mark all notifications read error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update notifications"
        });
    }
};

module.exports = {
    getAdminNotificationsController,
    getUnreadAdminNotificationCountController,
    markAdminNotificationReadController,
    markAllAdminNotificationsReadController
};
