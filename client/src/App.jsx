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
import NotFoundPage from "./pages/NotFoundPage";
import WishlistPage from "./pages/WishlistPage";
import HistoryPage from "./pages/HistoryPage";
import AIChatbot from "./components/AIChatbot"; // NEW: AI chatbot widget
import AdminPage from "./pages/AdminPage"; // NEW: role-protected admin panel
import PlannerPage from "./pages/PlannerPage"; // NEW: AI event planner
import ComparePage from "./pages/ComparePage"; // NEW: multi-vendor comparison
import CompareTray from "./components/CompareTray"; // NEW: floating comparison selection bar
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

    {/* WISHLIST (customer only) */}
    <Route
      path="/wishlist"
      element={
          <RoleRoute allowedRole="customer">
            <WishlistPage />
          </RoleRoute>
      }
    />

    {/* AI EVENT PLANNER (customer only) */}
    <Route
      path="/planner"
      element={
          <RoleRoute allowedRole="customer">
            <PlannerPage />
          </RoleRoute>
      }
    />

    {/* HISTORY (customer only) */}
    <Route
      path="/history"
      element={
          <RoleRoute allowedRole="customer">
            <HistoryPage />
          </RoleRoute>
      }
    />

    <Route
      path="/chat"
      element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
      }
    />

    {/* ADMIN PANEL (admin only) */}
    <Route
      path="/admin"
      element={
          <RoleRoute allowedRole="admin">
            <AdminPage />
          </RoleRoute>
      }
    />

    {/* COMPARE VENDORS - public, no auth required, same as /vendors itself */}
    <Route
      path="/compare"
      element={<ComparePage />}
    />

    {/* CATCH-ALL 404 - previously any unknown route rendered a blank page */}
    <Route
      path="*"
      element={<NotFoundPage />}
    />

</Routes>

      <AIChatbot />

      <CompareTray />

    </>

  )

}

export default App