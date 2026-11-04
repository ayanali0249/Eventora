import { createContext, useContext, useEffect, useState } from "react";

export const AuthContext = createContext();

// Convenience hook: `const { user } = useAuth();` instead of every
// component having to `useContext(AuthContext)` + import AuthContext.
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

function AuthProvider({ children }) {

    const [user, setUser] = useState(null);

    const [token, setToken] = useState(null);

    const [loading, setLoading] = useState(true);

    // LOAD USER FROM LOCAL STORAGE
    useEffect(() => {

        const storedUser = localStorage.getItem("user");

        const storedToken = localStorage.getItem("token");

        if (storedUser && storedToken) {

            setUser(JSON.parse(storedUser));

            setToken(storedToken);

        }

        setLoading(false);

    }, []);

    // LOGIN
    const login = (userData, tokenData) => {

        localStorage.setItem(
            "user",
            JSON.stringify(userData)
        );

        localStorage.setItem(
            "token",
            tokenData
        );

        setUser(userData);

        setToken(tokenData);

    };

    // LOGOUT
    const logout = () => {

        localStorage.removeItem("user");

        localStorage.removeItem("token");

        setUser(null);

        setToken(null);

    };

    // UPDATE USER
    const updateUser = (

        updatedUser

    ) => {

        const mergedUser = {

            ...user,

            ...updatedUser

        };

        setUser(

            mergedUser

        );

        localStorage.setItem(

            "user",

            JSON.stringify(

                mergedUser

            )

        );

    };

    return (

        <AuthContext.Provider
            value={{
                user,
                token,
                loading,
                login,
                logout,
                updateUser
            }}
        >

            {children}

        </AuthContext.Provider>

    )

}

export default AuthProvider