import { useContext, useEffect, useState } from "react";

import { AuthContext } from "../context/AuthContext";

import API from "../services/api";

import BookingCard from "../components/BookingCard";

function DashboardPage() {

    const { user } = useContext(AuthContext);

    const [bookings, setBookings] = useState([]);

    const [loadingBookings, setLoadingBookings] = useState(true);

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

            console.log(response.data);

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

    return (

        <div className="min-h-screen bg-gray-50 px-6 py-10">

            <div className="max-w-7xl mx-auto">

                {/* HEADER */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-500 rounded-3xl p-10 text-white shadow-xl">

                    <h1 className="text-5xl font-bold">
                        Welcome Back 👋
                    </h1>

                    <p className="text-xl mt-4 text-purple-100">

                        Hello,
                        <span className="font-bold">
                            {" "} {user?.name}
                        </span>

                    </p>

                    <p className="mt-3 text-purple-100">
                        Manage your bookings, vendors and events easily.
                    </p>

                </div>

                {/* STATS */}
                <div className="grid md:grid-cols-3 gap-8 mt-12">

                    <div className="bg-white rounded-3xl p-8 shadow-lg">

                        <div className="text-5xl mb-5">
                            📅
                        </div>

                        <h2 className="text-4xl font-bold text-gray-900">
                            {bookings.length}
                        </h2>

                        <p className="text-gray-500 mt-2">
                            Total Bookings
                        </p>

                    </div>

                    <div className="bg-white rounded-3xl p-8 shadow-lg">

                        <div className="text-5xl mb-5">
                            ⭐
                        </div>

                        <h2 className="text-4xl font-bold text-gray-900">
                            4.9
                        </h2>

                        <p className="text-gray-500 mt-2">
                            Vendor Rating
                        </p>

                    </div>

                    <div className="bg-white rounded-3xl p-8 shadow-lg">

                        <div className="text-5xl mb-5">
                            🎉
                        </div>

                        <h2 className="text-4xl font-bold text-gray-900">
                            5
                        </h2>

                        <p className="text-gray-500 mt-2">
                            Upcoming Events
                        </p>

                    </div>

                </div>

                {/* QUICK ACTIONS */}
                <div className="bg-white rounded-3xl p-10 shadow-lg mt-12">

                    <h2 className="text-3xl font-bold text-gray-900">
                        Quick Actions
                    </h2>

                    <div className="flex flex-wrap gap-6 mt-8">

                        <button className="px-8 py-4 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition">

                            Explore Vendors

                        </button>

                        <button className="px-8 py-4 bg-pink-500 text-white rounded-2xl hover:bg-pink-600 transition">

                            View Bookings

                        </button>

                        <button className="px-8 py-4 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 transition">

                            Create Event

                        </button>

                    </div>

                </div>

                {/* BOOKINGS SECTION */}
                <div className="mt-16">

                    <div className="flex items-center justify-between mb-10">

                        <div>

                            <h2 className="text-4xl font-bold text-gray-900">
                                My Bookings
                            </h2>

                            <p className="text-gray-500 mt-2">
                                Track all your vendor booking requests
                            </p>

                        </div>

                    </div>

                    {/* LOADING */}
                    {
                        loadingBookings && (

                            <div className="text-center text-2xl font-bold">
                                Loading bookings...
                            </div>

                        )
                    }

                    {/* EMPTY */}
                    {
                        !loadingBookings && bookings.length === 0 && (

                            <div className="bg-white rounded-3xl p-16 text-center shadow-lg">

                                <h2 className="text-3xl font-bold text-gray-900">
                                    No bookings yet
                                </h2>

                                <p className="text-gray-500 mt-4">
                                    Start exploring vendors and book your dream event services.
                                </p>

                            </div>

                        )
                    }

                    {/* BOOKINGS GRID */}
                    <div className="grid gap-10">

                        {
                            bookings.map((booking) => (

                                <BookingCard
                                    key={booking.id}
                                    booking={booking}
                                />

                            ))
                        }

                    </div>

                </div>

            </div>

        </div>

    )

}

export default DashboardPage