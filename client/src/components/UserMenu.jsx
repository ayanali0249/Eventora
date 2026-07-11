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

    const [profileImage,setProfileImage] = useState(user?.profile_image || "");

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

        try {

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

            console.log(

                response.data

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

            alert(

                "Profile Updated"

            );

        }

        catch(error){

            console.log(

                "PROFILE ERROR:",

                error

            );

            console.log(

                error.response?.data

            );

            alert(

                "Update Failed"

            );

        }

    };

    const updatePassword = async () => {

        try {

            if (

                newPassword !== confirmPassword

            ) {

                return alert(

                    "Passwords do not match"

                );

            }

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

            alert(

                response.data.message

            );

            setOldPassword("");

            setNewPassword("");

            setConfirmPassword("");

            setPasswordMode(false);

        }

        catch(error){

            console.log(error);

            alert(

                error.response?.data?.message ||

                "Password update failed"

            );

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

        }

        catch(error){

            alert(

                "Delete failed"

            );

        }

    };

    const uploadProfile = async (

        e

        ) => {

        const file = e.target.files[0];

        if(!file) return;

        const formData = new FormData();

        formData.append(

        "file",

        file

        );

        formData.append(

        "upload_preset",

        "eventora_profile"

        );

        const response = await fetch(

        `https://api.cloudinary.com/v1_1/djwyk9bzd/image/upload`,

        {

        method:"POST",

        body:formData

        }

        );

        const data = await response.json();

            console.log(

            "CLOUDINARY:",

            data

        );

        setProfileImage(

        data.secure_url

        );

        const token = localStorage.getItem(

        "token"

        );

        const saved = await API.put(

        "/auth/profile-image",

        {

        imageUrl:

        data.secure_url

        },

        {

        headers:{

        Authorization:

        `Bearer ${token}`

        }

        }

        );

        console.log(

        "DB SAVE:",

        saved.data

        );

        updateUser(

        saved.data.user

        );

        };

    return (

        <div className="relative">

            {/* AVATAR */}

                <div className="relative group">

                    <button

                        onClick={() =>

                            setOpen(!open)

                        }

                        className="relative w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 via-pink-500 to-purple-700 shadow-xl ring-4 ring-purple-100 hover:scale-105 transition duration-300"

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

                        className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow-lg border-2 border-purple-100 flex items-center justify-center cursor-pointer hover:scale-110 transition"

                    >

                        <span className="text-sm">

                            ✏️

                        </span>

                        <input

                            type="file"

                            accept="image/*"

                            onChange={uploadProfile}

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
                                        className="w-full bg-purple-600 text-white rounded-xl p-3"
                                    >
                                        Save Changes
                                    </button>

                                </>

                            ) : (

                                <button
                                    onClick={() => setEditMode(true)}
                                    className="w-full text-left p-3 hover:bg-gray-100 rounded-xl"
                                >
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

                                className="w-full bg-purple-600 text-white rounded-xl p-3"

                                >

                                Update Password

                                </button>

                                </>

                                ) : (

                                <button

                                onClick={() => setPasswordMode(true)}

                                className="w-full text-left p-3 hover:bg-gray-100 rounded-xl"

                                >

                                Change Password

                                </button>

                                )

                                }

                            <button

                            onClick={handleDelete}

                            className="w-full text-left p-3 text-red-500 hover:bg-red-50 rounded-xl"

                            >

                             Delete Account

                            </button>

                            <button
                                onClick={handleLogout}
                                className="w-full bg-purple-600 text-white rounded-xl p-3"
                            >
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