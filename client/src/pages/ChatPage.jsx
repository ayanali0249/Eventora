import {
    useEffect,
    useState,
    useContext,
    useRef,
    useCallback
} from "react";

import { io } from "socket.io-client";

import API from "../services/api";

import toast from "react-hot-toast";

import { AuthContext } from "../context/AuthContext";

import {
    ArrowLeft,
    Send,
    Paperclip,
    X,
    Check,
    CheckCheck,
    MessageCircle
} from "lucide-react";
import { SOCKET_URL } from "../config";

// Small shared avatar: shows the image if there is one, otherwise a
// colored circle with the first letter of the name - so a vendor/customer
// without a profile picture still looks intentional, not broken.
function Avatar({ name, image, size = 44, online = false }) {
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            {image ? (
                <img
                    src={image}
                    alt={name}
                    className="w-full h-full rounded-full object-cover"
                />
            ) : (
                <div
                    className="w-full h-full rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold"
                    style={{ fontSize: size * 0.4 }}
                >
                    {name?.[0]?.toUpperCase() || "?"}
                </div>
            )}
            {online && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
            )}
        </div>
    );
}

// Formats a timestamp for the sidebar preview ("2:45 PM", "Yesterday", "12 Sep")
function formatPreviewTime(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (isYesterday) return "Yesterday";
    return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

// Formats a date divider label for a group of messages ("Today", "Yesterday", "12 September 2026")
function formatDateDivider(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    return date.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
}

function ChatPage() {

    const { user, token } = useContext(AuthContext);

    const [conversations, setConversations] = useState([]);
    const [loadingConversations, setLoadingConversations] = useState(true);

    const [activeRoom, setActiveRoom] = useState(null);
    const [activeMeta, setActiveMeta] = useState(null);

    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [sending, setSending] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUser, setTypingUser] = useState("");
    const [loadingMessages, setLoadingMessages] = useState(false);

    // On phones we only show one pane at a time.
    const [mobileView, setMobileView] = useState("list");

    const bottomRef = useRef(null);
    const socketRef = useRef(null);
    const activeRoomRef = useRef(null);

    useEffect(() => {
        activeRoomRef.current = activeRoom;
    }, [activeRoom]);

    // FETCH CONVERSATION LIST
    const fetchConversations = useCallback(async () => {
        try {
            setLoadingConversations(true);
            const response = await API.get("/chat/conversations/list", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConversations(response.data.conversations);
            return response.data.conversations;
        } catch (error) {
            console.log(error);
            return [];
        } finally {
            setLoadingConversations(false);
        }
    }, [token]);

    // LOAD MESSAGES FOR A ROOM
    const fetchMessages = async (roomId) => {
        try {
            setLoadingMessages(true);
            const response = await API.get(`/chat/${roomId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(response.data.messages);
        } catch (error) {
            console.log(error);
            toast.error("Could not load this conversation");
        } finally {
            setLoadingMessages(false);
        }
    };

    const selectConversation = (roomId, meta) => {
        setActiveRoom(roomId);
        setActiveMeta(meta);
        setMobileView("thread");
        setMessages([]);

        socketRef.current?.emit("join_room", roomId);
        socketRef.current?.emit("mark_seen", roomId);
        fetchMessages(roomId);

        // Clear the unread badge for this conversation locally right away
        setConversations((prev) =>
            prev.map((c) => (c.room_id === roomId ? { ...c, unread_count: 0 } : c))
        );
    };

    // INITIAL SETUP: connect socket, load conversation list, and honor a
    // conversation chosen elsewhere in the app (vendor page, booking card,
    // vendor dashboard, history page all set these two localStorage keys).
    useEffect(() => {

        const socket = io(SOCKET_URL, { auth: { token } });
        socketRef.current = socket;

        socket.on("connect_error", () => {
            toast.error("Chat connection failed. Please log in again.");
        });

        socket.emit("user_online");

        socket.on("online_users", (users) => setOnlineUsers(users));

        socket.on("receive_message", (data) => {

            if (data.roomId === activeRoomRef.current) {
                setMessages((prev) => [...prev, data]);
                socket.emit("mark_seen", data.roomId);
            }

            // "New message" is now a real, DB-persisted notification pushed
            // separately by the server (see NotificationContext) so it
            // survives a refresh and shows up anywhere in the app, not
            // just while this page happens to be mounted - no need to
            // raise one here too.

            fetchConversations();

        });

        socket.on("conversation_updated", () => {
            fetchConversations();
        });

        let typingTimeout;
        socket.on("user_typing", (name) => {
            setTypingUser(`${name} is typing...`);
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => setTypingUser(""), 1500);
        });

        socket.on("messages_seen", (updatedRoom) => {
            if (updatedRoom !== activeRoomRef.current) return;
            setMessages((prev) => prev.map((msg) => ({ ...msg, seen: true })));
        });

        (async () => {
            const list = await fetchConversations();

            const pendingRoom = localStorage.getItem("currentRoom");
            const pendingLabel = localStorage.getItem("currentRoomLabel");

            if (pendingRoom) {

                const existing = list.find((c) => c.room_id === pendingRoom);

                if (existing) {
                    selectConversation(existing.room_id, {
                        name: existing.other_name,
                        image: existing.other_image,
                        subtitle: existing.other_subtitle,
                        otherUserId: existing.other_user_id
                    });
                } else {
                    // Brand new conversation - no messages yet, so it won't
                    // appear in the list until the first message is sent.
                    selectConversation(pendingRoom, {
                        name: pendingLabel || "New conversation",
                        image: null,
                        subtitle: null,
                        otherUserId: null
                    });
                }

                localStorage.removeItem("currentRoom");
                localStorage.removeItem("currentRoomLabel");

            } else if (list.length > 0 && window.innerWidth >= 768) {
                // On desktop, open the most recent conversation by default
                // so the page never looks empty on arrival.
                selectConversation(list[0].room_id, {
                    name: list[0].other_name,
                    image: list[0].other_image,
                    subtitle: list[0].other_subtitle,
                    otherUserId: list[0].other_user_id
                });
            }

        })();

        return () => {
            clearTimeout(typingTimeout);
            socket.off("receive_message");
            socket.off("online_users");
            socket.off("user_typing");
            socket.off("messages_seen");
            socket.off("conversation_updated");
            socket.off("connect_error");
            socket.disconnect();
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // AUTO SCROLL
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // SEND MESSAGE
    const sendMessage = async () => {
        try {
            if (!message.trim() && !selectedFile) return;
            if (!socketRef.current || !activeRoom) return;

            setSending(true);

            let uploadedUrl = "";

            if (selectedFile) {
                setUploadingFile(true);
                const formData = new FormData();
                formData.append("file", selectedFile);

                const uploadRes = await API.post("/chat-upload", formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "multipart/form-data"
                    }
                });

                uploadedUrl = uploadRes.data.fileUrl;
                setUploadingFile(false);
            }

            socketRef.current.emit("send_message", {
                roomId: activeRoom,
                message,
                fileUrl: uploadedUrl
            });

            setMessage("");
            setSelectedFile(null);

        } catch (error) {
            console.log(error);
            toast.error(error.response?.data?.message || "Message failed");
        } finally {
            setSending(false);
            setUploadingFile(false);
        }
    };

    const isOnline = activeMeta?.otherUserId && onlineUsers.includes(String(activeMeta.otherUserId));

    // Group messages by calendar day for date dividers.
    const groupedMessages = [];
    let lastDateKey = null;
    messages.forEach((msg) => {
        const dateKey = new Date(msg.created_at || 0).toDateString();
        if (dateKey !== lastDateKey) {
            groupedMessages.push({ type: "divider", key: `divider-${dateKey}`, label: formatDateDivider(msg.created_at) });
            lastDateKey = dateKey;
        }
        groupedMessages.push({ type: "message", data: msg });
    });

    return (

        <div className="h-[calc(100vh-73px)] bg-gray-50 flex">

            {/* CONVERSATION LIST */}
            <div className={`w-full md:w-[340px] border-r border-gray-200 bg-white flex-col ${mobileView === "list" ? "flex" : "hidden md:flex"}`}>

                <div className="px-6 py-5 border-b border-gray-100">
                    <h1 className="text-2xl font-display font-semibold text-ink">Messages</h1>
                </div>

                <div className="flex-1 overflow-y-auto">

                    {loadingConversations && (
                        <div className="p-4 space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="w-11 h-11 rounded-full bg-gray-200" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-gray-200 rounded w-2/3" />
                                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loadingConversations && conversations.length === 0 && (
                        <div className="text-center px-6 py-16">
                            <MessageCircle size={40} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500 text-sm">
                                No conversations yet. Message a vendor from their profile to start chatting.
                            </p>
                        </div>
                    )}

                    {!loadingConversations && conversations.map((conv) => {
                        const online = conv.other_user_id && onlineUsers.includes(String(conv.other_user_id));
                        return (
                            <button
                                key={conv.room_id}
                                onClick={() => selectConversation(conv.room_id, {
                                    name: conv.other_name,
                                    image: conv.other_image,
                                    subtitle: conv.other_subtitle,
                                    otherUserId: conv.other_user_id
                                })}
                                className={`w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-gray-50 transition border-l-4 ${
                                    activeRoom === conv.room_id ? "border-teal-600 bg-teal-50/50" : "border-transparent"
                                }`}
                            >
                                <Avatar name={conv.other_name} image={conv.other_image} online={online} />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-semibold text-ink truncate">{conv.other_name}</p>
                                        <span className="text-xs text-gray-400 shrink-0">{formatPreviewTime(conv.last_message_at)}</span>
                                    </div>
                                    <p className="text-sm text-gray-500 truncate">
                                        {conv.last_file_url ? "📷 Photo" : (conv.last_message || "")}
                                    </p>
                                </div>

                                {conv.unread_count > 0 && (
                                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center shrink-0">
                                        {conv.unread_count}
                                    </span>
                                )}
                            </button>
                        );
                    })}

                </div>

            </div>

            {/* MESSAGE THREAD */}
            <div className={`flex-1 flex-col ${mobileView === "thread" ? "flex" : "hidden md:flex"}`}>

                {!activeRoom ? (

                    <div className="flex-1 flex items-center justify-center text-center px-6">
                        <div>
                            <MessageCircle size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500">Select a conversation to start chatting.</p>
                        </div>
                    </div>

                ) : (

                    <>
                        {/* HEADER */}
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-white">

                            <button
                                onClick={() => setMobileView("list")}
                                className="md:hidden text-gray-500 hover:text-ink transition"
                                aria-label="Back to conversations"
                            >
                                <ArrowLeft size={22} />
                            </button>

                            <Avatar name={activeMeta?.name} image={activeMeta?.image} size={40} online={isOnline} />

                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-ink truncate">{activeMeta?.name}</p>
                                <p className="text-xs text-gray-400">
                                    {typingUser || (isOnline ? "Online" : "Offline")}
                                </p>
                            </div>

                        </div>

                        {/* MESSAGES */}
                        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-1">

                            {loadingMessages ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className={`h-14 w-2/3 bg-gray-200 rounded-2xl animate-pulse ${i % 2 ? "ml-auto" : ""}`} />
                                    ))}
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center text-gray-500 mt-10">
                                    No messages yet. Say hello to start the conversation.
                                </div>
                            ) : (
                                groupedMessages.map((item, index) => {

                                    if (item.type === "divider") {
                                        return (
                                            <div key={item.key} className="flex items-center justify-center my-4">
                                                <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                                                    {item.label}
                                                </span>
                                            </div>
                                        );
                                    }

                                    const msg = item.data;
                                    const isMine = msg.sender_id === user?.id;

                                    return (
                                        <div
                                            key={msg.id ?? `msg-${index}`}
                                            className={`flex mb-3 ${isMine ? "justify-end" : "justify-start"}`}
                                        >
                                            {!isMine && (
                                                <div className="mr-2 self-end">
                                                    <Avatar name={msg.sender_name} image={activeMeta?.image} size={28} />
                                                </div>
                                            )}

                                            <div
                                                className={`px-4 py-2.5 rounded-2xl w-fit max-w-xs md:max-w-md ${
                                                    isMine
                                                        ? "bg-teal-600 text-white rounded-br-sm"
                                                        : "bg-white border border-gray-100 text-ink rounded-bl-sm"
                                                }`}
                                            >
                                                {msg.message && <div className="whitespace-pre-wrap break-words">{msg.message}</div>}

                                                {(msg.fileUrl || msg.file_url) && (
                                                    <img
                                                        src={msg.fileUrl || msg.file_url}
                                                        alt="shared"
                                                        className="mt-2 rounded-xl max-w-[220px] border shadow"
                                                    />
                                                )}

                                                <div className={`flex items-center gap-1 mt-1 text-[11px] ${isMine ? "text-teal-100 justify-end" : "text-gray-400"}`}>
                                                    {new Date(msg.created_at || 0).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                                    {isMine && (msg.seen ? <CheckCheck size={13} /> : <Check size={13} />)}
                                                </div>
                                            </div>
                                        </div>
                                    );

                                })
                            )}

                            <div ref={bottomRef}></div>

                        </div>

                        {/* SELECTED FILE PREVIEW */}
                        {selectedFile && (
                            <div className="px-6 py-2 border-t border-gray-100 flex items-center gap-3">
                                <img
                                    src={URL.createObjectURL(selectedFile)}
                                    alt="preview"
                                    className="w-12 h-12 object-cover rounded-lg"
                                />
                                <p className="text-sm text-gray-500 flex-1 truncate">{selectedFile.name}</p>
                                <button
                                    onClick={() => setSelectedFile(null)}
                                    className="text-rose-500 hover:text-rose-600 transition"
                                    aria-label="Remove attachment"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}

                        {/* INPUT */}
                        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-200 bg-white">

                            <label className="text-gray-400 hover:text-teal-600 cursor-pointer transition p-2">
                                <Paperclip size={20} />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setSelectedFile(e.target.files[0])}
                                    className="hidden"
                                />
                            </label>

                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={message}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") sendMessage();
                                }}
                                onChange={(e) => {
                                    setMessage(e.target.value);
                                    socketRef.current?.emit("typing", {
                                        roomId: activeRoom,
                                        sender: user?.name
                                    });
                                }}
                                className="flex-1 border border-gray-200 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-teal-400"
                            />

                            <button
                                onClick={sendMessage}
                                disabled={sending || uploadingFile}
                                className="w-11 h-11 rounded-full bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 transition disabled:opacity-50 shrink-0"
                                aria-label="Send message"
                            >
                                <Send size={18} />
                            </button>

                        </div>
                    </>

                )}

            </div>

        </div>

    );

}

export default ChatPage;
