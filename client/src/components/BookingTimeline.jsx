import { useState } from "react";
import { History, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import API from "../services/api";

const HISTORY_LABELS = {
    pending: "Requested",
    approved: "Accepted by vendor",
    confirmed: "Confirmed by customer",
    completed: "Marked completed",
    rejected: "Rejected by vendor",
    cancelled: "Cancelled"
};

// A collapsed-by-default timeline of every status change on a booking,
// backed by GET /bookings/:id/history (booking_status_history table) -
// real audit data, not a guess rendered from the current status alone.
function BookingTimeline({ bookingId }) {

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [entries, setEntries] = useState([]);

    const toggle = async () => {

        if (!open && !loaded) {

            setLoading(true);

            try {

                const token = localStorage.getItem("token");

                const response = await API.get(
                    `/bookings/${bookingId}/history`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                setEntries(response.data.history);
                setLoaded(true);

            } catch (error) {

                console.log(error);

            } finally {

                setLoading(false);

            }

        }

        setOpen((prev) => !prev);

    };

    return (
        <div className="mt-6">

            <button
                onClick={toggle}
                className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition"
            >
                <History size={15} />
                Timeline
                {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {open && (
                <div className="mt-4 pl-4 border-l-2 border-gray-100 space-y-4">

                    {loading && (
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <Loader2 size={14} className="animate-spin" /> Loading timeline...
                        </div>
                    )}

                    {!loading && entries.length === 0 && (
                        <p className="text-sm text-gray-400">No history yet.</p>
                    )}

                    {!loading && entries.map((entry) => {

                        // Reschedule propose/accept/decline entries keep the
                        // booking's CURRENT status (e.g. "confirmed") on the
                        // row, since a proposal doesn't change the status -
                        // so the status label alone would be misleading
                        // ("Confirmed by customer" on a decline). The note
                        // itself is already a full, specific sentence for
                        // these, so lead with that instead.
                        const isRescheduleNote = entry.note && (
                            entry.note.startsWith("Proposed rescheduling")
                            || entry.note.startsWith("Accepted reschedule")
                            || entry.note.startsWith("Declined the reschedule")
                        );

                        return (
                            <div key={entry.id} className="relative">
                                <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-teal-500" />
                                <p className="text-sm font-medium text-gray-800">
                                    {isRescheduleNote ? entry.note : (HISTORY_LABELS[entry.status] || entry.status)}
                                    <span className="text-gray-400 font-normal"> — by {entry.changed_by_role === "system" ? "Eventora" : entry.changed_by_role}</span>
                                </p>
                                {entry.note && !isRescheduleNote && (
                                    <p className="text-sm text-gray-500 mt-0.5">{entry.note}</p>
                                )}
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {new Date(entry.created_at).toLocaleString()}
                                </p>
                            </div>
                        );

                    })}

                </div>
            )}

        </div>
    );

}

export default BookingTimeline;
