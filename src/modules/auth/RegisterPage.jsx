import { Navigate } from "react-router-dom";
import AuthCard from "./components/AuthCard";
import RegisterForm from "./components/RegisterForm";
import { useAuth } from "./AuthContext";

export default function RegisterPage() {
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
    <AuthCard>
      <h1 className="mb-6 text-lg font-normal text-white">Sign Up</h1>
      <RegisterForm />
    </AuthCard>
  );
}
