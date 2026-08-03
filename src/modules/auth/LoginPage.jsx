import { Navigate } from "react-router-dom";
import AuthCard from "./components/AuthCard";
import LoginForm from "./components/LoginForm";
import { useAuth } from "./AuthContext";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-primary text-white">
        <span className="text-sm text-secondary-default">Loading...</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/viqubed" replace />;
  }

  return (
    <AuthCard className="overflow-y-auto">
      <div className="mb-6 flex items-center justify-center gap-2.5 py-5">
        <img src="/images/logo-purple-fill.svg" alt="" className="h-14 w-14" />
        <img
          src="/images/logo-white-label.svg"
          alt="Viqubed"
          className="h-7 w-auto"
        />
      </div>

      <LoginForm />
    </AuthCard>
  );
}
