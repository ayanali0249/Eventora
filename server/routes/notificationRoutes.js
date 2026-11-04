const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
} = require("../controllers/notificationController");

// No requireRole here on purpose - both customers and vendors receive
// notifications, so this is just "any authenticated user, for their own
// notifications only" (enforced in the controller via req.user.id).

router.get("/", authMiddleware, getNotifications);

router.put("/read-all", authMiddleware, markAllAsRead);

router.put("/:id/read", authMiddleware, markAsRead);

router.delete("/:id", authMiddleware, deleteNotification);

module.exports = router;
