import { Link, useLocation } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { Menu, X, Heart, History, MessageCircle, Sparkles } from "lucide-react";

import { AuthContext } from "../context/AuthContext";

import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";

function Navbar() {

    const { user } = useContext(AuthContext);

    const [mobileOpen, setMobileOpen] = useState(false);

    const location = useLocation();

    // Close the mobile menu automatically whenever the route changes
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    const navLinkClass = "text-gray-700 hover:text-teal-600 transition";

    return (

        <nav className="bg-white shadow-md px-6 md:px-8 py-4 sticky top-0 z-50">

            <div className="max-w-7xl mx-auto flex items-center justify-between">

                {/* LOGO */}
                <Link to="/" className="text-3xl font-display font-semibold text-teal-600">
                    Eventora
                </Link>

                {/* DESKTOP LINKS */}
                <div className="hidden md:flex items-center gap-8">

                    <Link to="/" className={navLinkClass}>Home</Link>
                    <Link to="/vendors" className={navLinkClass}>Vendors</Link>

                    {user?.role === "customer" && (
                        <>
                            <Link to="/planner" className={navLinkClass}>Planner</Link>
                            <Link to="/dashboard" className={navLinkClass}>Dashboard</Link>
                            <Link to="/history" className={navLinkClass}>History</Link>
                        </>
                    )}

                    {user?.role === "vendor" && (
                        <Link to="/vendor-dashboard" className={navLinkClass}>Vendor Dashboard</Link>
                    )}

                    {user?.role === "admin" && (
                        <Link to="/admin" className={navLinkClass}>Admin Panel</Link>
                    )}

                </div>

                {/* DESKTOP RIGHT SIDE */}
                <div className="hidden md:flex items-center gap-4">

                    {user && (
                        <Link
                            to="/chat"
                            aria-label="Messages"
                            className="text-gray-700 hover:text-teal-600 transition"
                        >
                            <MessageCircle size={24} />
                        </Link>
                    )}

                    {user?.role === "customer" && (
                        <Link
                            to="/wishlist"
                            aria-label="Wishlist"
                            className="text-gray-700 hover:text-rose-500 transition"
                        >
                            <Heart size={24} />
                        </Link>
                    )}

                    {user && <NotificationBell />}

                    {user ? (
                        <UserMenu />
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="px-5 py-2 border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 transition"
                            >
                                Login
                            </Link>
                            <Link
                                to="/register"
                                className="px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
                            >
                                Register
                            </Link>
                        </>
                    )}

                </div>

                {/* MOBILE: notification bell + hamburger toggle */}
                <div className="flex md:hidden items-center gap-3">

                    {user && <NotificationBell />}

                    <button
                        onClick={() => setMobileOpen((prev) => !prev)}
                        aria-label="Toggle menu"
                        aria-expanded={mobileOpen}
                        className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-700 text-xl"
                    >
                        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>

                </div>

            </div>

            {/* MOBILE MENU PANEL */}
            {mobileOpen && (
                <div className="md:hidden mt-4 pb-2 border-t pt-4 flex flex-col gap-4">

                    <Link to="/" className={navLinkClass}>Home</Link>
                    <Link to="/vendors" className={navLinkClass}>Vendors</Link>

                    {user && (
                        <Link to="/chat" className={`${navLinkClass} flex items-center gap-2`}>
                            <MessageCircle size={18} /> Messages
                        </Link>
                    )}

                    {user?.role === "customer" && (
                        <>
                            <Link to="/planner" className={`${navLinkClass} flex items-center gap-2`}>
                                <Sparkles size={18} /> Planner
                            </Link>
                            <Link to="/dashboard" className={navLinkClass}>Dashboard</Link>
                            <Link to="/wishlist" className={`${navLinkClass} flex items-center gap-2`}>
                                <Heart size={18} /> Wishlist
                            </Link>
                            <Link to="/history" className={`${navLinkClass} flex items-center gap-2`}>
                                <History size={18} /> History
                            </Link>
                        </>
                    )}

                    {user?.role === "vendor" && (
                        <Link to="/vendor-dashboard" className={navLinkClass}>Vendor Dashboard</Link>
                    )}

                    {user?.role === "admin" && (
                        <Link to="/admin" className={navLinkClass}>Admin Panel</Link>
                    )}

                    {user ? (
                        <UserMenu />
                    ) : (
                        <div className="flex gap-3 pt-2">
                            <Link
                                to="/login"
                                className="flex-1 text-center px-5 py-3 border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 transition"
                            >
                                Login
                            </Link>
                            <Link
                                to="/register"
                                className="flex-1 text-center px-5 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
                            >
                                Register
                            </Link>
                        </div>
                    )}

                </div>
            )}

        </nav>

    );

}

export default Navbar;
