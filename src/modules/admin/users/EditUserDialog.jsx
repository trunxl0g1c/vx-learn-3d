import { useState } from "react";
import { X } from "lucide-react";
import Button from "../../../components/ui/button";
import Input from "../../../components/ui/input";
import InlineAlert from "../../../components/ui/inline-alert";
import SelectField from "../../../components/ui/select";
import { useUpdateUser, useUserRoles } from "../../workspace/api/users";
import {
  SAFE_LABEL_MAX_LENGTH,
  SAFE_LABEL_REGEX,
  SAFE_LABEL_REGEX_MESSAGE,
  validateRequiredText,
} from "../../../utils/validation";

export default function EditUserDialog({ open, user, onClose, onUpdated }) {
  const [name, setName] = useState(user?.name || "");
  const [roleId, setRoleId] = useState(user?.role?.id || "");
  const [error, setError] = useState("");

  const { data: roles = [], isLoading: isLoadingRoles } = useUserRoles({
    enabled: open,
  });

  const updateUser = useUpdateUser({
    onSuccess: (updated) => onUpdated?.(updated),
    onError: (mutationError) => {
      setError(
        mutationError?.response?.data?.message ||
          "Error encountered while updating user.",
      );
    },
  });

  if (!open || !user) return null;

  const isSubmitting = updateUser.isPending;
  const roleOptions = roles.map((role) => ({
    value: role.id,
    label: role.name,
  }));

  function handleClose() {
    if (isSubmitting) return;

    onClose?.();
  }

  function handleSubmit() {
    setError("");

    const { value: sanitizedName, error: nameError } = validateRequiredText(
      name,
      {
        fieldLabel: "Name",
        maxLength: SAFE_LABEL_MAX_LENGTH,
        pattern: SAFE_LABEL_REGEX,
        patternMessage: SAFE_LABEL_REGEX_MESSAGE,
      },
    );
    if (nameError) {
      setError(nameError);
      return;
    }

    if (!roleId) {
      setError("Select a role for this user.");
      return;
    }

    updateUser.mutate({ id: user.id, name: sanitizedName, roleId });
  }

  return (
    <div className="fixed inset-0 z-999 grid place-items-center bg-black/45 backdrop-blur-sm">
      <div className="w-125 overflow-hidden rounded-[20px] bg-dark-alpha text-white shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="flex h-18 items-center justify-between bg-dark-alpha px-5">
          <h2 className="text-base font-normal">Edit User</h2>

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
              Name
            </label>
            <Input
              value={name}
              maxLength={SAFE_LABEL_MAX_LENGTH}
              placeholder="e.g. Jane Doe"
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              disabled={isSubmitting}
              className="h-[44px] rounded-lg bg-dark-alpha!"
              inputClassName="text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-normal text-contrast-grayout">
              Email
            </label>
            <Input
              value={user.email || ""}
              disabled
              className="h-[44px] rounded-lg bg-dark-alpha!"
              inputClassName="text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-normal text-contrast-grayout">
              Role
            </label>
            <SelectField
              value={roleId}
              onChange={(value) => {
                setRoleId(value);
                setError("");
              }}
              options={roleOptions}
              placeholder={isLoadingRoles ? "Loading roles…" : "Select role"}
              disabled={isSubmitting || isLoadingRoles}
              className="h-11! rounded-lg border-secondary-default!"
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
