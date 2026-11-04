import { useEffect, useState } from "react";
import { X } from "lucide-react";

import API from "../services/api";
import toast from "react-hot-toast";
import AvailabilityCalendar from "./AvailabilityCalendar";

function BookingModal({
    vendor,
    onClose
}) {

    const [formData, setFormData] = useState({

        event_date: "",
        event_type: "",
        guest_count: "",
        message: ""

    });

    const [loading, setLoading] = useState(false);

    // Same unavailable-dates set the vendor details page shows, fetched
    // fresh here too (not passed down as a prop) so it's still accurate
    // even if some time passed between opening the page and opening this
    // modal.
    const [unavailableDates, setUnavailableDates] = useState(new Set());

    useEffect(() => {

        const fetchAvailability = async () => {
            try {
                const response = await API.get(`/vendors/${vendor.id}/availability`);
                const dates = new Set([
                    ...(response.data.bookedDates || []),
                    ...(response.data.blockedDates || []).map((b) => b.date)
                ]);
                setUnavailableDates(dates);
            } catch (error) {
                console.log(error);
            }
        };

        fetchAvailability();

    }, [vendor.id]);

    // Confirm before discarding a partially-filled form, so a user never
    // loses booking details they've already typed by an accidental
    // backdrop click or close-button tap.
    const hasUnsavedInput = () =>
        Object.values(formData).some((value) => value.trim() !== "");

    const safeClose = () => {
        if (hasUnsavedInput()) {
            if (window.confirm("Discard this booking request? Your entered details will be lost.")) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    // HANDLE INPUT
    const handleChange = (e) => {

        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });

    };

    // HANDLE BOOKING
    const handleBooking = async (e) => {

        e.preventDefault();

        // The date picker is now the calendar above, not a native
        // <input required>, so this is the only thing still enforcing a
        // date was actually picked before submitting.
        if (!formData.event_date) {
            toast.error("Please pick an event date");
            return;
        }

        try {

            setLoading(true);

            const token = localStorage.getItem("token");

            const response = await API.post(

                "/bookings/create",

                {
                    vendor_id: vendor.id,
                    ...formData
                },

                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }

            );

            toast.success(response.data.message);

            onClose();

        } catch (error) {

            console.log(error);

            toast.error(
                 error.response?.data?.message ||
                    "Booking failed"
            );

        } finally {

            setLoading(false);

        }

    };

    return (

        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6"
            onClick={(e) => {
                if (e.target === e.currentTarget) safeClose();
            }}
        >

            <div className="bg-white rounded-3xl p-10 w-full max-w-2xl">

                {/* HEADER */}
                <div className="flex items-center justify-between mb-8">

                    <div>

                        <h2 className="text-3xl font-bold text-gray-900">
                            Book Vendor
                        </h2>

                        <p className="text-gray-500 mt-2">
                            {vendor.business_name}
                        </p>

                    </div>

                    <button
                        onClick={safeClose}
                        className="text-gray-400 hover:text-ink transition"
                    >
                        <X size={22} />
                    </button>

                </div>

                {/* FORM */}
                <form
                    onSubmit={handleBooking}
                    className="space-y-6"
                >

                    {/* EVENT DATE */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Event Date
                        </label>
                        <AvailabilityCalendar
                            unavailableDates={unavailableDates}
                            selectedDate={formData.event_date || null}
                            interactive
                            onSelectDate={(dateStr) =>
                                setFormData((prev) => ({ ...prev, event_date: dateStr }))
                            }
                        />
                        {!formData.event_date && (
                            <p className="text-sm text-gray-400 mt-2">
                                Pick an available date above.
                            </p>
                        )}
                    </div>

                    {/* EVENT TYPE */}
                    <input
                        type="text"
                        name="event_type"
                        placeholder="Event Type"
                        value={formData.event_type}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-xl px-5 py-4"
                        required
                    />

                    {/* GUEST COUNT */}
                    <input
                        type="number"
                        name="guest_count"
                        placeholder="Guest Count"
                        value={formData.guest_count}
                        onChange={handleChange}
                        min="1"
                        className="w-full border border-gray-300 rounded-xl px-5 py-4"
                        required
                    />

                    {/* MESSAGE */}
                    <textarea
                        name="message"
                        placeholder="Additional Message"
                        value={formData.message}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-xl px-5 py-4 h-32"
                    />

                    {/* BUTTON */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold hover:bg-teal-700 transition"
                    >

                        {
                            loading
                                ? "Sending Request..."
                                : "Book Now"
                        }

                    </button>

                </form>

            </div>

        </div>

    )

}

export default BookingModal