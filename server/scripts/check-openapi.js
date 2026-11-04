// Fails (exit 1) if docs/openapi.js and the routes Express really registers
// have drifted apart: a route missing from the docs, or documented but gone.
// Run with:  npm run check:openapi
const path = require("path");
const spec = require("../docs/openapi");

// Mount prefix -> router file, mirroring routes/v1.js.
const mounts = {
    auth: "authRoutes", vendors: "vendorRoutes", bookings: "bookingRoutes",
    chat: "chatRoutes", "chat-upload": "chatUploadRoutes", reviews: "reviewRoutes",
    upload: "uploadRoutes", "ai-chat": "aiChatRoutes", wishlist: "wishlistRoutes",
    history: "historyRoutes", notifications: "notificationRoutes", admin: "adminRoutes",
    planner: "plannerRoutes"
};

const actual = new Set(["get /health"]); // defined inline in routes/v1.js

for (const [prefix, file] of Object.entries(mounts)) {
    const router = require(path.join(__dirname, "..", "routes", file));
    for (const layer of router.stack) {
        if (!layer.route) continue;
        const tail = layer.route.path === "/" ? "" : layer.route.path;
        const p = `/${prefix}${tail}`.replace(/:(\w+)/g, "{$1}");
        for (const method of Object.keys(layer.route.methods)) actual.add(`${method} ${p}`);
    }
}

const documented = new Set();
for (const [p, ops] of Object.entries(spec.paths)) {
    for (const method of Object.keys(ops)) documented.add(`${method} ${p}`);
}

const undocumented = [...actual].filter((r) => !documented.has(r));
const stale = [...documented].filter((r) => !actual.has(r));

console.log(`${actual.size} registered routes, ${documented.size} documented operations`);
if (undocumented.length) console.log("Missing from docs:\n  " + undocumented.join("\n  "));
if (stale.length) console.log("Documented but not registered:\n  " + stale.join("\n  "));
if (undocumented.length || stale.length) process.exit(1);
console.log("OpenAPI spec matches the registered routes.");
process.exit(0);
