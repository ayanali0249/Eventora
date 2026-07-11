import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VendorPage from "./pages/VendorPage";
import DashboardPage from "./pages/DashboardPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import VendorDashboardPage from "./pages/VendorDashboardPage";
import RoleRoute from "./routes/RoleRoute";
import ChatPage from "./pages/ChatPage";
import VendorDetailsPage from "./pages/VendorDetailsPage";
function App() {

  return (

    <>
    
      <Navbar />

      <Routes>

    <Route
        path="/"
        element={<HomePage />}
    />

    <Route
        path="/login"
        element={<LoginPage />}
    />

    <Route
        path="/register"
        element={<RegisterPage />}
    />

    <Route
        path="/vendors"
        element={<VendorPage />}
    />

    {/* CUSTOMER DASHBOARD */}
    <Route
        path="/dashboard"
        element={
            <RoleRoute allowedRole="customer">
              <DashboardPage />
            </RoleRoute>
        }
    />

    {/* VENDOR DASHBOARD */}
    <Route
        path="/vendor-dashboard"
        element={
            <RoleRoute allowedRole="vendor">
              <VendorDashboardPage />
            </RoleRoute>
        }
    />

    {/* VENDOR DETAILS */}
    <Route
      path="/vendors/:id"
      element={
      <VendorDetailsPage />
      }
    />
    
    <Route
      path="/chat"
      element={<ChatPage />}
    />

</Routes>

    </>

  )

}

export default App