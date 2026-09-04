import { Loader2, Lock, X } from "lucide-react";
import Button from "../../../components/ui/button";
import Input from "../../../components/ui/input";
import InlineAlert from "../../../components/ui/inline-alert";
import SelectField from "../../../components/ui/select";
import { useWorkspaces } from "../../workspace/api/workspaces";

export default function ImportProjectDialog({
  open,
  fileName,
  isEncrypted,
  workspaceId,
  setWorkspaceId,
  password,
  setPassword,
  isSubmitting,
  error,
  onClearError,
  onCancel,
  onSubmit,
}) {
  const {
    data: workspaces = [],
    isLoading: isLoadingWorkspaces,
    isError: isWorkspacesError,
  } = useWorkspaces(undefined, { enabled: open });

  if (!open) return null;

  const workspaceOptions = workspaces.map((workspace) => ({
    label: workspace.name,
    value: workspace.id,
  }));

  let workspacePlaceholder = "Select a workspace";
  if (isWorkspacesError) workspacePlaceholder = "Failed to load workspaces";
  else if (isLoadingWorkspaces) workspacePlaceholder = "Loading workspaces...";

  return (
    <div className="fixed inset-0 z-999 grid place-items-center bg-black/45 backdrop-blur-sm">
      <div className="w-125 overflow-hidden rounded-[20px] bg-dark-alpha text-white shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="flex h-18 items-center justify-between bg-dark-alpha px-5">
          <h2 className="text-base font-normal">Import Project</h2>

          {!isSubmitting && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="grid size-9 cursor-pointer place-items-center rounded-lg text-[#69cbe3] hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50"
            >
              <X className="size-6" />
            </button>
          )}
        </div>

        <div className="space-y-6 px-5 pb-5 pt-4">
          <p className="truncate text-sm text-contrast-grayout">
            {fileName || "This package"} will be imported as a new project.
          </p>

          <InlineAlert type="error" message={error} autoHide={false} />

          <div className="space-y-2">
            <label className="block text-sm font-normal text-contrast-grayout">
              Workspace
            </label>

            <SelectField
              value={workspaceId || ""}
              onChange={(value) => {
                setWorkspaceId(value);
                onClearError?.();
              }}
              options={workspaceOptions}
              placeholder={workspacePlaceholder}
              disabled={
                isSubmitting || isLoadingWorkspaces || isWorkspacesError
              }
              className="h-11! rounded-lg border-accent-main!"
            />
          </div>

          {isEncrypted && (
            <div className="space-y-2">
              <label className="block text-sm font-normal text-contrast-grayout">
                Password
              </label>

              <Input
                type="password"
                value={password}
                maxLength={128}
                placeholder="Enter the package password"
                leftIcon={<Lock className="size-4.5" />}
                autoFocus
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => {
                  setPassword(event.target.value);
                  onClearError?.();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !isSubmitting) {
                    onSubmit?.();
                  }
                }}
                disabled={isSubmitting}
                className="h-[44px] rounded-lg bg-dark-alpha!"
                inputClassName="text-sm italic"
              />
            </div>
          )}

          <InlineAlert
            type="info"
            autoHide={false}
            message="The project is saved to this browser first, then uploaded to the selected workspace — it stays usable even if the workspace upload fails partway through."
          />
        </div>

        <div className="flex gap-4 border-t border-[#315263] px-6 py-6">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 rounded-xl border-accent-contrast! bg-transparent text-base font-normal tracking-[4px]"
          >
            CANCEL
          </Button>

          <Button
            variant="gold"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="flex-1 rounded-xl text-base font-normal tracking-[4px]"
          >
            {isSubmitting ? (
              <Loader2 className="mx-auto size-5 animate-spin" />
            ) : (
              "IMPORT"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
