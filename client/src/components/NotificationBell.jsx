import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Bell, X, Check, CheckCheck, Loader2,
    CalendarPlus, CalendarCheck2, CalendarClock, CalendarX2,
    CheckCircle2, XCircle, PartyPopper, Ban, MessageCircle, Star
} from "lucide-react";

import { useNotifications } from "../context/NotificationContext";

const TYPE_ICON = {
    booking_request: { Icon: CalendarPlus, className: "bg-sky-50 text-sky-600" },
    booking_approved: { Icon: CheckCircle2, className: "bg-sky-50 text-sky-600" },
    booking_confirmed: { Icon: CalendarCheck2, className: "bg-emerald-50 text-emerald-600" },
    booking_completed: { Icon: PartyPopper, className: "bg-teal-50 text-teal-700" },
    booking_rejected: { Icon: XCircle, className: "bg-rose-50 text-rose-600" },
    booking_cancelled: { Icon: Ban, className: "bg-gray-100 text-gray-500" },
    reschedule_proposed: { Icon: CalendarClock, className: "bg-blue-50 text-blue-600" },
    reschedule_accepted: { Icon: CalendarCheck2, className: "bg-emerald-50 text-emerald-600" },
    reschedule_declined: { Icon: CalendarX2, className: "bg-rose-50 text-rose-600" },
    new_message: { Icon: MessageCircle, className: "bg-teal-50 text-teal-700" },
    new_review: { Icon: Star, className: "bg-amber-50 text-amber-600" }
};

function timeAgo(dateStr) {

    const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);

    if (seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return new Date(dateStr).toLocaleDateString([], { day: "numeric", month: "short" });

}

function NotificationBell() {

    const {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        removeNotification
    } = useNotifications();

    const [open, setOpen] = useState(false);

    const navigate = useNavigate();
    const panelRef = useRef(null);

    // Close on outside click, so the dropdown never feels "stuck" open.
    useEffect(() => {

        if (!open) return;

        const handleClick = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);

    }, [open]);

    const handleNotificationClick = (notification) => {

        if (!notification.is_read) {
            markAsRead(notification.id);
        }

        setOpen(false);

        if (notification.link) {
            navigate(notification.link);
        }

    };

    return (

        <div className="relative" ref={panelRef}>

            {/* BELL */}
            <button
                onClick={() => setOpen((prev) => !prev)}
                className="relative text-gray-700 hover:text-teal-600 transition"
                aria-label="Notifications"
            >

                <Bell size={24} />

                {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[11px] font-semibold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}

            </button>

            {/* DROPDOWN */}
            {open && (

                <div className="absolute right-0 mt-4 w-96 max-w-[90vw] bg-white shadow-2xl rounded-2xl border border-gray-100 z-50 overflow-hidden">

                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">

                        <h2 className="text-lg font-bold text-gray-900">Notifications</h2>

                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-900 transition"
                            >
                                <CheckCheck size={14} />
                                Mark all read
                            </button>
                        )}

                    </div>

                    <div className="max-h-[28rem] overflow-y-auto">

                        {loading && notifications.length === 0 && (
                            <div className="flex items-center justify-center gap-2 text-gray-400 py-10 text-sm">
                                <Loader2 size={16} className="animate-spin" /> Loading...
                            </div>
                        )}

                        {!loading && notifications.length === 0 && (
                            <div className="py-12 px-6 text-center">
                                <Bell size={28} className="mx-auto text-gray-300" />
                                <p className="text-gray-500 text-sm mt-3">No notifications yet</p>
                            </div>
                        )}

                        {notifications.map((notification) => {

                            const { Icon, className } = TYPE_ICON[notification.type] || { Icon: Bell, className: "bg-gray-100 text-gray-500" };

                            return (
                                <div
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`flex items-start gap-3 px-5 py-4 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 transition ${!notification.is_read ? "bg-teal-50/40" : ""}`}
                                >

                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${className}`}>
                                        <Icon size={16} />
                                    </div>

                                    <div className="flex-1 min-w-0">

                                        <p className={`text-sm leading-snug ${!notification.is_read ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                                            {notification.title}
                                        </p>

                                        {notification.message && (
                                            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                                                {notification.message}
                                            </p>
                                        )}

                                        <p className="text-xs text-gray-400 mt-1">
                                            {timeAgo(notification.created_at)}
                                        </p>

                                    </div>

                                    <div className="flex flex-col items-center gap-2 shrink-0">

                                        {!notification.is_read && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                                                title="Mark as read"
                                                className="text-gray-300 hover:text-teal-600 transition"
                                            >
                                                <Check size={15} />
                                            </button>
                                        )}

                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeNotification(notification.id); }}
                                            title="Remove"
                                            className="text-gray-300 hover:text-rose-500 transition"
                                        >
                                            <X size={15} />
                                        </button>

                                    </div>

                                </div>
                            );

                        })}

                    </div>

                </div>

            )}

        </div>

    );

}

export default NotificationBell;
