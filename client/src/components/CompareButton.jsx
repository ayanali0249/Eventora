import { Scale } from "lucide-react";
import { useCompare } from "../context/CompareContext";

// Reusable "add to comparison tray" toggle, styled to match WishlistButton
// so the two sit together naturally on a vendor card's thumbnail overlay.
function CompareButton({ vendor, size = "sm", className = "" }) {

    const { isComparing, toggleCompare } = useCompare();

    const selected = isComparing(vendor.id);

    const dimensions = size === "lg" ? "w-12 h-12" : "w-9 h-9";
    const iconSize = size === "lg" ? 22 : 18;

    return (
        <button
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleCompare(vendor);
            }}
            aria-label={selected ? "Remove from comparison" : "Add to comparison"}
            aria-pressed={selected}
            title={selected ? "Remove from comparison" : "Add to comparison"}
            className={`${dimensions} rounded-full backdrop-blur shadow-md flex items-center justify-center hover:scale-110 transition ${
                selected ? "bg-teal-600" : "bg-white/90"
            } ${className}`}
        >
            <Scale
                size={iconSize}
                className={selected ? "text-white" : "text-gray-500"}
                strokeWidth={2}
            />
        </button>
    );
}

export default CompareButton;
