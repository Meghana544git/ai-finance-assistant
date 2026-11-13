import { Navigate, Outlet, useLocation } from "react-router-dom";

import { FullPageLoader } from "@/components/FullPageLoader";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <FullPageLoader />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { isAuthenticated, isInitializing } = useAuth();
  if (isInitializing) return <FullPageLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
