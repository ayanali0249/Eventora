import { useNavigate } from "react-router-dom";

function BookingCard({ booking }) {

    const navigate = useNavigate();

    // STATUS COLORS
    const statusColors = {

        pending: "bg-yellow-100 text-yellow-700",

        approved: "bg-green-100 text-green-700",

        rejected: "bg-red-100 text-red-700",

        completed: "bg-blue-100 text-blue-700"

    };

    const openChat = () => {

        localStorage.setItem(

            "currentRoom",

            `booking-${booking.id}`

        );

        navigate("/chat");

    };

    return (

        <div className="bg-white rounded-3xl shadow-lg p-8">

            {/* HEADER */}

            <div className="flex items-start justify-between gap-6">

                <div>

                    <h2 className="text-3xl font-bold text-gray-900">

                        {booking.business_name}

                    </h2>

                    <p className="text-gray-500 mt-2">

                        {booking.category} • {booking.city}

                    </p>

                </div>

                <div className="flex flex-col items-end gap-4">

                    {/* STATUS */}

                    <div
                        className={`px-5 py-2 rounded-full font-semibold capitalize ${statusColors[booking.booking_status]}`}
                    >

                        {booking.booking_status}

                    </div>

                    {/* CHAT BUTTON */}

                    <button

                        onClick={openChat}

                        className="px-5 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"

                    >

                        Open Chat

                    </button>

                </div>

            </div>

            {/* EVENT DETAILS */}

            <div className="grid md:grid-cols-2 gap-6 mt-10">

                <div>

                    <p className="text-gray-400 text-sm">
                        Event Type
                    </p>

                    <h3 className="text-xl font-semibold text-gray-900 mt-2">

                        {booking.event_type}

                    </h3>

                </div>

                <div>

                    <p className="text-gray-400 text-sm">
                        Guest Count
                    </p>

                    <h3 className="text-xl font-semibold text-gray-900 mt-2">

                        {booking.guest_count}

                    </h3>

                </div>

                <div>

                    <p className="text-gray-400 text-sm">
                        Event Date
                    </p>

                    <h3 className="text-xl font-semibold text-gray-900 mt-2">

                        {

                            new Date(

                                booking.event_date

                            ).toLocaleDateString()

                        }

                    </h3>

                </div>

                <div>

                    <p className="text-gray-400 text-sm">
                        Price Range
                    </p>

                    <h3 className="text-xl font-semibold text-purple-600 mt-2">

                        {booking.price_range}

                    </h3>

                </div>

            </div>

            {/* MESSAGE */}

            <div className="mt-10">

                <p className="text-gray-400 text-sm">

                    Your Message

                </p>

                <p className="text-gray-700 mt-3 leading-relaxed">

                    {booking.message}

                </p>

            </div>

        </div>

    );

}

export default BookingCard;