import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";

import API from "../services/api";

// Standalone floating AI chatbot widget.
// Does not touch the existing socket.io vendor<->customer chat (ChatPage).
// Talks to the backend route: POST /api/v1/ai-chat

const AIChatbot = () => {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
        { sender: "bot", text: "Hi! I'm the Eventora Assistant. Ask me anything about booking vendors or planning your event." },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        if (open) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, open]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || loading) return;

        const newMessages = [...messages, { sender: "user", text }];
        setMessages(newMessages);
        setInput("");
        setLoading(true);

        try {
            const res = await API.post("/ai-chat", {
                message: text,
                // send prior turns (excluding the greeting) for context
                history: newMessages.slice(0, -1),
            });

            const reply = res?.data?.reply || "Sorry, something went wrong.";
            setMessages((prev) => [...prev, { sender: "bot", text: reply }]);
        } catch (err) {
            console.log("AI chatbot error:", err);
            setMessages((prev) => [
                ...prev,
                { sender: "bot", text: "Sorry, I couldn't reach the assistant right now." },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="fixed bottom-5 right-5 z-[1000]">

            {open && (
                <div className="w-[min(340px,calc(100vw-2.5rem))] h-[420px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-3 border border-gray-100">

                    <div className="bg-teal-600 text-white px-4 py-3 font-semibold font-display">
                        Eventora Assistant
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-cream">
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`px-3 py-2 rounded-xl max-w-[80%] text-sm whitespace-pre-wrap ${
                                        m.sender === "user"
                                            ? "bg-teal-600 text-white"
                                            : "bg-white border border-gray-100 text-ink"
                                    }`}
                                >
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="text-xs text-gray-400 px-1">Assistant is typing...</div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    <div className="flex border-t border-gray-100">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            className="flex-1 border-none px-3 py-3 outline-none text-sm"
                        />
                        <button
                            onClick={handleSend}
                            disabled={loading}
                            className="px-4 bg-teal-600 text-white hover:bg-teal-700 transition disabled:opacity-60"
                            aria-label="Send message"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            )}

            <button
                onClick={() => setOpen((o) => !o)}
                className="w-14 h-14 rounded-full bg-teal-600 text-white shadow-xl hover:bg-teal-700 transition flex items-center justify-center"
                aria-label="Toggle AI chatbot"
            >
                {open ? <X size={24} /> : <MessageCircle size={24} />}
            </button>

        </div>
    );
};

export default AIChatbot;
