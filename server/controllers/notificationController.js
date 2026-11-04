const pool = require("../config/db");

// GET NOTIFICATIONS (most recent first) + total unread count in one
// round trip, since that's all the bell dropdown needs.
const getNotifications = async (req, res) => {

    try {

        const userId = req.user.id;

        const limit = Math.min(Number(req.query.limit) || 30, 100);

        const [notificationsResult, unreadResult] = await Promise.all([

            pool.query(
                `SELECT * FROM notifications
                 WHERE user_id = $1
                 ORDER BY created_at DESC
                 LIMIT $2`,
                [userId, limit]
            ),

            pool.query(
                `SELECT COUNT(*)::int AS count FROM notifications
                 WHERE user_id = $1 AND is_read = FALSE`,
                [userId]
            )

        ]);

        res.json({
            success: true,
            notifications: notificationsResult.rows,
            unread_count: unreadResult.rows[0].count
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({ success: false, message: "Something went wrong. Please try again."
        });

    }

};

// MARK ONE AS READ (ownership verified - a user can only ever touch their
// own notifications)
const markAsRead = async (req, res) => {

    try {

        const userId = req.user.id;
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE notifications SET is_read = TRUE
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        res.json({ success: true, notification: result.rows[0] });

    } catch (error) {

        console.log(error);

        res.status(500).json({ success: false, message: "Something went wrong. Please try again."
        });

    }

};

// MARK ALL AS READ
const markAllAsRead = async (req, res) => {

    try {

        const userId = req.user.id;

        await pool.query(
            `UPDATE notifications SET is_read = TRUE
             WHERE user_id = $1 AND is_read = FALSE`,
            [userId]
        );

        res.json({ success: true, message: "All notifications marked as read" });

    } catch (error) {

        console.log(error);

        res.status(500).json({ success: false, message: "Something went wrong. Please try again."
        });

    }

};

// DELETE ONE (ownership verified)
const deleteNotification = async (req, res) => {

    try {

        const userId = req.user.id;
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        res.json({ success: true, message: "Notification removed" });

    } catch (error) {

        console.log(error);

        res.status(500).json({ success: false, message: "Something went wrong. Please try again."
        });

    }

};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
};
