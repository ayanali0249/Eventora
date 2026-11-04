import { Heart } from "lucide-react";
import { useWishlist } from "../context/WishlistContext";

// Reusable save/unsave heart button. `size="sm"` for use on top of a vendor
// card thumbnail, `size="lg"` for the vendor details page header.
function WishlistButton({ vendorId, size = "sm", className = "" }) {

    const { isWishlisted, toggleWishlist } = useWishlist();

    const saved = isWishlisted(vendorId);

    const dimensions = size === "lg"
        ? "w-12 h-12"
        : "w-9 h-9";

    const iconSize = size === "lg" ? 22 : 18;

    return (
        <button
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist(vendorId);
            }}
            aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
            aria-pressed={saved}
            className={`${dimensions} rounded-full bg-white/90 backdrop-blur shadow-md flex items-center justify-center hover:scale-110 transition ${className}`}
        >
            <Heart
                size={iconSize}
                className={saved ? "text-rose-500" : "text-gray-500"}
                fill={saved ? "currentColor" : "none"}
                strokeWidth={saved ? 0 : 2}
            />
        </button>
    );
}

export default WishlistButton;
