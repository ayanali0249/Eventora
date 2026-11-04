import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";

import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";

import VendorCard from "../components/VendorCard";

function WishlistPage() {

    const { token } = useAuth();
    const { wishlistIds } = useWishlist();

    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchWishlist = async () => {

        try {

            setLoading(true);

            const response = await API.get("/wishlist", {
                headers: { Authorization: `Bearer ${token}` }
            });

            setVendors(response.data.vendors);

        } catch (error) {

            console.log(error);

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {
        fetchWishlist();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep the list in sync if a heart is un-saved from this very page
    // (wishlistIds comes from the shared context and updates instantly).
    useEffect(() => {
        setVendors((prev) => prev.filter((v) => wishlistIds.has(v.id)));
    }, [wishlistIds]);

    return (

        <div className="min-h-screen bg-gray-50 px-6 py-12">

            <div className="max-w-7xl mx-auto">

                <div className="mb-10">
                    <h1 className="text-4xl font-display font-semibold text-ink flex items-center gap-3">
                        <Heart size={32} className="text-rose-500" fill="currentColor" strokeWidth={0} />
                        My Wishlist
                    </h1>
                    <p className="text-gray-500 mt-3">
                        Vendors you've saved for later.
                    </p>
                </div>

                {loading && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-lg animate-pulse">
                                <div className="h-72 w-full bg-gray-200" />
                                <div className="p-7 space-y-3">
                                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                                    <div className="h-6 bg-gray-200 rounded w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && vendors.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <Heart size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-2xl font-bold text-gray-700">Your wishlist is empty</p>
                        <p className="text-gray-500 mt-2">Tap the heart on any vendor to save them here.</p>
                        <Link
                            to="/vendors"
                            className="inline-block mt-6 px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition"
                        >
                            Browse Vendors
                        </Link>
                    </div>
                )}

                {!loading && vendors.length > 0 && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {vendors.map((vendor) => (
                            <VendorCard key={vendor.id} vendor={vendor} />
                        ))}
                    </div>
                )}

            </div>

        </div>

    );

}

export default WishlistPage;
