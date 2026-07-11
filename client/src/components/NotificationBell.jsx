import {
    useContext,
    useState
} from "react";

import {
    NotificationContext
} from "../context/NotificationContext";

function NotificationBell() {

    const {
        notifications,
        removeNotification
    } = useContext(
        NotificationContext
    );

    const [
        open,
        setOpen
    ] = useState(false);

    return (

        <div className="relative">

            {/* BELL */}
            <button
                onClick={() =>
                    setOpen(!open)
                }
                className="relative text-3xl"
            >

                🔔

                {/* BADGE */}
                {
                    notifications.length > 0 && (

                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center">

                            {
                                notifications.length
                            }

                        </span>

                    )
                }

            </button>

            {/* DROPDOWN */}
            {
                open && (

                    <div className="absolute right-0 mt-4 w-96 bg-white shadow-2xl rounded-2xl p-5 z-50">

                        <h2 className="text-2xl font-bold mb-5">

                            Notifications

                        </h2>

                        {
                            notifications.length === 0 ? (

                                <p className="text-gray-500">
                                    No notifications
                                </p>

                            ) : (

                                <div className="space-y-4">

                                    {
                                        notifications.map(
                                            (notification) => (

                                                <div
                                                    key={notification.id}
                                                    className="bg-gray-100 rounded-xl p-4 flex items-start justify-between gap-4"
                                                >

                                                    <p className="text-gray-700">

                                                        {
                                                            notification.message
                                                        }

                                                    </p>

                                                    <button
                                                        onClick={() =>
                                                            removeNotification(
                                                                notification.id
                                                            )
                                                        }
                                                        className="text-red-500"
                                                    >

                                                        ✕

                                                    </button>

                                                </div>

                                            )
                                        )
                                    }

                                </div>

                            )
                        }

                    </div>

                )
            }

        </div>

    )

}

export default NotificationBell