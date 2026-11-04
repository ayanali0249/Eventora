import { Fragment, useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Star, X, ArrowLeft, Scale } from "lucide-react";

import API from "../services/api";
import WishlistButton from "../components/WishlistButton";
import { useCompare } from "../context/CompareContext";

const FALLBACK_IMAGE =
    "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop";

function ComparePage() {

    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { clearCompare } = useCompare();

    const ids = (searchParams.get("ids") || "").split(",").filter(Boolean);

    const [vendors, setVendors] = useState([]);
    const [missingIds, setMissingIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {

        if (ids.length < 2) {
            setLoading(false);
            return;
        }

        const fetchComparison = async () => {
            setLoading(true);
            setError("");
            try {
                const response = await API.get(`/vendors/compare?ids=${ids.join(",")}`);
                setVendors(response.data.vendors || []);
                setMissingIds(response.data.missingIds || []);
            } catch (err) {
                setError(err.response?.data?.message || "Couldn't load this comparison");
            } finally {
                setLoading(false);
            }
        };

        fetchComparison();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams.get("ids")]);

    const removeVendor = (vendorId) => {
        const remaining = ids.filter((id) => id !== String(vendorId));
        if (remaining.length < 2) {
            navigate("/vendors");
            return;
        }
        setSearchParams({ ids: remaining.join(",") });
    };

    const rows = [
        {
            label: "Category",
            render: (v) => (
                <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-sm font-semibold">
                    {v.category}
                </span>
            )
        },
        { label: "City", render: (v) => v.city },
        {
            label: "Rating",
            render: (v) => (
                <span className="flex items-center gap-1 text-gold font-bold">
                    <Star size={16} fill="currentColor" strokeWidth={0} />
                    {Number(v.avg_rating) > 0 ? v.avg_rating : "New"}
                    {v.review_count > 0 && (
                        <span className="text-gray-400 font-normal text-sm">
                            ({v.review_count} review{v.review_count === 1 ? "" : "s"})
                        </span>
                    )}
                </span>
            )
        },
        {
            label: "Starting From",
            render: (v) => (
                <span className="text-teal-600 font-bold">
                    {v.price_range || "Not listed"}
                </span>
            )
        },
        {
            label: "About",
            render: (v) => (
                <span className="text-gray-600 text-sm leading-relaxed">
                    {v.description || "No description provided yet."}
                </span>
            )
        },
        {
            label: "On Eventora Since",
            render: (v) => new Date(v.created_at).toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric"
            })
        }
    ];

    return (

        <div className="min-h-screen bg-gray-50 px-6 py-12">

            <div className="max-w-6xl mx-auto">

                {/* HEADER */}
                <div className="mb-8">

                    <Link
                        to="/vendors"
                        className="inline-flex items-center gap-2 text-gray-500 hover:text-teal-600 transition mb-4"
                    >
                        <ArrowLeft size={18} /> Back to Vendors
                    </Link>

                    <div className="bg-white rounded-3xl shadow-lg border border-teal-100 p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                        <div>
                            <div className="inline-flex items-center gap-2 text-teal-700 font-semibold">
                                <Scale size={20} />
                                Compare Vendors
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">
                                Side-By-Side Comparison
                            </h1>
                        </div>

                        {vendors.length > 0 && (
                            <button
                                onClick={() => {
                                    clearCompare();
                                    navigate("/vendors");
                                }}
                                className="px-5 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition font-semibold whitespace-nowrap"
                            >
                                Clear Comparison
                            </button>
                        )}

                    </div>

                </div>

                {/* NOT ENOUGH VENDORS SELECTED */}
                {ids.length < 2 && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <p className="text-gray-500">
                            Select at least 2 vendors from{" "}
                            <Link to="/vendors" className="text-teal-600 font-semibold hover:underline">
                                the vendor browse page
                            </Link>{" "}
                            to compare them here.
                        </p>
                    </div>
                )}

                {/* LOADING */}
                {ids.length >= 2 && loading && (
                    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${ids.length}, minmax(0, 1fr))` }}>
                        {ids.map((id) => (
                            <div key={id} className="bg-white rounded-3xl overflow-hidden shadow-lg animate-pulse">
                                <div className="h-56 w-full bg-gray-200" />
                                <div className="p-6 space-y-3">
                                    <div className="h-5 bg-gray-200 rounded w-2/3" />
                                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ERROR */}
                {ids.length >= 2 && !loading && error && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <p className="text-gray-500">{error}</p>
                    </div>
                )}

                {/* COMPARISON TABLE */}
                {ids.length >= 2 && !loading && !error && vendors.length > 0 && (
                    <>
                        {missingIds.length > 0 && (
                            <div className="mb-6 bg-gold/10 border border-gold/30 text-ink/80 rounded-2xl px-5 py-3 text-sm">
                                {missingIds.length === 1 ? "One vendor is" : `${missingIds.length} vendors are`}{" "}
                                no longer available and {missingIds.length === 1 ? "isn't" : "aren't"} shown below.
                            </div>
                        )}

                        <div className="overflow-x-auto bg-white rounded-3xl shadow-lg border border-gray-100">
                            <div
                                className="grid min-w-[700px]"
                                style={{ gridTemplateColumns: `160px repeat(${vendors.length}, minmax(200px, 1fr))` }}
                            >

                                {/* VENDOR CARDS ROW */}
                                <div className="p-5 flex items-end border-b border-gray-100">
                                    <span className="text-sm text-gray-400 font-semibold">Vendor</span>
                                </div>

                                {vendors.map((vendor) => (
                                    <div key={vendor.id} className="p-5 border-b border-l border-gray-100">

                                        <div className="relative mb-3">
                                            <img
                                                src={vendor.portfolio_image || FALLBACK_IMAGE}
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = FALLBACK_IMAGE;
                                                }}
                                                alt={vendor.business_name}
                                                className="h-36 w-full object-cover rounded-xl"
                                            />

                                            <div className="absolute top-2 right-2 flex flex-col gap-2">
                                                <WishlistButton vendorId={vendor.id} />
                                                <button
                                                    onClick={() => removeVendor(vendor.id)}
                                                    aria-label={`Remove ${vendor.business_name} from comparison`}
                                                    className="w-9 h-9 rounded-full bg-white/90 backdrop-blur shadow-md flex items-center justify-center hover:scale-110 transition"
                                                >
                                                    <X size={18} className="text-gray-500" />
                                                </button>
                                            </div>

                                            {vendor.is_featured && (
                                                <span className="absolute top-2 left-2 bg-gold text-ink text-xs font-bold px-3 py-1 rounded-full">
                                                    Featured
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-lg font-bold text-gray-900 leading-snug">
                                            {vendor.business_name}
                                        </h3>

                                    </div>
                                ))}

                                {/* ATTRIBUTE ROWS */}
                                {rows.map((row) => (
                                    <Fragment key={row.label}>

                                        <div className="p-5 border-b border-gray-100 bg-gray-50/60 flex items-start">
                                            <span className="text-sm text-gray-500 font-semibold">{row.label}</span>
                                        </div>

                                        {vendors.map((vendor) => (
                                            <div
                                                key={`${row.label}-${vendor.id}`}
                                                className="p-5 border-b border-l border-gray-100 flex items-start"
                                            >
                                                {row.render(vendor)}
                                            </div>
                                        ))}

                                    </Fragment>
                                ))}

                                {/* ACTIONS ROW */}
                                <div className="p-5" />
                                {vendors.map((vendor) => (
                                    <div key={`action-${vendor.id}`} className="p-5 border-l border-gray-100">
                                        <Link
                                            to={`/vendors/${vendor.id}`}
                                            className="block text-center px-5 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition font-semibold"
                                        >
                                            View Full Profile
                                        </Link>
                                    </div>
                                ))}

                            </div>
                        </div>
                    </>
                )}

            </div>

        </div>

    );

}

export default ComparePage;
