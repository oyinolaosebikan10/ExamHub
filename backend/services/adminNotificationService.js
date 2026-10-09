const { createHash } = require("crypto");
const { db } = require("../firebase/firebaseAdmin");

const adminNotificationsCollection =
    db.collection("adminNotifications");

const getNotificationRef = (eventKey) => {
    const notificationId = createHash("sha256")
        .update(eventKey)
        .digest("hex");

    return adminNotificationsCollection.doc(notificationId);
};

const createAdminNotificationInTransaction = async (
    transaction,
    {
        eventKey,
        type,
        title,
        message,
        targetUrl = null,
        createdAt = new Date()
    }
) => {
    const notificationRef = getNotificationRef(eventKey);
    const notificationDoc =
        await transaction.get(notificationRef);

    if (notificationDoc.exists) {
        return notificationDoc.id;
    }

    transaction.create(notificationRef, {
        type,
        title,
        message,
        read: false,
        createdAt,
        targetUrl
    });

    return notificationRef.id;
};

const createAdminNotification = async (notification) => {
    let notificationId;

    await db.runTransaction(async (transaction) => {
        notificationId =
            await createAdminNotificationInTransaction(
                transaction,
                notification
            );
    });

    return notificationId;
};

const getAdminNotifications = async (requestedLimit = 50) => {
    const limit = Math.min(
        100,
        Math.max(1, Number.parseInt(requestedLimit, 10) || 50)
    );
    const snapshot = await adminNotificationsCollection
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

    return snapshot.docs.map((doc) => {
        const notification = doc.data();

        return {
            id: doc.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            read: notification.read === true,
            createdAt: notification.createdAt,
            readAt: notification.readAt || null,
            targetUrl: notification.targetUrl || null
        };
    });
};

const getUnreadAdminNotificationCount = async () => {
    const countSnapshot = await adminNotificationsCollection
        .where("read", "==", false)
        .count()
        .get();

    return countSnapshot.data().count;
};

const markAdminNotificationRead = async (notificationId) => {
    const notificationRef =
        adminNotificationsCollection.doc(notificationId);

    return db.runTransaction(async (transaction) => {
        const notificationDoc =
            await transaction.get(notificationRef);

        if (!notificationDoc.exists) {
            throw new Error("Notification not found");
        }

        if (!notificationDoc.data().read) {
            transaction.update(notificationRef, {
                read: true,
                readAt: new Date()
            });
        }

        return {
            id: notificationDoc.id,
            read: true
        };
    });
};

const markAllAdminNotificationsRead = async () => {
    const snapshot = await adminNotificationsCollection
        .where("read", "==", false)
        .get();
    const docs = snapshot.docs;
    const readAt = new Date();

    for (let index = 0; index < docs.length; index += 450) {
        const batch = db.batch();
        docs.slice(index, index + 450).forEach((doc) => {
            batch.update(doc.ref, {
                read: true,
                readAt
            });
        });
        await batch.commit();
    }

    return {
        updatedCount: docs.length
    };
};

module.exports = {
    createAdminNotification,
    createAdminNotificationInTransaction,
    getAdminNotifications,
    getUnreadAdminNotificationCount,
    markAdminNotificationRead,
    markAllAdminNotificationsRead
};
