import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../services/api";
import toast from "react-hot-toast";
import EditVendorModal from "../components/EditVendorModal";
import BookingStatusBadge from "../components/BookingStatusBadge";
import BookingTimeline from "../components/BookingTimeline";
import RescheduleBox from "../components/RescheduleBox";
import AvailabilityCalendar from "../components/AvailabilityCalendar";
import {
    CalendarDays, Clock, CheckCircle2, PartyPopper, Star, MessageSquareText,
    MessageCircle, Eye, TrendingUp, IndianRupee, XCircle, Sparkles, Ban, Loader2
} from "lucide-react";

function VendorDashboardPage() {

    const navigate = useNavigate();

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

    const rejectedBookings = bookings.filter(

    booking =>

    booking.booking_status === "rejected"

    ).length;

    const confirmedBookings = bookings.filter(

    booking =>

    booking.booking_status === "confirmed"

    ).length;

    const cancelledBookings = bookings.filter(

    booking =>

    booking.booking_status === "cancelled"

    ).length;

    // REAL, DB-BACKED DASHBOARD KPIs (GET /vendors/dashboard-stats)
    const [stats, setStats] = useState(null);

    const [statsLoading, setStatsLoading] = useState(true);

    const [workingBookingId, setWorkingBookingId] = useState(null);

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

        }

        catch(error){

            console.log(error);

        }

    };

    // UPDATE STATUS
    const updateStatus = async (
        bookingId,
        status,
        reason
    ) => {

        try {

            setWorkingBookingId(bookingId);

            const token = localStorage.getItem("token");

            await API.put(

                `/bookings/${bookingId}/status`,

                reason ? { status, reason } : { status },

                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }

            );

            toast.success(`Booking ${status}`);

            fetchVendorBookings();

            fetchDashboardStats();

        } catch (error) {

            console.log(error);

            toast.error(
                error.response?.data?.message || "Failed to update booking"
            );

        } finally {

            setWorkingBookingId(null);

        }

    };

    // CANCEL (vendor side) - requires a reason, same pattern as the
    // customer-side cancel in BookingCard.jsx.
    const cancelBooking = (bookingId) => {

        const reason = window.prompt(
            "Please tell the customer why you're cancelling this booking:"
        );

        if (reason === null) return;

        if (!reason.trim()) {
            toast.error("A reason is required to cancel");
            return;
        }

        if (!window.confirm("Cancel this booking? This cannot be undone.")) return;

        updateStatus(bookingId, "cancelled", reason);

    };

    // CHAT WITH CUSTOMER
    // Same room-id scheme as the customer side (VendorDetailsPage /
    // BookingCard): keyed by (vendor, customer) pair.
    const openChatWithCustomer = (booking) => {
        localStorage.setItem(
            "currentRoom",
            `chat-v${vendor.id}-c${booking.customer_id}`
        );
        localStorage.setItem("currentRoomLabel", booking.customer_name);
        navigate("/chat");
    };

    useEffect(() => {

        fetchVendorBookings();

        fetchVendor();

    }, []);

    const fetchDashboardStats = async () => {

        try {

            if (!vendor?.id) return;

            setStatsLoading(true);

            const token = localStorage.getItem("token");

            const response = await API.get(

                "/vendors/dashboard-stats",

                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }

            );

            setStats(response.data.stats);

        }

        catch(error){

            console.log(error);

        }

        finally {

            setStatsLoading(false);

        }

    };

    // MANAGE AVAILABILITY
    //
    // Booked dates come from the vendor's own CONFIRMED bookings (fixed -
    // the vendor can't toggle those off here, only cancel the booking
    // itself from the list below) and blocked dates are the vendor's own
    // manual blackout days, which this calendar lets them add/remove by
    // clicking. Reuses the exact same public GET /vendors/:id/availability
    // endpoint a customer's calendar calls, just with the vendor's own id.
    const [bookedDates, setBookedDates] = useState(new Set());
    const [blockedDates, setBlockedDates] = useState(new Set());
    const [togglingDate, setTogglingDate] = useState(null);

    const fetchAvailability = async () => {
        try {
            const response = await API.get(`/vendors/${vendor.id}/availability`);
            setBookedDates(new Set(response.data.bookedDates || []));
            setBlockedDates(new Set((response.data.blockedDates || []).map((b) => b.date)));
        } catch (error) {
            console.log(error);
        }
    };

    const toggleBlockedDate = async (dateStr) => {

        if (bookedDates.has(dateStr)) {
            toast.error("You already have a confirmed booking on this date");
            return;
        }

        const token = localStorage.getItem("token");
        const isBlocked = blockedDates.has(dateStr);

        setTogglingDate(dateStr);

        try {

            if (isBlocked) {
                await API.delete(`/vendors/availability/block/${dateStr}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setBlockedDates((prev) => {
                    const next = new Set(prev);
                    next.delete(dateStr);
                    return next;
                });
                toast.success("Date unblocked");
            } else {
                await API.post(
                    "/vendors/availability/block",
                    { date: dateStr },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setBlockedDates((prev) => new Set(prev).add(dateStr));
                toast.success("Date blocked");
            }

        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong");
        } finally {
            setTogglingDate(null);
        }

    };

    useEffect(() => {

        if(

            vendor?.id

        ){

            fetchDashboardStats();

            fetchAvailability();

        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vendor]);


    return (

        <div className="min-h-screen bg-gray-50 px-6 py-10">

            <div className="max-w-7xl mx-auto">

                {/* HEADER */}
                <div className="relative overflow-hidden rounded-[32px] p-8 mb-10 bg-teal-600 shadow-2xl">

                    <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>

                    <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>

                    <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">

                        <div>


                            <h1 className="text-4xl md:text-6xl font-bold text-white">

                                Welcome Back,

                            </h1>

                            <h2 className="text-2xl md:text-3xl font-semibold text-teal-100 mt-2">

                                {vendor?.business_name || "Vendor"}

                            </h2>

                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">

                            <button

                                onClick={() => setShowEdit(true)}

                                className="px-8 py-4 rounded-2xl bg-white text-teal-700 font-semibold hover:scale-105 transition shadow-lg"

                            >

                                {vendor ? "Edit Profile" : "Create Vendor Profile"}

                            </button>

                        </div>

                    </div>

                </div>

                {!loading && !vendor && (
                    <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 mb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-teal-900">Set up your vendor profile</h3>
                            <p className="text-teal-700 text-sm mt-1">
                                Customers can't find or book you yet. Add your business details to appear in search.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowEdit(true)}
                            className="px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition whitespace-nowrap"
                        >
                            Get Started
                        </button>
                    </div>
                )}

                {/* PROFILE COMPLETION */}
                {vendor && (
                    <div className="bg-white rounded-3xl shadow-lg p-8 mb-10">

                        <div className="flex flex-col md:flex-row md:items-center gap-8">

                            <div className="flex items-center gap-5 shrink-0">

                                <div className="relative w-24 h-24 shrink-0">
                                    <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
                                        <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                                        <circle
                                            cx="50" cy="50" r="42" fill="none"
                                            stroke="#0f766e"
                                            strokeWidth="10"
                                            strokeLinecap="round"
                                            strokeDasharray={`${2 * Math.PI * 42}`}
                                            strokeDashoffset={`${2 * Math.PI * 42 * (1 - (stats?.profile_completion?.percentage ?? 0) / 100)}`}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xl font-bold text-gray-900">
                                            {statsLoading ? "…" : `${stats?.profile_completion?.percentage ?? 0}%`}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Profile Completion</h3>
                                    <p className="text-sm text-gray-500 mt-1 max-w-xs">
                                        A fuller profile shows up higher in search and wins more bookings.
                                    </p>
                                </div>

                            </div>

                            {!statsLoading && stats?.profile_completion?.missing?.length > 0 && (
                                <div className="flex-1 flex flex-wrap gap-3">
                                    {stats.profile_completion.missing.map((item) => (
                                        <button
                                            key={item.field}
                                            onClick={() => setShowEdit(true)}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium hover:bg-amber-100 transition"
                                        >
                                            <XCircle size={15} />
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {!statsLoading && stats?.profile_completion?.missing?.length === 0 && (
                                <div className="flex-1 flex items-center gap-2 text-emerald-700 font-medium">
                                    <Sparkles size={18} />
                                    Your profile is complete. Nice work!
                                </div>
                            )}

                        </div>

                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10">

                    <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-xl transition">
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <CalendarDays size={16} /> Total Bookings
                        </div>
                        <h2 className="text-4xl font-bold mt-3">
                            {totalBookings}
                        </h2>
                    </div>

                    <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-xl transition">
                        <div className="flex items-center gap-2 text-gold text-sm">
                            <Clock size={16} /> Pending
                        </div>
                        <h2 className="text-4xl font-bold mt-3">
                            {pendingBookings}
                        </h2>
                    </div>

                    <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-xl transition">
                        <div className="flex items-center gap-2 text-sky-600 text-sm">
                            <CheckCircle2 size={16} /> Approved
                        </div>
                        <h2 className="text-4xl font-bold mt-3">
                            {approvedBookings}
                        </h2>
                    </div>

                    <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-xl transition">
                        <div className="flex items-center gap-2 text-emerald-600 text-sm">
                            <CheckCircle2 size={16} /> Confirmed
                        </div>
                        <h2 className="text-4xl font-bold mt-3">
                            {confirmedBookings}
                        </h2>
                    </div>

                    <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-xl transition">
                        <div className="flex items-center gap-2 text-teal-800 text-sm">
                            <PartyPopper size={16} /> Completed
                        </div>
                        <h2 className="text-4xl font-bold mt-3">
                            {completedBookings}
                        </h2>
                    </div>

                    <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-xl transition">
                        <div className="flex items-center gap-2 text-rose-500 text-sm">
                            <XCircle size={16} /> Rejected
                        </div>
                        <h2 className="text-4xl font-bold mt-3">
                            {rejectedBookings}
                        </h2>
                    </div>

                    <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-xl transition">
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <Ban size={16} /> Cancelled
                        </div>
                        <h2 className="text-4xl font-bold mt-3">
                            {cancelledBookings}
                        </h2>
                    </div>

                    <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-xl transition">
                        <div className="flex items-center gap-2 text-gold text-sm">
                            <Star size={16} fill="currentColor" strokeWidth={0} /> Rating
                        </div>
                        <h2 className="text-4xl font-bold mt-3">
                             {statsLoading ? "—" : stats?.avg_rating ?? 0}
                        </h2>
                    </div>

                    <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-xl transition">
                        <div className="flex items-center gap-2 text-rose-500 text-sm">
                            <MessageSquareText size={16} /> Reviews
                        </div>
                        <h2 className="text-4xl font-bold mt-3">
                            {statsLoading ? "—" : stats?.total_reviews ?? 0}
                        </h2>
                    </div>

                    <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-xl transition">
                        <div className="flex items-center gap-2 text-blue-600 text-sm">
                            <Eye size={16} /> Profile Views
                        </div>
                        <h2 className="text-4xl font-bold mt-3">
                            {statsLoading ? "—" : stats?.profile_views ?? 0}
                        </h2>
                    </div>

                    <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-xl transition">
                        <div className="flex items-center gap-2 text-emerald-700 text-sm">
                            <TrendingUp size={16} /> Response Rate
                        </div>
                        <h2 className="text-4xl font-bold mt-3">
                            {statsLoading
                                ? "—"
                                : stats?.response_rate === null
                                    ? "N/A"
                                    : `${stats.response_rate}%`}
                        </h2>
                    </div>

                    <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-xl transition">
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <IndianRupee size={16} /> Est. Revenue
                        </div>
                        <h2 className="text-3xl font-bold mt-3">
                            {statsLoading
                                ? "—"
                                : stats?.estimated_revenue === null
                                    ? "N/A"
                                    : `₹${stats.estimated_revenue.toLocaleString("en-IN")}`}
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">From completed bookings</p>
                    </div>

                </div>

                {/* MANAGE AVAILABILITY */}
                <div className="bg-white rounded-3xl shadow-lg p-8 mb-10">

                    <div className="flex items-center gap-2 text-teal-700 font-semibold">
                        <CalendarDays size={20} />
                        Manage Availability
                    </div>

                    <p className="text-gray-500 mt-2 max-w-2xl">
                        Dates with a confirmed booking are locked and shown in red - cancel the
                        booking below if plans change. Click any other future date to block it
                        off (a day you're unavailable for any other reason) or click a blocked
                        date again to open it back up.
                    </p>

                    <div className="mt-5">
                        <AvailabilityCalendar
                            unavailableDates={blockedDates}
                            lockedDates={bookedDates}
                            interactive
                            selectableUnavailable
                            onSelectDate={toggleBlockedDate}
                            legend={false}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-5 mt-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-rose-200" /> Confirmed booking (locked)
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-rose-50 border border-rose-200" /> Blocked by you (click to unblock)
                        </span>
                        {togglingDate && (
                            <span className="flex items-center gap-1.5 text-teal-600">
                                <Loader2 size={14} className="animate-spin" /> Updating {togglingDate}...
                            </span>
                        )}
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

                                    <BookingStatusBadge booking={booking} />

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

                                {/* CANCELLATION REASON, IF CANCELLED */}
                                {booking.booking_status === "cancelled" && booking.cancellation_reason && (
                                    <div className="mt-6 bg-gray-50 border border-gray-200 rounded-2xl p-5">
                                        <p className="text-sm font-medium text-gray-700">
                                            Cancelled by {booking.cancelled_by === "vendor" ? "you" : booking.cancelled_by === "admin" ? "Eventora" : "the customer"}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">"{booking.cancellation_reason}"</p>
                                    </div>
                                )}

                                {/* ACTION BUTTONS */}
                                <div className="flex flex-wrap gap-5 mt-10">

                                    <button
                                        onClick={() => openChatWithCustomer(booking)}
                                        className="px-8 py-4 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition flex items-center gap-2"
                                    >
                                        <MessageCircle size={18} />
                                        Chat with Customer
                                    </button>

                                    {booking.booking_status === "pending" && (
                                        <>
                                            <button
                                                disabled={workingBookingId === booking.id}
                                                onClick={() =>
                                                    updateStatus(
                                                        booking.id,
                                                        "approved"
                                                    )
                                                }
                                                className="px-8 py-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition disabled:opacity-60"
                                            >

                                                Approve

                                            </button>

                                            <button
                                                disabled={workingBookingId === booking.id}
                                                onClick={() => {
                                                    if (window.confirm("Reject this booking? This cannot be undone.")) {
                                                        updateStatus(
                                                            booking.id,
                                                            "rejected"
                                                        );
                                                    }
                                                }}
                                                className="px-8 py-4 bg-rose-600 text-white rounded-2xl hover:bg-rose-700 transition disabled:opacity-60"
                                            >

                                                Reject

                                            </button>
                                        </>
                                    )}

                                    {booking.booking_status === "approved" && (
                                        <span className="px-6 py-4 rounded-2xl bg-sky-50 text-sky-700 font-medium flex items-center gap-2">
                                            <Loader2 size={16} />
                                            Waiting for customer to confirm
                                        </span>
                                    )}

                                    {booking.booking_status === "confirmed" && (
                                        <button
                                            disabled={workingBookingId === booking.id}
                                            onClick={() =>
                                                updateStatus(
                                                    booking.id,
                                                    "completed"
                                                )
                                            }
                                            className="px-8 py-4 bg-teal-700 text-white rounded-2xl hover:bg-teal-800 transition disabled:opacity-60"
                                        >
                                            Mark Completed
                                        </button>
                                    )}

                                    {(booking.booking_status === "approved" || booking.booking_status === "confirmed") && (
                                        <button
                                            disabled={workingBookingId === booking.id}
                                            onClick={() => cancelBooking(booking.id)}
                                            className="flex items-center gap-2 px-8 py-4 bg-white border border-rose-300 text-rose-600 rounded-2xl hover:bg-rose-50 transition disabled:opacity-60"
                                        >
                                            <Ban size={16} />
                                            Cancel
                                        </button>
                                    )}

                                    {["completed", "rejected", "cancelled"].includes(booking.booking_status) && (
                                        <span className="px-8 py-4 rounded-2xl bg-gray-100 text-gray-500 font-medium">
                                            This booking is finalized
                                        </span>
                                    )}

                                </div>

                                {(booking.booking_status === "approved" || booking.booking_status === "confirmed") && (
                                    <RescheduleBox
                                        booking={booking}
                                        myRole="vendor"
                                        onUpdated={() => { fetchVendorBookings(); fetchDashboardStats(); }}
                                    />
                                )}

                                <BookingTimeline bookingId={booking.id} />

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