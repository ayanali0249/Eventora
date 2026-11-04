import { useState } from "react";

import { useNavigate, Link } from "react-router-dom";

import API from "../services/api";
import toast from "react-hot-toast";
import { useContext } from "react";

import { AuthContext } from "../context/AuthContext";

function LoginPage() {

    const navigate = useNavigate();
    const { login } = useContext(AuthContext);

    const [formData, setFormData] = useState({

        email: "",
        password: ""

    });

    const [loading, setLoading] = useState(false);

    // HANDLE INPUT
    const handleChange = (e) => {

        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });

    };

    // HANDLE LOGIN
    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            setLoading(true);

            const response = await API.post(
                "/auth/login",
                formData
            );

            login(
                 response.data.user,
                response.data.token
            );

            toast.success("Login successful ");

            // FIXED: this used to always send everyone to /dashboard, which
            // is wrapped in a RoleRoute that only allows role === "customer".
            // A vendor (or now admin) logging in was immediately bounced
            // back to "/".
            if (response.data.user.role === "vendor") {
                navigate("/vendor-dashboard");
            } else if (response.data.user.role === "admin") {
                navigate("/admin");
            } else {
                navigate("/dashboard");
            }

        } catch (error) {

            console.log(error);

            toast.error(

             error.response?.data?.message ||

                "Login failed"

            );

        } finally {

            setLoading(false);

        }

    };

    return (

        <div className="min-h-screen flex items-center justify-center bg-cream px-6">

            <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-lg">

                <h2 className="text-4xl font-display font-semibold text-center text-ink">
                    Welcome Back
                </h2>

                <p className="text-gray-500 text-center mt-3">
                    Welcome back — let's find your next vendor.
                </p>

                <form
                    onSubmit={handleSubmit}
                    className="mt-10 space-y-6"
                >

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

                    {/* PASSWORD */}
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-xl px-5 py-4 outline-none focus:border-teal-600"
                        required
                    />

                    {/* BUTTON */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold hover:bg-teal-700 transition"
                    >

                        {
                            loading
                                ? "Logging In..."
                                : "Login"
                        }

                    </button>

                </form>

                <p className="text-center text-gray-500 mt-6">
                    Don't have an account?{" "}
                    <Link to="/register" className="text-teal-600 font-semibold hover:underline">
                        Sign up
                    </Link>
                </p>

            </div>

        </div>

    )

}

export default LoginPage