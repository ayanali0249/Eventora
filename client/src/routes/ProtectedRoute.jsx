import { useContext } from "react";

import { Navigate } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";

function ProtectedRoute({ children }) {

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

    // AUTHORIZED
    return children;

}

export default ProtectedRoute