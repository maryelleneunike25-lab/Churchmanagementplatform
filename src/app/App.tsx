import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./components/auth/LoginPage";
import SignupPage from "./components/auth/SignupPage";
import SuperAdminDashboard from "./components/dashboard/SuperAdminDashboard";

// Protected Route — redirects to /login if not authenticated
function ProtectedRoute({ children }: { children: React.ReactNode }) {
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
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Login/Signup route — redirects to /dashboard if already logged in
function AdminRoute() {
  const { user } = useAuth();
  const [showSignup, setShowSignup] = useState(false);

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
          {/* Login */}
          <Route path="/login" element={<AdminRoute />} />
          <Route path="/admin" element={<AdminRoute />} />

          {/* Protected Admin / SuperAdmin Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Default — open login screen */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}