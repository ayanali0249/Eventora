import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, MessageCircle, CalendarClock } from "lucide-react";

import API from "../services/api";
import { useAuth } from "../context/AuthContext";

import VendorCard from "../components/VendorCard";
import BookingCard from "../components/BookingCard";

const TABS = [
    { key: "viewed", label: "Recently Viewed", icon: Eye },
    { key: "contacted", label: "Recently Contacted", icon: MessageCircle },
    { key: "bookings", label: "Recent Bookings", icon: CalendarClock }
];

function HistoryPage() {

    const { user, token } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState("viewed");

    const [viewed, setViewed] = useState([]);
    const [contacted, setContacted] = useState([]);
    const [bookings, setBookings] = useState([]);

    const [loading, setLoading] = useState(true);

    const fetchAll = async () => {

        try {

            setLoading(true);

            const headers = { Authorization: `Bearer ${token}` };

            const [viewedRes, contactedRes, bookingsRes] = await Promise.all([
                API.get("/history/recently-viewed", { headers }),
                API.get("/history/recently-contacted", { headers }),
                API.get("/bookings/customer", { headers })
            ]);

            setViewed(viewedRes.data.vendors);
            setContacted(contactedRes.data.vendors);
            setBookings(bookingsRes.data.bookings);

        } catch (error) {

            console.log(error);

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {
        fetchAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openChatWithVendor = (vendor) => {
        localStorage.setItem("currentRoom", `chat-v${vendor.id}-c${user?.id}`);
        localStorage.setItem("currentRoomLabel", vendor.business_name);
        navigate("/chat");
    };

    const currentList = activeTab === "viewed" ? viewed : activeTab === "contacted" ? contacted : null;

    return (

        <div className="min-h-screen bg-gray-50 px-6 py-12">

            <div className="max-w-7xl mx-auto">

                <div className="mb-8">
                    <h1 className="text-4xl font-display font-semibold text-ink">
                        History
                    </h1>
                    <p className="text-gray-500 mt-3">
                        Vendors you've viewed, chatted with, and booked.
                    </p>
                </div>

                {/* TABS */}
                <div className="flex flex-wrap gap-2 mb-10 bg-white p-2 rounded-2xl shadow-sm w-fit">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition ${
                                    activeTab === tab.key
                                        ? "bg-teal-600 text-white"
                                        : "text-gray-600 hover:bg-gray-100"
                                }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* LOADING */}
                {loading && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-lg animate-pulse h-96" />
                        ))}
                    </div>
                )}

                {/* RECENT BOOKINGS TAB */}
                {!loading && activeTab === "bookings" && (
                    bookings.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                            <CalendarClock size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-2xl font-bold text-gray-700">No bookings yet</p>
                            <p className="text-gray-500 mt-2">Your booking history will show up here.</p>
                            <Link to="/vendors" className="inline-block mt-6 px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition">
                                Browse Vendors
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-8">
                            {bookings.map((booking) => (
                                <BookingCard key={booking.id} booking={booking} />
                            ))}
                        </div>
                    )
                )}

                {/* VIEWED / CONTACTED TABS */}
                {!loading && activeTab !== "bookings" && (
                    currentList.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                            {activeTab === "viewed"
                                ? <Eye size={48} className="mx-auto text-gray-300 mb-4" />
                                : <MessageCircle size={48} className="mx-auto text-gray-300 mb-4" />
                            }
                            <p className="text-2xl font-bold text-gray-700">
                                {activeTab === "viewed" ? "No vendors viewed yet" : "No conversations yet"}
                            </p>
                            <p className="text-gray-500 mt-2">
                                {activeTab === "viewed"
                                    ? "Vendors you open will show up here."
                                    : "Vendors you've messaged will show up here."}
                            </p>
                            <Link to="/vendors" className="inline-block mt-6 px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition">
                                Browse Vendors
                            </Link>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {currentList.map((vendor) => (
                                <div key={vendor.id} className="relative">
                                    <VendorCard vendor={vendor} />
                                    {activeTab === "contacted" && (
                                        <button
                                            onClick={() => openChatWithVendor(vendor)}
                                            className="absolute bottom-24 right-6 w-11 h-11 rounded-full bg-teal-600 text-white shadow-lg flex items-center justify-center hover:bg-teal-700 transition"
                                            aria-label="Open chat"
                                        >
                                            <MessageCircle size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )
                )}

            </div>

        </div>

    );

}

export default HistoryPage;
