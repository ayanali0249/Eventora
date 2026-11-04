import { createContext, useContext, useState } from "react";
import toast from "react-hot-toast";

const CompareContext = createContext();

export function useCompare() {
    const context = useContext(CompareContext);
    if (!context) {
        throw new Error("useCompare must be used within a CompareProvider");
    }
    return context;
}

const MAX_COMPARE = 4;

// Pure client-side selection state for the "compare vendors" tray - unlike
// the wishlist, this isn't tied to an account or persisted server-side: it's
// a lightweight browsing aid open to guests too (comparing a few vendors
// doesn't require booking or saving anything). Each entry keeps just enough
// of the vendor to render the floating tray (id, name, thumbnail) without
// needing an extra fetch; the full comparable details are fetched once, by
// id, when the person actually opens the comparison page.
function CompareProvider({ children }) {

    const [compareList, setCompareList] = useState([]);

    const isComparing = (vendorId) => compareList.some((v) => v.id === vendorId);

    const toggleCompare = (vendor) => {

        setCompareList((prev) => {

            const alreadyIn = prev.some((v) => v.id === vendor.id);

            if (alreadyIn) {
                return prev.filter((v) => v.id !== vendor.id);
            }

            if (prev.length >= MAX_COMPARE) {
                toast.error(`You can compare up to ${MAX_COMPARE} vendors at a time`);
                return prev;
            }

            return [
                ...prev,
                {
                    id: vendor.id,
                    business_name: vendor.business_name,
                    portfolio_image: vendor.portfolio_image
                }
            ];

        });

    };

    const removeFromCompare = (vendorId) => {
        setCompareList((prev) => prev.filter((v) => v.id !== vendorId));
    };

    const clearCompare = () => setCompareList([]);

    return (
        <CompareContext.Provider
            value={{
                compareList,
                isComparing,
                toggleCompare,
                removeFromCompare,
                clearCompare,
                maxCompare: MAX_COMPARE
            }}
        >
            {children}
        </CompareContext.Provider>
    );
}

export default CompareProvider;
