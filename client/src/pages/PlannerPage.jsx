import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
    Sparkles, Loader2, Star, Save, Trash2, FolderOpen, RefreshCw,
    AlertTriangle, Info, CheckCircle2, CalendarClock, MapPin
} from "lucide-react";

import API from "../services/api";
import { useAuth } from "../context/AuthContext";

const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const FIT_LABELS = {
    comfortable: { text: "Fits your budget", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    within: { text: "Within their range", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    stretch: { text: "Slight stretch", cls: "bg-amber-50 text-amber-800 border-amber-200" },
    over: { text: "Above this budget", cls: "bg-rose-50 text-rose-800 border-rose-200" },
    unknown: { text: "Ask for a quote", cls: "bg-gray-100 text-gray-700 border-gray-200" }
};

const localToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const errorText = (error, fallback) => error?.response?.data?.message || fallback;

const inputClass =
    "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500";

function PlannerPage() {

    const { token } = useAuth();
    const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

    const [options, setOptions] = useState(null);
    const [optionsError, setOptionsError] = useState("");
    const [cities, setCities] = useState([]);

    const [form, setForm] = useState({
        event_type: "Wedding",
        budget: "",
        guest_count: "",
        city: "",
        event_date: "",
        notes: ""
    });
    const [selected, setSelected] = useState(null); // chosen categories (null = all)

    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState(null); // { inputs, plan, savedId? }
    const [saving, setSaving] = useState(false);

    const [plans, setPlans] = useState([]);
    const [plansLoading, setPlansLoading] = useState(true);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [busyPlanId, setBusyPlanId] = useState(null);

    const resultRef = useRef(null);

    // ---------------------------------------------------------- initial data

    useEffect(() => {

        let cancelled = false;

        API.get("/planner/options", { headers: authHeaders })
            .then((res) => { if (!cancelled) setOptions(res.data); })
            .catch((error) => { if (!cancelled) setOptionsError(errorText(error, "Could not load the planner")); });

        API.get("/vendors/filters")
            .then((res) => { if (!cancelled) setCities(res.data.cities || []); })
            .catch(() => { /* city suggestions are optional */ });

        API.get("/planner/plans", { headers: authHeaders })
            .then((res) => { if (!cancelled) setPlans(res.data.plans); })
            .catch((error) => { if (!cancelled) toast.error(errorText(error, "Could not load your saved plans")); })
            .finally(() => { if (!cancelled) setPlansLoading(false); });

        return () => { cancelled = true; };

    }, [authHeaders]);

    const eventTypeCategories = useMemo(() => {
        const type = options?.eventTypes.find((t) => t.name === form.event_type);
        return type ? type.categories : [];
    }, [options, form.event_type]);

    const activeCategories = selected ?? eventTypeCategories;

    // ------------------------------------------------------------- form logic

    const setField = (name) => (e) => setForm((prev) => ({ ...prev, [name]: e.target.value }));

    const changeEventType = (e) => {
        setForm((prev) => ({ ...prev, event_type: e.target.value }));
        setSelected(null); // new event type -> start from its full category list
    };

    const toggleCategory = (category) => {
        const current = new Set(activeCategories);
        if (current.has(category)) current.delete(category); else current.add(category);
        setSelected(eventTypeCategories.filter((c) => current.has(c)));
    };

    const buildPayload = () => ({
        event_type: form.event_type,
        budget: Number(form.budget),
        guest_count: Number(form.guest_count),
        city: form.city.trim(),
        event_date: form.event_date || null,
        categories: activeCategories,
        notes: form.notes.trim()
    });

    const runGenerate = async (payload) => {

        setGenerating(true);

        try {

            const res = await API.post("/planner/generate", payload, { headers: authHeaders });

            setResult({ inputs: res.data.inputs, plan: res.data.plan, savedId: null });

            // Scroll after the result has rendered.
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

        } catch (error) {

            toast.error(errorText(error, "Could not build your plan. Please try again."));

        } finally {

            setGenerating(false);
        }
    };

    const handleSubmit = (e) => {

        e.preventDefault();

        if (activeCategories.length === 0) {
            toast.error("Pick at least one category to plan for");
            return;
        }

        runGenerate(buildPayload());
    };

    // -------------------------------------------------------------- save/open

    const handleSave = async () => {

        if (!result || result.savedId) return;

        setSaving(true);

        try {

            const res = await API.post(
                "/planner/plans",
                { ...result.inputs, ai_summary: result.plan.ai_summary || undefined },
                { headers: authHeaders }
            );

            const saved = res.data.plan;

            setResult((prev) => ({ ...prev, savedId: saved.id }));
            setPlans((prev) => [{ id: saved.id, title: saved.title, inputs: saved.inputs, created_at: saved.created_at }, ...prev]);
            toast.success("Plan saved");

        } catch (error) {

            toast.error(errorText(error, "Could not save the plan"));

        } finally {

            setSaving(false);
        }
    };

    const fillFormFrom = (inputs) => {
        setForm({
            event_type: inputs.event_type,
            budget: String(inputs.budget),
            guest_count: String(inputs.guest_count),
            city: inputs.city,
            event_date: inputs.event_date && inputs.event_date >= localToday() ? inputs.event_date : "",
            notes: inputs.notes || ""
        });
        setSelected(inputs.categories);
    };

    const openPlan = async (id) => {

        setBusyPlanId(id);

        try {

            const res = await API.get(`/planner/plans/${id}`, { headers: authHeaders });
            const saved = res.data.plan;

            fillFormFrom(saved.inputs);
            setResult({ inputs: saved.inputs, plan: saved.result, savedId: saved.id, snapshot: saved.created_at });
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

        } catch (error) {

            toast.error(errorText(error, "Could not open that plan"));

        } finally {

            setBusyPlanId(null);
        }
    };

    const rerunPlan = () => {

        if (!result) return;

        const inputs = { ...result.inputs };

        // A past date can't be re-planned; drop it rather than fail.
        if (inputs.event_date && inputs.event_date < localToday()) inputs.event_date = null;

        fillFormFrom(inputs);
        runGenerate(inputs);
    };

    const deletePlan = async (id) => {

        setBusyPlanId(id);

        try {

            await API.delete(`/planner/plans/${id}`, { headers: authHeaders });

            setPlans((prev) => prev.filter((p) => p.id !== id));
            setResult((prev) => (prev && prev.savedId === id ? { ...prev, savedId: null } : prev));
            setConfirmDeleteId(null);
            toast.success("Plan deleted");

        } catch (error) {

            toast.error(errorText(error, "Could not delete the plan"));

        } finally {

            setBusyPlanId(null);
        }
    };

    // ----------------------------------------------------------------- render

    const plan = result?.plan;
    const maxAmount = plan ? Math.max(...plan.allocation.map((a) => a.amount)) : 0;

    return (

        <div className="min-h-screen bg-gray-50 px-6 py-12">

            <div className="max-w-6xl mx-auto">

                <div className="mb-10">
                    <h1 className="text-4xl font-display font-semibold text-ink flex items-center gap-3">
                        <Sparkles size={32} className="text-teal-600" />
                        AI Event Planner
                    </h1>
                    <p className="text-gray-500 mt-3 max-w-2xl">
                        Tell us about your event and budget. We split the money across what you need and
                        pick real, available vendors from Eventora for every slot.
                    </p>
                </div>

                {optionsError && (
                    <div role="alert" className="mb-8 p-4 rounded-xl bg-rose-50 text-rose-800 border border-rose-200">
                        {optionsError}
                    </div>
                )}

                {/* ---------------------------------------------------- FORM */}
                <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg p-8 space-y-6">

                    <div className="grid md:grid-cols-2 gap-6">

                        <label className="block">
                            <span className="block text-sm font-medium text-gray-700 mb-2">Event type</span>
                            <select
                                value={form.event_type}
                                onChange={changeEventType}
                                disabled={!options}
                                className={inputClass}
                            >
                                {(options?.eventTypes || [{ name: "Wedding" }]).map((t) => (
                                    <option key={t.name} value={t.name}>{t.name}</option>
                                ))}
                            </select>
                        </label>

                        <label className="block">
                            <span className="block text-sm font-medium text-gray-700 mb-2">Total budget (₹)</span>
                            <input
                                type="number"
                                inputMode="numeric"
                                required
                                min={options?.limits.minBudget || 10000}
                                max={options?.limits.maxBudget || 100000000}
                                step="1"
                                value={form.budget}
                                onChange={setField("budget")}
                                placeholder="e.g. 1000000"
                                className={inputClass}
                            />
                            {form.budget && Number(form.budget) > 0 && (
                                <span className="block text-xs text-gray-500 mt-1">{inr(Number(form.budget))}</span>
                            )}
                        </label>

                        <label className="block">
                            <span className="block text-sm font-medium text-gray-700 mb-2">Number of guests</span>
                            <input
                                type="number"
                                inputMode="numeric"
                                required
                                min={options?.limits.minGuests || 1}
                                max={options?.limits.maxGuests || 5000}
                                step="1"
                                value={form.guest_count}
                                onChange={setField("guest_count")}
                                placeholder="e.g. 300"
                                className={inputClass}
                            />
                        </label>

                        <label className="block">
                            <span className="block text-sm font-medium text-gray-700 mb-2">City</span>
                            <input
                                type="text"
                                required
                                list="planner-cities"
                                maxLength={options?.limits.maxCityLength || 80}
                                value={form.city}
                                onChange={setField("city")}
                                placeholder="e.g. Jaipur"
                                className={inputClass}
                            />
                            <datalist id="planner-cities">
                                {cities.map((c) => <option key={c} value={c} />)}
                            </datalist>
                        </label>

                        <label className="block">
                            <span className="block text-sm font-medium text-gray-700 mb-2">
                                Event date <span className="text-gray-400 font-normal">(optional - hides vendors who are booked)</span>
                            </span>
                            <input
                                type="date"
                                min={localToday()}
                                value={form.event_date}
                                onChange={setField("event_date")}
                                className={inputClass}
                            />
                        </label>

                        <label className="block">
                            <span className="block text-sm font-medium text-gray-700 mb-2">
                                Notes <span className="text-gray-400 font-normal">(optional)</span>
                            </span>
                            <input
                                type="text"
                                maxLength={options?.limits.maxNotes || 300}
                                value={form.notes}
                                onChange={setField("notes")}
                                placeholder="e.g. outdoor evening ceremony"
                                className={inputClass}
                            />
                        </label>

                    </div>

                    <fieldset>
                        <legend className="block text-sm font-medium text-gray-700 mb-3">
                            What do you need? <span className="text-gray-400 font-normal">({activeCategories.length} selected)</span>
                        </legend>
                        <div className="flex flex-wrap gap-2">
                            {eventTypeCategories.map((category) => {
                                const on = activeCategories.includes(category);
                                return (
                                    <button
                                        key={category}
                                        type="button"
                                        onClick={() => toggleCategory(category)}
                                        aria-pressed={on}
                                        className={`px-4 py-2 rounded-full border text-sm transition ${on
                                            ? "bg-teal-600 text-white border-teal-600"
                                            : "bg-white text-gray-700 border-gray-200 hover:border-teal-400"}`}
                                    >
                                        {on && "✓ "}{category}
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>

                    <button
                        type="submit"
                        disabled={generating || !options}
                        className="inline-flex items-center gap-2 px-8 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition disabled:opacity-60"
                    >
                        {generating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        {generating ? "Planning your event..." : "Build my plan"}
                    </button>

                </form>

                {/* -------------------------------------------------- RESULT */}
                {plan && (
                    <div ref={resultRef} className="mt-12 space-y-8 scroll-mt-24">

                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h2 className="text-3xl font-display font-semibold text-ink">
                                    {result.inputs.event_type} in {result.inputs.city}
                                </h2>
                                <p className="text-gray-500 mt-1">
                                    {inr(result.inputs.budget)} for {result.inputs.guest_count} guests
                                    {result.inputs.event_date && ` · ${new Date(`${result.inputs.event_date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`}
                                </p>
                                {result.snapshot && (
                                    <p className="text-sm text-amber-700 mt-2">
                                        Saved plan from {new Date(result.snapshot).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.
                                        Vendor prices and availability may have changed since.
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={rerunPlan}
                                    disabled={generating}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-teal-600 text-teal-700 rounded-xl hover:bg-teal-50 transition disabled:opacity-60"
                                >
                                    <RefreshCw size={16} className={generating ? "animate-spin" : ""} /> Refresh with latest data
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || Boolean(result.savedId)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition disabled:opacity-70"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : result.savedId ? <CheckCircle2 size={16} /> : <Save size={16} />}
                                    {result.savedId ? "Saved" : "Save this plan"}
                                </button>
                            </div>
                        </div>

                        {/* AI summary */}
                        {plan.ai_summary && (
                            <div className="bg-teal-50 border border-teal-100 rounded-2xl p-6">
                                <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 mb-2 flex items-center gap-2">
                                    <Sparkles size={14} /> AI summary
                                </p>
                                <p className="text-gray-800 whitespace-pre-line">{plan.ai_summary}</p>
                            </div>
                        )}

                        {/* Budget breakdown */}
                        <section className="bg-white rounded-3xl shadow-lg p-8">
                            <h3 className="text-xl font-semibold text-ink mb-6">Budget breakdown</h3>
                            <ul className="space-y-4">
                                {plan.allocation.map((a) => (
                                    <li key={a.category}>
                                        <div className="flex justify-between gap-4 text-sm mb-1.5">
                                            <span className="font-medium text-gray-800">{a.category}</span>
                                            <span className="text-gray-600">
                                                <span className="font-semibold text-gray-900">{inr(a.amount)}</span> · {a.percent}%
                                            </span>
                                        </div>
                                        <div className="h-3 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
                                            <div
                                                className="h-full rounded-full bg-teal-600"
                                                style={{ width: `${Math.max((a.amount / maxAmount) * 100, 2)}%` }}
                                            />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-sm text-gray-500 mt-6 pt-4 border-t border-gray-100 flex justify-between">
                                <span>Total</span>
                                <span className="font-semibold text-gray-900">{inr(plan.allocation.reduce((s, a) => s + a.amount, 0))}</span>
                            </p>
                        </section>

                        {/* Insights */}
                        {plan.insights.length > 0 && (
                            <section className="bg-white rounded-3xl shadow-lg p-8">
                                <h3 className="text-xl font-semibold text-ink mb-4">Things to know</h3>
                                <ul className="space-y-3">
                                    {plan.insights.map((insight, i) => (
                                        <li key={i} className="flex gap-3 text-gray-700">
                                            {insight.type === "warning"
                                                ? <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                                                : <Info size={20} className="text-teal-600 shrink-0 mt-0.5" />}
                                            <span>{insight.message}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {/* Vendor recommendations */}
                        <section>
                            <h3 className="text-xl font-semibold text-ink mb-4">Recommended vendors</h3>
                            <div className="space-y-6">
                                {plan.allocation.map((a) => (
                                    <div key={a.category} className="bg-white rounded-3xl shadow-lg p-6">
                                        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                                            <h4 className="text-lg font-semibold text-gray-900">{a.category}</h4>
                                            <span className="text-sm text-gray-500">Budget {inr(a.amount)}</span>
                                        </div>

                                        {a.vendors.length === 0 ? (
                                            <p className="text-gray-500">
                                                {a.vendors_unavailable > 0
                                                    ? "Every vendor in this category is booked on your date."
                                                    : "No vendors are listed in this category yet."}
                                            </p>
                                        ) : (
                                            <div className="grid md:grid-cols-3 gap-4">
                                                {a.vendors.map((v) => {
                                                    const fit = FIT_LABELS[v.fit] || FIT_LABELS.unknown;
                                                    return (
                                                        <Link
                                                            key={v.id}
                                                            to={`/vendors/${v.id}`}
                                                            className="block rounded-2xl border border-gray-100 hover:border-teal-300 hover:shadow-md transition overflow-hidden"
                                                        >
                                                            <div className="h-32 w-full bg-teal-50 overflow-hidden">
                                                                {v.portfolio_image && (
                                                                    <img
                                                                        src={v.portfolio_image}
                                                                        alt={v.business_name}
                                                                        className="h-full w-full object-cover"
                                                                        loading="lazy"
                                                                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                                                                    />
                                                                )}
                                                            </div>
                                                            <div className="p-4">
                                                                <p className="font-semibold text-gray-900">{v.business_name}</p>
                                                                <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                                                                    <MapPin size={13} /> {v.city}
                                                                    {v.outOfCity && <span className="text-amber-700"> · outside {result.inputs.city}</span>}
                                                                </p>
                                                                <p className="text-sm text-gray-700 mt-2">{v.price_range || "Price on request"}</p>
                                                                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                                                    <Star size={14} className="text-amber-500" fill="currentColor" strokeWidth={0} />
                                                                    {v.review_count > 0 ? `${Number(v.avg_rating).toFixed(1)} (${v.review_count})` : "No reviews yet"}
                                                                </p>
                                                                <span className={`inline-block mt-3 px-2.5 py-1 rounded-full border text-xs font-medium ${fit.cls}`}>
                                                                    {fit.text}
                                                                </span>
                                                                <ul className="mt-3 space-y-1 text-xs text-gray-500 list-disc list-inside">
                                                                    {v.reasons.map((r, i) => <li key={i}>{r}</li>)}
                                                                </ul>
                                                            </div>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Checklist */}
                        <section className="bg-white rounded-3xl shadow-lg p-8">
                            <h3 className="text-xl font-semibold text-ink mb-4 flex items-center gap-2">
                                <CalendarClock size={22} className="text-teal-600" /> Your planning checklist
                            </h3>
                            <ol className="divide-y divide-gray-100">
                                {plan.checklist.map((item, i) => (
                                    <li key={i} className="py-3 flex flex-wrap justify-between gap-2">
                                        <span className="text-gray-800">{item.task}</span>
                                        <span className={`text-sm ${item.urgent ? "font-semibold text-rose-700" : "text-gray-500"}`}>{item.when}</span>
                                    </li>
                                ))}
                            </ol>
                        </section>

                    </div>
                )}

                {/* ---------------------------------------------- SAVED PLANS */}
                <section className="mt-14">
                    <h2 className="text-2xl font-display font-semibold text-ink mb-4">Your saved plans</h2>

                    {plansLoading && <p className="text-gray-500">Loading...</p>}

                    {!plansLoading && plans.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-500">
                            No saved plans yet. Build a plan above and press “Save this plan”.
                        </div>
                    )}

                    {plans.length > 0 && (
                        <ul className="space-y-3">
                            {plans.map((p) => (
                                <li key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <p className="font-semibold text-gray-900">{p.title}</p>
                                        <p className="text-sm text-gray-500">
                                            {p.inputs.guest_count} guests · {p.inputs.categories.length} categories · saved {new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {confirmDeleteId === p.id ? (
                                            <>
                                                <span className="text-sm text-gray-600">Delete this plan?</span>
                                                <button
                                                    onClick={() => deletePlan(p.id)}
                                                    disabled={busyPlanId === p.id}
                                                    className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm hover:bg-rose-700 disabled:opacity-60"
                                                >
                                                    {busyPlanId === p.id ? "Deleting..." : "Yes, delete"}
                                                </button>
                                                <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => openPlan(p.id)}
                                                    disabled={busyPlanId === p.id}
                                                    className="inline-flex items-center gap-2 px-4 py-2 border border-teal-600 text-teal-700 rounded-lg text-sm hover:bg-teal-50 disabled:opacity-60"
                                                >
                                                    {busyPlanId === p.id ? <Loader2 size={14} className="animate-spin" /> : <FolderOpen size={14} />} Open
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteId(p.id)}
                                                    aria-label={`Delete plan ${p.title}`}
                                                    className="p-2 text-gray-400 hover:text-rose-600 transition"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

            </div>

        </div>

    );

}

export default PlannerPage;
