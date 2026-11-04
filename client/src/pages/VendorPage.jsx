import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import API from "../services/api";
import { Search, ChevronDown, SlidersHorizontal } from "lucide-react";

import VendorCard from "../components/VendorCard";
import Pagination from "../components/Pagination";

function VendorPage() {

    const [searchParams, setSearchParams] = useSearchParams();

    const [vendors, setVendors] = useState([]);
    const [pagination, setPagination] = useState(null);

    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [debouncedSearch, setDebouncedSearch] = useState(search);

    const [category, setCategory] = useState(searchParams.get("category") || "");
    const [city, setCity] = useState(searchParams.get("city") || "");
    const [sort, setSort] = useState(searchParams.get("sort") || "");
    const [minRating, setMinRating] = useState(searchParams.get("minRating") || "");

    const [priceMinInput, setPriceMinInput] = useState(searchParams.get("priceMin") || "");
    const [priceMaxInput, setPriceMaxInput] = useState(searchParams.get("priceMax") || "");
    const [priceMin, setPriceMin] = useState(priceMinInput);
    const [priceMax, setPriceMax] = useState(priceMaxInput);
    const [showMoreFilters, setShowMoreFilters] = useState(
        Boolean(searchParams.get("minRating") || searchParams.get("priceMin") || searchParams.get("priceMax"))
    );

    const [page, setPage] = useState(Number(searchParams.get("page")) || 1);

    const [categoryOptions, setCategoryOptions] = useState([]);
    const [cityOptions, setCityOptions] = useState([]);
    const [priceBounds, setPriceBounds] = useState({ min: null, max: null });

    const [loading, setLoading] = useState(true);

    // Debounce the search box so we don't fire an API request on every
    // keystroke.
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Debounce the price inputs the same way.
    useEffect(() => {
        const timer = setTimeout(() => {
            setPriceMin(priceMinInput);
            setPriceMax(priceMaxInput);
        }, 500);
        return () => clearTimeout(timer);
    }, [priceMinInput, priceMaxInput]);

    // Load the real category/city/price options that exist in the
    // database, so the filters never offer something that returns zero
    // results.
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const response = await API.get("/vendors/filters");
                setCategoryOptions(response.data.categories || []);
                setCityOptions(response.data.cities || []);
                setPriceBounds(response.data.priceBounds || { min: null, max: null });
            } catch (error) {
                console.log(error);
            }
        };
        fetchFilters();
    }, []);

    // Tracks the previous filter combination so a FILTER change (not a page
    // change) can reset to page 1 without racing the fetch below: if we
    // instead reset page via its own separate effect, that effect's
    // setPage(1) wouldn't be visible yet when THIS effect runs in the same
    // commit, so it would fetch once with the old (now out-of-range) page
    // and the new filters, then fetch again a moment later once page
    // actually became 1. Computing the effective page synchronously here
    // avoids that wasted/incorrect request entirely.
    const filterSignature = JSON.stringify([debouncedSearch, category, city, sort, minRating, priceMin, priceMax]);
    const prevFilterSignature = useRef(filterSignature);

    // FETCH VENDORS
    const fetchVendors = async (targetPage) => {

        try {

            setLoading(true);

            const params = new URLSearchParams();
            if (debouncedSearch) params.set("search", debouncedSearch);
            if (category) params.set("category", category);
            if (city) params.set("city", city);
            if (sort) params.set("sort", sort);
            if (minRating) params.set("minRating", minRating);
            if (priceMin) params.set("priceMin", priceMin);
            if (priceMax) params.set("priceMax", priceMax);
            if (targetPage > 1) params.set("page", String(targetPage));

            const response = await API.get(`/vendors?${params.toString()}`);

            setVendors(response.data.vendors);
            setPagination(response.data.pagination);

            // Keep the URL in sync so filters (and the current page) survive
            // a refresh/share.
            setSearchParams(params, { replace: true });

        } catch (error) {

            console.log(error);

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        const filterChanged = prevFilterSignature.current !== filterSignature;
        prevFilterSignature.current = filterSignature;

        if (filterChanged && page !== 1) {
            // Let the re-render this triggers (page now 1) do the actual
            // fetch, instead of fetching twice in a row for the same
            // filters.
            setPage(1);
            return;
        }

        fetchVendors(page);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterSignature, page]);

    const handlePageChange = (newPage) => {
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const clearFilters = () => {
        setSearch("");
        setDebouncedSearch("");
        setCategory("");
        setCity("");
        setSort("");
        setMinRating("");
        setPriceMinInput("");
        setPriceMaxInput("");
        setPriceMin("");
        setPriceMax("");
        setPage(1);
    };

    const hasActiveFilters = search || category || city || sort || minRating || priceMin || priceMax;

    return (

        <div className="min-h-screen bg-gray-50 px-6 py-12">

            <div className="max-w-7xl mx-auto">

                {/* HEADER */}
                <div className="mb-10">

                    <div className="bg-white rounded-3xl shadow-lg border border-teal-100 p-8">

                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

                            <div>

                                <h1 className="text-4xl font-bold text-gray-900 mt-4">
                                    Discover Perfect Event Vendors
                                </h1>

                                <p className="text-gray-500 mt-3 max-w-2xl">
                                    Find photographers, decorators, caterers, planners and venues for your next event.
                                </p>

                            </div>

                            <div>
                                <p className="text-3xl font-bold text-teal-600">
                                    {loading ? "…" : (pagination?.total ?? vendors.length)}
                                </p>
                                <p className="text-gray-500 text-sm">
                                    {(pagination?.total ?? vendors.length) === 1 ? "Vendor Found" : "Vendors Found"}
                                </p>
                            </div>

                        </div>

                    </div>

                </div>

                {/* FILTER BAR */}
                <div className="bg-white rounded-[28px] shadow-xl border border-gray-100 p-4 mb-10">

                    <div className="flex flex-col lg:flex-row gap-4">

                        {/* SEARCH */}
                        <div className="flex-1">

                            <div className="flex items-center bg-gray-50 rounded-2xl px-5 h-16 border border-transparent focus-within:border-teal-500 transition">

                                <Search size={20} className="mr-3 text-gray-400" />

                                <input
                                    type="text"
                                    placeholder="Search vendors, cities, categories..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="bg-transparent w-full outline-none text-lg"
                                />

                            </div>

                        </div>

                        {/* CATEGORY FILTER */}
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="h-16 bg-white border-2 border-teal-100 rounded-2xl px-5 text-gray-800 font-medium shadow-sm hover:border-teal-300 focus:border-teal-500 focus:outline-none transition cursor-pointer lg:min-w-[200px]"
                        >
                            <option value="">All Categories</option>
                            {categoryOptions.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        {/* CITY FILTER */}
                        <select
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="h-16 bg-white border-2 border-teal-100 rounded-2xl px-5 text-gray-800 font-medium shadow-sm hover:border-teal-300 focus:border-teal-500 focus:outline-none transition cursor-pointer lg:min-w-[180px]"
                        >
                            <option value="">All Cities</option>
                            {cityOptions.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>

                        {/* SORT */}
                        <div className="relative min-w-[220px]">

                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                                className="appearance-none relative w-full h-16 bg-white border-2 border-teal-100 rounded-2xl px-6 pr-14 text-gray-800 font-semibold shadow-lg hover:border-teal-300 focus:border-teal-500 focus:outline-none transition-all cursor-pointer"
                            >
                                <option value="">Newest Vendors</option>
                                <option value="rating">Top Rated</option>
                                <option value="price">Lowest Price</option>
                                <option value="price_high">Highest Price</option>
                            </select>

                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-ink shadow-lg border border-gray-300">
                                    <ChevronDown size={16} />
                                </div>
                            </div>

                        </div>

                        {/* MORE FILTERS TOGGLE */}
                        <button
                            onClick={() => setShowMoreFilters((prev) => !prev)}
                            className={`h-16 px-5 rounded-2xl border-2 font-medium flex items-center gap-2 transition ${
                                showMoreFilters
                                    ? "border-teal-500 bg-teal-50 text-teal-700"
                                    : "border-teal-100 text-gray-700 hover:border-teal-300"
                            }`}
                        >
                            <SlidersHorizontal size={18} />
                            More Filters
                        </button>

                    </div>

                    {/* RATING + PRICE FILTERS */}
                    {showMoreFilters && (
                        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col lg:flex-row gap-4">

                            <select
                                value={minRating}
                                onChange={(e) => setMinRating(e.target.value)}
                                className="h-14 bg-white border-2 border-gray-200 rounded-2xl px-5 text-gray-800 font-medium shadow-sm hover:border-teal-300 focus:border-teal-500 focus:outline-none transition cursor-pointer lg:min-w-[180px]"
                            >
                                <option value="">Any Rating</option>
                                <option value="4.5">4.5+ Stars</option>
                                <option value="4">4+ Stars</option>
                                <option value="3">3+ Stars</option>
                            </select>

                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min="0"
                                    placeholder={priceBounds.min !== null ? `Min ₹${priceBounds.min.toLocaleString("en-IN")}` : "Min price"}
                                    value={priceMinInput}
                                    onChange={(e) => setPriceMinInput(e.target.value)}
                                    className="h-14 w-40 bg-white border-2 border-gray-200 rounded-2xl px-4 text-gray-800 focus:border-teal-500 focus:outline-none transition"
                                />
                                <span className="text-gray-400">—</span>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder={priceBounds.max !== null ? `Max ₹${priceBounds.max.toLocaleString("en-IN")}` : "Max price"}
                                    value={priceMaxInput}
                                    onChange={(e) => setPriceMaxInput(e.target.value)}
                                    className="h-14 w-40 bg-white border-2 border-gray-200 rounded-2xl px-4 text-gray-800 focus:border-teal-500 focus:outline-none transition"
                                />
                            </div>

                        </div>
                    )}

                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="mt-4 text-sm text-teal-600 hover:underline font-medium"
                        >
                            Clear all filters
                        </button>
                    )}

                </div>

                {/* LOADING */}
                {loading && (

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-lg animate-pulse">
                                <div className="h-72 w-full bg-gray-200" />
                                <div className="p-7 space-y-3">
                                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                                    <div className="h-6 bg-gray-200 rounded w-2/3" />
                                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>

                )}

                {/* EMPTY */}
                {!loading && vendors.length === 0 && (

                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <p className="text-2xl font-bold text-gray-700">No vendors found</p>
                        <p className="text-gray-500 mt-2">Try adjusting your search or filters.</p>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="mt-6 px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>

                )}

                {/* VENDOR GRID */}
                {!loading && vendors.length > 0 && (

                    <>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {vendors.map((vendor) => (
                                <VendorCard key={vendor.id} vendor={vendor} />
                            ))}
                        </div>

                        <div className="bg-white rounded-[28px] shadow-xl border border-gray-100 mt-10">
                            <Pagination pagination={pagination} onPageChange={handlePageChange} itemLabel="vendors" />
                        </div>

                    </>

                )}

            </div>

        </div>

    );

}

export default VendorPage;
