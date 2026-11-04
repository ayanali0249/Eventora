import { ChevronLeft, ChevronRight } from "lucide-react";

// Shared pagination control - takes the {page, limit, total, total_pages}
// shape every paginated endpoint in this app returns (admin users/vendors/
// bookings, and the public vendor browse page), so there's one place that
// decides how "Page X of Y" and the prev/next buttons behave.
function Pagination({ pagination, onPageChange, itemLabel = "total" }) {

    if (!pagination || pagination.total_pages <= 1) return null;

    return (
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.total_pages} &middot; {pagination.total} {itemLabel}
            </p>
            <div className="flex gap-2">
                <button
                    disabled={pagination.page <= 1}
                    onClick={() => onPageChange(pagination.page - 1)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                    <ChevronLeft size={16} />
                </button>
                <button
                    disabled={pagination.page >= pagination.total_pages}
                    onClick={() => onPageChange(pagination.page + 1)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );

}

export default Pagination;
