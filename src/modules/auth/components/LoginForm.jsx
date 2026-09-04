import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock } from "lucide-react";
import Button from "../../../components/ui/button";
import Input from "../../../components/ui/input";
import InlineAlert from "../../../components/ui/inline-alert";
import { useAlert } from "../../../components/dialog/AlertContext";
import { useLogin } from "../api/login";
import { useAuth } from "../AuthContext";
import MaterialIcon from "../../../components/ui/material-icon";
import { EMAIL_MAX_LENGTH, isValidEmail } from "../../../utils/validation";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 384 512"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76-19.7C63.3 141.2 4 184.8 4 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuth();
  const { showAlert } = useAlert();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");

  const loginMutation = useLogin({
    onSuccess: (data) => {
      setSession(data?.user ?? null);

      const redirectTo = location.state?.from?.pathname || "/viqubed";
      navigate(redirectTo, { replace: true });
    },
  });

  function handleSubmit(event) {
    event.preventDefault();

    if (loginMutation.isPending) return;

    setFormError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setFormError("Enter a valid email address.");
      return;
    }

    if (!password) {
      setFormError("Password is required.");
      return;
    }

    loginMutation.mutate({ email: trimmedEmail, password });
  }

  function notifyUnavailable(feature) {
    showAlert({
      title: "Not available yet",
      message: `${feature} isn't set up yet — use your email and password for now.`,
      type: "info",
    });
  }

  const errorMessage =
    formError ||
    loginMutation.error?.response?.data?.message ||
    (loginMutation.isError ? "Invalid email or password" : "");

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {errorMessage && (
        <InlineAlert message={errorMessage} type="error" autoHide={false} />
      )}

      <Input
        type="email"
        name="email"
        autoComplete="email"
        placeholder="Email"
        aria-label="Email"
        maxLength={EMAIL_MAX_LENGTH}
        disabled={loginMutation.isPending}
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          setFormError("");
        }}
        // leftIcon={<User className="text-contrast-main" size={18} />}
        leftIcon={
          <MaterialIcon
            name="person"
            fill={1}
            size={18}
            className="text-contrast-main"
          />
        }
        className="rounded-[16px]! bg-transparent! border-accent-main! py-6!"
        inputClassName="py-6!"
      />

      <Input
        type={showPassword ? "text" : "password"}
        name="password"
        autoComplete="current-password"
        placeholder="Password"
        aria-label="Password"
        maxLength={128}
        disabled={loginMutation.isPending}
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          setFormError("");
        }}
        leftIcon={
          <MaterialIcon
            name="lock"
            fill={1}
            size={18}
            className="text-contrast-main"
          />
        }
        // rightIcon={
        //   <button
        //     type="button"
        //     onClick={() => setShowPassword((value) => !value)}
        //     aria-label={showPassword ? "Hide password" : "Show password"}
        //     className="cursor-pointer"
        //   >
        //     {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        //   </button>
        // }
        className="rounded-[16px]! bg-transparent! py-6!"
        inputClassName="py-6!"
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => notifyUnavailable("Password reset")}
          className="cursor-pointer text-xs text-white"
        >
          Forgot Password?
        </button>
      </div>

      <Button
        type="submit"
        size="md"
        className="w-full rounded-full! uppercase tracking-wide font-bold!"
        disabled={loginMutation.isPending}
      >
        {loginMutation.isPending ? "Signing in..." : "Sign in"}
      </Button>

      <div className="flex items-center justify-center gap-3 py-1">
        {/* <div className="h-px flex-1 bg-divider-main" /> */}
        <span className="text-sm text-white">OR</span>
        {/* <div className="h-px flex-1 bg-divider-main" /> */}
      </div>

      <button
        type="button"
        onClick={() => notifyUnavailable("Google sign-in")}
        className="flex h-[46px] w-full cursor-pointer items-center gap-2.5 rounded-full bg-white text-sm font-normal tracking-wide text-gray-800 uppercase transition hover:bg-gray-100"
      >
        <div className="w-1/3 pl-5">
          <GoogleIcon />
        </div>
        Login with Google
      </button>

      <button
        type="button"
        onClick={() => notifyUnavailable("Apple sign-in")}
        className="flex h-[46px] w-full cursor-pointer items-center gap-2.5 rounded-full bg-white text-sm font-normal tracking-wide text-gray-800 uppercase transition hover:bg-gray-100"
      >
        <div className="w-1/3 pl-5">
          <AppleIcon />
        </div>
        Login with Apple
      </button>

      <p className="pt-10 text-center text-sm text-white">
        Do not have an account?{" "}
        <Link
          to="/register"
          className="font-medium text-accent-main hover:underline"
        >
          Sign Up
        </Link>
      </p>
    </form>
  );
}
