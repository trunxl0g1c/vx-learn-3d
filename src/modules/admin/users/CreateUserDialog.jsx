import { useState } from "react";
import { X } from "lucide-react";
import Button from "../../../components/ui/button";
import Input from "../../../components/ui/input";
import InlineAlert from "../../../components/ui/inline-alert";
import SelectField from "../../../components/ui/select";
import { useCreateUserWithWorkspace } from "../../workspace/api/users";
import { useWorkspaces } from "../../workspace/api/workspaces";
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_REQUIREMENTS_TEXT,
  SAFE_LABEL_MAX_LENGTH,
  SAFE_LABEL_REGEX,
  SAFE_LABEL_REGEX_MESSAGE,
  isValidEmail,
  validatePasswordComplexity,
  validateRequiredText,
} from "../../../utils/validation";

const WORKSPACE_ROLE_OPTIONS = [
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

export default function CreateUserDialog({ open, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [roleInWorkspace, setRoleInWorkspace] = useState("editor");
  const [error, setError] = useState("");

  const { data: workspaces = [], isLoading: isLoadingWorkspaces } =
    useWorkspaces({ pageSize: 100 }, { enabled: open });

  const createUser = useCreateUserWithWorkspace({
    onSuccess: (user) => onCreated?.(user),
    onError: (mutationError) => {
      setError(
        mutationError?.response?.data?.message ||
          "Error encountered while creating user.",
      );
    },
  });

  if (!open) return null;

  const isSubmitting = createUser.isPending;
  const workspaceOptions = workspaces.map((workspace) => ({
    value: workspace.id,
    label: workspace.name,
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

    const sanitizedEmail = email.trim().slice(0, EMAIL_MAX_LENGTH);
    if (!isValidEmail(sanitizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    const { valid: passwordValid, reasons } =
      validatePasswordComplexity(password);
    if (!passwordValid) {
      setError(`Password must have ${reasons.join(", ")}.`);
      return;
    }

    if (!workspaceId) {
      setError("Select a workspace to add this user to.");
      return;
    }

    createUser.mutate({
      name: sanitizedName,
      email: sanitizedEmail,
      password,
      workspaceId,
      roleInWorkspace,
    });
  }

  return (
    <div className="fixed inset-0 z-999 grid place-items-center bg-black/45 backdrop-blur-sm">
      <div className="w-125 overflow-hidden rounded-[20px] bg-dark-alpha text-white shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="flex h-18 items-center justify-between bg-dark-alpha px-5">
          <h2 className="text-base font-normal">Create User</h2>

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
              type="email"
              value={email}
              maxLength={EMAIL_MAX_LENGTH}
              placeholder="user@example.com"
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              disabled={isSubmitting}
              className="h-[44px] rounded-lg bg-dark-alpha!"
              inputClassName="text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-normal text-contrast-grayout">
              Password
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
              Workspace
            </label>
            <SelectField
              value={workspaceId}
              onChange={(value) => {
                setWorkspaceId(value);
                setError("");
              }}
              options={workspaceOptions}
              placeholder={
                isLoadingWorkspaces ? "Loading workspaces…" : "Select workspace"
              }
              disabled={isSubmitting || isLoadingWorkspaces}
              className="h-11! rounded-lg border-secondary-default!"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-normal text-contrast-grayout">
              Role in workspace
            </label>
            <SelectField
              value={roleInWorkspace}
              onChange={setRoleInWorkspace}
              options={WORKSPACE_ROLE_OPTIONS}
              disabled={isSubmitting}
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
            {isSubmitting ? "CREATING..." : "SUBMIT"}
          </Button>
        </div>
      </div>
    </div>
  );
}
