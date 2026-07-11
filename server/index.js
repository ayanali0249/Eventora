const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const pool = require("./config/db");
// ROUTES
const authRoutes = require("./routes/authRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const chatRoutes = require("./routes/chatRoutes");
const chatUploadRoutes = require("./routes/chatUploadRoutes");
const reviewRoutes = require("./routes/reviewRoutes");

// CONFIG
dotenv.config();

// APP
const app = express();

// HTTP SERVER
const server = http.createServer(app);

// SOCKET SERVER
const io = new Server(server, {

    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }

});

// MIDDLEWARE
app.use(cors());

app.use(express.json());

// API ROUTES
app.use("/api/auth", authRoutes);

app.use("/api/vendors", vendorRoutes);

app.use("/api/bookings", bookingRoutes);

app.use("/api/chat", chatRoutes);

app.use("/api/chat-upload",chatUploadRoutes);

app.use("/api/reviews",reviewRoutes);

// TEST ROUTE
app.get("/", (req, res) => {

    res.send("Eventora API Running");

});

// SOCKET CONNECTION

const onlineUsers = {};

io.on("connection", (socket) => {

    console.log(
        "User connected:",
        socket.id
    );

    // USER ONLINE
    socket.on(

        "user_online",

        (userId) => {

            onlineUsers[userId] = socket.id;

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

                await pool.query(

                    `
                    INSERT INTO messages
                    (
                        room_id,
                        sender_name,
                        message,
                        file_url,
                        seen
                    )
                    VALUES ($1,$2,$3,$4,$5)
                    `,

                    [
                    data.roomId,

                    data.sender_name,

                    data.message,

                    data.fileUrl,

                    false
                    ]

                );

                io.to(

                    data.roomId

                ).emit(

                    "receive_message",

                    data

                );

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
                    `,

                    [roomId]

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

// PORT
const PORT =
    process.env.PORT || 5000;

// START SERVER
server.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    );

});