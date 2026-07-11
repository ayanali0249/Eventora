import { useState } from "react";

import API from "../services/api";

function RegisterPage() {

    const [formData, setFormData] = useState({

        name: "",

        email: "",

        phone: "",

        password: "",

        role: "customer"

    });

    const [loading, setLoading] = useState(false);

    // HANDLE INPUT
    const handleChange = (e) => {

        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });

    };

    // HANDLE REGISTER
    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            setLoading(true);

            const response = await API.post(
                "/auth/register",
                formData
            );

            alert(response.data.message);

            console.log(response.data);

        } catch (error) {

            console.log(error);

            alert(
                error.response?.data?.message ||
                "Registration failed"
            );

        } finally {

            setLoading(false);

        }

    };

    return (

        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 px-6">

            <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-lg">

                <h2 className="text-4xl font-bold text-center text-gray-900">
                    Create Account
                </h2>

                <p className="text-gray-500 text-center mt-3">
                    Join Eventora today 🚀
                </p>

                <form
                    onSubmit={handleSubmit}
                    className="mt-10 space-y-6"
                >

                    {/* NAME */}
                    <input
                        type="text"
                        name="name"
                        placeholder="Full Name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-xl px-5 py-4 outline-none focus:border-purple-600"
                        required
                    />

                    {/* EMAIL */}
                    <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-xl px-5 py-4 outline-none focus:border-purple-600"
                        required
                    />

                    {/* PHONE */}
                    <input
                        type="text"
                        name="phone"
                        placeholder="Phone Number"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-xl px-5 py-4 outline-none focus:border-purple-600"
                        required
                    />

                    <select

                        name="role"

                        value={formData.role}

                        onChange={handleChange}

                        className="w-full border border-gray-300 rounded-xl px-5 py-4 outline-none focus:border-purple-600"

                    >

                        <option value="customer">

                            Customer

                        </option>

                        <option value="vendor">

                            Vendor

                        </option>

                    </select>

                    {/* PASSWORD */}
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-xl px-5 py-4 outline-none focus:border-purple-600"
                        required
                    />

                    {/* BUTTON */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold hover:bg-purple-700 transition"
                    >

                        {
                            loading
                                ? "Creating Account..."
                                : "Register"
                        }

                    </button>

                </form>

            </div>

        </div>

    )

}

export default RegisterPage