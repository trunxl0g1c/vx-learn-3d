import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Mail, User } from "lucide-react";
import Button from "../../../components/ui/button";
import Input from "../../../components/ui/input";
import Switch from "../../../components/ui/switch";
import InlineAlert from "../../../components/ui/inline-alert";
import { useRegister } from "../api/register";
import { useAuth } from "../AuthContext";

export default function RegisterForm() {
  const navigate = useNavigate();
  const { setSession } = useAuth();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formError, setFormError] = useState("");

  const registerMutation = useRegister({
    onSuccess: (data) => {
      setSession(data?.user ?? null);
      navigate("/viqubed", { replace: true });
    },
  });

  function handleSubmit(event) {
    event.preventDefault();

    if (registerMutation.isPending) return;

    setFormError("");

    if (!name.trim() || !username.trim() || !password) {
      setFormError("All fields are required.");
      return;
    }

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    if (!agreedToTerms) {
      setFormError("You must agree to the Terms and Conditions to continue.");
      return;
    }

    registerMutation.mutate({
      name: name.trim(),
      username: username.trim(),
      password,
    });
  }

  const errorMessage =
    formError || registerMutation.error?.response?.data?.message || "";

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      {errorMessage && (
        <InlineAlert message={errorMessage} type="error" autoHide={false} />
      )}

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <label htmlFor="name" className="text-sm text-contrast-grayout">
            Name
          </label>
          <Input
            id="name"
            name="name"
            placeholder="Type here..."
            autoComplete="name"
            disabled={registerMutation.isPending}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-[16px]! bg-transparent! py-6!"
            inputClassName="py-6!"
          />
        </div>

        <div className="flex flex-col gap-3">
          <label
            htmlFor="register-username"
            className="text-sm text-contrast-grayout"
          >
            Email
          </label>
          <Input
            id="register-username"
            name="username"
            placeholder="Type here..."
            autoComplete="username"
            disabled={registerMutation.isPending}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="rounded-[16px]! bg-transparent! py-6!"
            inputClassName="py-6!"
          />
        </div>

        <div className="flex flex-col gap-3">
          <label
            htmlFor="register-password"
            className="text-sm text-contrast-grayout"
          >
            Password
          </label>
          <Input
            id="register-password"
            name="password"
            type="password"
            placeholder="Type here..."
            autoComplete="new-password"
            disabled={registerMutation.isPending}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-[16px]! bg-transparent! py-6!"
            inputClassName="py-6!"
          />
        </div>

        <div className="flex flex-col gap-3">
          <label
            htmlFor="confirm-password"
            className="text-sm text-contrast-grayout"
          >
            Confirm Password
          </label>
          <Input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            placeholder="Type here..."
            autoComplete="new-password"
            disabled={registerMutation.isPending}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="rounded-[16px]! bg-transparent! py-6!"
            inputClassName="py-6!"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-3">
        <Switch checked={agreedToTerms} onCheckedChange={setAgreedToTerms} />
        <span className="text-xs text-white">
          By registering, I agree to the{" "}
          <span className="font-medium text-accent-main">
            Terms and Conditions
          </span>
        </span>
      </div>

      <Button
        type="submit"
        size="md"
        className="w-full rounded-2xl! uppercase tracking-wide font-bold!"
        disabled={registerMutation.isPending}
      >
        {registerMutation.isPending ? "Creating account..." : "Sign up"}
      </Button>

      <p className="text-center text-sm text-white">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-medium text-accent-main hover:underline"
        >
          Sign In
        </Link>
      </p>
    </form>
  );
}
