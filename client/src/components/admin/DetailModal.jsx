import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import API from "../../services/api";

const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-");
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-");

function Row({ label, children }) {
    return (
        <div className="flex justify-between gap-4 py-2 border-b border-gray-50 last:border-0 text-sm">
            <dt className="text-gray-500 shrink-0">{label}</dt>
            <dd className="text-gray-900 text-right break-words min-w-0">{children ?? "-"}</dd>
        </div>
    );
}

// Shell shared by the user and booking detail views: fetches `path`,
// renders `children(data)`, closes on Escape / backdrop / the X button.
function DetailModal({ title, path, onClose, children }) {

    const [data, setData] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        API.get(path, authHeaders())
            .then((res) => { if (!cancelled) setData(res.data); })
            .catch((err) => {
                const message = err.response?.data?.message || "Could not load details";
                if (!cancelled) setError(message);
                toast.error(message);
            });
        return () => { cancelled = true; };
    }, [path]);

    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/40"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            >
                <div className="flex items-center justify-between px-6 pt-5 pb-3 sticky top-0 bg-white border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
                        <X size={18} />
                    </button>
                </div>
                <div className="px-6 py-4">
                    {!data && !error && (
                        <div className="flex items-center justify-center gap-2 text-gray-400 py-10">
                            <Loader2 size={18} className="animate-spin" /> Loading...
                        </div>
                    )}
                    {error && <p className="text-rose-700 py-6 text-center">{error}</p>}
                    {data && children(data)}
                </div>
            </div>
        </div>
    );
}

const tallyText = (t) => {
    const parts = Object.entries(t).filter(([k]) => k !== "total").map(([k, v]) => `${v} ${k}`);
    return t.total === 0 ? "None" : `${t.total} (${parts.join(", ")})`;
};

export function UserDetailModal({ userId, onClose }) {
    return (
        <DetailModal title="Account details" path={`/admin/users/${userId}`} onClose={onClose}>
            {({ user, vendor_profile: vp, bookings_as_customer: asC, bookings_as_vendor: asV, reviews_written, recent_bookings }) => (
                <div className="space-y-5">
                    <dl>
                        <Row label="Name">{user.name}</Row>
                        <Row label="Email">{user.email}</Row>
                        <Row label="Phone">{user.phone}</Row>
                        <Row label="Role">{user.role}</Row>
                        <Row label="Joined">{fmtDate(user.created_at)}</Row>
                        <Row label="Status">
                            {user.is_banned ? `Suspended ${fmtDate(user.banned_at)}${user.ban_reason ? ` - ${user.ban_reason}` : ""}` : "Active"}
                        </Row>
                        <Row label="Bookings as customer">{tallyText(asC)}</Row>
                        <Row label="Reviews written">{reviews_written}</Row>
                    </dl>

                    {vp && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-1">Vendor business profile</h3>
                            <dl>
                                <Row label="Business">{vp.business_name}</Row>
                                <Row label="Category / city">{vp.category} · {vp.city}</Row>
                                <Row label="Price range">{vp.price_range}</Row>
                                <Row label="Listing">
                                    {vp.is_active ? "Active" : `Deactivated${vp.deactivated_reason ? ` - ${vp.deactivated_reason}` : ""}`}
                                    {vp.is_featured ? " · Featured" : ""}
                                </Row>
                                <Row label="Profile views">{vp.profile_views}</Row>
                                <Row label="Bookings received">{tallyText(asV)}</Row>
                            </dl>
                        </div>
                    )}

                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">Recent bookings</h3>
                        {recent_bookings.length === 0 ? (
                            <p className="text-sm text-gray-500">No bookings yet.</p>
                        ) : (
                            <ul className="text-sm divide-y divide-gray-50">
                                {recent_bookings.map((b) => (
                                    <li key={b.id} className="py-2 flex justify-between gap-3">
                                        <span className="text-gray-800">#{b.id} · {b.event_type} · {b.customer_name} → {b.vendor_business_name}</span>
                                        <span className="text-gray-500 shrink-0">{b.booking_status}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </DetailModal>
    );
}

export function BookingDetailModal({ bookingId, onClose }) {
    return (
        <DetailModal title={`Booking #${bookingId}`} path={`/admin/bookings/${bookingId}`} onClose={onClose}>
            {({ booking: b, history }) => (
                <div className="space-y-5">
                    <dl>
                        <Row label="Status">{b.booking_status}</Row>
                        <Row label="Event">{b.event_type}</Row>
                        <Row label="Event date">{fmtDate(b.event_date)}</Row>
                        <Row label="Guests">{b.guest_count}</Row>
                        <Row label="Customer">{b.customer_name} ({b.customer_email})</Row>
                        <Row label="Vendor">{b.vendor_business_name} · {b.vendor_category}, {b.vendor_city}</Row>
                        <Row label="Vendor owner">{b.vendor_owner_name} ({b.vendor_owner_email})</Row>
                        <Row label="Requested">{fmtDateTime(b.created_at)}</Row>
                        {b.confirmed_at && <Row label="Confirmed">{fmtDateTime(b.confirmed_at)}</Row>}
                        {b.completed_at && <Row label="Completed">{fmtDateTime(b.completed_at)}</Row>}
                        {b.booking_status === "cancelled" && (
                            <>
                                <Row label="Cancelled by">{b.cancelled_by}</Row>
                                <Row label="Cancelled on">{fmtDateTime(b.cancelled_at)}</Row>
                                <Row label="Reason">{b.cancellation_reason}</Row>
                            </>
                        )}
                        {b.message && <Row label="Customer message">{b.message}</Row>}
                    </dl>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">Status history</h3>
                        {history.length === 0 ? (
                            <p className="text-sm text-gray-500">No recorded status changes.</p>
                        ) : (
                            <ol className="text-sm divide-y divide-gray-50">
                                {history.map((h, i) => (
                                    <li key={i} className="py-2">
                                        <span className="font-medium text-gray-800">{h.status}</span>
                                        <span className="text-gray-500"> · {h.changed_by_role} · {fmtDateTime(h.created_at)}</span>
                                        {h.note && <span className="block text-gray-600">{h.note}</span>}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                </div>
            )}
        </DetailModal>
    );
}
