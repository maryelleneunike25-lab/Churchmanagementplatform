import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./components/auth/LoginPage";
import SignupPage from "./components/auth/SignupPage";
import SuperAdminDashboard from "./components/dashboard/SuperAdminDashboard";
import JemaatPage from "./pages/JemaatPage";
import TentangPage from "./pages/TentangPage";
import GaleriPage from "./pages/GaleriPage";
import LokasiPage from "./pages/LokasiPage";
import ServicePage from "./pages/ServicePage";

// Protected Route Component
function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

// Admin Login Route
function AdminRoute() {
  const { user } = useAuth();
  const [showSignup, setShowSignup] = useState(false);

  // If already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return showSignup ? (
    <SignupPage onSwitchToLogin={() => setShowSignup(false)} />
  ) : (
    <LoginPage onSwitchToSignup={() => setShowSignup(true)} />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/jemaat" element={<JemaatPage />} />
          <Route path="/tentang" element={<TentangPage />} />
          <Route path="/service" element={<ServicePage />} />
          <Route path="/galeri" element={<GaleriPage />} />
          <Route path="/lokasi" element={<LokasiPage />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute />} />
          <Route path="/login" element={<AdminRoute />} />

          {/* Protected Admin Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Default Route - Redirect to Jemaat Page */}
          <Route
            path="/"
            element={<Navigate to="/jemaat" replace />}
          />

          {/* 404 - Redirect to Jemaat */}
          <Route
            path="*"
            element={<Navigate to="/jemaat" replace />}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}