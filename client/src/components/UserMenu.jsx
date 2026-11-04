import {

    useContext,

    useState

} from "react";

import {

    AuthContext

} from "../context/AuthContext";

import {

    useNavigate

} from "react-router-dom";

import API from "../services/api";

import toast from "react-hot-toast";
import { Camera, Loader2, UserCog, KeyRound, Trash2, LogOut } from "lucide-react";

function UserMenu() {

    const {

        user,

        logout,

        updateUser

    } = useContext(

        AuthContext

    );

    const navigate = useNavigate();

    const [

        open,

        setOpen

    ] = useState(false);

    const [editMode, setEditMode] = useState(false);
    const [passwordMode, setPasswordMode] = useState(false);

    const [oldPassword, setOldPassword] = useState("");

    const [newPassword, setNewPassword] = useState("");

    const [confirmPassword, setConfirmPassword] = useState("");

    const [uploadingImage, setUploadingImage] = useState(false);

    const [savingProfile, setSavingProfile] = useState(false);

    const [savingPassword, setSavingPassword] = useState(false);

    const [name, setName] = useState(

        user?.name || ""

    );

    const [email, setEmail] = useState(

        user?.email || ""

    );

    const handleLogout = () => {

        logout();

        navigate("/login");

    };

    const saveProfile = async () => {

        if (!name.trim() || !email.trim()) {
            toast.error("Name and email are required");
            return;
        }

        try {

            setSavingProfile(true);

            const token = localStorage.getItem(

                "token"

            );

            const response = await API.put(

                "/auth/profile",

                {

                    name,

                    email

                },

                {

                    headers: {

                        Authorization:

                        `Bearer ${token}`

                    }

                }

            );

            const updated = {

                ...user,

                ...response.data.user

            };

            updateUser(

                updated

            );

            setName(

                updated.name

            );

            setEmail(

                updated.email

            );

            setEditMode(false);

            toast.success("Profile updated");

        }

        catch(error){

            toast.error(
                error.response?.data?.message || "Update failed"
            );

        }

        finally {

            setSavingProfile(false);

        }

    };

    const updatePassword = async () => {

        if (!oldPassword || !newPassword) {
            toast.error("Please fill in both password fields");
            return;
        }

        if (newPassword.length < 6) {
            toast.error("New password must be at least 6 characters long");
            return;
        }

        if (

            newPassword !== confirmPassword

        ) {

            toast.error(

                "Passwords do not match"

            );

            return;

        }

        try {

            setSavingPassword(true);

            const token = localStorage.getItem(

                "token"

            );

            const response = await API.put(

                "/auth/change-password",

                {

                    oldPassword,

                    newPassword

                },

                {

                    headers: {

                        Authorization:

                        `Bearer ${token}`

                    }

                }

            );

            toast.success(

                response.data.message || "Password updated"

            );

            setOldPassword("");

            setNewPassword("");

            setConfirmPassword("");

            setPasswordMode(false);

        }

        catch(error){

            toast.error(

                error.response?.data?.message ||

                "Password update failed"

            );

        }

        finally {

            setSavingPassword(false);

        }

    };

    const handleDelete = async () => {

        const confirmDelete = window.confirm(

            "Delete account permanently?"

        );

        if(

            !confirmDelete

        ) return;

        try {

            const token = localStorage.getItem(

                "token"

            );

            await API.delete(

                "/auth/delete-account",

                {

                    headers: {

                        Authorization:

                        `Bearer ${token}`

                    }

                }

            );

            logout();

            navigate("/login");

            toast.success("Account deleted");

        }

        catch(error){

            toast.error(

                error.response?.data?.message || "Delete failed"

            );

        }

    };

    const uploadProfile = async (

        e

        ) => {

        const file = e.target.files[0];

        if(!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please choose an image file");
            e.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be smaller than 5MB");
            e.target.value = "";
            return;
        }

        const token = localStorage.getItem("token");

        try {

            setUploadingImage(true);

            // FIXED: this used to call Cloudinary directly with an
            // "eventora_profile" unsigned upload preset that was never
            // actually created in the Cloudinary account, so every profile
            // picture upload silently failed. It now goes through the
            // backend's own signed upload endpoint (same one vendors use
            // for portfolio/gallery images), which uses the Cloudinary
            // credentials already configured in .env - no dashboard setup
            // required.
            const formData = new FormData();
            formData.append("image", file);

            const uploadRes = await API.post("/upload/image", formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data"
                }
            });

            const imageUrl = uploadRes.data.imageUrl;

            const saved = await API.put(

                "/auth/profile-image",

                {

                    imageUrl

                },

                {

                    headers:{

                        Authorization:

                        `Bearer ${token}`

                    }

                }

            );

            updateUser(

                saved.data.user

            );

            toast.success("Profile picture updated");

        } catch (error) {

            toast.error(
                error.response?.data?.message || "Could not upload image"
            );

        } finally {

            setUploadingImage(false);

            e.target.value = "";

        }

        };

    return (

        <div className="relative">

            {/* AVATAR */}

                <div className="relative group">

                    <button

                        onClick={() =>

                            setOpen(!open)

                        }

                        className="relative w-14 h-14 rounded-full overflow-hidden bg-teal-600 shadow-xl ring-4 ring-gold/30 hover:scale-105 transition duration-300"

                    >

                        {

                            user?.profile_image ? (

                                <img

                                    src={user.profile_image}

                                    alt="profile"

                                    className="w-full h-full object-cover"

                                />

                            ) : (

                                <span className="text-white text-xl font-bold">

                                    {

                                        user?.name

                                        ?.charAt(0)

                                        ?.toUpperCase()

                                    }

                                </span>

                            )

                        }

                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition" />

                    </button>

                    <label

                        className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow-lg border-2 border-teal-100 flex items-center justify-center transition ${uploadingImage ? "opacity-60 cursor-wait" : "cursor-pointer hover:scale-110"}`}

                    >

                        <span className="text-sm">

                            {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}

                        </span>

                        <input

                            type="file"

                            accept="image/*"

                            onChange={uploadProfile}

                            disabled={uploadingImage}

                            className="hidden"

                        />

                    </label>

                    <div

                        className="absolute left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition text-xs text-gray-500 whitespace-nowrap"

                    >


                    </div>

                </div>

            {

                open && (

                    <div className="absolute right-0 mt-4 bg-white shadow-2xl rounded-2xl w-72 p-4 z-50">

                        <div className="pb-4 border-b">

                            <h3 className="font-bold">

                                {user.name}

                            </h3>

                            <p className="text-sm text-gray-500">

                                {user.email}

                            </p>

                        </div>

                        <div className="mt-4 space-y-3">

                            {editMode ? (

                                <>

                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full border rounded-xl px-4 py-3"
                                    />

                                    <input
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full border rounded-xl px-4 py-3"
                                    />

                                    <button
                                        onClick={saveProfile}
                                        disabled={savingProfile}
                                        className="w-full bg-teal-600 text-white rounded-xl p-3 disabled:opacity-60"
                                    >
                                        {savingProfile ? "Saving..." : "Save Changes"}
                                    </button>

                                </>

                            ) : (

                                <button
                                    onClick={() => setEditMode(true)}
                                    className="w-full flex items-center gap-3 text-left p-3 hover:bg-gray-100 rounded-xl"
                                >
                                    <UserCog size={18} className="text-gray-500" />
                                    Change Name / Email
                                </button>

                            )}

                            {

                                passwordMode ? (

                                <>

                                <input

                                type="password"

                                placeholder="Old Password"

                                value={oldPassword}

                                onChange={(e)=>setOldPassword(e.target.value)}

                                className="w-full border rounded-xl px-4 py-3 mb-2"

                                />

                                <input

                                type="password"

                                placeholder="New Password"

                                value={newPassword}

                                onChange={(e)=>setNewPassword(e.target.value)}

                                className="w-full border rounded-xl px-4 py-3 mb-2"

                                />

                                <input

                                type="password"

                                placeholder="Confirm Password"

                                value={confirmPassword}

                                onChange={(e)=>setConfirmPassword(e.target.value)}

                                className="w-full border rounded-xl px-4 py-3 mb-2"

                                />

                                <button

                                onClick={updatePassword}

                                disabled={savingPassword}

                                className="w-full bg-teal-600 text-white rounded-xl p-3 disabled:opacity-60"

                                >

                                {savingPassword ? "Updating..." : "Update Password"}

                                </button>

                                </>

                                ) : (

                                <button

                                onClick={() => setPasswordMode(true)}

                                className="w-full flex items-center gap-3 text-left p-3 hover:bg-gray-100 rounded-xl"

                                >

                                <KeyRound size={18} className="text-gray-500" />
                                Change Password

                                </button>

                                )

                                }

                            <button

                            onClick={handleDelete}

                            className="w-full flex items-center gap-3 text-left p-3 text-rose-600 hover:bg-rose-50 rounded-xl"

                            >

                             <Trash2 size={18} />
                             Delete Account

                            </button>

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white rounded-xl p-3 hover:bg-teal-700 transition"
                            >
                                <LogOut size={18} />
                                Logout
                            </button>

                        </div>

                    </div>

                )

            }

        </div>

    );

}

export default UserMenu;