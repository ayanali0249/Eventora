import { useState } from "react";

import BookingModal from "./BookingModal";

import { useNavigate } from "react-router-dom";

function VendorCard({ vendor }) {

    const [showModal, setShowModal] = useState(false);

    const navigate = useNavigate();

    const openVendorDetails = () => {

        navigate(

            `/vendors/${vendor.id}`

        );

    };

    return (

        <>

            <div

                onClick={openVendorDetails}

                className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition duration-300 cursor-pointer"

            >

                {/* IMAGE */}

                <img

                    src={

                        vendor.portfolio_image ||

                        "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop"

                    }

                    alt={vendor.business_name}

                    className="h-72 w-full object-cover"

                />

                {/* CONTENT */}

                <div className="p-7">

                    <div className="flex items-center justify-between mb-4">

                        <span className="bg-purple-100 text-purple-700 px-4 py-1 rounded-full text-sm font-semibold">

                            {vendor.category}

                        </span>

                        <span className="text-yellow-500 font-bold">

                            ★ {

                                vendor.avg_rating ||

                                "New"

                            }

                        </span>

                    </div>

                    <h3 className="text-2xl font-bold text-gray-900">

                        {vendor.business_name}

                    </h3>

                    <p className="text-gray-500 mt-2">

                        {vendor.city}

                    </p>

                    <p className="text-gray-600 mt-5 leading-relaxed">

                        {vendor.description}

                    </p>

                    <div className="flex items-center justify-between mt-8">

                        <div>

                            <p className="text-gray-400 text-sm">

                                Starting From

                            </p>

                            <h4 className="text-2xl font-bold text-purple-600">

                                {vendor.price_range}

                            </h4>

                        </div>

                        <button

                            onClick={(e) => {

                                e.stopPropagation();

                                setShowModal(true);

                            }}

                            className="px-5 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"

                        >

                            Book Now

                        </button>

                    </div>

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

        </>

    );

}

export default VendorCard;