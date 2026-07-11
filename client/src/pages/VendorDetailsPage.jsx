import {

    useEffect,

    useState

} from "react";

import {

    useParams,

    useNavigate

} from "react-router-dom";

import API from "../services/api";

import BookingModal from "../components/BookingModal";

function VendorDetailsPage() {

    const { id } = useParams();

    const navigate = useNavigate();

    const [vendor, setVendor] = useState(null);

    const [showModal, setShowModal] = useState(false);

    const [reviews, setReviews] = useState([]);

    const [showReviewModal, setShowReviewModal] = useState(false);

    const [selectedImage, setSelectedImage] = useState("");

    const [relatedVendors, setRelatedVendors] = useState([]);

    const fetchVendor = async () => {

        try {

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

        }

        catch(error){

            console.log(error);

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

    }, [id]);

    if(!vendor){

        return (

            <div className="text-center p-10">

                Loading...

            </div>

        );

    }

    const openChat = () => {

        localStorage.setItem(

            "currentRoom",

            `booking-${vendor.id}`

        );

        navigate("/chat");

    };

    return (

        <div className="min-h-screen bg-gray-50 py-10 px-6">

            {/* MAIN CARD */}

            <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">

                <img

                    src={selectedImage}

                    alt={vendor.business_name}

                    className="w-full h-[450px] object-cover"

                />

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

                                    className="w-28 h-20 rounded-xl object-cover cursor-pointer border-4 border-transparent hover:border-purple-500"

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

                            <p className="text-3xl font-bold text-purple-600">

                                {vendor.price_range}

                            </p>

                            <p className="mt-2 text-lg">

                                ⭐ {vendor.avg_rating}

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

                    <div className="flex gap-5 mt-10 flex-wrap">

                        <button

                            onClick={() => setShowModal(true)}

                            className="px-8 py-4 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition"

                        >

                            Book Vendor

                        </button>

                        <button

                            onClick={openChat}

                            className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl hover:scale-105 transition shadow-lg"

                        >

                            Chat Vendor

                        </button>

                        <button

                            onClick={() =>

                                setShowReviewModal(true)

                            }

                            className="px-8 py-4 border border-purple-600 text-purple-600 rounded-2xl hover:bg-purple-50 transition"

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

                                                            <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">

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

                                                        <div className="text-yellow-500 text-lg">

                                                            {

                                                                "⭐".repeat(

                                                                    review?.rating || 0

                                                                )

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

                                        src={item.portfolio_image}

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

                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">

                        <div className="bg-white rounded-3xl p-10 w-full max-w-xl">

                            <div className="flex justify-between items-center">

                                <h2 className="text-3xl font-bold">

                                    Add Review

                                </h2>

                                <button

                                    onClick={() =>

                                        setShowReviewModal(false)

                                    }

                                    className="text-2xl"

                                >

                                    ✕

                                </button>

                            </div>

                            <form

                                className="space-y-5 mt-8"

                                onSubmit={async (e) => {

                                    e.preventDefault();

                                    try {

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

                                                rating: form.get("rating"),

                                                review: form.get("review")

                                            },

                                            {

                                                headers: {

                                                    Authorization:

                                                    `Bearer ${token}`

                                                }

                                            }

                                        );

                                        fetchReviews();

                                        setShowReviewModal(false);

                                    }

                                    catch(error){

                                        console.log(error);

                                    }

                                }}

                            >

                                <input

                                    name="rating"

                                    type="number"

                                    min="1"

                                    max="5"

                                    placeholder="Rating"

                                    className="w-full border rounded-xl px-5 py-4"

                                    required

                                />

                                <textarea

                                    name="review"

                                    placeholder="Write review"

                                    className="w-full border rounded-xl px-5 py-4 h-32"

                                    required

                                />

                                <button

                                    className="w-full bg-purple-600 text-white py-4 rounded-xl"

                                >

                                    Submit Review

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