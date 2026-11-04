import { useState } from "react";
import toast from "react-hot-toast";
import { CalendarClock, Check, X } from "lucide-react";
import API from "../services/api";

const TERMINAL_STATUSES = ["completed", "rejected", "cancelled"];

// Either side of a booking (customer or vendor) can propose a new event
// date; the OTHER side then accepts or declines it. Shared between the
// customer BookingCard and the vendor dashboard so both get identical
// behaviour instead of two parallel implementations drifting apart.
function RescheduleBox({ booking, myRole, onUpdated }) {

    const [showForm, setShowForm] = useState(false);
    const [newDate, setNewDate] = useState("");
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);

    if (TERMINAL_STATUSES.includes(booking.booking_status)) {
        return null;
    }

    const authHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });

    const submitProposal = async (e) => {

        e.preventDefault();

        if (!newDate) {
            toast.error("Pick a new date first");
            return;
        }

        setSubmitting(true);

        try {

            await API.post(
                `/bookings/${booking.id}/reschedule`,
                { new_date: newDate, message },
                authHeaders()
            );

            toast.success("Reschedule proposed");
            setShowForm(false);
            setNewDate("");
            setMessage("");
            onUpdated();

        } catch (error) {

            toast.error(error.response?.data?.message || "Failed to propose reschedule");

        } finally {

            setSubmitting(false);

        }

    };

    const respond = async (action) => {

        setSubmitting(true);

        try {

            await API.put(
                `/bookings/${booking.id}/reschedule/respond`,
                { action },
                authHeaders()
            );

            toast.success(action === "accept" ? "Reschedule accepted" : "Reschedule declined");
            onUpdated();

        } catch (error) {

            toast.error(error.response?.data?.message || "Failed to respond to reschedule");

        } finally {

            setSubmitting(false);

        }

    };

    // An active proposal is already on this booking.
    if (booking.reschedule_proposed_date) {

        const proposedDateLabel = new Date(booking.reschedule_proposed_date).toLocaleDateString();
        const otherRole = myRole === "customer" ? "vendor" : "customer";

        if (booking.reschedule_proposed_by === myRole) {
            return (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-5">
                    <p className="text-sm font-medium text-blue-900 flex items-center gap-2">
                        <CalendarClock size={16} />
                        You proposed moving this event to {proposedDateLabel}
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                        Waiting for the {otherRole} to respond.
                    </p>
                </div>
            );
        }

        return (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-5">
                <p className="text-sm font-medium text-blue-900 flex items-center gap-2">
                    <CalendarClock size={16} />
                    The {otherRole} proposed moving this event to {proposedDateLabel}
                </p>
                {booking.reschedule_message && (
                    <p className="text-sm text-blue-700 mt-2">"{booking.reschedule_message}"</p>
                )}
                <div className="flex gap-3 mt-4">
                    <button
                        disabled={submitting}
                        onClick={() => respond("accept")}
                        className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition text-sm font-medium disabled:opacity-60"
                    >
                        <Check size={15} /> Accept new date
                    </button>
                    <button
                        disabled={submitting}
                        onClick={() => respond("decline")}
                        className="flex items-center gap-1.5 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition text-sm font-medium disabled:opacity-60"
                    >
                        <X size={15} /> Decline
                    </button>
                </div>
            </div>
        );

    }

    // No active proposal - offer to make one.
    if (!showForm) {
        return (
            <button
                onClick={() => setShowForm(true)}
                className="mt-6 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-teal-700 transition"
            >
                <CalendarClock size={15} />
                Propose a different date
            </button>
        );
    }

    return (
        <form onSubmit={submitProposal} className="mt-6 bg-gray-50 border border-gray-200 rounded-2xl p-5">

            <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-800">Propose a new date</p>
                <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700">
                    <X size={16} />
                </button>
            </div>

            <input
                type="date"
                required
                value={newDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />

            <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Optional note for the other side..."
                rows={2}
                className="w-full mt-3 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />

            <button
                type="submit"
                disabled={submitting}
                className="mt-3 px-6 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition text-sm font-medium disabled:opacity-60"
            >
                {submitting ? "Sending..." : "Send proposal"}
            </button>

        </form>
    );

}

export default RescheduleBox;
