import { useState } from "react";

import { useNavigate } from "react-router-dom";

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

            console.log(response.data);

            login(
                 response.data.user,
                response.data.token
            );

            toast.success("Login successful ");

            navigate("/dashboard");

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

        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 px-6">

            <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-lg">

                <h2 className="text-4xl font-bold text-center text-gray-900">
                    Welcome Back
                </h2>

                <p className="text-gray-500 text-center mt-3">
                    Login to continue 🚀
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
                        className="w-full border border-gray-300 rounded-xl px-5 py-4 outline-none focus:border-purple-600"
                        required
                    />

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
                                ? "Logging In..."
                                : "Login"
                        }

                    </button>

                </form>

            </div>

        </div>

    )

}

export default LoginPage