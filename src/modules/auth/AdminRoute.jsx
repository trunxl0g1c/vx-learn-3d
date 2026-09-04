import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

// Sits inside <ProtectedRoute/> (auth is already guaranteed here) — this
// only adds the role check. GET /auth/me returns `role` as the global
// Role's plain name ("Admin" | "User" post-remap, see vxcubed-be's
// prisma/seed.ts), not a permission string, so this checks it directly
// rather than going through hasPermission().
export default function AdminRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-primary text-white">
        <span className="text-sm text-secondary-default">Loading...</span>
      </div>
    );
  }

  if (user?.role !== "Admin") {
    return <Navigate to="/viqubed" replace />;
  }

  return <Outlet />;
}
