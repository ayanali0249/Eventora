import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function toDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Reusable month-grid calendar. Two modes, both driven by the same
// `unavailableDates` set (confirmed bookings + vendor blackout days,
// fetched once by the caller from GET /vendors/:id/availability and kept
// client-side, since this app's unavailable dates are sparse enough that
// one fetch for "today onward" is cheaper than a request per month):
//   - interactive=false (default): pure display, used on the vendor
//     details page so a customer can see open dates before booking.
//   - interactive=true: clicking a future, available date calls
//     onSelectDate - used inside BookingModal's date picker and the
//     vendor's own "manage availability" calendar (where EVERY future
//     date is clickable, including already-blocked ones, so the vendor can
//     toggle them off again; the caller decides that via `selectableDates`).
function AvailabilityCalendar({
    unavailableDates = new Set(),
    lockedDates = new Set(),
    selectedDate = null,
    onSelectDate = null,
    interactive = false,
    selectableUnavailable = false,
    legend = true
}) {

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [viewMonth, setViewMonth] = useState(startOfMonth(today));

    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();

    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
        cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        cells.push(new Date(year, month, day));
    }

    const isSameMonthAsToday = year === today.getFullYear() && month === today.getMonth();

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 max-w-sm">

            {/* MONTH NAV */}
            <div className="flex items-center justify-between mb-4">

                <button
                    type="button"
                    onClick={() => setViewMonth(new Date(year, month - 1, 1))}
                    disabled={isSameMonthAsToday}
                    aria-label="Previous month"
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                    <ChevronLeft size={16} />
                </button>

                <p className="font-semibold text-gray-900">
                    {viewMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                </p>

                <button
                    type="button"
                    onClick={() => setViewMonth(new Date(year, month + 1, 1))}
                    aria-label="Next month"
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                    <ChevronRight size={16} />
                </button>

            </div>

            {/* WEEKDAY HEADER */}
            <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAY_LABELS.map((label, i) => (
                    <div key={i} className="text-center text-xs text-gray-400 font-semibold py-1">
                        {label}
                    </div>
                ))}
            </div>

            {/* DAY GRID */}
            <div className="grid grid-cols-7 gap-1">
                {cells.map((date, i) => {

                    if (!date) {
                        return <div key={`blank-${i}`} />;
                    }

                    const dateStr = toDateStr(date);
                    const isPast = date < today;
                    const isLocked = lockedDates.has(dateStr);
                    const isUnavailable = isLocked || unavailableDates.has(dateStr);
                    const isSelected = selectedDate === dateStr;

                    const clickable = interactive && !isPast && !isLocked && (selectableUnavailable || !isUnavailable);

                    return (
                        <button
                            key={dateStr}
                            type="button"
                            disabled={!clickable}
                            onClick={() => clickable && onSelectDate && onSelectDate(dateStr)}
                            title={isLocked ? "Confirmed booking" : isUnavailable ? "Unavailable" : undefined}
                            className={`aspect-square rounded-lg text-sm flex items-center justify-center transition
                                ${isPast ? "text-gray-300 cursor-not-allowed" : ""}
                                ${!isPast && isLocked ? "bg-rose-200 text-rose-700 font-semibold line-through cursor-not-allowed" : ""}
                                ${!isPast && !isLocked && isUnavailable ? `bg-rose-50 text-rose-400 line-through ${clickable ? "hover:bg-rose-100 cursor-pointer" : "cursor-not-allowed"}` : ""}
                                ${!isPast && !isUnavailable && !isSelected ? "text-gray-700 hover:bg-teal-50" : ""}
                                ${isSelected ? "bg-teal-600 text-white font-bold" : ""}
                                ${!clickable && !isPast && !isUnavailable ? "cursor-default" : ""}
                            `}
                        >
                            {date.getDate()}
                        </button>
                    );

                })}
            </div>

            {legend && (
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-rose-50 border border-rose-200" /> Unavailable
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-teal-600" /> Selected
                    </span>
                </div>
            )}

        </div>
    );

}

export default AvailabilityCalendar;
