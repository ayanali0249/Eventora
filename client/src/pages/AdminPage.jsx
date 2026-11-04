import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
    LayoutDashboard, Users, Store, CalendarCheck, Search,
    Ban, CheckCircle2, Trash2, Star, Loader2, ShieldCheck,
    UserX, Eye, Power, ScrollText, ArrowUpDown
} from "lucide-react";

import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { STATUS_STYLES, STATUS_LABELS } from "../components/BookingStatusBadge";
import Pagination from "../components/Pagination";
import ConfirmDialog from "../components/admin/ConfirmDialog";
import { UserDetailModal, BookingDetailModal } from "../components/admin/DetailModal";

const TABS = [
    { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { key: "users", label: "Users", Icon: Users },
    { key: "vendors", label: "Vendors", Icon: Store },
    { key: "bookings", label: "Bookings", Icon: CalendarCheck },
    { key: "reviews", label: "Reviews", Icon: Star },
    { key: "activity", label: "Activity log", Icon: ScrollText }
];

const AUDIT_LABELS = {
    "user.ban": "Suspended an account",
    "user.unban": "Reinstated an account",
    "user.delete": "Deleted an account",
    "vendor.feature": "Featured a vendor",
    "vendor.unfeature": "Unfeatured a vendor",
    "vendor.activate": "Reactivated a vendor listing",
    "vendor.deactivate": "Deactivated a vendor listing",
    "vendor.delete": "Removed a vendor profile",
    "booking.cancel": "Cancelled a booking"
};

const inputClass = "px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtDateTime = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// A sort <select> that encodes "key:dir" in one value.
function SortSelect({ value, onChange, options }) {
    return (
        <label className="inline-flex items-center gap-2 text-sm text-gray-500">
            <ArrowUpDown size={14} />
            <span className="sr-only">Sort by</span>
            <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} aria-label="Sort by">
                {options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
        </label>
    );
}

function IconButton({ title, onClick, disabled, tone = "gray", children }) {
    const tones = {
        gray: "text-gray-500 hover:bg-gray-100",
        rose: "text-rose-600 hover:bg-rose-50",
        amber: "text-amber-600 hover:bg-amber-50",
        emerald: "text-emerald-600 hover:bg-emerald-50",
        teal: "text-teal-600 hover:bg-teal-50"
    };
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            disabled={disabled}
            onClick={onClick}
            className={`w-8 h-8 inline-flex items-center justify-center rounded-lg disabled:opacity-40 ${tones[tone]}`}
        >
            {children}
        </button>
    );
}

function authHeaders() {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
}

function StatCard({ label, value, Icon, tone = "teal" }) {
    const toneClasses = {
        teal: "bg-teal-50 text-teal-600",
        rose: "bg-rose-50 text-rose-600",
        amber: "bg-amber-50 text-amber-600",
        sky: "bg-sky-50 text-sky-600",
        emerald: "bg-emerald-50 text-emerald-600"
    };
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${toneClasses[tone]}`}>
                <Icon size={22} />
            </div>
            <div className="min-w-0">
                <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
                <p className="text-sm text-gray-500 truncate">{label}</p>
            </div>
        </div>
    );
}

function RoleBadge({ role }) {
    const styles = {
        admin: "bg-violet-100 text-violet-700",
        vendor: "bg-sky-100 text-sky-700",
        customer: "bg-gray-100 text-gray-600"
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[role] || "bg-gray-100 text-gray-600"}`}>
            {role}
        </span>
    );
}

function AdminPage() {

    const { user: currentAdmin } = useAuth();

    const [activeTab, setActiveTab] = useState("dashboard");

    // One confirmation dialog and two detail views are shared by all tabs.
    const [dialog, setDialog] = useState(null);
    const [detailUserId, setDetailUserId] = useState(null);
    const [detailBookingId, setDetailBookingId] = useState(null);

    useEffect(() => {
        const previous = document.title;
        document.title = "Eventora Admin Dashboard";
        return () => { document.title = previous; };
    }, []);

    // Runs an admin API call for a dialog: toasts the outcome and rethrows
    // on failure so the dialog stays open.
    const runAction = async (request, successMessage, failureMessage) => {
        try {
            await request();
            toast.success(successMessage);
        } catch (error) {
            toast.error(error.response?.data?.message || failureMessage);
            throw error;
        }
    };

    // ---- DASHBOARD ----
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const res = await API.get("/admin/stats", authHeaders());
            setStats(res.data.stats);
        } catch (error) {
            console.log(error);
            toast.error("Failed to load platform stats");
        } finally {
            setStatsLoading(false);
        }
    }, []);

    // ---- USERS ----
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [usersPagination, setUsersPagination] = useState(null);
    const [userPage, setUserPage] = useState(1);
    const [roleFilter, setRoleFilter] = useState("");
    const [userStatusFilter, setUserStatusFilter] = useState("");
    const [userSearchInput, setUserSearchInput] = useState("");
    const [userSearch, setUserSearch] = useState("");
    const [userSort, setUserSort] = useState("created_at:desc");

    const fetchUsers = useCallback(async () => {
        setUsersLoading(true);
        try {
            const res = await API.get("/admin/users", {
                ...authHeaders(),
                params: {
                    page: userPage,
                    limit: 10,
                    role: roleFilter || undefined,
                    status: userStatusFilter || undefined,
                    search: userSearch || undefined,
                    sort: userSort.split(":")[0],
                    dir: userSort.split(":")[1]
                }
            });
            setUsers(res.data.users);
            setUsersPagination(res.data.pagination);
        } catch (error) {
            console.log(error);
            toast.error("Failed to load users");
        } finally {
            setUsersLoading(false);
        }
    }, [userPage, roleFilter, userStatusFilter, userSearch, userSort]);

    // Debounce the search box so every keystroke doesn't fire a request.
    useEffect(() => {
        const timer = setTimeout(() => {
            setUserPage(1);
            setUserSearch(userSearchInput);
        }, 400);
        return () => clearTimeout(timer);
    }, [userSearchInput]);

    const askBanUser = (targetUser) => setDialog({
        title: `Suspend ${targetUser.name}?`,
        description: "They lose access immediately, including on devices where they're already signed in. The reason is shown to them.",
        confirmLabel: "Suspend account",
        tone: "amber",
        reasonLabel: "Reason for suspension",
        run: async (reason) => {
            await runAction(
                () => API.put(`/admin/users/${targetUser.id}/ban`, { reason }, authHeaders()),
                `${targetUser.name} has been suspended`, "Failed to suspend user"
            );
            fetchUsers();
        }
    });

    const askUnbanUser = (targetUser) => setDialog({
        title: `Reinstate ${targetUser.name}?`,
        description: "They'll be able to sign in and use Eventora again straight away.",
        confirmLabel: "Reinstate account",
        tone: "teal",
        run: async () => {
            await runAction(
                () => API.put(`/admin/users/${targetUser.id}/unban`, {}, authHeaders()),
                `${targetUser.name} has been reinstated`, "Failed to reinstate user"
            );
            fetchUsers();
        }
    });

    const askDeleteUser = (targetUser) => setDialog({
        title: `Permanently delete ${targetUser.name}?`,
        description: "This also removes their bookings, reviews, vendor profile (if any) and messages. It cannot be undone. Consider suspending instead.",
        confirmLabel: "Delete account",
        tone: "rose",
        run: async () => {
            await runAction(
                () => API.delete(`/admin/users/${targetUser.id}`, authHeaders()),
                `${targetUser.name}'s account was deleted`, "Failed to delete user"
            );
            fetchUsers();
        }
    });

    // ---- VENDORS ----
    const [vendors, setVendors] = useState([]);
    const [vendorsLoading, setVendorsLoading] = useState(true);
    const [vendorsPagination, setVendorsPagination] = useState(null);
    const [vendorPage, setVendorPage] = useState(1);
    const [vendorSearchInput, setVendorSearchInput] = useState("");
    const [vendorSearch, setVendorSearch] = useState("");
    const [vendorCategory, setVendorCategory] = useState("");
    const [vendorCity, setVendorCity] = useState("");
    const [vendorStatusFilter, setVendorStatusFilter] = useState("");
    const [vendorSort, setVendorSort] = useState("featured:desc");
    const [filterOptions, setFilterOptions] = useState({ categories: [], cities: [] });
    const [workingVendorId, setWorkingVendorId] = useState(null);

    useEffect(() => {
        API.get("/vendors/filters")
            .then((res) => setFilterOptions({ categories: res.data.categories || [], cities: res.data.cities || [] }))
            .catch(() => { /* the filters just stay empty */ });
    }, []);

    const fetchVendors = useCallback(async () => {
        setVendorsLoading(true);
        try {
            const res = await API.get("/admin/vendors", {
                ...authHeaders(),
                params: {
                    page: vendorPage,
                    limit: 10,
                    search: vendorSearch || undefined,
                    category: vendorCategory || undefined,
                    city: vendorCity || undefined,
                    status: vendorStatusFilter || undefined,
                    sort: vendorSort.split(":")[0],
                    dir: vendorSort.split(":")[1]
                }
            });
            setVendors(res.data.vendors);
            setVendorsPagination(res.data.pagination);
        } catch (error) {
            console.log(error);
            toast.error("Failed to load vendors");
        } finally {
            setVendorsLoading(false);
        }
    }, [vendorPage, vendorSearch, vendorCategory, vendorCity, vendorStatusFilter, vendorSort]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVendorPage(1);
            setVendorSearch(vendorSearchInput);
        }, 400);
        return () => clearTimeout(timer);
    }, [vendorSearchInput]);

    const handleToggleFeature = async (vendor) => {
        setWorkingVendorId(vendor.id);
        try {
            await API.put(
                `/admin/vendors/${vendor.id}/feature`,
                { featured: !vendor.is_featured },
                authHeaders()
            );
            toast.success(vendor.is_featured ? "Vendor unfeatured" : "Vendor featured");
            fetchVendors();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update vendor");
        } finally {
            setWorkingVendorId(null);
        }
    };

    const askToggleListing = (vendor) => {
        if (vendor.is_active) {
            setDialog({
                title: `Deactivate ${vendor.business_name}?`,
                description: "The listing disappears from browse, search, recommendations and the planner, and can't receive new booking requests. Existing bookings are kept. The owner is notified.",
                confirmLabel: "Deactivate listing",
                tone: "amber",
                reasonLabel: "Reason (shown to the vendor)",
                run: async (reason) => {
                    await runAction(
                        () => API.put(`/admin/vendors/${vendor.id}/status`, { active: false, reason }, authHeaders()),
                        `${vendor.business_name} was deactivated`, "Failed to deactivate listing"
                    );
                    fetchVendors();
                }
            });
        } else {
            setDialog({
                title: `Reactivate ${vendor.business_name}?`,
                description: "The listing becomes public again and can receive booking requests.",
                confirmLabel: "Reactivate listing",
                tone: "teal",
                run: async () => {
                    await runAction(
                        () => API.put(`/admin/vendors/${vendor.id}/status`, { active: true }, authHeaders()),
                        `${vendor.business_name} is live again`, "Failed to reactivate listing"
                    );
                    fetchVendors();
                }
            });
        }
    };

    const askDeleteVendor = (vendor) => setDialog({
        title: `Remove ${vendor.business_name}'s vendor profile?`,
        description: "This also removes their bookings and reviews. The owner's user account stays. It cannot be undone. Consider deactivating the listing instead.",
        confirmLabel: "Remove profile",
        tone: "rose",
        run: async () => {
            await runAction(
                () => API.delete(`/admin/vendors/${vendor.id}`, authHeaders()),
                `${vendor.business_name} was removed`, "Failed to delete vendor"
            );
            fetchVendors();
        }
    });

    // ---- BOOKINGS ----
    const [bookings, setBookings] = useState([]);
    const [bookingsLoading, setBookingsLoading] = useState(true);
    const [bookingsPagination, setBookingsPagination] = useState(null);
    const [bookingPage, setBookingPage] = useState(1);
    const [bookingStatusFilter, setBookingStatusFilter] = useState("");
    const [bookingSearchInput, setBookingSearchInput] = useState("");
    const [bookingSearch, setBookingSearch] = useState("");
    const [bookingSort, setBookingSort] = useState("created_at:desc");

    const fetchBookings = useCallback(async () => {
        setBookingsLoading(true);
        try {
            const res = await API.get("/admin/bookings", {
                ...authHeaders(),
                params: {
                    page: bookingPage,
                    limit: 10,
                    status: bookingStatusFilter || undefined,
                    search: bookingSearch || undefined,
                    sort: bookingSort.split(":")[0],
                    dir: bookingSort.split(":")[1]
                }
            });
            setBookings(res.data.bookings);
            setBookingsPagination(res.data.pagination);
        } catch (error) {
            console.log(error);
            toast.error("Failed to load bookings");
        } finally {
            setBookingsLoading(false);
        }
    }, [bookingPage, bookingStatusFilter, bookingSearch, bookingSort]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setBookingPage(1);
            setBookingSearch(bookingSearchInput);
        }, 400);
        return () => clearTimeout(timer);
    }, [bookingSearchInput]);

    const askCancelBooking = (booking) => setDialog({
        title: `Cancel booking #${booking.id}?`,
        description: `${booking.event_type} between ${booking.customer_name} and ${booking.vendor_business_name}. Both of them are notified and it can't be undone.`,
        confirmLabel: "Cancel booking",
        tone: "rose",
        reasonLabel: "Reason (sent to both parties)",
        run: async (reason) => {
            await runAction(
                () => API.put(`/admin/bookings/${booking.id}/cancel`, { reason }, authHeaders()),
                "Booking cancelled", "Failed to cancel booking"
            );
            fetchBookings();
        }
    });

    // ---- REVIEWS ----
    const [reviews, setReviews] = useState([]);
    // "Loading" is derived: the page is loading until the results on screen
    // belong to the filters currently selected (no state set inside the effect).
    const [reviewsLoadedKey, setReviewsLoadedKey] = useState(null);
    const [reviewsPagination, setReviewsPagination] = useState(null);
    const [reviewPage, setReviewPage] = useState(1);
    const [reviewRating, setReviewRating] = useState("");
    const [reviewSearchInput, setReviewSearchInput] = useState("");
    const [reviewSearch, setReviewSearch] = useState("");
    const [reviewSort, setReviewSort] = useState("created_at:desc");

    const reviewsKey = `${reviewPage}|${reviewRating}|${reviewSearch}|${reviewSort}`;
    const reviewsLoading = reviewsLoadedKey !== reviewsKey;

    // Fetched straight from the effect (promise chain, nothing set
    // synchronously) so it doesn't add to the client lint baseline.
    useEffect(() => {
        if (activeTab !== "reviews") return undefined;
        let cancelled = false;
        API.get("/admin/reviews", {
            ...authHeaders(),
            params: {
                page: reviewPage,
                limit: 10,
                rating: reviewRating || undefined,
                search: reviewSearch || undefined,
                sort: reviewSort.split(":")[0],
                dir: reviewSort.split(":")[1]
            }
        })
            .then((res) => {
                if (cancelled) return;
                setReviews(res.data.reviews);
                setReviewsPagination(res.data.pagination);
            })
            .catch(() => {
                if (cancelled) return;
                toast.error("Failed to load reviews");
                setReviews([]);
            })
            .finally(() => {
                if (!cancelled) setReviewsLoadedKey(`${reviewPage}|${reviewRating}|${reviewSearch}|${reviewSort}`);
            });
        return () => { cancelled = true; };
    }, [activeTab, reviewPage, reviewRating, reviewSearch, reviewSort]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setReviewPage(1);
            setReviewSearch(reviewSearchInput);
        }, 400);
        return () => clearTimeout(timer);
    }, [reviewSearchInput]);

    // ---- ACTIVITY LOG ----
    const [auditEntries, setAuditEntries] = useState([]);
    const [auditLoadedPage, setAuditLoadedPage] = useState(null);
    const [auditPagination, setAuditPagination] = useState(null);
    const [auditPage, setAuditPage] = useState(1);

    const auditLoading = auditLoadedPage !== auditPage;

    useEffect(() => {
        if (activeTab !== "activity") return undefined;
        let cancelled = false;
        API.get("/admin/audit-log", { ...authHeaders(), params: { page: auditPage, limit: 15 } })
            .then((res) => {
                if (cancelled) return;
                setAuditEntries(res.data.entries);
                setAuditPagination(res.data.pagination);
            })
            .catch(() => {
                if (cancelled) return;
                toast.error("Failed to load the activity log");
                setAuditEntries([]);
            })
            .finally(() => { if (!cancelled) setAuditLoadedPage(auditPage); });
        return () => { cancelled = true; };
    }, [activeTab, auditPage]);

    // ---- TAB-DRIVEN FETCHING ----
    useEffect(() => {
        if (activeTab === "dashboard") fetchStats();
    }, [activeTab, fetchStats]);

    useEffect(() => {
        if (activeTab === "users") fetchUsers();
    }, [activeTab, fetchUsers]);

    useEffect(() => {
        if (activeTab === "vendors") fetchVendors();
    }, [activeTab, fetchVendors]);

    useEffect(() => {
        if (activeTab === "bookings") fetchBookings();
    }, [activeTab, fetchBookings]);

    const TERMINAL_BOOKING_STATUSES = ["completed", "rejected", "cancelled"];

    return (

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">

            <div className="flex items-center gap-3 mb-8">
                <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    <ShieldCheck size={22} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
                    <p className="text-sm text-gray-500">Platform oversight — users, vendors, bookings, reviews and activity</p>
                </div>
            </div>

            {/* TABS */}
            <div role="tablist" aria-label="Admin sections" className="flex gap-2 border-b border-gray-200 mb-8 overflow-x-auto">
                {TABS.map(({ key, label, Icon }) => (
                    <button
                        key={key}
                        role="tab"
                        aria-selected={activeTab === key}
                        onClick={() => setActiveTab(key)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                            activeTab === key
                                ? "border-teal-600 text-teal-700"
                                : "border-transparent text-gray-500 hover:text-gray-800"
                        }`}
                    >
                        <Icon size={16} /> {label}
                    </button>
                ))}
            </div>

            {/* ===== DASHBOARD TAB ===== */}
            {activeTab === "dashboard" && (
                <div>
                    {statsLoading && (
                        <div className="flex items-center justify-center gap-2 text-gray-400 py-20">
                            <Loader2 size={20} className="animate-spin" /> Loading platform stats...
                        </div>
                    )}

                    {!statsLoading && stats && (
                        <div className="space-y-8">

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard label="Total Users" value={stats.users.total} Icon={Users} tone="teal" />
                                <StatCard label="Customers" value={stats.users.customers} Icon={Users} tone="sky" />
                                <StatCard label="Vendor accounts" value={stats.users.vendors} Icon={Store} tone="emerald" />
                                <StatCard label="Suspended Accounts" value={stats.users.banned} Icon={UserX} tone="rose" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <StatCard label="Vendor business profiles" value={stats.vendors.total} Icon={Store} tone="emerald" />
                                <StatCard label="Deactivated listings" value={stats.vendors.inactive} Icon={Power} tone="amber" />
                                <StatCard label="Featured listings" value={stats.vendors.featured} Icon={Star} tone="amber" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard label="Total Bookings" value={stats.bookings.total} Icon={CalendarCheck} tone="teal" />
                                <StatCard label="Total Reviews" value={stats.reviews.total} Icon={Star} tone="amber" />
                                <StatCard label="Avg. Rating" value={stats.reviews.avg_rating} Icon={Star} tone="amber" />
                                <StatCard label="Pending requests" value={stats.bookings.by_status.pending} Icon={CalendarCheck} tone="amber" />
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h2 className="font-semibold text-gray-900 mb-4">Bookings by status</h2>
                                <div className="flex flex-wrap gap-3">
                                    {Object.entries(stats.bookings.by_status).map(([status, count]) => (
                                        <span
                                            key={status}
                                            className={`px-4 py-2 rounded-full text-sm font-semibold ${STATUS_STYLES[status] || "bg-gray-100 text-gray-600"}`}
                                        >
                                            {STATUS_LABELS[status] || status}: {count}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                    <h2 className="font-semibold text-gray-900 mb-3">Recently registered</h2>
                                    <ul className="divide-y divide-gray-50 text-sm">
                                        {stats.recent_users.map((u) => (
                                            <li key={u.id} className="py-2 flex items-center justify-between gap-3">
                                                <span className="min-w-0">
                                                    <span className="font-medium text-gray-900">{u.name}</span>
                                                    <span className="block text-xs text-gray-400 truncate">{u.email}</span>
                                                </span>
                                                <span className="flex items-center gap-2 shrink-0">
                                                    <RoleBadge role={u.role} />
                                                    <span className="text-xs text-gray-400">{fmtDate(u.created_at)}</span>
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                    <h2 className="font-semibold text-gray-900 mb-3">Recent booking activity</h2>
                                    {stats.recent_bookings.length === 0 ? (
                                        <p className="text-sm text-gray-500">No bookings yet.</p>
                                    ) : (
                                        <ul className="divide-y divide-gray-50 text-sm">
                                            {stats.recent_bookings.map((b) => (
                                                <li key={b.id} className="py-2 flex items-center justify-between gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setDetailBookingId(b.id)}
                                                        className="text-left min-w-0 hover:text-teal-700"
                                                    >
                                                        <span className="font-medium text-gray-900">#{b.id} · {b.event_type}</span>
                                                        <span className="block text-xs text-gray-400 truncate">{b.customer_name} → {b.vendor_business_name}</span>
                                                    </button>
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${STATUS_STYLES[b.booking_status] || "bg-gray-100 text-gray-600"}`}>
                                                        {STATUS_LABELS[b.booking_status] || b.booking_status}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h2 className="font-semibold text-gray-900 mb-2">Signups</h2>
                                <p className="text-sm text-gray-600">
                                    <strong>{stats.users.new_last_7_days}</strong> new accounts in the last 7 days,{" "}
                                    <strong>{stats.users.new_last_30_days}</strong> in the last 30 days.
                                </p>
                            </div>

                        </div>
                    )}
                </div>
            )}

            {/* ===== USERS TAB ===== */}
            {activeTab === "users" && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                    <div className="p-5 border-b border-gray-100 flex flex-wrap gap-3 items-center">

                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={userSearchInput}
                                onChange={(e) => setUserSearchInput(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>

                        <select
                            value={roleFilter}
                            onChange={(e) => { setRoleFilter(e.target.value); setUserPage(1); }}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        >
                            <option value="">All roles</option>
                            <option value="customer">Customer</option>
                            <option value="vendor">Vendor</option>
                            <option value="admin">Admin</option>
                        </select>

                        <select
                            value={userStatusFilter}
                            onChange={(e) => { setUserStatusFilter(e.target.value); setUserPage(1); }}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        >
                            <option value="">All statuses</option>
                            <option value="active">Active</option>
                            <option value="banned">Suspended</option>
                        </select>

                        <SortSelect
                            value={userSort}
                            onChange={(v) => { setUserSort(v); setUserPage(1); }}
                            options={[
                                ["created_at:desc", "Newest first"], ["created_at:asc", "Oldest first"],
                                ["name:asc", "Name A-Z"], ["name:desc", "Name Z-A"],
                                ["email:asc", "Email A-Z"], ["role:asc", "Role"]
                            ]}
                        />

                    </div>

                    {usersLoading && (
                        <div className="flex items-center justify-center gap-2 text-gray-400 py-16">
                            <Loader2 size={18} className="animate-spin" /> Loading users...
                        </div>
                    )}

                    {!usersLoading && users.length === 0 && (
                        <p className="text-center text-gray-500 py-16">No users match these filters.</p>
                    )}

                    {!usersLoading && users.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500 border-b border-gray-100">
                                        <th className="px-5 py-3 font-medium">Name</th>
                                        <th className="px-5 py-3 font-medium">Email</th>
                                        <th className="px-5 py-3 font-medium">Role</th>
                                        <th className="px-5 py-3 font-medium">Status</th>
                                        <th className="px-5 py-3 font-medium">Joined</th>
                                        <th className="px-5 py-3 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => {
                                        const isSelf = currentAdmin?.id === u.id;
                                        const isAdmin = u.role === "admin";
                                        return (
                                            <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                                                <td className="px-5 py-3 font-medium text-gray-900">
                                                    {u.name}
                                                    {u.business_name && (
                                                        <span className="block text-xs text-gray-400">{u.business_name}</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 text-gray-600">{u.email}</td>
                                                <td className="px-5 py-3"><RoleBadge role={u.role} /></td>
                                                <td className="px-5 py-3">
                                                    {u.is_banned ? (
                                                        <span title={u.ban_reason || ""} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                                                            Suspended
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                                            Active
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 text-gray-500">
                                                    {fmtDate(u.created_at)}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        <IconButton title={`View ${u.name}`} onClick={() => setDetailUserId(u.id)}>
                                                            <Eye size={16} />
                                                        </IconButton>
                                                        {!isAdmin && !isSelf && (
                                                            <>
                                                                {u.is_banned ? (
                                                                    <IconButton title={`Reinstate ${u.name}`} tone="emerald" onClick={() => askUnbanUser(u)}>
                                                                        <CheckCircle2 size={16} />
                                                                    </IconButton>
                                                                ) : (
                                                                    <IconButton title={`Suspend ${u.name}`} tone="amber" onClick={() => askBanUser(u)}>
                                                                        <Ban size={16} />
                                                                    </IconButton>
                                                                )}
                                                                <IconButton title={`Delete ${u.name}`} tone="rose" onClick={() => askDeleteUser(u)}>
                                                                    <Trash2 size={16} />
                                                                </IconButton>
                                                            </>
                                                        )}
                                                        {(isAdmin || isSelf) && (
                                                            <span className="text-xs text-gray-400 italic">
                                                                {isSelf ? "You" : "Protected"}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <Pagination pagination={usersPagination} onPageChange={setUserPage} />

                </div>
            )}

            {/* ===== VENDORS TAB ===== */}
            {activeTab === "vendors" && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                    <div className="p-5 border-b border-gray-100 flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                aria-label="Search vendors"
                                placeholder="Search by business name or owner email..."
                                value={vendorSearchInput}
                                onChange={(e) => setVendorSearchInput(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>

                        <select aria-label="Category" value={vendorCategory} onChange={(e) => { setVendorCategory(e.target.value); setVendorPage(1); }} className={inputClass}>
                            <option value="">All categories</option>
                            {filterOptions.categories.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <select aria-label="City" value={vendorCity} onChange={(e) => { setVendorCity(e.target.value); setVendorPage(1); }} className={inputClass}>
                            <option value="">All cities</option>
                            {filterOptions.cities.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <select aria-label="Listing status" value={vendorStatusFilter} onChange={(e) => { setVendorStatusFilter(e.target.value); setVendorPage(1); }} className={inputClass}>
                            <option value="">All listings</option>
                            <option value="active">Active</option>
                            <option value="inactive">Deactivated</option>
                            <option value="featured">Featured</option>
                        </select>

                        <SortSelect
                            value={vendorSort}
                            onChange={(v) => { setVendorSort(v); setVendorPage(1); }}
                            options={[
                                ["featured:desc", "Featured first"], ["created_at:desc", "Newest first"],
                                ["name:asc", "Name A-Z"], ["bookings:desc", "Most bookings"], ["rating:desc", "Top rated"]
                            ]}
                        />
                    </div>

                    {vendorsLoading && (
                        <div className="flex items-center justify-center gap-2 text-gray-400 py-16">
                            <Loader2 size={18} className="animate-spin" /> Loading vendors...
                        </div>
                    )}

                    {!vendorsLoading && vendors.length === 0 && (
                        <p className="text-center text-gray-500 py-16">No vendors match these filters.</p>
                    )}

                    {!vendorsLoading && vendors.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500 border-b border-gray-100">
                                        <th className="px-5 py-3 font-medium">Business</th>
                                        <th className="px-5 py-3 font-medium">Owner</th>
                                        <th className="px-5 py-3 font-medium">Category / City</th>
                                        <th className="px-5 py-3 font-medium">Rating</th>
                                        <th className="px-5 py-3 font-medium">Bookings</th>
                                        <th className="px-5 py-3 font-medium">Views</th>
                                        <th className="px-5 py-3 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vendors.map((v) => {
                                        return (
                                            <tr key={v.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                                                <td className="px-5 py-3 font-medium text-gray-900">
                                                    {v.business_name}
                                                    {v.is_featured && (
                                                        <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
                                                            Featured
                                                        </span>
                                                    )}
                                                    {!v.is_active && (
                                                        <span
                                                            title={v.deactivated_reason || ""}
                                                            className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700"
                                                        >
                                                            Deactivated
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 text-gray-600">
                                                    {v.owner_name}
                                                    <span className="block text-xs text-gray-400">{v.owner_email}</span>
                                                    {v.owner_banned && (
                                                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700">
                                                            Owner suspended
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 text-gray-600">{v.category} &middot; {v.city}</td>
                                                <td className="px-5 py-3 text-gray-600">
                                                    {v.avg_rating} <span className="text-gray-400">({v.total_reviews})</span>
                                                </td>
                                                <td className="px-5 py-3 text-gray-600">{v.total_bookings}</td>
                                                <td className="px-5 py-3 text-gray-600">{v.profile_views}</td>
                                                <td className="px-5 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        <IconButton title={`View owner of ${v.business_name}`} onClick={() => setDetailUserId(v.owner_id)}>
                                                            <Eye size={16} />
                                                        </IconButton>
                                                        <IconButton
                                                            title={v.is_featured ? `Unfeature ${v.business_name}` : `Feature ${v.business_name}`}
                                                            tone={v.is_featured ? "amber" : "gray"}
                                                            disabled={workingVendorId === v.id}
                                                            onClick={() => handleToggleFeature(v)}
                                                        >
                                                            <Star size={16} fill={v.is_featured ? "currentColor" : "none"} />
                                                        </IconButton>
                                                        <IconButton
                                                            title={v.is_active ? `Deactivate ${v.business_name}` : `Reactivate ${v.business_name}`}
                                                            tone={v.is_active ? "amber" : "emerald"}
                                                            onClick={() => askToggleListing(v)}
                                                        >
                                                            <Power size={16} />
                                                        </IconButton>
                                                        <IconButton title={`Remove ${v.business_name}`} tone="rose" onClick={() => askDeleteVendor(v)}>
                                                            <Trash2 size={16} />
                                                        </IconButton>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <Pagination pagination={vendorsPagination} onPageChange={setVendorPage} />

                </div>
            )}

            {/* ===== BOOKINGS TAB ===== */}
            {activeTab === "bookings" && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                    <div className="p-5 border-b border-gray-100 flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                aria-label="Search bookings"
                                placeholder="Search customer, vendor, event type or booking #..."
                                value={bookingSearchInput}
                                onChange={(e) => setBookingSearchInput(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                        <select
                            aria-label="Booking status"
                            value={bookingStatusFilter}
                            onChange={(e) => { setBookingStatusFilter(e.target.value); setBookingPage(1); }}
                            className={inputClass}
                        >
                            <option value="">All statuses</option>
                            {Object.keys(STATUS_LABELS).map((status) => (
                                <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                            ))}
                        </select>
                        <SortSelect
                            value={bookingSort}
                            onChange={(v) => { setBookingSort(v); setBookingPage(1); }}
                            options={[
                                ["created_at:desc", "Newest requests"], ["created_at:asc", "Oldest requests"],
                                ["event_date:asc", "Event date (soonest)"], ["event_date:desc", "Event date (latest)"]
                            ]}
                        />
                    </div>

                    {bookingsLoading && (
                        <div className="flex items-center justify-center gap-2 text-gray-400 py-16">
                            <Loader2 size={18} className="animate-spin" /> Loading bookings...
                        </div>
                    )}

                    {!bookingsLoading && bookings.length === 0 && (
                        <p className="text-center text-gray-500 py-16">No bookings match these filters.</p>
                    )}

                    {!bookingsLoading && bookings.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500 border-b border-gray-100">
                                        <th className="px-5 py-3 font-medium">#</th>
                                        <th className="px-5 py-3 font-medium">Event</th>
                                        <th className="px-5 py-3 font-medium">Customer</th>
                                        <th className="px-5 py-3 font-medium">Vendor</th>
                                        <th className="px-5 py-3 font-medium">Status</th>
                                        <th className="px-5 py-3 font-medium">Created</th>
                                        <th className="px-5 py-3 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bookings.map((b) => {
                                        const isTerminal = TERMINAL_BOOKING_STATUSES.includes(b.booking_status);
                                        return (
                                            <tr key={b.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                                                <td className="px-5 py-3 text-gray-500">{b.id}</td>
                                                <td className="px-5 py-3 font-medium text-gray-900">
                                                    {b.event_type}
                                                    <span className="block text-xs text-gray-400">
                                                        {fmtDate(b.event_date)}{b.guest_count ? ` · ${b.guest_count} guests` : ""}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-gray-600">{b.customer_name}</td>
                                                <td className="px-5 py-3 text-gray-600">{b.vendor_business_name}</td>
                                                <td className="px-5 py-3">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[b.booking_status] || "bg-gray-100 text-gray-600"}`}>
                                                        {STATUS_LABELS[b.booking_status] || b.booking_status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-gray-500">
                                                    {fmtDate(b.created_at)}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        <IconButton title={`View booking ${b.id}`} onClick={() => setDetailBookingId(b.id)}>
                                                            <Eye size={16} />
                                                        </IconButton>
                                                        {!isTerminal && (
                                                            <IconButton title={`Cancel booking ${b.id}`} tone="rose" onClick={() => askCancelBooking(b)}>
                                                                <Ban size={16} />
                                                            </IconButton>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <Pagination pagination={bookingsPagination} onPageChange={setBookingPage} />

                </div>
            )}

            {/* ===== REVIEWS TAB (read-only) ===== */}
            {activeTab === "reviews" && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                    <div className="p-5 border-b border-gray-100 flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                aria-label="Search reviews"
                                placeholder="Search review text, vendor or reviewer..."
                                value={reviewSearchInput}
                                onChange={(e) => setReviewSearchInput(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                        <select aria-label="Rating" value={reviewRating} onChange={(e) => { setReviewRating(e.target.value); setReviewPage(1); }} className={inputClass}>
                            <option value="">All ratings</option>
                            {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} star{r === 1 ? "" : "s"}</option>)}
                        </select>
                        <SortSelect
                            value={reviewSort}
                            onChange={(v) => { setReviewSort(v); setReviewPage(1); }}
                            options={[
                                ["created_at:desc", "Newest first"], ["created_at:asc", "Oldest first"],
                                ["rating:desc", "Highest rating"], ["rating:asc", "Lowest rating"]
                            ]}
                        />
                    </div>

                    {reviewsLoading && (
                        <div className="flex items-center justify-center gap-2 text-gray-400 py-16">
                            <Loader2 size={18} className="animate-spin" /> Loading reviews...
                        </div>
                    )}

                    {!reviewsLoading && reviews.length === 0 && (
                        <p className="text-center text-gray-500 py-16">No reviews match these filters.</p>
                    )}

                    {!reviewsLoading && reviews.length > 0 && (
                        <ul className="divide-y divide-gray-50">
                            {reviews.map((r) => (
                                <li key={r.id} className="px-5 py-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm text-gray-900">
                                            <span className="font-medium">{r.customer_name || "Deleted user"}</span>
                                            <span className="text-gray-400"> reviewed </span>
                                            <span className="font-medium">{r.vendor_business_name}</span>
                                        </p>
                                        <p className="text-sm text-gray-500 flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1 text-amber-600 font-semibold" aria-label={`${r.rating} out of 5`}>
                                                <Star size={14} fill="currentColor" strokeWidth={0} /> {r.rating}/5
                                            </span>
                                            {fmtDate(r.created_at)}
                                        </p>
                                    </div>
                                    <p className="text-sm text-gray-700 mt-1 break-words">{r.review}</p>
                                </li>
                            ))}
                        </ul>
                    )}

                    <Pagination pagination={reviewsPagination} onPageChange={setReviewPage} />

                </div>
            )}

            {/* ===== ACTIVITY LOG TAB ===== */}
            {activeTab === "activity" && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                    {auditLoading && (
                        <div className="flex items-center justify-center gap-2 text-gray-400 py-16">
                            <Loader2 size={18} className="animate-spin" /> Loading activity...
                        </div>
                    )}

                    {!auditLoading && auditEntries.length === 0 && (
                        <p className="text-center text-gray-500 py-16">No admin actions have been recorded yet.</p>
                    )}

                    {!auditLoading && auditEntries.length > 0 && (
                        <ul className="divide-y divide-gray-50">
                            {auditEntries.map((e) => (
                                <li key={e.id} className="px-5 py-4 flex flex-wrap items-start justify-between gap-2 text-sm">
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900">
                                            {AUDIT_LABELS[e.action] || e.action}
                                            <span className="text-gray-400 font-normal"> · {e.target_type} #{e.target_id}</span>
                                        </p>
                                        <p className="text-gray-600 break-words">
                                            {[e.details?.business_name, e.details?.name, e.details?.email, e.details?.reason && `Reason: ${e.details.reason}`]
                                                .filter(Boolean).join(" · ") || "\u00A0"}
                                        </p>
                                    </div>
                                    <p className="text-gray-500 shrink-0">
                                        {e.admin_name || "Removed admin"} · {fmtDateTime(e.created_at)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}

                    <Pagination pagination={auditPagination} onPageChange={setAuditPage} />

                </div>
            )}

            {dialog && (
                <ConfirmDialog
                    title={dialog.title}
                    description={dialog.description}
                    confirmLabel={dialog.confirmLabel}
                    tone={dialog.tone}
                    reasonLabel={dialog.reasonLabel}
                    onConfirm={dialog.run}
                    onClose={() => setDialog(null)}
                />
            )}

            {detailUserId && <UserDetailModal userId={detailUserId} onClose={() => setDetailUserId(null)} />}
            {detailBookingId && <BookingDetailModal bookingId={detailBookingId} onClose={() => setDetailBookingId(null)} />}

        </div>

    );

}

export default AdminPage;
