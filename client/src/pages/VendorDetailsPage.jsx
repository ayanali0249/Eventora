import {

    useEffect,

    useState

} from "react";

import {

    useParams,

    useNavigate,

    Link

} from "react-router-dom";

import API from "../services/api";

import BookingModal from "../components/BookingModal";

import { useAuth } from "../context/AuthContext";

import toast from "react-hot-toast";
import { X, Star, ArrowLeft } from "lucide-react";
import WishlistButton from "../components/WishlistButton";
import AvailabilityCalendar from "../components/AvailabilityCalendar";

function VendorDetailsPage() {

    const { id } = useParams();

    const navigate = useNavigate();

    const { user, token } = useAuth();

    const [vendor, setVendor] = useState(null);

    const [showModal, setShowModal] = useState(false);

    const [reviews, setReviews] = useState([]);

    const [showReviewModal, setShowReviewModal] = useState(false);

    const [selectedImage, setSelectedImage] = useState("");

    const [relatedVendors, setRelatedVendors] = useState([]);

    const [reviewRating, setReviewRating] = useState(0);

    const [submittingReview, setSubmittingReview] = useState(false);

    const [loading, setLoading] = useState(true);

    const [notFound, setNotFound] = useState(false);

    // Confirmed bookings + the vendor's own blackout days, merged into one
    // set of unavailable date strings for the read-only calendar below -
    // the same shape BookingModal fetches again for its own interactive
    // picker, so a customer sees the exact same availability in both
    // places.
    const [unavailableDates, setUnavailableDates] = useState(new Set());

    const fetchAvailability = async () => {
        try {
            const response = await API.get(`/vendors/${id}/availability`);
            const dates = new Set([
                ...(response.data.bookedDates || []),
                ...(response.data.blockedDates || []).map((b) => b.date)
            ]);
            setUnavailableDates(dates);
        } catch (error) {
            console.log(error);
        }
    };

    const fetchVendor = async () => {

        try {

            setLoading(true);

            const response = await API.get(

                `/vendors/${id}`

            );

            setVendor(

                response.data.vendor

            );

            fetchRelated(

                response.data.vendor.category

            );

            setSelectedImage(

                response.data.vendor.portfolio_image

                ||

                response.data.vendor.gallery_images?.[0]

                ||

                "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop"

            );

            // Record this view for the customer's "Recently Viewed" history.
            // Fire-and-forget: never blocks the page or shows an error if
            // it fails, since it's a nice-to-have, not core functionality.
            if (user?.role === "customer" && token) {
                API.post(
                    `/history/view/${response.data.vendor.id}`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                ).catch(() => {});
            }

        }

        catch(error){

            console.log(error);

            setNotFound(true);

        }

        finally {

            setLoading(false);

        }

    };

    const fetchRelated = async (

        category

    ) => {

        try {

            const response = await API.get(

                `/vendors/related?category=${category}&vendorId=${id}`

            );

            setRelatedVendors(

                response.data.vendors

            );

        }

        catch(error){

            console.log(error);

        }

    };

    const fetchReviews = async () => {

        try {

            const response = await API.get(

                `/reviews/vendor/${id}`

            );

            setReviews(

                response.data.reviews || []

            );

        }

        catch(error){

            console.log(

                "Review Error:",

                error

            );

            setReviews([]);

        }

    };

    useEffect(() => {

        fetchVendor();

        fetchReviews();

        fetchAvailability();

    }, [id]);

    if (loading) {

        return (

            <div className="min-h-screen bg-gray-50 py-10 px-6">
                <div className="max-w-6xl mx-auto animate-pulse space-y-6">
                    <div className="h-[450px] bg-gray-200 rounded-3xl" />
                    <div className="h-8 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-24 bg-gray-200 rounded" />
                </div>
            </div>

        );

    }

    if (notFound || !vendor) {

        return (

            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800">Vendor not found</h2>
                    <p className="text-gray-500 mt-2">This vendor may have been removed or the link is incorrect.</p>
                    <button
                        onClick={() => navigate("/vendors")}
                        className="mt-6 px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition"
                    >
                        Browse Vendors
                    </button>
                </div>
            </div>

        );

    }

    const openChat = () => {

        if (!user) {
            toast.error("Please log in to chat with this vendor");
            navigate("/login");
            return;
        }

        // Room id is keyed by (vendor, customer) pair - not by booking - so
        // the same conversation is reachable before AND after a booking
        // exists, and the vendor dashboard's "Chat with Customer" button
        // (which knows the customer's id from the booking) lands in the
        // exact same room.
        localStorage.setItem(

            "currentRoom",

            `chat-v${vendor.id}-c${user.id}`

        );

        localStorage.setItem("currentRoomLabel", vendor.business_name);

        navigate("/chat");

    };

    const requireLogin = (action) => {
        if (!user) {
            toast.error(`Please log in to ${action}`);
            navigate("/login");
            return false;
        }
        return true;
    };

    return (

        <div className="min-h-screen bg-gray-50 py-10 px-6">

            {/* BACK NAVIGATION */}
            <div className="max-w-6xl mx-auto mb-6 flex items-center justify-between">

                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-teal-600 transition font-medium"
                >
                    <ArrowLeft size={18} />
                    Back
                </button>

                <nav className="text-sm text-gray-400 hidden sm:flex items-center gap-2">
                    <Link to="/vendors" className="hover:text-teal-600 transition">Vendors</Link>
                    <span>/</span>
                    <Link to={`/vendors?category=${encodeURIComponent(vendor.category)}`} className="hover:text-teal-600 transition">
                        {vendor.category}
                    </Link>
                    <span>/</span>
                    <span className="text-gray-600">{vendor.business_name}</span>
                </nav>

            </div>

            {/* MAIN CARD */}

            <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">

                <div className="relative">

                    <img

                        src={selectedImage}

                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop";
                        }}

                        alt={vendor.business_name}

                        className="w-full h-[450px] object-cover"

                    />

                    <WishlistButton vendorId={vendor.id} size="lg" className="absolute top-6 right-6" />

                </div>

                {/* GALLERY */}

                <div className="flex gap-4 p-6 overflow-x-auto">

                    {

                        [
                            vendor.portfolio_image,

                            ...(vendor.gallery_images || [])

                        ]

                        .filter(

                            image =>

                            image &&

                            image.startsWith("http")

                        )

                        .filter(Boolean)

                        .map(

                            (image,index) => (

                                <img

                                    key={index}

                                    src={image}

                                    onClick={() =>

                                        setSelectedImage(

                                            image

                                        )

                                    }

                                    className="w-28 h-20 rounded-xl object-cover cursor-pointer border-4 border-transparent hover:border-teal-500"

                                />

                            )

                        )

                    }

                </div>

                <div className="p-10">

                    <div className="flex justify-between items-start flex-wrap gap-6">

                        <div>

                            <h1 className="text-5xl font-bold">

                                {vendor.business_name}

                            </h1>

                            <p className="mt-3 text-gray-500">

                                {vendor.city}

                            </p>

                        </div>

                        <div className="text-right">

                            <p className="text-3xl font-bold text-teal-600">

                                {vendor.price_range}

                            </p>

                            <p className="mt-2 text-lg flex items-center gap-1.5">

                                <Star size={18} className="text-gold" fill="currentColor" strokeWidth={0} /> {vendor.avg_rating}

                                <span className="text-gray-500 ml-2">

                                    (

                                    {vendor.total_reviews}

                                    Reviews

                                    )

                                </span>

                            </p>

                        </div>

                    </div>

                    <div className="mt-10">

                        <h2 className="text-2xl font-bold">

                            About Vendor

                        </h2>

                        <p className="mt-4 text-gray-600 leading-relaxed">

                            {vendor.description}

                        </p>

                    </div>

                    <div className="mt-10">

                        <h2 className="text-2xl font-bold">
                            Availability
                        </h2>

                        <p className="mt-2 text-gray-500">
                            Dates already locked in or blocked off by this vendor are shown unavailable below.
                        </p>

                        <div className="mt-5">
                            <AvailabilityCalendar unavailableDates={unavailableDates} />
                        </div>

                    </div>

                    <div className="flex gap-5 mt-10 flex-wrap">

                        <button

                            onClick={() => {
                                if (requireLogin("book this vendor")) {
                                    setShowModal(true);
                                }
                            }}

                            className="px-8 py-4 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition"

                        >

                            Book Vendor

                        </button>

                        <button

                            onClick={openChat}

                            className="px-8 py-4 bg-rose-500 text-white rounded-2xl hover:bg-rose-600 transition shadow-lg"

                        >

                            Chat Vendor

                        </button>

                        <button

                            onClick={() =>

                                requireLogin("leave a review") && setShowReviewModal(true)

                            }

                            className="px-8 py-4 border border-teal-600 text-teal-600 rounded-2xl hover:bg-teal-50 transition"

                        >

                            Add Review

                        </button>

                    </div>

                </div>

            </div>

            {/* REVIEWS */}

            <div className="max-w-6xl mx-auto mt-10">

                <div className="bg-white rounded-3xl shadow-xl p-10">

                    <h2 className="text-3xl font-bold">

                        Customer Reviews

                    </h2>

                    {

                        reviews.length === 0 ? (

                            <div className="mt-6 bg-gray-100 rounded-2xl p-8 text-gray-500">

                                No reviews yet

                            </div>

                        ) : (

                            <div className="space-y-5 mt-8">

                                {

                                    reviews.map(

                                        (review) => (

                                            <div

                                                    key={review.id}

                                                    className="bg-gray-50 rounded-3xl p-6 shadow-sm"

                                                >

                                                    <div className="flex justify-between items-start">

                                                        <div className="flex gap-4 items-center">

                                                            <div className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold">

                                                                {

                                                                    review?.name?.charAt(0)

                                                                }

                                                            </div>

                                                            <div>

                                                                <h3 className="font-bold text-lg">

                                                                    {review?.name}

                                                                </h3>

                                                                <p className="text-sm text-gray-500">

                                                                    {

                                                                        new Date(

                                                                            review.created_at

                                                                        ).toLocaleDateString()

                                                                    }

                                                                </p>

                                                            </div>

                                                        </div>

                                                        <div className="flex gap-0.5 text-gold">

                                                            {

                                                                [1,2,3,4,5].map((i) => (
                                                                    <Star
                                                                        key={i}
                                                                        size={16}
                                                                        fill={i <= (review?.rating || 0) ? "currentColor" : "none"}
                                                                        className={i <= (review?.rating || 0) ? "" : "text-gray-300"}
                                                                        strokeWidth={i <= (review?.rating || 0) ? 0 : 1.5}
                                                                    />
                                                                ))

                                                            }

                                                        </div>

                                                    </div>

                                                    <p className="mt-5 text-gray-700 leading-relaxed">

                                                        {review?.review}

                                                    </p>

                                                </div>

                                        )

                                    )

                                }

                            </div>

                        )

                    }

                </div>

            </div>

            {/* RELATED VENDORS */}

<div className="max-w-6xl mx-auto mt-10">

    <div className="bg-white rounded-3xl shadow-xl p-10">

        <h2 className="text-3xl font-bold mb-8">

            Similar Vendors

        </h2>

        {

            relatedVendors.length === 0 ? (

                <p className="text-gray-500">

                    No recommendations found

                </p>

            ) : (

                <div className="grid md:grid-cols-4 gap-6">

                    {

                        relatedVendors.map(

                            (item) => (

                                <div

                                    key={item.id}

                                    onClick={() =>

                                        navigate(

                                            `/vendors/${item.id}`

                                        )

                                    }

                                    className="cursor-pointer rounded-2xl overflow-hidden border hover:shadow-xl transition"

                                >

                                    <img

                                        src={
                                            item.portfolio_image ||
                                            "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop"
                                        }

                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop";
                                        }}

                                        alt={item.business_name}

                                        className="w-full h-40 object-cover"

                                    />

                                    <div className="p-4">

                                        <h3 className="font-bold">

                                            {item.business_name}

                                        </h3>

                                        <p className="text-sm text-gray-500">

                                            {item.city}

                                        </p>

                                    </div>

                                </div>

                            )

                        )

                    }

                </div>

            )

        }

    </div>

</div>

            {

                showModal && (

                    <BookingModal

                        vendor={vendor}

                        onClose={() =>

                            setShowModal(false)

                        }

                    />

                )

            }
            {

                showReviewModal && (

                    <div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6"
                        onClick={(e) => {
                            if (e.target !== e.currentTarget) return;
                            setShowReviewModal(false);
                            setReviewRating(0);
                        }}
                    >

                        <div className="bg-white rounded-3xl p-10 w-full max-w-xl">

                            <div className="flex justify-between items-center">

                                <h2 className="text-3xl font-bold">

                                    Add Review

                                </h2>

                                <button

                                    onClick={() => {
                                        setShowReviewModal(false);
                                        setReviewRating(0);
                                    }}

                                    className="text-gray-400 hover:text-ink transition"

                                >

                                    <X size={22} />

                                </button>

                            </div>

                            <form

                                className="space-y-5 mt-8"

                                onSubmit={async (e) => {

                                    e.preventDefault();

                                    if (!reviewRating) {
                                        toast.error("Please select a star rating");
                                        return;
                                    }

                                    try {

                                        setSubmittingReview(true);

                                        const token = localStorage.getItem(

                                            "token"

                                        );

                                        const form = new FormData(

                                            e.target

                                        );

                                        await API.post(

                                            "/reviews/create",

                                            {

                                                vendor_id: vendor.id,

                                                rating: reviewRating,

                                                review: form.get("review")

                                            },

                                            {

                                                headers: {

                                                    Authorization:

                                                    `Bearer ${token}`

                                                }

                                            }

                                        );

                                        toast.success("Review submitted, thank you!");

                                        fetchReviews();

                                        setShowReviewModal(false);

                                        setReviewRating(0);

                                    }

                                    catch(error){

                                        toast.error(
                                            error.response?.data?.message ||
                                            "Could not submit your review"
                                        );

                                    }

                                    finally {

                                        setSubmittingReview(false);

                                    }

                                }}

                            >

                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-2">Your Rating</p>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                type="button"
                                                key={star}
                                                onClick={() => setReviewRating(star)}
                                                className="transition"
                                                aria-label={`${star} star`}
                                            >
                                                <Star
                                                    size={32}
                                                    className={star <= reviewRating ? "text-gold" : "text-gray-300"}
                                                    fill="currentColor"
                                                    strokeWidth={0}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <textarea

                                    name="review"

                                    placeholder="Write review"

                                    className="w-full border rounded-xl px-5 py-4 h-32"

                                    required

                                />

                                <button

                                    disabled={submittingReview}

                                    className="w-full bg-teal-600 text-white py-4 rounded-xl disabled:opacity-60"

                                >

                                    {submittingReview ? "Submitting..." : "Submit Review"}

                                </button>

                            </form>

                        </div>

                    </div>

                )

            }

        </div>

    );

}

export default VendorDetailsPage;