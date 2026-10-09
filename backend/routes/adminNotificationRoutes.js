const express = require("express");

const {
    getAdminNotificationsController,
    getUnreadAdminNotificationCountController,
    markAdminNotificationReadController,
    markAllAdminNotificationsReadController
} = require("../controllers/adminNotificationController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware, roleMiddleware("admin"));

router.get("/unread-count", getUnreadAdminNotificationCountController);
router.get("/", getAdminNotificationsController);
router.patch("/read-all", markAllAdminNotificationsReadController);
router.patch(
    "/:notificationId/read",
    markAdminNotificationReadController
);

module.exports = router;
