import { useState } from "react";
import { X } from "lucide-react";
import Button from "../../../components/ui/button";
import Input from "../../../components/ui/input";
import InlineAlert from "../../../components/ui/inline-alert";
import { useChangeUserPassword } from "../../workspace/api/users";
import {
  PASSWORD_REQUIREMENTS_TEXT,
  validatePasswordComplexity,
} from "../../../utils/validation";

export default function ChangeUserPasswordDialog({ open, user, onClose, onChanged }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const changePassword = useChangeUserPassword({
    onSuccess: () => onChanged?.(),
    onError: (mutationError) => {
      setError(
        mutationError?.response?.data?.message ||
          "Error encountered while changing password.",
      );
    },
  });

  if (!open || !user) return null;

  const isSubmitting = changePassword.isPending;

  function handleClose() {
    if (isSubmitting) return;

    onClose?.();
  }

  function handleSubmit() {
    setError("");

    const { valid: passwordValid, reasons } =
      validatePasswordComplexity(password);
    if (!passwordValid) {
      setError(`Password must have ${reasons.join(", ")}.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    changePassword.mutate({ id: user.id, password });
  }

  return (
    <div className="fixed inset-0 z-999 grid place-items-center bg-black/45 backdrop-blur-sm">
      <div className="w-125 overflow-hidden rounded-[20px] bg-dark-alpha text-white shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="flex h-18 items-center justify-between bg-dark-alpha px-5">
          <h2 className="text-base font-normal">
            Change Password - {user.name}
          </h2>

          {!isSubmitting && (
            <button
              type="button"
              onClick={handleClose}
              className="grid size-9 cursor-pointer place-items-center rounded-lg text-[#69cbe3] hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50"
            >
              <X className="size-6" />
            </button>
          )}
        </div>

        <div className="space-y-4 px-5 pb-5 pt-4">
          <InlineAlert type="error" message={error} autoHide={false} />

          <div className="space-y-2">
            <label className="block text-sm font-normal text-contrast-grayout">
              New Password
            </label>
            <Input
              type="password"
              value={password}
              placeholder="At least 8 characters"
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              disabled={isSubmitting}
              className="h-[44px] rounded-lg bg-dark-alpha!"
              inputClassName="text-sm"
            />
            <p className="text-[11px] leading-4 text-contrast-grayout">
              {PASSWORD_REQUIREMENTS_TEXT}
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-normal text-contrast-grayout">
              Confirm New Password
            </label>
            <Input
              type="password"
              value={confirmPassword}
              placeholder="Re-enter the new password"
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError("");
              }}
              disabled={isSubmitting}
              className="h-[44px] rounded-lg bg-dark-alpha!"
              inputClassName="text-sm"
            />
          </div>
        </div>

        <div className="flex gap-4 border-t border-[#315263] px-6 py-6">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 rounded-xl border-accent-contrast! bg-transparent text-base font-normal tracking-[4px]"
          >
            CANCEL
          </Button>

          <Button
            variant="gold"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 rounded-xl text-base font-normal tracking-[4px]"
          >
            {isSubmitting ? "SAVING..." : "SAVE"}
          </Button>
        </div>
      </div>
    </div>
  );
}
