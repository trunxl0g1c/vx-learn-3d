import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProjectHubLayout from "../project-hub/layouts/ProjectHubLayout";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import InlineAlert from "../../components/ui/inline-alert";
import MaterialIcon from "../../components/ui/material-icon";
import { useAuth } from "../auth/AuthContext";
import { useLogout } from "../auth/api/logout";
import { useUpdateProfile } from "./api/profile";
import {
  SAFE_LABEL_MAX_LENGTH,
  SAFE_LABEL_REGEX,
  SAFE_LABEL_REGEX_MESSAGE,
  validateRequiredText,
} from "../../utils/validation";

const NAME_MAX_LENGTH = SAFE_LABEL_MAX_LENGTH;

function formatPermissionLabel(permission) {
  const [resource, action] = permission.split(":");

  if (!action) return permission;

  return `${resource} · ${action}`;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setSession } = useAuth();

  // Stays undefined until the user edits the field, so the input tracks the
  // logged-in user without needing an effect to keep it in sync.
  const [draftName, setDraftName] = useState(undefined);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const name = draftName ?? user?.name ?? "";
  const isDirty = draftName !== undefined && draftName.trim() !== (user?.name ?? "");

  const updateProfile = useUpdateProfile({
    onSuccess: (updatedUser) => {
      setSession(updatedUser);
      setDraftName(undefined);
      setSuccessMessage("Profile updated successfully.");
    },
    onError: (mutationError) => {
      setError(
        mutationError?.response?.data?.message ||
          "Error encountered while updating profile.",
      );
    },
  });

  const logoutMutation = useLogout({
    onSuccess: () => {
      setSession(null);
      navigate("/login", { replace: true });
    },
    onError: () => {
      setSession(null);
      navigate("/login", { replace: true });
    },
  });

  function handleSubmit() {
    setError("");
    setSuccessMessage("");

    const { value: sanitizedName, error: nameError } = validateRequiredText(
      name,
      {
        fieldLabel: "Name",
        maxLength: NAME_MAX_LENGTH,
        pattern: SAFE_LABEL_REGEX,
        patternMessage: SAFE_LABEL_REGEX_MESSAGE,
      },
    );

    if (nameError) {
      setError(nameError);
      return;
    }

    updateProfile.mutate({ name: sanitizedName });
  }

  const isSaving = updateProfile.isPending;
  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();
  const permissions = user?.permissions || [];

  return (
    <ProjectHubLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-medium text-white">Profile</h1>
          <p className="mt-1 text-sm text-contrast-grayout">
            Manage your account information.
          </p>
        </div>

        <div className="max-w-lg space-y-6">
          <div className="flex items-center gap-4 rounded-xl border border-divider-main bg-dark px-5 py-5">
            <div className="grid size-16 shrink-0 place-items-center rounded-full bg-accent-main text-2xl font-semibold text-white">
              {initial}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-medium text-white">
                {user?.name || "Unnamed User"}
              </p>
              <p className="truncate text-sm text-secondary-default">
                {user?.email}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="shrink-0 gap-2 border-white/30"
            >
              <MaterialIcon name="logout" size={18} />
              <span className="hidden sm:inline">
                {logoutMutation.isPending ? "Logging out..." : "Log out"}
              </span>
            </Button>
          </div>

          <InlineAlert type="error" message={error} autoHide={false} />
          <InlineAlert type="success" message={successMessage} />

          <div className="space-y-2">
            <label className="block text-sm font-normal text-contrast-grayout">
              Name
            </label>

            <div className="relative">
              <Input
                value={name}
                maxLength={NAME_MAX_LENGTH}
                placeholder="Your name"
                onChange={(event) => {
                  setDraftName(event.target.value);
                  setError("");
                  setSuccessMessage("");
                }}
                disabled={isSaving}
                className={[
                  "h-[44px] rounded-lg bg-dark-alpha!",
                  error ? "border-warning-main!" : "",
                ].join(" ")}
                inputClassName="text-sm"
              />

              <span className="absolute bottom-2 right-3 text-[9px] font-normal text-contrast-grayout">
                {name.length}/{NAME_MAX_LENGTH}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-normal text-contrast-grayout">
              Email
            </label>

            <Input
              value={user?.email || ""}
              disabled
              readOnly
              className="h-[44px] rounded-lg bg-dark-alpha! opacity-60"
              inputClassName="text-sm"
            />
          </div>

          <Button
            variant="gold"
            onClick={handleSubmit}
            disabled={isSaving || !isDirty}
            className="rounded-xl text-sm font-normal w-44 tracking-widest"
          >
            {isSaving ? "SAVING..." : "SAVE"}
          </Button>

          {permissions.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-normal text-contrast-grayout">
                Access &amp; Permissions
              </label>

              <div className="flex flex-wrap gap-2">
                {permissions.map((permission) => (
                  <span
                    key={permission}
                    className="rounded-full border border-grayout-dark bg-dark-alpha px-3 py-1 text-xs capitalize text-secondary-default"
                  >
                    {formatPermissionLabel(permission)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProjectHubLayout>
  );
}
