import { Navigate, Outlet } from "react-router";
import { useAuth } from "../hooks/useAuth";

export function ClientRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-50">
        <span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "client") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function ClientOrAdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-50">
        <span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "client")) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
