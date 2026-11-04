import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import API from "../services/api";
import toast from "react-hot-toast";

function RegisterPage() {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
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

        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (formData.password.length < 6) {
            toast.error("Password must be at least 6 characters long");
            return;
        }

        try {

            setLoading(true);

            // eslint-disable-next-line no-unused-vars -- confirmPassword is intentionally excluded from the payload
            const { confirmPassword, ...payload } = formData;

            await API.post("/auth/register", payload);

            toast.success("Account created! Please log in.");

            // FIXED: previously just showed an alert() and left the user
            // sitting on the same filled-in form with no way forward.
            navigate("/login");

        } catch (error) {

            toast.error(
                error.response?.data?.message ||
                "Registration failed"
            );

        } finally {

            setLoading(false);

        }

    };

    return (

        <div className="min-h-screen flex items-center justify-center bg-cream px-6 py-12">

            <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-lg">

                <h2 className="text-4xl font-display font-semibold text-center text-ink">
                    Create Account
                </h2>

                <p className="text-gray-500 text-center mt-3">
                    Find trusted vendors for your next event.
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
                        className="w-full border border-gray-300 rounded-xl px-5 py-4 outline-none focus:border-teal-600"
                        required
                    />

                    {/* EMAIL */}
                    <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-xl px-5 py-4 outline-none focus:border-teal-600"
                        required
                    />

                    {/* PHONE */}
                    <input
                        type="tel"
                        name="phone"
                        placeholder="Phone Number"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-xl px-5 py-4 outline-none focus:border-teal-600"
                        required
                    />

                    <div>
                        <label className="text-sm font-medium text-gray-600 mb-2 block px-1">
                            I want to join as a...
                        </label>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-xl px-5 py-4 outline-none focus:border-teal-600 bg-white"
                        >
                            <option value="customer">Customer — I'm planning an event</option>
                            <option value="vendor">Vendor — I offer event services</option>
                        </select>
                    </div>

                    {/* PASSWORD */}
                    <input
                        type="password"
                        name="password"
                        placeholder="Password (min. 6 characters)"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-xl px-5 py-4 outline-none focus:border-teal-600"
                        required
                        minLength={6}
                    />

                    {/* CONFIRM PASSWORD */}
                    <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm Password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-xl px-5 py-4 outline-none focus:border-teal-600"
                        required
                    />

                    {/* BUTTON */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold hover:bg-teal-700 transition disabled:opacity-60"
                    >
                        {loading ? "Creating Account..." : "Register"}
                    </button>

                </form>

                <p className="text-center text-gray-500 mt-6">
                    Already have an account?{" "}
                    <Link to="/login" className="text-teal-600 font-semibold hover:underline">
                        Log in
                    </Link>
                </p>

            </div>

        </div>

    );

}

export default RegisterPage;
