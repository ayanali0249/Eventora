const pool = require("../config/db");

// GET CHAT HISTORY
const getMessages = async (req, res) => {

    try {

        const { roomId } = req.params;

        console.log(
            "Fetching room:",
            roomId
        );

        const result = await pool.query(

            `
            SELECT *
            FROM messages
            WHERE room_id = $1
            ORDER BY created_at ASC
            `,

            [roomId]

        );

        res.status(200).json({

            success: true,

            messages: result.rows

        });

    } catch (error) {

        console.log(
            "CHAT ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            error: error.message

        });

    }

};

module.exports = {
    getMessages
};