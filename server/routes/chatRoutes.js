const express = require("express");

const router = express.Router();

const {
    getMessages
} = require("../controllers/chatController");

// GET CHAT HISTORY
router.get("/:roomId", getMessages);

module.exports = router;