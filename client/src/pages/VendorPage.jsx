import { useEffect, useState } from "react";

import API from "../services/api";

import VendorCard from "../components/VendorCard";

function VendorPage() {

    const [vendors, setVendors] = useState([]);

    const [search, setSearch] = useState("");

    const [sort, setSort] = useState("");

    const [loading, setLoading] = useState(true);


    // FETCH VENDORS
    const fetchVendors = async () => {

        try {

            const response = await API.get(`/vendors?search=${search}&sort=${sort}`);

            console.log(response.data);

            setVendors(response.data.vendors);

        } catch (error) {

            console.log(error);

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        fetchVendors();

    }, [

        search,

        sort

    ]);

    return (

        <div className="min-h-screen bg-gray-50 px-6 py-12">

            <div className="max-w-7xl mx-auto">

                {/* HEADER */}
                <div className="mb-10">

                    <div className="bg-white rounded-3xl shadow-lg border border-purple-100 p-8">

                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

                            <div>

                                <h1 className="text-4xl font-bold text-gray-900 mt-4">

                                    Discover Perfect Event Vendors

                                </h1>

                                <p className="text-gray-500 mt-3 max-w-2xl">

                                    Find photographers, decorators, caterers, planners and venues for your next event.

                                </p>

                            </div>

                            <div className="flex gap-8">

                                <div>

                                    <p className="text-3xl font-bold text-purple-600">

                                        500+

                                    </p>

                                    <p className="text-gray-500 text-sm">

                                        Vendors

                                    </p>

                                </div>

                                <div>

                                    <p className="text-3xl font-bold text-pink-500">

                                        1K+

                                    </p>

                                    <p className="text-gray-500 text-sm">

                                        Bookings

                                    </p>

                                </div>

                                <div>

                                    <p className="text-3xl font-bold text-blue-500">

                                        50+

                                    </p>

                                    <p className="text-gray-500 text-sm">

                                        Cities

                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

                {/* LOADING */}
                {
                    loading && (

                        <div className="text-center text-2xl font-bold">
                            Loading vendors...
                        </div>

                    )
                }

                {/* EMPTY */}
                {
                    !loading && vendors.length === 0 && (

                        <div className="text-center text-2xl font-bold text-gray-500">
                            No vendors found
                        </div>

                    )
                }

                {/* VENDOR GRID */}
                <div className="bg-white rounded-[28px] shadow-xl border border-gray-100 p-4 mb-10">

                    <div className="flex flex-col lg:flex-row gap-4">

                        {/* SEARCH */}

                        <div className="flex-1">

                            <div className="flex items-center bg-gray-50 rounded-2xl px-5 h-16 border border-transparent focus-within:border-purple-500 transition">

                                <span className="text-xl mr-3">

                                    🔍

                                </span>

                                <input

                                    type="text"

                                    placeholder="Search vendors, cities, categories..."

                                    value={search}

                                    onChange={(e) =>

                                        setSearch(

                                            e.target.value

                                        )

                                    }

                                    className="bg-transparent w-full outline-none text-lg"

                                />

                            </div>

                        </div>

                        {/* FILTER */}

                        <div className="relative min-w-[280px]">

                            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl blur-md opacity-20"></div>

                            <select

                                value={sort}

                                onChange={(e) =>

                                    setSort(

                                        e.target.value

                                    )

                                }

                                className="appearance-none relative w-full h-16 bg-white border-2 border-purple-100 rounded-2xl px-6 pr-14 text-gray-800 text-lg font-semibold shadow-lg hover:border-purple-300 focus:border-purple-500 focus:outline-none transition-all cursor-pointer"

                            >

                                <option value="">

                                    🆕 Newest Vendors

                                </option>

                                <option value="rating">

                                    ⭐ Top Rated

                                </option>

                                <option value="price">

                                    💰 Lowest Price

                                </option>

                            </select>

                            {/* Custom Arrow */}

                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">

                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black shadow-lg border border-gray-300">

                                    ▼

                                </div>

                            </div>

                        </div>

                    </div>

                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">

                    {
                        vendors.map((vendor) => (

                            <VendorCard
                                key={vendor.id}
                                vendor={vendor}
                            />

                        ))
                    }

                </div>

            </div>

        </div>

    )

}

export default VendorPage