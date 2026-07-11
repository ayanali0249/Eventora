import { Link } from "react-router-dom";

function HomePage() {

    return (

        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">

            {/* HERO SECTION */}
            <section className="max-w-7xl mx-auto px-6 pt-4 pb-20 relative">
                <div className="absolute top-0 left-10 w-72 h-72 bg-purple-300 rounded-full blur-3xl opacity-20"></div>

                <div className="absolute top-20 right-20 w-72 h-72 bg-pink-300 rounded-full blur-3xl opacity-20"></div>

                <div className="grid md:grid-cols-2 gap-16 items-center">

                    {/* LEFT CONTENT */}
                    <div>

                        <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">

                            ✨ AI Powered Wedding & Event Marketplace

                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold leading-tight text-gray-900">

                            Plan Your
                            <span className="text-purple-600"> Dream Event </span>
                            With Trusted Vendors

                        </h1>

                        <p className="text-gray-600 text-lg mt-8 leading-relaxed">

                            Discover photographers, decorators,
                            caterers, makeup artists, wedding planners,
                            venues and more — all in one place.

                        </p>

                        {/* CTA BUTTONS */}
                        <div className="flex flex-wrap gap-5 mt-10">

                            <Link
                                to="/vendors"
                                className="px-8 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition font-semibold shadow-lg"
                            >
                                Explore Vendors
                            </Link>

                            <Link
                                to="/register"
                                className="px-8 py-4 border border-purple-600 text-purple-600 rounded-xl hover:bg-purple-50 transition font-semibold"
                            >
                                Become a Vendor
                            </Link>

                        </div>

                    </div>

                    {/* RIGHT SIDE */}
                    <div className="relative">

                        <div className="bg-white rounded-3xl shadow-2xl p-8">

                            <img
                                src="https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop"
                                alt="Wedding"
                                className="rounded-2xl h-[500px] w-full object-cover"
                            />

                        </div>

                        {/* FLOATING CARD */}
                        <div className="absolute -bottom-5 -left-8 bg-white shadow-xl rounded-2xl p-5">

                            <p className="font-semibold text-gray-900">
                                🎉 250+ Bookings This Month
                            </p>

                            <p className="text-gray-500 text-sm mt-1">
                                Trusted by thousands of users
                            </p>

                        </div>

                    </div>

                </div>

            </section>

                <div className="max-w-7xl mx-auto px-6">

                    <div className="h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent"></div>

                </div>

        {/* FEATURES SECTION */}
        <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-24">

    {/* SECTION HEADER */}
    <div className="text-center mb-20">

        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white border border-purple-200 shadow-sm">

            <div className="w-2 h-2 rounded-full bg-purple-500"></div>

            <span className="text-purple-700 font-semibold tracking-wide">

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

            <div className="text-5xl mb-6">
                🎯
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

            <div className="text-5xl mb-6">
                ⚡
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

            <div className="text-5xl mb-6">
                ⭐
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

            <div className="text-5xl mb-6">
                📱
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
 <div className="h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent"></div>
</div>

{/* POPULAR VENDORS SECTION */}
<section className="max-w-7xl mx-auto px-6 py-24">

    {/* SECTION HEADER */}
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">

        <div>
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white border border-purple-200 shadow-sm">

                <div className="w-2 h-2 rounded-full bg-purple-500"></div>

                <span className="text-purple-700 font-semibold tracking-wide">

                    Popular Vendors

                </span>

            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-4">
                Explore Top Rated Event Experts
            </h2>

        </div>

        <Link
            to="/vendors"
            className="h-fit px-6 py-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition shadow-lg hover:scale-105">
            View All Vendors
        </Link>

    </div>

    {/* VENDOR CARDS */}
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">

        {/* CARD 1 */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition duration-300">

            <img
                src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1200&auto=format&fit=crop"
                alt="Vendor"
                className="h-72 w-full object-cover"
            />

            <div className="p-7">

                <div className="flex items-center justify-between mb-4">

                    <span className="bg-purple-100 text-purple-700 px-4 py-1 rounded-full text-sm font-semibold">
                        Photographer
                    </span>

                    <span className="text-yellow-500 font-bold">
                        ★ 4.9
                    </span>

                </div>

                <h3 className="text-2xl font-bold text-gray-900">
                    Royal Wedding Studio
                </h3>

                <p className="text-gray-500 mt-2">
                    Jaipur, Rajasthan
                </p>

                <p className="text-gray-600 mt-5 leading-relaxed">
                    Premium wedding photography and cinematic
                    videography services for luxury weddings.
                </p>

                <div className="flex items-center justify-between mt-8">

                    <div>

                        <p className="text-gray-400 text-sm">
                            Starting From
                        </p>

                        <h4 className="text-2xl font-bold text-purple-600">
                            ₹50K
                        </h4>

                    </div>

                    <button className="px-5 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition">
                        Book Now
                    </button>

                </div>

            </div>

        </div>

        {/* CARD 2 */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition duration-300">

            <img
                src="https://images.unsplash.com/photo-1469371670807-013ccf25f16a?q=80&w=1200&auto=format&fit=crop"
                alt="Vendor"
                className="h-72 w-full object-cover"
            />

            <div className="p-7">

                <div className="flex items-center justify-between mb-4">

                    <span className="bg-pink-100 text-pink-700 px-4 py-1 rounded-full text-sm font-semibold">
                        Decorator
                    </span>

                    <span className="text-yellow-500 font-bold">
                        ★ 4.8
                    </span>

                </div>

                <h3 className="text-2xl font-bold text-gray-900">
                    Dream Decor Events
                </h3>

                <p className="text-gray-500 mt-2">
                    Udaipur, Rajasthan
                </p>

                <p className="text-gray-600 mt-5 leading-relaxed">
                    Elegant wedding decor, floral setups
                    and luxury destination wedding themes.
                </p>

                <div className="flex items-center justify-between mt-8">

                    <div>

                        <p className="text-gray-400 text-sm">
                            Starting From
                        </p>

                        <h4 className="text-2xl font-bold text-pink-600">
                            ₹80K
                        </h4>

                    </div>

                    <button className="px-5 py-3 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition">
                        Book Now
                    </button>

                </div>

            </div>

        </div>

        {/* CARD 3 */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition duration-300">

            <img
                src="https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=1200&auto=format&fit=crop"
                alt="Vendor"
                className="h-72 w-full object-cover"
            />

            <div className="p-7">

                <div className="flex items-center justify-between mb-4">

                    <span className="bg-orange-100 text-orange-700 px-4 py-1 rounded-full text-sm font-semibold">
                        Catering
                    </span>

                    <span className="text-yellow-500 font-bold">
                        ★ 4.9
                    </span>

                </div>

                <h3 className="text-2xl font-bold text-gray-900">
                    Royal Feast Caterers
                </h3>

                <p className="text-gray-500 mt-2">
                    Delhi, India
                </p>

                <p className="text-gray-600 mt-5 leading-relaxed">
                    Multi-cuisine luxury catering services
                    for weddings and grand celebrations.
                </p>

                <div className="flex items-center justify-between mt-8">

                    <div>

                        <p className="text-gray-400 text-sm">
                            Starting From
                        </p>

                        <h4 className="text-2xl font-bold text-orange-600">
                            ₹1L
                        </h4>

                    </div>

                    <button className="px-5 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition">
                        Book Now
                    </button>

                </div>

            </div>

        </div>

    </div>

</section>

<div className="max-w-7xl mx-auto px-6">
 <div className="h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent"></div>
</div>

{/* TESTIMONIAL SECTION */}
<section className="bg-white py-16">

    <div className="max-w-7xl mx-auto px-6">

        {/* HEADER */}
        <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white border border-purple-200 shadow-sm">

                <div className="w-2 h-2 rounded-full bg-purple-500"></div>

                <span className="text-purple-700 font-semibold tracking-wide">

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
            <div className="bg-purple-50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition duration-300">

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

                <div className="mt-6 text-yellow-500 text-xl">
                    ★★★★★
                </div>

            </div>

            {/* CARD 2 */}
            <div className="bg-pink-50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition duration-300">

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

                <div className="mt-6 text-yellow-500 text-xl">
                    ★★★★★
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

                <div className="mt-6 text-yellow-500 text-xl">
                    ★★★★★
                </div>

            </div>

        </div>

    </div>

</section>

<div className="max-w-7xl mx-auto px-6">
 <div className="h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent"></div>
</div>

{/* CTA SECTION */}
<section className="py-16 px-6">

    <div className="max-w-5xl mx-auto bg-gradient-to-r from-purple-600 to-pink-500 rounded-[32px] p-8 md:p-12 text-center shadow-2xl">

        <p className="uppercase tracking-widest text-purple-100 font-semibold">
            Start Planning Today
        </p>

        <h2 className="text-3xl md:text-5xl font-bold text-white mt-4 leading-tight">

            Make Your Dream Event
            <br />
            A Reality With Eventora

        </h2>

        <p className="text-purple-100 text-lg mt-5 max-w-2xl mx-auto leading-relaxed">

            Find trusted vendors, manage bookings,
            and organize unforgettable events
            effortlessly from one platform.

        </p>

        {/* CTA BUTTONS */}
        <div className="flex flex-wrap justify-center gap-6 mt-8">

            <button className="px-8 py-4 bg-white text-purple-700 rounded-2xl font-bold hover:scale-105 transition shadow-lg">
                Explore Vendors
            </button>

            <button className="px-8 py-4 border border-white text-white rounded-2xl font-bold hover:bg-white hover:text-purple-700 transition">
                Become a Vendor
            </button>

        </div>

    </div>

</section>

{/* PREMIUM FOOTER */}
<footer className="relative bg-gray-950 text-white overflow-hidden">

    {/* TOP GRADIENT LINE */}
    <div className="h-[2px] bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600" />

    <div className="max-w-7xl mx-auto px-6 py-10">

        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8">

            {/* BRAND */}
            <div>

                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
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

                    <Link to="/" className="hover:text-purple-400 transition">
                        Home
                    </Link>

                    <Link to="/vendors" className="hover:text-purple-400 transition">
                        Vendors
                    </Link>

                    <Link to="/register" className="hover:text-purple-400 transition">
                        Become Vendor
                    </Link>

                    <Link to="/login" className="hover:text-purple-400 transition">
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

                    <span>Photography</span>
                    <span>Decoration</span>
                    <span>Catering</span>
                    <span>Wedding Planning</span>

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

                <span className="text-gray-500 hover:text-purple-400 transition cursor-pointer text-sm">
                    Privacy Policy
                </span>

                <span className="text-gray-500 hover:text-purple-400 transition cursor-pointer text-sm">
                    Terms
                </span>

                <span className="text-gray-500 hover:text-purple-400 transition cursor-pointer text-sm">
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