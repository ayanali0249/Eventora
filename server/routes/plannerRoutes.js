const express = require("express");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const {
    getOptions,
    generatePlan,
    savePlan,
    listPlans,
    getPlan,
    deletePlan
} = require("../controllers/plannerController");

// Generating a plan can call the billed Gemini API, so it gets its own
// tighter ceiling on top of the global limiter in index.js. Keyed per
// client IP, like the other limiters.
const generateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.PLANNER_RATE_LIMIT_MAX) || 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "You're generating plans very quickly. Please wait a few minutes and try again." }
});

const customerOnly = [authMiddleware, requireRole("customer")];

router.get("/options", ...customerOnly, getOptions);
router.post("/generate", ...customerOnly, generateLimiter, generatePlan);
router.get("/plans", ...customerOnly, listPlans);
router.post("/plans", ...customerOnly, savePlan);
router.get("/plans/:id", ...customerOnly, getPlan);
router.delete("/plans/:id", ...customerOnly, deletePlan);

module.exports = router;
