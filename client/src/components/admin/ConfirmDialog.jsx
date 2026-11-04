import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

// Accessible confirmation dialog for destructive admin actions. When
// `reasonLabel` is given, a reason is required before the action can be
// confirmed (it's sent to the server, which also validates it). `onConfirm`
// may be async: the dialog stays open and shows a spinner until it settles,
// and closes itself only when it resolves without throwing.
function ConfirmDialog({
    title,
    description,
    confirmLabel = "Confirm",
    tone = "rose",
    reasonLabel,
    onConfirm,
    onClose
}) {

    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const firstFocus = useRef(null);

    const needsReason = Boolean(reasonLabel);
    const canConfirm = !busy && (!needsReason || reason.trim().length > 0);

    useEffect(() => {
        firstFocus.current?.focus();
    }, []);

    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape" && !busy) onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [busy, onClose]);

    const submit = async (e) => {
        e.preventDefault();
        if (!canConfirm) return;
        setBusy(true);
        try {
            await onConfirm(needsReason ? reason.trim() : undefined);
            onClose();
        } catch {
            // The caller has already shown the error; keep the dialog open.
            setBusy(false);
        }
    };

    const confirmClass = tone === "rose"
        ? "bg-rose-600 hover:bg-rose-700"
        : tone === "amber"
            ? "bg-amber-600 hover:bg-amber-700"
            : "bg-teal-600 hover:bg-teal-700";

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
        >
            <form
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                onSubmit={submit}
                className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            >
                <h2 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900">{title}</h2>
                {description && <p className="text-sm text-gray-600 mt-2">{description}</p>}

                {needsReason && (
                    <label className="block mt-4">
                        <span className="block text-sm font-medium text-gray-700 mb-1">{reasonLabel}</span>
                        <textarea
                            ref={firstFocus}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            maxLength={500}
                            rows={3}
                            required
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <span className="block text-xs text-gray-400 mt-1 text-right">{reason.length}/500</span>
                    </label>
                )}

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        ref={needsReason ? undefined : firstFocus}
                        disabled={!canConfirm}
                        className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm disabled:opacity-50 ${confirmClass}`}
                    >
                        {busy && <Loader2 size={14} className="animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ConfirmDialog;
