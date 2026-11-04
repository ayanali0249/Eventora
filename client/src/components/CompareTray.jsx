import { useNavigate } from "react-router-dom";
import { Scale, X } from "lucide-react";
import { useCompare } from "../context/CompareContext";

// Floating bar that appears the moment someone adds a vendor to the
// comparison tray (from any page that renders a VendorCard), and follows
// them around the site until they either compare or clear the selection.
// Mounted once, globally, in App.jsx - same pattern as the AI chatbot
// widget.
function CompareTray() {

    const { compareList, removeFromCompare, clearCompare, maxCompare } = useCompare();
    const navigate = useNavigate();

    if (compareList.length === 0) {
        return null;
    }

    const canCompare = compareList.length >= 2;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">

            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center gap-4">

                <div className="flex items-center gap-2 text-teal-700 font-semibold shrink-0">
                    <Scale size={20} />
                    <span>{compareList.length}/{maxCompare} Selected</span>
                </div>

                <div className="flex-1 flex items-center gap-3 overflow-x-auto w-full sm:w-auto">
                    {compareList.map((vendor) => (
                        <div
                            key={vendor.id}
                            className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl pl-2 pr-1 py-1 shrink-0"
                        >
                            <img
                                src={
                                    vendor.portfolio_image ||
                                    "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop"
                                }
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop";
                                }}
                                alt={vendor.business_name}
                                className="w-8 h-8 rounded-lg object-cover"
                            />
                            <span className="text-sm text-gray-700 max-w-[120px] truncate">
                                {vendor.business_name}
                            </span>
                            <button
                                onClick={() => removeFromCompare(vendor.id)}
                                aria-label={`Remove ${vendor.business_name} from comparison`}
                                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-3 shrink-0">

                    <button
                        onClick={clearCompare}
                        className="text-gray-500 hover:text-gray-700 text-sm font-medium transition"
                    >
                        Clear
                    </button>

                    <button
                        onClick={() => {
                            if (!canCompare) return;
                            const ids = compareList.map((v) => v.id).join(",");
                            navigate(`/compare?ids=${ids}`);
                        }}
                        disabled={!canCompare}
                        title={canCompare ? "Compare selected vendors" : "Select at least 2 vendors to compare"}
                        className="px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition font-semibold whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-teal-600"
                    >
                        Compare Now
                    </button>

                </div>

            </div>

        </div>
    );

}

export default CompareTray;
