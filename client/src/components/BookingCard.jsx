import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { CheckCircle2, Ban, Loader2 } from "lucide-react";

import API from "../services/api";
import BookingStatusBadge from "./BookingStatusBadge";
import BookingTimeline from "./BookingTimeline";
import RescheduleBox from "./RescheduleBox";

// `onUpdate` is optional - when a parent passes it (DashboardPage), the
// card becomes interactive (confirm/cancel/reschedule). When it's omitted
// (HistoryPage, which is a read-only activity log), the card just shows the
// current status with no action buttons, which is the correct behaviour for
// a history view.
function BookingCard({ booking, onUpdate }) {

    const navigate = useNavigate();

    const [working, setWorking] = useState(false);

    const openChat = () => {

        // Same room-id scheme as VendorDetailsPage / VendorDashboardPage:
        // keyed by (vendor, customer) pair so it's the same conversation
        // regardless of which booking it was opened from.
        localStorage.setItem(

            "currentRoom",

            `chat-v${booking.vendor_id}-c${booking.customer_id}`

        );

        localStorage.setItem("currentRoomLabel", booking.business_name);

        navigate("/chat");

    };

    const authHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });

    const confirmBooking = async () => {

        setWorking(true);

        try {

            await API.put(
                `/bookings/${booking.id}/customer-status`,
                { status: "confirmed" },
                authHeaders()
            );

            toast.success("Booking confirmed!");
            onUpdate?.();

        } catch (error) {

            toast.error(error.response?.data?.message || "Failed to confirm booking");

        } finally {

            setWorking(false);

        }

    };

    const cancelBooking = async () => {

        const reason = window.prompt(
            "Please tell the vendor why you're cancelling this booking:"
        );

        if (reason === null) return; // user dismissed the prompt

        if (!reason.trim()) {
            toast.error("A reason is required to cancel");
            return;
        }

        if (!window.confirm("Cancel this booking? This cannot be undone.")) return;

        setWorking(true);

        try {

            await API.put(
                `/bookings/${booking.id}/customer-status`,
                { status: "cancelled", reason },
                authHeaders()
            );

            toast.success("Booking cancelled");
            onUpdate?.();

        } catch (error) {

            toast.error(error.response?.data?.message || "Failed to cancel booking");

        } finally {

            setWorking(false);

        }

    };

    const canCancel = ["pending", "approved", "confirmed"].includes(booking.booking_status);

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

                    <BookingStatusBadge booking={booking} />

                    {/* CHAT BUTTON */}

                    <button

                        onClick={openChat}

                        className="px-5 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition"

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

                    <h3 className="text-xl font-semibold text-teal-600 mt-2">

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

            {/* CANCELLATION REASON, IF CANCELLED */}
            {booking.booking_status === "cancelled" && booking.cancellation_reason && (
                <div className="mt-6 bg-gray-50 border border-gray-200 rounded-2xl p-5">
                    <p className="text-sm font-medium text-gray-700">
                        Cancelled by {booking.cancelled_by === "customer" ? "you" : booking.cancelled_by === "admin" ? "Eventora" : "the vendor"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">"{booking.cancellation_reason}"</p>
                </div>
            )}

            {/* ACTIONS - only rendered for an interactive parent (DashboardPage) */}
            {onUpdate && (
                <>
                    {(booking.booking_status === "approved" || canCancel) && (
                        <div className="flex flex-wrap gap-4 mt-8">

                            {booking.booking_status === "approved" && (
                                <button
                                    onClick={confirmBooking}
                                    disabled={working}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-60"
                                >
                                    {working ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                    Confirm Booking
                                </button>
                            )}

                            {canCancel && (
                                <button
                                    onClick={cancelBooking}
                                    disabled={working}
                                    className="flex items-center gap-2 px-6 py-3 bg-white border border-rose-300 text-rose-600 rounded-xl hover:bg-rose-50 transition disabled:opacity-60"
                                >
                                    <Ban size={16} />
                                    Cancel Booking
                                </button>
                            )}

                        </div>
                    )}

                    <RescheduleBox booking={booking} myRole="customer" onUpdated={onUpdate} />
                </>
            )}

            <BookingTimeline bookingId={booking.id} />

        </div>

    );

}

export default BookingCard;
