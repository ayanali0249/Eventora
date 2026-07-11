import {
    useEffect,
    useState,
    useContext,
    useRef
} from "react";

import { io } from "socket.io-client";

import API from "../services/api";

import toast from "react-hot-toast";

import {
    NotificationContext
} from "../context/NotificationContext";

// SOCKET CONNECTION
const socket = io("http://localhost:5000");

function ChatPage() {

    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [sending, setSending] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUser, setTypingUser] = useState("");
    const bottomRef = useRef(null);
    const roomId = localStorage.getItem("currentRoom") || "booking-1";

    const {
        addNotification
    } = useContext(
        NotificationContext
    );

    // LOAD OLD MESSAGES
    const fetchMessages = async () => {

        try {

            const response = await API.get(
                `/chat/${roomId}`
            );

            setMessages(
                response.data.messages
            );

        } catch (error) {

            console.log(error);

        }

    };

    // SOCKET SETUP
useEffect(() => {

    socket.emit(
        "join_room",
        roomId
    );
    socket.emit(

        "mark_seen",

        roomId

    );

    const user = JSON.parse(

        localStorage.getItem(
            "user"
        )

    );

    if(user?.id){

        socket.emit(

            "user_online",

            user.id

        );

    }

    fetchMessages();

    // RECEIVE MESSAGE
    socket.on(

        "receive_message",

        (data) => {

            addNotification(

                `New message from ${data.sender_name}`

            );

            setMessages(

                (prev) => [

                    ...prev,

                    data

                ]

            );

        }

    );

    // ONLINE USERS
    socket.on(

        "online_users",

        (users) => {

            setOnlineUsers(
                users
            );

        }

    );

    // TYPING
    let typingTimeout;

    socket.on(

        "user_typing",

        (name) => {

            setTypingUser(

                `${name} is typing...`

            );

            clearTimeout(
                typingTimeout
            );

            typingTimeout = setTimeout(

                () => {

                    setTypingUser("");

                },

                1500

            );

        }

    );
    socket.on(

    "messages_seen",

    (updatedRoom) => {

        if (

            updatedRoom !== roomId

        ) return;

        setMessages(

            (prev) =>

                prev.map(

                    (msg) => ({

                        ...msg,

                        seen: true

                    })

                )

        );

    }

);

    return () => {

        socket.off(
            "receive_message"
        );

        socket.off(
            "online_users"
        );

        socket.off(
            "user_typing"
        );

        socket.off(
            "messages_seen"
        );

    };

}, [

roomId

]);

    // AUTO SCROLL
    useEffect(() => {

        bottomRef.current?.scrollIntoView({

            behavior: "smooth"

        });

    }, [messages]);

    // SEND MESSAGE
    const sendMessage = async () => {

        try {

            if (
                !message.trim() &&
                !selectedFile
            ) return;

            setSending(true);

            const user = JSON.parse(
                localStorage.getItem("user")
            );

            let uploadedUrl = "";

            // FILE UPLOAD
            if (selectedFile) {

                const formData =
                    new FormData();

                formData.append(
                    "file",
                    selectedFile
                );

                const uploadRes =
                    await API.post(

                        "/chat-upload",

                        formData

                    );

                uploadedUrl =
                    uploadRes.data.fileUrl;

            }

            const messageData = {

                roomId,

                sender_name:
                    user?.name ||
                    "Anonymous",

                message,

                fileUrl:
                    uploadedUrl

            };

            socket.emit(

                "send_message",

                messageData

            );

            setMessage("");

            setSelectedFile(null);

        } catch (error) {

            console.log(error);

            toast.error(
                "Message failed"
            );

        } finally {

            setSending(false);

        }

    };

    return (

        <div className="min-h-screen bg-gray-100 flex items-center justify-center px-6 py-10">

            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl p-8">

                <h1 className="text-4xl font-bold mb-2">

                    Real-Time Chat

                </h1>

                <div className="mb-5">

                    <p className="font-semibold">

                        Users Online:

                        {

                            onlineUsers.length || 0

                        }

                    </p>

                    <p className="text-gray-500">

                        {typingUser}

                    </p>

                </div>

                {/* CHAT AREA */}
                <div className="h-[500px] overflow-y-auto bg-gray-50 rounded-2xl p-6 space-y-4">

                    {

                        messages.length === 0

                        ?

                        (

                            <div className="text-center text-gray-500">

                                No messages yet

                            </div>

                        )

                        :

                        (

                            messages.map(

                                (msg, index) => (

                                    <div
                                        key={index}
                                        className="bg-purple-600 text-white px-5 py-3 rounded-2xl w-fit max-w-xs mb-3"
                                    >

                                        <div className="font-bold mb-1">

                                            {

                                                msg.sender_name ||

                                                "Anonymous"

                                            }

                                        </div>

                                        <div>

                                            {msg.message}
                                            <p className="text-xs mt-2">

                                                {

                                                msg.seen

                                                ?

                                                "✓✓ Seen"

                                                :

                                                "✓ Sent"

                                                }

                                            </p>

                                        </div>

                                        {

                                            (

                                                msg.fileUrl ||

                                                msg.file_url

                                            ) && (

                                                <img

                                                    src={
                                                        msg.fileUrl ||

                                                        msg.file_url
                                                    }

                                                    alt="shared"

                                                    className="mt-3 rounded-xl max-w-[220px] border shadow"

                                                />

                                            )

                                        }

                                    </div>

                                )

                            )

                        )

                    }

                    <div ref={bottomRef}></div>

                </div>

                {/* FILE SECTION */}

                <div className="mt-4">

                    <input

                        type="file"

                        accept="image/*"

                        onChange={(e) =>

                            setSelectedFile(
                                e.target.files[0]
                            )

                        }

                    />

                    {

                        selectedFile && (

                            <div className="mt-3 flex flex-col gap-2">

                                <p className="text-sm text-gray-500">

                                    {selectedFile.name}

                                </p>

                                <img

                                    src={
                                        URL.createObjectURL(
                                            selectedFile
                                        )
                                    }

                                    alt="preview"

                                    className="w-28 rounded-xl"

                                />

                            </div>

                        )

                    }

                </div>

                {/* INPUT AREA */}

                <div className="flex gap-4 mt-6">

                    <input

                        type="text"

                        placeholder="Type message..."

                        value={message}

                        onKeyDown={(e) => {

                            if (

                                e.key === "Enter"

                            ) {

                                sendMessage();

                            }

                        }}

                        onChange={(e) => {

                            setMessage(
                                e.target.value
                            );

                            const user = JSON.parse(

                                localStorage.getItem(
                                    "user"
                                )

                            );

                            socket.emit(

                                "typing",

                                {

                                    roomId,

                                    sender:
                                        user?.name

                                }

                            );

                        }}
                        className="flex-1 border rounded-2xl px-5 py-4"

                    />

                    <button

                        onClick={sendMessage}

                        disabled={sending}

                        className="px-8 py-4 bg-purple-600 text-white rounded-2xl disabled:opacity-50"

                    >

                        {

                            sending

                            ?

                            "Sending..."

                            :

                            "Send"

                        }

                    </button>

                </div>

            </div>

        </div>

    );

}

export default ChatPage;