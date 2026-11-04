import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState
} from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { Bell } from "lucide-react";

import API from "../services/api";
import { AuthContext } from "./AuthContext";
import { SOCKET_URL } from "../config";

export const NotificationContext = createContext();

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotifications must be used within a NotificationProvider");
    }
    return context;
}

// Real, DB-persisted notifications (GET /api/v1/notifications) pushed live
// over a dedicated Socket.io connection - this replaces the old version of
// this file, which only ever held an in-memory array that reset on every
// refresh and only grew while ChatPage happened to be mounted. This
// connection is separate from ChatPage's own socket: it's opened once per
// login and stays alive app-wide, however the person navigates, instead of
// being tied to one page's lifecycle.
function NotificationProvider({ children }) {

    const { user, token } = useContext(AuthContext);

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const socketRef = useRef(null);

    const authHeaders = useCallback(() => ({
        headers: { Authorization: `Bearer ${token}` }
    }), [token]);

    const fetchNotifications = useCallback(async () => {

        if (!token) return;

        setLoading(true);

        try {

            const response = await API.get("/notifications", authHeaders());

            setNotifications(response.data.notifications);
            setUnreadCount(response.data.unread_count);

        } catch (error) {

            console.log(error);

        } finally {

            setLoading(false);

        }

    }, [token, authHeaders]);

    const markAsRead = async (id) => {

        const target = notifications.find((n) => n.id === id);

        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));

        if (target && !target.is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        try {

            await API.put(`/notifications/${id}/read`, {}, authHeaders());

        } catch (error) {

            console.log(error);

        }

    };

    const markAllAsRead = async () => {

        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);

        try {

            await API.put("/notifications/read-all", {}, authHeaders());

        } catch (error) {

            console.log(error);

        }

    };

    const removeNotification = async (id) => {

        const target = notifications.find((n) => n.id === id);

        setNotifications((prev) => prev.filter((n) => n.id !== id));

        if (target && !target.is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        try {

            await API.delete(`/notifications/${id}`, authHeaders());

        } catch (error) {

            console.log(error);

        }

    };

    useEffect(() => {

        if (!token || !user) {

            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }

            setNotifications([]);
            setUnreadCount(0);

            return;

        }

        fetchNotifications();

        const socket = io(SOCKET_URL, { auth: { token } });
        socketRef.current = socket;

        socket.on("new_notification", (notification) => {

            setNotifications((prev) => [notification, ...prev]);

            if (!notification.is_read) {

                setUnreadCount((prev) => prev + 1);

                toast(notification.title, { icon: <Bell size={16} /> });

            }

        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, user?.id]);

    return (

        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                loading,
                markAsRead,
                markAllAsRead,
                removeNotification,
                refresh: fetchNotifications
            }}
        >

            {children}

        </NotificationContext.Provider>

    );

}

export default NotificationProvider;
