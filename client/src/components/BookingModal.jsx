import { useState } from "react";

import API from "../services/api";
import toast from "react-hot-toast";

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

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">

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
                        onClick={onClose}
                        className="text-2xl"
                    >
                        ✕
                    </button>

                </div>

                {/* FORM */}
                <form
                    onSubmit={handleBooking}
                    className="space-y-6"
                >

                    {/* EVENT DATE */}
                    <input
                        type="date"
                        name="event_date"
                        value={formData.event_date}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-xl px-5 py-4"
                        required
                    />

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
                        className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold hover:bg-purple-700 transition"
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