import { useContext, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";

import API from "../services/api";
import { CalendarDays, Clock, PartyPopper } from "lucide-react";

import BookingCard from "../components/BookingCard";

function DashboardPage() {

    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [bookings, setBookings] = useState([]);

    const [loadingBookings, setLoadingBookings] = useState(true);

    const bookingsRef = useRef(null);

    // FETCH BOOKINGS
    const fetchBookings = async () => {

        try {

            const token = localStorage.getItem("token");

            const response = await API.get(

                "/bookings/customer",

                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }

            );

            setBookings(response.data.bookings);

        } catch (error) {

            console.log(error);

        } finally {

            setLoadingBookings(false);

        }

    };

    // LOAD BOOKINGS
    useEffect(() => {

        fetchBookings();

    }, []);

    // Real, derived stats instead of the hardcoded placeholders this page
    // used to show.
    const pendingCount = bookings.filter((b) => b.booking_status === "pending").length;

    const upcomingCount = bookings.filter((b) => {
        return (
            new Date(b.event_date) >= new Date(new Date().toDateString()) &&
            !["rejected", "cancelled"].includes(b.booking_status)
        );
    }).length;

    return (

        <div className="min-h-screen bg-gray-50 px-6 py-10">

            <div className="max-w-7xl mx-auto">

                {/* HEADER */}
                <div className="bg-teal-600 rounded-3xl p-10 text-white shadow-xl">

                    <h1 className="text-5xl font-display font-semibold">
                        Welcome back
                    </h1>

                    <p className="text-xl mt-4 text-teal-100">
                        Hello,
                        <span className="font-bold">
                            {" "} {user?.name}
                        </span>
                    </p>

                    <p className="mt-3 text-teal-100">
                        Manage your bookings, vendors and events easily.
                    </p>

                </div>

                {/* STATS */}
                <div className="grid md:grid-cols-3 gap-8 mt-12">

                    <div className="bg-white rounded-3xl p-8 shadow-lg">
                        <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-5">
                            <CalendarDays size={26} className="text-teal-600" />
                        </div>
                        <h2 className="text-4xl font-bold text-gray-900">{bookings.length}</h2>
                        <p className="text-gray-500 mt-2">Total Bookings</p>
                    </div>

                    <div className="bg-white rounded-3xl p-8 shadow-lg">
                        <div className="w-14 h-14 rounded-2xl bg-gold/15 flex items-center justify-center mb-5">
                            <Clock size={26} className="text-gold" />
                        </div>
                        <h2 className="text-4xl font-bold text-gray-900">{pendingCount}</h2>
                        <p className="text-gray-500 mt-2">Pending Requests</p>
                    </div>

                    <div className="bg-white rounded-3xl p-8 shadow-lg">
                        <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mb-5">
                            <PartyPopper size={26} className="text-rose-500" />
                        </div>
                        <h2 className="text-4xl font-bold text-gray-900">{upcomingCount}</h2>
                        <p className="text-gray-500 mt-2">Upcoming Events</p>
                    </div>

                </div>

                {/* QUICK ACTIONS */}
                <div className="bg-white rounded-3xl p-10 shadow-lg mt-12">

                    <h2 className="text-3xl font-bold text-gray-900">
                        Quick Actions
                    </h2>

                    <div className="flex flex-wrap gap-6 mt-8">

                        <button
                            onClick={() => navigate("/vendors")}
                            className="px-8 py-4 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition"
                        >
                            Explore Vendors
                        </button>

                        <button
                            onClick={() => bookingsRef.current?.scrollIntoView({ behavior: "smooth" })}
                            className="px-8 py-4 bg-rose-500 text-white rounded-2xl hover:bg-rose-600 transition"
                        >
                            View Bookings
                        </button>

                        <button
                            onClick={() => navigate("/vendors?sort=rating")}
                            className="px-8 py-4 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 transition"
                        >
                            Top Rated Vendors
                        </button>

                    </div>

                </div>

                {/* BOOKINGS SECTION */}
                <div ref={bookingsRef} className="mt-16 scroll-mt-6">

                    <div className="flex items-center justify-between mb-10">

                        <div>
                            <h2 className="text-4xl font-bold text-gray-900">My Bookings</h2>
                            <p className="text-gray-500 mt-2">Track all your vendor booking requests</p>
                        </div>

                    </div>

                    {/* LOADING */}
                    {loadingBookings && (

                        <div className="grid gap-6">
                            {[1, 2].map((i) => (
                                <div key={i} className="bg-white rounded-3xl p-8 shadow-lg animate-pulse h-40" />
                            ))}
                        </div>

                    )}

                    {/* EMPTY */}
                    {!loadingBookings && bookings.length === 0 && (

                        <div className="bg-white rounded-3xl p-16 text-center shadow-lg">

                            <h2 className="text-3xl font-bold text-gray-900">No bookings yet</h2>

                            <p className="text-gray-500 mt-4">
                                Start exploring vendors and book your dream event services.
                            </p>

                            <button
                                onClick={() => navigate("/vendors")}
                                className="mt-6 px-8 py-4 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition"
                            >
                                Explore Vendors
                            </button>

                        </div>

                    )}

                    {/* BOOKINGS GRID */}
                    {!loadingBookings && bookings.length > 0 && (

                        <div className="grid gap-10">
                            {bookings.map((booking) => (
                                <BookingCard key={booking.id} booking={booking} onUpdate={fetchBookings} />
                            ))}
                        </div>

                    )}

                </div>

            </div>

        </div>

    );

}

export default DashboardPage;
