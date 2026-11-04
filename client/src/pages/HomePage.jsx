import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sparkles, PartyPopper, ShieldCheck, Zap, Star, LayoutDashboard, Wand2 } from "lucide-react";

import API from "../services/api";
import VendorCard from "../components/VendorCard";
import { useAuth } from "../context/AuthContext";

function HomePage() {

    const navigate = useNavigate();
    const { user, token } = useAuth();

    const [popularVendors, setPopularVendors] = useState([]);
    const [loadingPopular, setLoadingPopular] = useState(true);
    const [heroSearch, setHeroSearch] = useState("");

    // Personalized picks, built server-side from this customer's own
    // bookings/wishlist/recently-viewed vendors. Only ever populated when
    // the backend reports `personalized: true` - a brand-new customer with
    // no signals yet would otherwise just get the same top-rated vendors
    // already shown in "Popular Vendors" below, so the section stays
    // hidden entirely rather than showing a near-duplicate list.
    const [recommendedVendors, setRecommendedVendors] = useState([]);

    useEffect(() => {

        const fetchPopularVendors = async () => {
            try {
                const response = await API.get("/vendors?sort=rating");
                setPopularVendors((response.data.vendors || []).slice(0, 3));
            } catch (error) {
                console.log(error);
            } finally {
                setLoadingPopular(false);
            }
        };

        fetchPopularVendors();

    }, []);

    useEffect(() => {

        if (!user || user.role !== "customer" || !token) {
            return;
        }

        const fetchRecommended = async () => {
            try {
                const response = await API.get(
                    "/vendors/recommended?limit=6",
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (response.data.personalized) {
                    setRecommendedVendors(response.data.vendors || []);
                }
            } catch (error) {
                console.log(error);
            }
        };

        fetchRecommended();

    }, [user, token]);

    const handleHeroSearch = (e) => {
        e.preventDefault();
        navigate(heroSearch.trim() ? `/vendors?search=${encodeURIComponent(heroSearch.trim())}` : "/vendors");
    };

    return (

        <div className="min-h-screen bg-cream">

            {/* HERO SECTION */}
            <section className="max-w-7xl mx-auto px-6 pt-4 pb-20 relative">

                <div className="grid md:grid-cols-2 gap-16 items-center">

                    {/* LEFT CONTENT */}
                    <div>

                        <div className="inline-flex items-center gap-2 bg-gold/15 text-teal-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                            <Sparkles size={16} className="text-gold" />
                            AI-Powered Wedding & Event Marketplace
                        </div>

                        <h1 className="text-5xl md:text-6xl font-display font-semibold leading-[1.1] text-ink">
                            Plan your dream event with vendors you can trust
                        </h1>

                        <p className="text-gray-600 text-lg mt-8 leading-relaxed max-w-lg">

                            Discover photographers, decorators,
                            caterers, makeup artists, wedding planners,
                            venues and more — all in one place.

                        </p>

                        {/* SEARCH BAR */}
                        <form onSubmit={handleHeroSearch} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-lg">
                            <input
                                type="text"
                                value={heroSearch}
                                onChange={(e) => setHeroSearch(e.target.value)}
                                placeholder="Search photographers, caterers, decorators..."
                                className="flex-1 px-5 py-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
                            />
                            <button
                                type="submit"
                                className="px-6 py-4 bg-ink text-white rounded-xl hover:bg-teal-700 transition font-semibold whitespace-nowrap"
                            >
                                Search Vendors
                            </button>
                        </form>

                        {/* CTA BUTTONS */}
                        <div className="flex flex-wrap gap-5 mt-6">

                            <Link
                                to="/vendors"
                                className="px-8 py-4 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition font-semibold shadow-lg"
                            >
                                Explore Vendors
                            </Link>

                            <Link
                                to="/register"
                                className="px-8 py-4 border border-teal-600 text-teal-600 rounded-xl hover:bg-teal-50 transition font-semibold"
                            >
                                Become a Vendor
                            </Link>

                        </div>

                    </div>

                    {/* RIGHT SIDE */}
                    <div className="relative">

                        <div className="bg-white rounded-3xl shadow-2xl p-8">

                            <img
                                src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1200&auto=format&fit=crop"
                                alt="Wedding celebration"
                                className="rounded-2xl h-[500px] w-full object-cover"
                            />

                        </div>

                        {/* FLOATING CARD */}
                        <div className="absolute -bottom-5 -left-8 bg-white shadow-xl rounded-2xl p-5 flex items-center gap-3">

                            <div className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center shrink-0">
                                <PartyPopper size={20} className="text-gold" />
                            </div>

                            <div>
                                <p className="font-semibold text-ink">
                                    250+ Bookings This Month
                                </p>

                                <p className="text-gray-500 text-sm">
                                    Trusted by thousands of users
                                </p>
                            </div>

                        </div>

                    </div>

                </div>

            </section>

                <div className="max-w-7xl mx-auto px-6">

                    <div className="h-px bg-gradient-to-r from-transparent via-teal-300 to-transparent"></div>

                </div>

        {/* RECOMMENDED FOR YOU SECTION - only rendered once the backend has
            confirmed real personalization happened for this customer */}
        {recommendedVendors.length > 0 && (
            <>
                <section className="max-w-7xl mx-auto px-6 py-16">

                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">

                        <div>
                            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white border border-gold/40 shadow-sm">

                                <Wand2 size={16} className="text-gold" />

                                <span className="text-teal-700 font-semibold tracking-wide">
                                    Recommended For You
                                </span>

                            </div>

                            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-4">
                                Picked To Match Your Taste
                            </h2>

                            <p className="text-gray-600 mt-4 max-w-xl text-lg">
                                Based on the vendors you've booked, saved and viewed.
                            </p>

                        </div>

                        <Link
                            to="/vendors"
                            className="h-fit px-6 py-3 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition shadow-lg hover:scale-105">
                            Explore More
                        </Link>

                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {recommendedVendors.map((vendor) => (
                            <VendorCard key={vendor.id} vendor={vendor} />
                        ))}
                    </div>

                </section>

                <div className="max-w-7xl mx-auto px-6">
                    <div className="h-px bg-gradient-to-r from-transparent via-teal-300 to-transparent"></div>
                </div>
            </>
        )}

        {/* FEATURES SECTION */}
        <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-24">

    {/* SECTION HEADER */}
    <div className="text-center mb-20">

        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white border border-teal-200 shadow-sm">

            <div className="w-2 h-2 rounded-full bg-teal-500"></div>

            <span className="text-teal-700 font-semibold tracking-wide">

                WHY EVENTORA

            </span>

        </div>

        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-4">
            Everything You Need For Perfect Events
        </h2>

        <p className="text-gray-600 mt-6 max-w-2xl mx-auto text-lg">
            Eventora helps you discover trusted vendors,
            manage bookings, and plan unforgettable events
            effortlessly.
        </p>

    </div>

    {/* FEATURE CARDS */}
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10 mt-16">

        {/* CARD 1 */}
        <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition duration-300">

            <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-6">
                <ShieldCheck size={28} className="text-teal-600" />
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Verified Vendors
            </h3>

            <p className="text-gray-600 leading-relaxed">
                Discover trusted photographers,
                decorators, caterers and planners
                verified by our platform.
            </p>

        </div>

        {/* CARD 2 */}
        <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition duration-300">

            <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-6">
                <Zap size={28} className="text-teal-600" />
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Instant Booking
            </h3>

            <p className="text-gray-600 leading-relaxed">
                Book vendors quickly with
                real-time availability and
                smooth booking management.
            </p>

        </div>

        {/* CARD 3 */}
        <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition duration-300">

            <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-6">
                <Star size={28} className="text-teal-600" />
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Trusted Reviews
            </h3>

            <p className="text-gray-600 leading-relaxed">
                Read authentic customer reviews
                and ratings before selecting
                your event vendors.
            </p>

        </div>

        {/* CARD 4 */}
        <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition duration-300">

            <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-6">
                <LayoutDashboard size={28} className="text-teal-600" />
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Smart Dashboard
            </h3>

            <p className="text-gray-600 leading-relaxed">
                Manage bookings, vendors,
                event details and customer
                requests in one place.
            </p>

        </div>

    </div>

</section>

<div className="max-w-7xl mx-auto px-6">
 <div className="h-px bg-gradient-to-r from-transparent via-teal-300 to-transparent"></div>
</div>

{/* POPULAR VENDORS SECTION */}
<section className="max-w-7xl mx-auto px-6 py-24">

    {/* SECTION HEADER */}
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">

        <div>
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white border border-teal-200 shadow-sm">

                <div className="w-2 h-2 rounded-full bg-teal-500"></div>

                <span className="text-teal-700 font-semibold tracking-wide">

                    Popular Vendors

                </span>

            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-4">
                Explore Top Rated Event Experts
            </h2>

        </div>

        <Link
            to="/vendors"
            className="h-fit px-6 py-3 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition shadow-lg hover:scale-105">
            View All Vendors
        </Link>

    </div>

    {/* VENDOR CARDS */}
    {loadingPopular ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-lg animate-pulse">
                    <div className="h-72 w-full bg-gray-200" />
                    <div className="p-7 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                        <div className="h-6 bg-gray-200 rounded w-2/3" />
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    ) : popularVendors.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
            <p className="text-gray-500">
                No vendors have joined yet. Be the first to{" "}
                <Link to="/register" className="text-teal-600 font-semibold hover:underline">
                    register as a vendor
                </Link>
                .
            </p>
        </div>
    ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            {popularVendors.map((vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} />
            ))}
        </div>
    )}


</section>

<div className="max-w-7xl mx-auto px-6">
 <div className="h-px bg-gradient-to-r from-transparent via-teal-300 to-transparent"></div>
</div>

{/* TESTIMONIAL SECTION */}
<section className="bg-white py-16">

    <div className="max-w-7xl mx-auto px-6">

        {/* HEADER */}
        <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white border border-teal-200 shadow-sm">

                <div className="w-2 h-2 rounded-full bg-teal-500"></div>

                <span className="text-teal-700 font-semibold tracking-wide">

                    Testimonials

                </span>

            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-4">
                What Our Customers Say
            </h2>

            <p className="text-gray-600 text-lg mt-6 max-w-2xl mx-auto">
                Thousands of users trust Eventora
                for planning unforgettable events
                with top-rated vendors.
            </p>

        </div>

        {/* TESTIMONIAL CARDS */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">

            {/* CARD 1 */}
            <div className="bg-teal-50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition duration-300">

                <div className="flex items-center gap-4 mb-6">

                    <img
                        src="https://randomuser.me/api/portraits/women/44.jpg"
                        alt="User"
                        className="w-16 h-16 rounded-full object-cover"
                    />

                    <div>

                        <h3 className="text-xl font-bold text-gray-900">
                            Priya Sharma
                        </h3>

                        <p className="text-gray-500">
                            Bride
                        </p>

                    </div>

                </div>

                <p className="text-gray-700 leading-relaxed text-lg">
                    “Eventora made our wedding planning
                    completely stress-free. We found the
                    perfect photographer and decorator
                    within minutes.”
                </p>

                <div className="mt-6 flex gap-1 text-gold">
                    {[1,2,3,4,5].map((i) => <Star key={i} size={18} fill="currentColor" strokeWidth={0} />)}
                </div>

            </div>

            {/* CARD 2 */}
            <div className="bg-rose-50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition duration-300">

                <div className="flex items-center gap-4 mb-6">

                    <img
                        src="https://randomuser.me/api/portraits/men/32.jpg"
                        alt="User"
                        className="w-16 h-16 rounded-full object-cover"
                    />

                    <div>

                        <h3 className="text-xl font-bold text-gray-900">
                            Rahul Verma
                        </h3>

                        <p className="text-gray-500">
                            Event Organizer
                        </p>

                    </div>

                </div>

                <p className="text-gray-700 leading-relaxed text-lg">
                    “The vendor booking system is incredibly
                    smooth and professional. Eventora saves
                    us a lot of time managing events.”
                </p>

                <div className="mt-6 flex gap-1 text-gold">
                    {[1,2,3,4,5].map((i) => <Star key={i} size={18} fill="currentColor" strokeWidth={0} />)}
                </div>

            </div>

            {/* CARD 3 */}
            <div className="bg-orange-50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition duration-300">

                <div className="flex items-center gap-4 mb-6">

                    <img
                        src="https://randomuser.me/api/portraits/women/68.jpg"
                        alt="User"
                        className="w-16 h-16 rounded-full object-cover"
                    />

                    <div>

                        <h3 className="text-xl font-bold text-gray-900">
                            Anjali Mehta
                        </h3>

                        <p className="text-gray-500">
                            Customer
                        </p>

                    </div>

                </div>

                <p className="text-gray-700 leading-relaxed text-lg">
                    “Amazing experience! We booked caterers,
                    decorators and photographers from one
                    platform without any hassle.”
                </p>

                <div className="mt-6 flex gap-1 text-gold">
                    {[1,2,3,4,5].map((i) => <Star key={i} size={18} fill="currentColor" strokeWidth={0} />)}
                </div>

            </div>

        </div>

    </div>

</section>

<div className="max-w-7xl mx-auto px-6">
 <div className="h-px bg-gradient-to-r from-transparent via-teal-300 to-transparent"></div>
</div>

{/* CTA SECTION */}
<section className="py-16 px-6">

    <div className="max-w-5xl mx-auto bg-gradient-to-br from-teal-600 to-rose-600 rounded-[32px] p-8 md:p-12 text-center shadow-2xl">

        <p className="uppercase tracking-widest text-teal-100 font-semibold">
            Start Planning Today
        </p>

        <h2 className="text-3xl md:text-5xl font-bold text-white mt-4 leading-tight">

            Make Your Dream Event
            <br />
            A Reality With Eventora

        </h2>

        <p className="text-teal-100 text-lg mt-5 max-w-2xl mx-auto leading-relaxed">

            Find trusted vendors, manage bookings,
            and organize unforgettable events
            effortlessly from one platform.

        </p>

        {/* CTA BUTTONS */}
        <div className="flex flex-wrap justify-center gap-6 mt-8">

            <Link to="/vendors" className="px-8 py-4 bg-white text-teal-700 rounded-2xl font-bold hover:scale-105 transition shadow-lg">
                Explore Vendors
            </Link>

            <Link to="/register" className="px-8 py-4 border border-white text-white rounded-2xl font-bold hover:bg-white hover:text-teal-700 transition">
                Become a Vendor
            </Link>

        </div>

    </div>

</section>

{/* PREMIUM FOOTER */}
<footer className="relative bg-gray-950 text-white overflow-hidden">

    {/* TOP GRADIENT LINE */}
    <div className="h-[2px] bg-gradient-to-r from-teal-600 via-rose-500 to-teal-600" />

    <div className="max-w-7xl mx-auto px-6 py-10">

        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8">

            {/* BRAND */}
            <div>

                <h2 className="text-3xl font-display font-semibold text-gold">
                    Eventora
                </h2>

                <p className="text-gray-400 mt-3 text-sm leading-relaxed">

                    AI-powered wedding & event marketplace helping customers discover, book and manage trusted vendors effortlessly.

                </p>

            </div>

            {/* COMPANY */}
            <div>

                <h3 className="font-semibold mb-3">
                    Company
                </h3>

                <div className="flex flex-col gap-2 text-sm text-gray-400">

                    <Link to="/" className="hover:text-teal-400 transition">
                        Home
                    </Link>

                    <Link to="/vendors" className="hover:text-teal-400 transition">
                        Vendors
                    </Link>

                    <Link to="/register" className="hover:text-teal-400 transition">
                        Become Vendor
                    </Link>

                    <Link to="/login" className="hover:text-teal-400 transition">
                        Login
                    </Link>

                </div>

            </div>

            {/* CATEGORIES */}
            <div>

                <h3 className="font-semibold mb-3">
                    Categories
                </h3>

                <div className="flex flex-col gap-2 text-sm text-gray-400">

                    <Link to="/vendors?category=Photography" className="hover:text-teal-400 transition w-fit">Photography</Link>
                    <Link to="/vendors?category=Decoration" className="hover:text-teal-400 transition w-fit">Decoration</Link>
                    <Link to="/vendors?category=Catering" className="hover:text-teal-400 transition w-fit">Catering</Link>
                    <Link to="/vendors?category=Wedding Planning" className="hover:text-teal-400 transition w-fit">Wedding Planning</Link>

                </div>

            </div>

            {/* CONTACT */}
            <div>

                <h3 className="font-semibold mb-3">
                    Contact
                </h3>

                <div className="flex flex-col gap-2 text-sm text-gray-400">

                    <p>support@eventora.com</p>

                    <p>+91 9876543210</p>

                    <p>Jaipur, Rajasthan</p>

                </div>

            </div>

        </div>

        {/* BOTTOM */}
        <div className="border-t border-gray-800 mt-6 pt-4 flex flex-col md:flex-row justify-between items-center">

            <p className="text-gray-500 text-sm">

                © 2026 Eventora. Crafted with love for unforgettable events.

            </p>

            <div className="flex gap-5 mt-2 md:mt-0">

                <span className="text-gray-500 hover:text-teal-400 transition cursor-pointer text-sm">
                    Privacy Policy
                </span>

                <span className="text-gray-500 hover:text-teal-400 transition cursor-pointer text-sm">
                    Terms
                </span>

                <span className="text-gray-500 hover:text-teal-400 transition cursor-pointer text-sm">
                    Support
                </span>

            </div>

        </div>

    </div>

</footer>
        </div>

    );

}

export default HomePage;