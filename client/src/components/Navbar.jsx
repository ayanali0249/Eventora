import {

    Link

} from "react-router-dom";

import {

    useContext

} from "react";

import {

    AuthContext

} from "../context/AuthContext";

import NotificationBell from "./NotificationBell";

import UserMenu from "./UserMenu";

function Navbar() {

    const {

        user

    } = useContext(

        AuthContext

    );

    return (

        <nav className="bg-white shadow-md px-8 py-4 sticky top-0 z-50">

            <div className="max-w-7xl mx-auto flex items-center justify-between">

                {/* LOGO */}

                <Link

                    to="/"

                    className="text-3xl font-bold text-purple-600"

                >

                    Eventora

                </Link>

                {/* LINKS */}

                <div className="hidden md:flex items-center gap-8">

                    <Link

                        to="/"

                        className="text-gray-700 hover:text-purple-600 transition"

                    >

                        Home

                    </Link>

                    <Link

                        to="/vendors"

                        className="text-gray-700 hover:text-purple-600 transition"

                    >

                        Vendors

                    </Link>

                    {

                        user?.role === "customer" && (

                            <Link

                                to="/dashboard"

                                className="text-gray-700 hover:text-purple-600"

                            >

                                Dashboard

                            </Link>

                        )

                    }

                    {

                        user?.role === "vendor" && (

                            <Link

                                to="/vendor-dashboard"

                                className="text-gray-700 hover:text-purple-600"

                            >

                                Vendor Dashboard

                            </Link>

                        )

                    }

                </div>

                {/* RIGHT SIDE */}

                <div className="hidden md:flex items-center gap-4">

                    {

                        user && (

                            <NotificationBell />

                        )

                    }

                    {

                        user ? (

                            <UserMenu />

                        ) : (

                            <>

                                <Link

                                    to="/login"

                                    className="px-5 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition"

                                >

                                    Login

                                </Link>

                                <Link

                                    to="/register"

                                    className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"

                                >

                                    Register

                                </Link>

                            </>

                        )

                    }

                </div>

            </div>

        </nav>

    );

}

export default Navbar;