const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const openApiSpec = require("./docs/openapi");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const pool = require("./config/db");
const jwt = require("jsonwebtoken");
// ROUTES (all feature routers are registered once in routes/v1.js)
const v1Routes = require("./routes/v1");
const { createNotification } = require("./utils/notify");

// CONFIG
dotenv.config();

// ENVIRONMENT VALIDATION
const isProduction = process.env.NODE_ENV === "production";
if (isProduction) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
        throw new Error(
            "FATAL: Insecure or missing JWT_SECRET in production environment. " +
            "Please configure a strong random secret (minimum 16 characters)."
        );
    }
} else if (!process.env.JWT_SECRET) {
    console.warn(
        "[DEV NOTICE] JWT_SECRET is not set in environment. " +
        "Set JWT_SECRET in server/.env."
    );
}

// APP
const app = express();

// HTTP SERVER
const server = http.createServer(app);

// Allowed origin for both REST (cors) and Socket.io. Reads CLIENT_URL from
// .env if present, otherwise falls back to the Vite dev server default so
// behaviour is unchanged from before.
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// SOCKET SERVER
const io = new Server(server, {

    cors: {
        origin: CLIENT_URL,
        methods: ["GET", "POST"]
    }

});

// Lets any controller send a real-time push for a notification it just
// wrote to the database via req.app.get("io"), without controllers needing
// to import/construct their own Socket.io instance.
app.set("io", io);

// MIDDLEWARE

// Behind a reverse proxy / load balancer (nginx, an ALB, Render, Fly...) the
// real client IP arrives in X-Forwarded-For, and the rate limiters below would
// otherwise see every user as the proxy's IP. Set TRUST_PROXY to the number of
// proxy hops (usually 1) to enable it. Unset (the default) = no proxy, same
// behaviour as before.
if (process.env.TRUST_PROXY) {
    const hops = Number(process.env.TRUST_PROXY);
    app.set("trust proxy", Number.isNaN(hops) ? process.env.TRUST_PROXY : hops);
}


// SECURITY HEADERS
// Sets a sane set of HTTP security headers (X-Content-Type-Options,
// X-Frame-Options, a default Content-Security-Policy, removes
// X-Powered-By, etc). This is a pure JSON API (the only non-JSON response
// is the plain-text "/" health check below), so the default policy has
// nothing to break here - crossOriginResourcePolicy is left at Helmet's
// default since all uploaded media is served from Cloudinary, not this
// server.
app.use(helmet());

// CORS - explicit allow-list rather than Express/cors' wide-open defaults.
// Only CLIENT_URL (the real frontend origin) may call this API, only with
// the methods and headers the app actually uses, and without credentials
// (the app sends its JWT in an Authorization header, not a cookie, so
// there's no session cookie to protect with credentialed CORS).
app.use(cors({
    origin: CLIENT_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false
}));

app.use(express.json());

// Return a clean JSON 400 instead of an HTML error page when the request
// body is malformed JSON (e.g. a stray comma), instead of crashing.
app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON in request body"
        });
    }
    next(err);
});

// RATE LIMITING
// A generous global ceiling against scripted abuse/bots across the whole
// API, well above anything a real user (or this app's own polling/search/
// pagination traffic) would ever hit. Login/register and the AI chatbot
// get their own, much stricter limiters directly on their routes (see
// authRoutes.js and aiChatRoutes.js) since those are the actual
// brute-force and cost-abuse targets - this one is just a backstop.
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please try again later." }
});
app.use("/api", globalLimiter);

// API DOCUMENTATION
// Machine-readable OpenAPI spec + interactive Swagger UI. Registered before
// the versioned routers so /api/v1/docs and /api/v1/openapi.json never fall
// through to the 404 handler. Swagger UI needs inline scripts/styles, so the
// strict default Content-Security-Policy is relaxed for THESE two paths only;
// every other response keeps Helmet's full policy.
const docsCsp = helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
        "script-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:"],
        "upgrade-insecure-requests": null
    }
});

app.get("/api/v1/openapi.json", (req, res) => res.json(openApiSpec));

app.use(
    "/api/v1/docs",
    docsCsp,
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
        customSiteTitle: "Eventora API Docs",
        swaggerOptions: { persistAuthorization: true, displayRequestDuration: true }
    })
);

// API ROUTES
// /api/v1 is the canonical, versioned API. The unversioned /api prefix is
// kept as a deprecated alias of v1 (same router, same handlers) so older
// clients and bookmarks keep working; responses from it carry a
// Deprecation header pointing at the versioned equivalent.
app.use("/api/v1", (req, res, next) => {
    res.set("X-API-Version", "v1");
    next();
});

app.use("/api/v1", v1Routes);

app.use("/api", (req, res, next) => {
    // Requests under /api/v1 that matched nothing fall through to here;
    // they aren't "legacy" calls, so leave them without the header.
    if (req.path.startsWith("/v1")) return next();
    res.set("X-API-Version", "v1");
    res.set("Deprecation", "true");
    res.set("Link", `</api/v1${req.url}>; rel="successor-version"`);
    next();
}, v1Routes);

// TEST ROUTE
app.get("/", (req, res) => {

    res.send("Eventora API Running");

});

// SOCKET AUTH MIDDLEWARE
// FIXED: previously anyone could open a socket connection with no identity
// check at all, and every event (join_room, send_message, ...) trusted
// whatever the client claimed. Now a valid JWT (the same one issued at
// login) is required to connect, and socket.user is the verified identity.
io.use(async (socket, next) => {

    const token = socket.handshake.auth?.token;

    if (!token) {
        return next(new Error("Authentication required"));
    }

    let decoded;

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return next(new Error("Invalid or expired token"));
    }

    // Same rule as the REST authMiddleware: a suspended (or deleted)
    // account can't open a socket on an old, still-valid token. Accounts
    // suspended while connected are disconnected by adminController.banUser.
    try {
        const check = await pool.query(
            `SELECT is_banned FROM users WHERE id = $1`,
            [decoded.id]
        );

        if (check.rows.length === 0 || check.rows[0].is_banned) {
            return next(new Error("Account suspended"));
        }
    } catch (error) {
        console.log("SOCKET AUTH CHECK ERROR:", error.message);
        return next(new Error("Authentication failed"));
    }

    socket.user = decoded;
    next();

});

// SOCKET CONNECTION

const onlineUsers = {};

io.on("connection", (socket) => {

    console.log(
        "User connected:",
        socket.id
    );

    // Every authenticated socket automatically joins a personal room keyed
    // by their user id. This lets us push a lightweight "you have a new
    // message" ping to someone even while they're looking at a DIFFERENT
    // conversation, so their chat sidebar can update live without needing
    // to be joined to every room at once.
    socket.join(`user-${socket.user.id}`);

    // USER ONLINE
    // FIXED: use the verified user id from the JWT rather than whatever
    // id the client claims to be.
    socket.on(

        "user_online",

        () => {

            onlineUsers[socket.user.id] = socket.id;

            io.emit(

                "online_users",

                Object.keys(
                    onlineUsers
                )

            );

        }

    );

    // JOIN ROOM
    socket.on(

        "join_room",

        (roomId) => {

            socket.join(
                roomId
            );

            console.log(

                `Joined room: ${roomId}`

            );

        }

    );

    // TYPING
    socket.on(

        "typing",

        (data) => {

            socket.to(

                data.roomId

            ).emit(

                "user_typing",

                data.sender

            );

        }

    );

    // SEND MESSAGE
    socket.on(

        "send_message",

        async (data) => {

            try {

                if (!data || !data.roomId || !data.message) {
                    return;
                }

                // FIXED: sender_name/sender_id now come from the verified
                // socket identity, not the client payload, so a user can
                // no longer send a message pretending to be someone else.
                const messageToSave = {
                    roomId: data.roomId,
                    sender_id: socket.user.id,
                    sender_name: socket.user.name,
                    message: data.message,
                    fileUrl: data.fileUrl || null
                };

                const inserted = await pool.query(

                    `
                    INSERT INTO messages
                    (
                        room_id,
                        sender_id,
                        sender_name,
                        message,
                        file_url,
                        seen
                    )
                    VALUES ($1,$2,$3,$4,$5,$6)
                    RETURNING id, created_at
                    `,

                    [
                    messageToSave.roomId,

                    messageToSave.sender_id,

                    messageToSave.sender_name,

                    messageToSave.message,

                    messageToSave.fileUrl,

                    false
                    ]

                );

                const broadcastPayload = {
                    ...messageToSave,
                    id: inserted.rows[0].id,
                    created_at: inserted.rows[0].created_at,
                    seen: false
                };

                io.to(

                    messageToSave.roomId

                ).emit(

                    "receive_message",

                    broadcastPayload

                );

                // Ping the recipient's personal room so their conversation
                // list refreshes even if they currently have a different
                // conversation open (or the chat page closed but connected
                // elsewhere in the app).
                const roomMatch = messageToSave.roomId.match(/^chat-v(\d+)-c(\d+)$/);

                if (roomMatch) {

                    const vendorIdInRoom = Number(roomMatch[1]);
                    const customerIdInRoom = Number(roomMatch[2]);

                    let recipientUserId = null;

                    if (socket.user.id === customerIdInRoom) {
                        // sender is the customer -> recipient is the vendor's owner
                        const vendorOwner = await pool.query(
                            "SELECT user_id FROM vendors WHERE id = $1",
                            [vendorIdInRoom]
                        );
                        recipientUserId = vendorOwner.rows[0]?.user_id;
                    } else {
                        // sender is the vendor -> recipient is the customer
                        recipientUserId = customerIdInRoom;
                    }

                    if (recipientUserId) {

                        io.to(`user-${recipientUserId}`).emit("conversation_updated", {
                            roomId: messageToSave.roomId
                        });

                        // Is the recipient currently looking at THIS exact
                        // conversation? If so, still write the permanent
                        // notification record, but mark it read up front -
                        // no point bumping their badge or popping a toast
                        // for a message they're already seeing on screen.
                        const socketsInRoom = io.sockets.adapter.rooms.get(messageToSave.roomId) || new Set();

                        let recipientIsViewingRoom = false;

                        for (const socketId of socketsInRoom) {
                            const s = io.sockets.sockets.get(socketId);
                            if (s?.user?.id === recipientUserId) {
                                recipientIsViewingRoom = true;
                                break;
                            }
                        }

                        const preview = messageToSave.message.length > 80
                            ? `${messageToSave.message.slice(0, 80)}...`
                            : messageToSave.message;

                        await createNotification(io, {
                            userId: recipientUserId,
                            type: "new_message",
                            title: `New message from ${messageToSave.sender_name}`,
                            message: preview,
                            link: "/chat",
                            isRead: recipientIsViewingRoom
                        });

                    }

                }

            } catch (error) {

                console.log(
                    error
                );

            }

        }

    );
    socket.on(

        "mark_seen",

        async (roomId) => {

            try {

                await pool.query(

                    `
                    UPDATE messages

                    SET seen = TRUE

                    WHERE room_id = $1
                    AND sender_id IS DISTINCT FROM $2
                    `,

                    [roomId, socket.user.id]

                );

                // SEND UPDATE TO ROOM

                io.to(

                    roomId

                ).emit(

                    "messages_seen",

                    roomId

                );

            } catch (error) {

                console.log(
                    error
                );

            }

        }

    );

    // DISCONNECT
    socket.on(

        "disconnect",

        () => {

            for (

                const userId

                in

                onlineUsers

            ) {

                if (

                    onlineUsers[userId]

                    ===

                    socket.id

                ) {

                    delete onlineUsers[userId];

                }

            }

            io.emit(

                "online_users",

                Object.keys(
                    onlineUsers
                )

            );

            console.log(

                "User disconnected"

            );

        }

    );

});

// UNKNOWN API ROUTE -> clean JSON 404 instead of Express's default HTML page
app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: `No API route: ${req.method} ${req.originalUrl}`
    });
});

// GLOBAL ERROR HANDLER (safety net for anything a controller didn't catch)
app.use((err, req, res, next) => {
    console.error("UNHANDLED ERROR:", err);
    res.status(500).json({
        success: false,
        message: "Something went wrong on the server"
    });
});

// PORT
const PORT =
    process.env.PORT || 5000;

// START SERVER
// The schema is brought up to date BEFORE the server accepts requests, so a
// database created by an older version of the app never meets code that
// expects newer columns (see db/migrate.js).
const { applySchema } = require("./db/migrate");

applySchema().then(() => {

    server.listen(PORT, () => {

        console.log(
            `Server running on port ${PORT}`
        );

    });

});

// GRACEFUL SHUTDOWN
// Docker/Kubernetes stop a container with SIGTERM and then SIGKILL after a
// grace period. Stop accepting new connections, let in-flight requests and
// sockets finish, close the DB pool, and exit cleanly - instead of dropping
// requests mid-flight.
let shuttingDown = false;

const shutdown = (signal) => {

    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`${signal} received, shutting down gracefully...`);

    // Hard stop if something hangs (open keep-alive connections, etc).
    const forceExit = setTimeout(() => {
        console.error("Shutdown timed out, forcing exit");
        process.exit(1);
    }, 10000);
    forceExit.unref();

    io.close(() => {
        // io.close() also closes the underlying HTTP server.
        pool.end().then(
            () => process.exit(0),
            () => process.exit(1)
        );
    });

};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));