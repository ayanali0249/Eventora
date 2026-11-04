import { createContext, useContext, useEffect, useState, useCallback } from "react";

import API from "../services/api";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

const WishlistContext = createContext();

export function useWishlist() {
    const context = useContext(WishlistContext);
    if (!context) {
        throw new Error("useWishlist must be used within a WishlistProvider");
    }
    return context;
}

function WishlistProvider({ children }) {

    const { user, token } = useAuth();

    // Set of vendor ids the current customer has saved. Using a Set keeps
    // isWishlisted() lookups O(1) instead of re-scanning an array on every
    // card render.
    const [wishlistIds, setWishlistIds] = useState(new Set());
    const [loading, setLoading] = useState(false);

    const fetchWishlistIds = useCallback(async () => {

        if (!user || user.role !== "customer" || !token) {
            setWishlistIds(new Set());
            return;
        }

        try {
            setLoading(true);
            const response = await API.get("/wishlist/ids", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setWishlistIds(new Set(response.data.vendorIds));
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }

    }, [user, token]);

    useEffect(() => {
        fetchWishlistIds();
    }, [fetchWishlistIds]);

    const isWishlisted = (vendorId) => wishlistIds.has(vendorId);

    // Optimistic toggle: update local state immediately so the heart icon
    // responds instantly, roll back if the request actually fails.
    const toggleWishlist = async (vendorId) => {

        if (!user) {
            toast.error("Please log in to save vendors");
            return false;
        }

        if (user.role !== "customer") {
            toast.error("Only customer accounts can save vendors");
            return false;
        }

        const wasWishlisted = wishlistIds.has(vendorId);

        setWishlistIds((prev) => {
            const next = new Set(prev);
            wasWishlisted ? next.delete(vendorId) : next.add(vendorId);
            return next;
        });

        try {

            if (wasWishlisted) {
                await API.delete(`/wishlist/${vendorId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success("Removed from wishlist");
            } else {
                await API.post(
                    "/wishlist/add",
                    { vendor_id: vendorId },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                toast.success("Saved to wishlist");
            }

            return true;

        } catch (error) {

            // roll back on failure
            setWishlistIds((prev) => {
                const next = new Set(prev);
                wasWishlisted ? next.add(vendorId) : next.delete(vendorId);
                return next;
            });

            toast.error(error.response?.data?.message || "Something went wrong");
            return false;

        }

    };

    return (
        <WishlistContext.Provider
            value={{
                wishlistIds,
                isWishlisted,
                toggleWishlist,
                loading,
                refreshWishlist: fetchWishlistIds
            }}
        >
            {children}
        </WishlistContext.Provider>
    );
}

export default WishlistProvider;
