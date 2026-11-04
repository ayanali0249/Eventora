import { useState, useEffect, useRef } from "react";

import API from "../services/api";
import toast from "react-hot-toast";
import { VENDOR_CATEGORIES } from "../constants/categories";
import { X, Upload, Plus, Loader2 } from "lucide-react";

function EditVendorModal({ vendor = {}, onClose, refresh }) {

    const [form, setForm] = useState({
        business_name: vendor?.business_name || "",
        category: vendor?.category || "",
        city: vendor?.city || "",
        description: vendor?.description || "",
        price_range: vendor?.price_range || "",
        portfolio_image: vendor?.portfolio_image || "",
        gallery_images: vendor?.gallery_images || []
    });

    const [saving, setSaving] = useState(false);
    const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
    const [uploadingGallery, setUploadingGallery] = useState(false);

    const portfolioInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    useEffect(() => {
        setForm({
            business_name: vendor?.business_name || "",
            category: vendor?.category || "",
            city: vendor?.city || "",
            description: vendor?.description || "",
            price_range: vendor?.price_range || "",
            portfolio_image: vendor?.portfolio_image || "",
            gallery_images: vendor?.gallery_images || []
        });
    }, [vendor]);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    // Confirm before discarding edits, comparing against the vendor's
    // saved data so an unchanged form (or a brand-new, still-empty one)
    // closes immediately with no unnecessary prompt.
    const isDirty = () => {
        const original = {
            business_name: vendor?.business_name || "",
            category: vendor?.category || "",
            city: vendor?.city || "",
            description: vendor?.description || "",
            price_range: vendor?.price_range || "",
            portfolio_image: vendor?.portfolio_image || "",
            gallery_images: vendor?.gallery_images || []
        };
        return JSON.stringify(original) !== JSON.stringify(form);
    };

    const safeClose = () => {
        if (isDirty()) {
            if (window.confirm("Discard your changes to this profile?")) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    // Shared helper: upload a single file to the backend's Cloudinary proxy.
    // Returns the hosted image URL, or null (with a toast) on failure.
    const uploadToCloudinary = async (file) => {
        if (!file.type.startsWith("image/")) {
            toast.error("Please choose an image file");
            return null;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be smaller than 5MB");
            return null;
        }

        const token = localStorage.getItem("token");
        const data = new FormData();
        data.append("image", file);

        try {
            const response = await API.post("/upload/image", data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data"
                }
            });
            return response.data.imageUrl;
        } catch (error) {
            toast.error(error.response?.data?.message || "Image upload failed");
            return null;
        }
    };

    const handlePortfolioUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingPortfolio(true);
        const url = await uploadToCloudinary(file);
        setUploadingPortfolio(false);

        if (url) {
            setForm((prev) => ({ ...prev, portfolio_image: url }));
            toast.success("Portfolio image uploaded");
        }

        e.target.value = "";
    };

    const handleGalleryUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (form.gallery_images.length >= 8) {
            toast.error("You can add up to 8 gallery images");
            e.target.value = "";
            return;
        }

        setUploadingGallery(true);
        const url = await uploadToCloudinary(file);
        setUploadingGallery(false);

        if (url) {
            setForm((prev) => ({
                ...prev,
                gallery_images: [...prev.gallery_images, url]
            }));
            toast.success("Image added to gallery");
        }

        e.target.value = "";
    };

    const removeGalleryImage = (indexToRemove) => {
        setForm((prev) => ({
            ...prev,
            gallery_images: prev.gallery_images.filter((_, i) => i !== indexToRemove)
        }));
    };

    const saveVendor = async () => {

        if (!form.business_name.trim() || !form.category || !form.city.trim()) {
            toast.error("Business name, category and city are required");
            return;
        }

        try {
            setSaving(true);

            const token = localStorage.getItem("token");

            await API.put("/vendors/edit", form, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            toast.success(vendor?.id ? "Profile updated" : "Vendor profile created!");

            refresh();
            onClose();

        } catch (error) {
            toast.error(error.response?.data?.message || "Could not save your profile");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 px-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) safeClose();
            }}
        >
            <div className="bg-white w-full max-w-2xl rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">

                <h2 className="text-2xl sm:text-3xl font-bold mb-6">
                    {vendor?.id ? "Edit Vendor Profile" : "Create Vendor Profile"}
                </h2>

                <div className="space-y-4">

                    <div>
                        <label className="text-sm font-medium text-gray-600 mb-1 block">Business Name *</label>
                        <input
                            name="business_name"
                            value={form.business_name}
                            onChange={handleChange}
                            placeholder="e.g. Royal Wedding Studio"
                            className="w-full border rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-teal-400"
                        />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-600 mb-1 block">Category *</label>
                            <select
                                name="category"
                                value={form.category}
                                onChange={handleChange}
                                className="w-full border rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                            >
                                <option value="">Select a category</option>
                                {VENDOR_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-600 mb-1 block">City *</label>
                            <input
                                name="city"
                                value={form.city}
                                onChange={handleChange}
                                placeholder="e.g. Jaipur"
                                className="w-full border rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-teal-400"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-600 mb-1 block">Price Range</label>
                        <input
                            name="price_range"
                            value={form.price_range}
                            onChange={handleChange}
                            placeholder="e.g. ₹50,000 - ₹1,50,000"
                            className="w-full border rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-teal-400"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-600 mb-1 block">Description</label>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            placeholder="Tell customers what makes your business great..."
                            rows={4}
                            className="w-full border rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-teal-400"
                        />
                    </div>

                    {/* PORTFOLIO IMAGE */}
                    <div>
                        <label className="text-sm font-medium text-gray-600 mb-2 block">Cover / Portfolio Image</label>
                        <div className="flex items-center gap-4">
                            <div className="w-24 h-24 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                                {form.portfolio_image ? (
                                    <img src={form.portfolio_image} alt="Portfolio" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-gray-400 text-xs text-center px-2">No image</span>
                                )}
                            </div>
                            <div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={portfolioInputRef}
                                    onChange={handlePortfolioUpload}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => portfolioInputRef.current?.click()}
                                    disabled={uploadingPortfolio}
                                    className="px-5 py-3 border border-teal-600 text-teal-600 rounded-xl hover:bg-teal-50 transition disabled:opacity-60 flex items-center gap-2"
                                >
                                    {uploadingPortfolio ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                    {uploadingPortfolio ? "Uploading..." : form.portfolio_image ? "Change Image" : "Upload Image"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* GALLERY IMAGES */}
                    <div>
                        <label className="text-sm font-medium text-gray-600 mb-2 block">
                            Gallery ({form.gallery_images.length}/8)
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {form.gallery_images.map((img, index) => (
                                <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden group">
                                    <img src={img} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeGalleryImage(index)}
                                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-red-600 transition"
                                        aria-label="Remove image"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}

                            {form.gallery_images.length < 8 && (
                                <>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        ref={galleryInputRef}
                                        onChange={handleGalleryUpload}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => galleryInputRef.current?.click()}
                                        disabled={uploadingGallery}
                                        className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-teal-400 hover:text-teal-500 transition flex items-center justify-center text-2xl disabled:opacity-60"
                                    >
                                        {uploadingGallery ? <Loader2 size={20} className="animate-spin" /> : <Plus size={22} />}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={saveVendor}
                        disabled={saving || uploadingPortfolio || uploadingGallery}
                        className="w-full bg-teal-600 text-white p-4 rounded-xl hover:bg-teal-700 transition disabled:opacity-60"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>

                    <button
                        onClick={safeClose}
                        className="w-full mt-1 border rounded-xl p-4 hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>

                </div>
            </div>
        </div>
    );
}

export default EditVendorModal;
