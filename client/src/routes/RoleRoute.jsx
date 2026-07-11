import { useContext } from "react";

import { Navigate } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";

function RoleRoute({
    children,
    allowedRole
}) {

    const {
        user,
        loading
    } = useContext(AuthContext);

    // LOADING
    if (loading) {

        return (
            <div className="text-center mt-20 text-2xl font-bold">
                Loading...
            </div>
        )

    }

    // NOT LOGGED IN
    if (!user) {

        return <Navigate to="/login" />

    }

    // WRONG ROLE
    if (user.role !== allowedRole) {

        return <Navigate to="/" />

    }

    return children;

}

export default RoleRoute