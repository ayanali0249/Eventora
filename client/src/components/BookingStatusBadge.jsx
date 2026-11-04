// Shared status pill for a booking, used on both the customer dashboard
// (BookingCard) and the vendor dashboard. "Upcoming" isn't a stored status -
// it's just a confirmed booking whose event_date hasn't happened yet, shown
// as a small sub-label so both sides get the same read of where things
// stand without adding a seventh database status.
const STATUS_STYLES = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-sky-100 text-sky-700",
    confirmed: "bg-emerald-100 text-emerald-700",
    completed: "bg-teal-100 text-teal-700",
    rejected: "bg-rose-100 text-rose-700",
    cancelled: "bg-gray-200 text-gray-600"
};

const STATUS_LABELS = {
    pending: "Requested",
    approved: "Accepted",
    confirmed: "Confirmed",
    completed: "Completed",
    rejected: "Rejected",
    cancelled: "Cancelled"
};

function BookingStatusBadge({ booking }) {

    const isUpcoming = booking.booking_status === "confirmed"
        && new Date(booking.event_date) >= new Date(new Date().toDateString());

    return (
        <div className="flex flex-col items-end gap-1.5">
            <span className={`px-5 py-2 rounded-full font-semibold w-fit text-sm ${STATUS_STYLES[booking.booking_status] || "bg-gray-100 text-gray-600"}`}>
                {STATUS_LABELS[booking.booking_status] || booking.booking_status}
            </span>
            {isUpcoming && (
                <span className="text-xs font-medium text-emerald-700">Event upcoming</span>
            )}
        </div>
    );

}

export { STATUS_STYLES, STATUS_LABELS };
export default BookingStatusBadge;
