import { useEffect, useState } from "react";

import API from "../services/api";
import toast from "react-hot-toast";
import EditVendorModal from "../components/EditVendorModal";

function VendorDashboardPage() {

    const [vendor,setVendor] = useState(null);

    const [bookings, setBookings] = useState([]);

    const [loading, setLoading] = useState(true);

    const [showEdit,setShowEdit] = useState(false);

    const totalBookings = bookings.length;

    const pendingBookings = bookings.filter(

    booking =>

    booking.booking_status === "pending"

    ).length;

    const approvedBookings = bookings.filter(

    booking =>

    booking.booking_status === "approved"

    ).length;

    const completedBookings = bookings.filter(

    booking =>

    booking.booking_status === "completed"

    ).length;

    const [avgRating,setAvgRating] = useState(0);

    const [totalReviews,setTotalReviews] = useState(0);

    // FETCH BOOKINGS
    const fetchVendorBookings = async () => {

        try {

            const token = localStorage.getItem("token");

            const response = await API.get(

                "/bookings/vendor",

                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }

            );

            console.log(response.data);

            setBookings(response.data.bookings);

        } catch (error) {

            console.log(error);

        } finally {

            setLoading(false);

        }

    };

    const fetchVendor = async () => {

        try {

            const token = localStorage.getItem(

                "token"

            );

            const response = await API.get(

                "/vendors/my-profile",

                {

                    headers: {

                        Authorization:

                        `Bearer ${token}`

                    }

                }

            );

            setVendor(

                response.data.vendor

            );

            console.log(

                "VENDOR DATA:",

                response.data

            );

        }

        catch(error){

            console.log(error);

        }

    };

    // UPDATE STATUS
    const updateStatus = async (
        bookingId,
        status
    ) => {

        try {

            const token = localStorage.getItem("token");
            alert(token);
            await API.put(

                `/bookings/${bookingId}/status`,

                { status },

                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }

            );

            fetchVendorBookings();

        } catch (error) {

            console.log(error);

            toast.error(
             "Failed to update booking"
            );

        }

    };

    useEffect(() => {

        fetchVendorBookings();

        fetchVendor();

    }, []);

    const fetchReviewStats = async () => {

        try {

            if(!vendor?.id) return;

            const response = await API.get(

                `/reviews/stats/${vendor.id}`

            );

            setAvgRating(

                response.data.stats.avg_rating

            );

            setTotalReviews(

                response.data.stats.total_reviews

            );

        }

        catch(error){

            console.log(error);

        }

    };

    useEffect(() => {

        if(

            vendor?.id

        ){

            fetchReviewStats();

        }

    }, [vendor]);

    
    return (

        <div className="min-h-screen bg-gray-50 px-6 py-10">

            <div className="max-w-7xl mx-auto">

                {/* HEADER */}
                <div className="relative overflow-hidden rounded-[32px] p-8 mb-10 bg-gradient-to-r from-purple-600 via-purple-700 to-pink-500 shadow-2xl">

                    <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>

                    <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>

                    <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">

                        <div>


                            <h1 className="text-4xl md:text-6xl font-bold text-white">

                                Welcome Back,

                            </h1>

                            <h2 className="text-2xl md:text-3xl font-semibold text-purple-100 mt-2">

                                {vendor?.business_name || "Vendor"}

                            </h2>

                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">

                            <button

                                onClick={() => setShowEdit(true)}

                                className="px-8 py-4 rounded-2xl bg-white text-purple-700 font-semibold hover:scale-105 transition shadow-lg"

                            >

                                Edit Profile

                            </button>

                        </div>

                    </div>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-10">

                    <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-xl transition">
                        <p className="text-gray-500 text-sm">
                            📅 Total Bookings
                        </p>
                        <h2 className="text-4xl font-bold mt-3">
                            {totalBookings}
                        </h2>
                    </div>

                    <div className="bg-yellow-50 rounded-3xl shadow-lg p-6">
                        <p className="text-yellow-700 text-sm">
                            ⏳ Pending
                        </p>
                        <h2 className="text-4xl font-bold mt-3">
                            {pendingBookings}
                        </h2>
                    </div>

                    <div className="bg-green-50 rounded-3xl shadow-lg p-6">
                        <p className="text-green-700 text-sm">
                            ✅ Approved
                        </p>
                        <h2 className="text-4xl font-bold mt-3">
                            {approvedBookings}
                        </h2>
                    </div>

                    <div className="bg-blue-50 rounded-3xl shadow-lg p-6">
                        <p className="text-blue-700 text-sm">
                            🎉 Completed
                        </p>
                        <h2 className="text-4xl font-bold mt-3">
                            {completedBookings}
                        </h2>
                    </div>

                    <div className="bg-pink-50 rounded-3xl shadow-lg p-6">
                        <p className="text-pink-700 text-sm">
                            ⭐ Rating
                        </p>
                        <h2 className="text-4xl font-bold mt-3">
                             {avgRating}
                        </h2>
                    </div>

                    <div className="bg-purple-50 rounded-3xl shadow-lg p-6">
                        <p className="text-purple-700 text-sm">
                            📝 Reviews
                        </p>
                        <h2 className="text-4xl font-bold mt-3">
                            {totalReviews}
                        </h2>
                    </div>
                    
                </div>

                {/* LOADING */}
                {
                    loading && (

                        <div className="text-center text-2xl font-bold">
                            Loading bookings...
                        </div>

                    )
                }

                {/* EMPTY */}
                {
                    !loading && bookings.length === 0 && (

                        <div className="bg-white rounded-3xl p-16 text-center shadow-lg">

                            <h2 className="text-3xl font-bold text-gray-900">
                                No booking requests
                            </h2>

                        </div>

                    )
                }


                {/* BOOKINGS */}
                <div className="grid gap-10">

                    {
                        bookings.map((booking) => (

                            <div
                                key={booking.id}
                                className="bg-white rounded-3xl p-10 shadow-lg"
                            >

                                {/* TOP */}
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

                                    <div>

                                        <h2 className="text-3xl font-bold text-gray-900">

                                            {booking.customer_name}

                                        </h2>

                                        <p className="text-gray-500 mt-2">

                                            {booking.customer_email}

                                        </p>

                                    </div>

                                    <div className="capitalize px-5 py-2 rounded-full bg-purple-100 text-purple-700 font-semibold w-fit">

                                        {booking.booking_status}

                                    </div>

                                </div>

                                {/* DETAILS */}
                                <div className="grid md:grid-cols-3 gap-8 mt-10">

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

                                </div>

                                {/* MESSAGE */}
                                <div className="mt-10">

                                    <p className="text-gray-400 text-sm">
                                        Customer Message
                                    </p>

                                    <p className="text-gray-700 mt-3 leading-relaxed">

                                        {booking.message}

                                    </p>

                                </div>

                                {/* ACTION BUTTONS */}
                                <div className="flex flex-wrap gap-5 mt-10">

                                    <button
                                        onClick={() =>
                                            updateStatus(
                                                booking.id,
                                                "approved"
                                            )
                                        }
                                        className="px-8 py-4 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition"
                                    >

                                        Approve

                                    </button>

                                    <button
                                        onClick={() =>
                                            updateStatus(
                                                booking.id,
                                                "rejected"
                                            )
                                        }
                                        className="px-8 py-4 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition"
                                    >

                                        Reject

                                    </button>

                                    <button
                                        onClick={() =>
                                            updateStatus(
                                                booking.id,
                                                "completed"
                                            )
                                        }
                                        className="px-8 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition"
                                    >
                                        Complete
                                    </button>

                                </div>

                            </div>

                        ))
                    }

                </div>

            </div>
            {

                showEdit && (

                <EditVendorModal

                vendor={vendor}

                refresh={fetchVendor}

                onClose={() =>

                setShowEdit(false)

                }

                />

                )

                }

        </div>

    )

}

export default VendorDashboardPage