import {
    createContext,
    useState
} from "react";

export const NotificationContext =
    createContext();

function NotificationProvider({
    children
}) {

    const [
        notifications,
        setNotifications
    ] = useState([]);

    // ADD NOTIFICATION
    const addNotification = (
        message
    ) => {

        const newNotification = {

            id: Date.now(),

            message

        };

        setNotifications((prev) => [

            newNotification,

            ...prev

        ]);

    };

    // REMOVE NOTIFICATION
    const removeNotification = (
        id
    ) => {

        setNotifications((prev) =>

            prev.filter(
                (n) => n.id !== id
            )

        );

    };

    return (

        <NotificationContext.Provider
            value={{
                notifications,
                addNotification,
                removeNotification
            }}
        >

            {children}

        </NotificationContext.Provider>

    )

}

export default NotificationProvider