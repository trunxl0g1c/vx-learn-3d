import { useMemo, useState } from "react";
import { CalendarClock, Pencil, X } from "lucide-react";
import Button from "../../../components/ui/button";
import Input from "../../../components/ui/input";
import InlineAlert from "../../../components/ui/inline-alert";
import SelectField from "../../../components/ui/select";
import MaterialIcon from "../../../components/ui/material-icon";
import { useWorkspaces } from "../api/workspaces";
import {
  useCreateContentPublic,
  useOutgoingContentPublic,
  useRevokeContentPublic,
  useUpdateContentPublic,
} from "../../content-public/api/contentPublic";

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

// ISO datetime -> the plain "YYYY-MM-DD" an <input type="date"> expects.
function toDateInputValue(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function ShareRow({ share, isBusy, onRevoke, onUpdateExpiry }) {
  const [isEditingExpiry, setIsEditingExpiry] = useState(false);
  const [expiryDraft, setExpiryDraft] = useState(toDateInputValue(share.expiredAt));

  return (
    <div className="rounded-lg border border-divider-main bg-primary px-3 py-2.5 transition hover:border-secondary-default/60">
      <div className="flex items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-main text-sm font-semibold text-white">
          {(share.workspace?.name || "?").trim().charAt(0).toUpperCase() || "?"}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {share.workspace?.name || "Unknown workspace"}
          </p>

          {!isEditingExpiry && (
            <p className="flex items-center gap-1 text-xs text-contrast-grayout">
              <CalendarClock className="size-3" />
              {share.expiredAt
                ? `Expires ${formatDate(share.expiredAt)}`
                : "Never expires"}
            </p>
          )}
        </div>

        {!isEditingExpiry && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              setExpiryDraft(toDateInputValue(share.expiredAt));
              setIsEditingExpiry(true);
            }}
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-secondary-default transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50"
            aria-label={`Edit expiry for ${share.workspace?.name || "share"}`}
            title="Edit expiry"
          >
            <Pencil className="size-4" />
          </button>
        )}

        {!isEditingExpiry && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onRevoke(share)}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-warning-main transition hover:bg-warning-main/10 disabled:pointer-events-none disabled:opacity-50"
          >
            Revoke
          </button>
        )}
      </div>

      {isEditingExpiry && (
        <div className="mt-2 flex items-center gap-2">
          <Input
            type="date"
            value={expiryDraft}
            onChange={(event) => setExpiryDraft(event.target.value)}
            disabled={isBusy}
            className="h-9! flex-1 rounded-lg"
            inputClassName="text-xs"
          />

          <Button
            variant="gold"
            size="sm"
            disabled={isBusy}
            onClick={() => {
              onUpdateExpiry(share, expiryDraft || null);
              setIsEditingExpiry(false);
            }}
            className="shrink-0 rounded-lg px-3"
          >
            Save
          </Button>

          <button
            type="button"
            disabled={isBusy}
            onClick={() => setIsEditingExpiry(false)}
            className="shrink-0 rounded-lg px-2 py-1.5 text-xs text-contrast-grayout transition hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default function ShareContentDialog({ open, workspaceId, content, onClose }) {
  const [targetWorkspaceId, setTargetWorkspaceId] = useState("");
  const [expiredAt, setExpiredAt] = useState("");
  const [error, setError] = useState("");

  const { data: workspaces = [] } = useWorkspaces(undefined, { enabled: open });
  const {
    data: shares = [],
    isLoading: isLoadingShares,
  } = useOutgoingContentPublic(content?.id, { enabled: open });

  const createShare = useCreateContentPublic({
    onSuccess: () => {
      setTargetWorkspaceId("");
      setExpiredAt("");
    },
    onError: (mutationError) => {
      setError(
        mutationError?.response?.data?.message ||
          "Failed to share this content.",
      );
    },
  });
  const updateShare = useUpdateContentPublic({
    onError: (mutationError) => {
      setError(
        mutationError?.response?.data?.message ||
          "Failed to update this share's expiry.",
      );
    },
  });
  const revokeShare = useRevokeContentPublic({
    onError: (mutationError) => {
      setError(
        mutationError?.response?.data?.message ||
          "Failed to revoke this share.",
      );
    },
  });

  const targetOptions = useMemo(
    () =>
      workspaces
        .filter((workspace) => workspace.id !== workspaceId)
        .map((workspace) => ({ label: workspace.name, value: workspace.id })),
    [workspaces, workspaceId],
  );

  if (!open || !content) return null;

  const isPublished = content.status === "PUBLISHED";
  const isPublic = content.visibility === "PUBLIC";
  const canShare = isPublished && isPublic;
  const isBusy = createShare.isPending || revokeShare.isPending || updateShare.isPending;

  function handleShare() {
    setError("");

    if (!targetWorkspaceId) {
      setError("Select a workspace to share with.");
      return;
    }

    createShare.mutate({
      contentId: content.id,
      targetWorkspaceId,
      expiredAt: expiredAt || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-999 grid place-items-center bg-black/45 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-[20px] bg-dark-alpha text-white shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="flex h-18 items-center justify-between bg-dark-alpha px-6">
          <div className="flex items-center gap-3">
            <MaterialIcon name="share" fill={1} size={22} className="text-accent-main" />
            <h2 className="text-base font-normal">
              Share &ldquo;{content.title || "Untitled"}&rdquo;
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid size-9 cursor-pointer place-items-center rounded-lg text-[#69cbe3] hover:bg-white/5"
          >
            <X className="size-6" />
          </button>
        </div>

        <div className="space-y-6 px-6 pb-6 pt-4">
          <InlineAlert type="error" message={error} autoHide={false} />

          {!canShare && (
            <InlineAlert
              type="warning"
              autoHide={false}
              message={
                !isPublished
                  ? "This content must be Published before it can be shared — publish it from the editor's top bar first."
                  : "This content must be marked Public in Project Settings before it can be shared."
              }
            />
          )}

          <div className="space-y-2 rounded-lg border border-divider-main p-4">
            <label className="block text-sm font-normal text-contrast-grayout">
              Share with Workspace
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px]">
              <SelectField
                value={targetWorkspaceId}
                onChange={setTargetWorkspaceId}
                options={targetOptions}
                placeholder="Select a workspace"
                disabled={!canShare || isBusy}
                className="h-11! rounded-lg border-accent-main!"
              />

              <Input
                type="date"
                value={expiredAt}
                onChange={(event) => setExpiredAt(event.target.value)}
                disabled={!canShare || isBusy}
                className="h-11! rounded-lg"
                inputClassName="text-sm"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-xs text-contrast-grayout">
                Leave the expiry date empty to share indefinitely.
              </p>

              <Button
                variant="gold"
                size="sm"
                onClick={handleShare}
                disabled={!canShare || isBusy}
                className="shrink-0 rounded-lg px-5"
              >
                Share
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-normal text-contrast-grayout">
              Shared With ({shares.length})
            </label>

            <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg bg-primary p-2">
              {!isLoadingShares && shares.length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-contrast-grayout">
                  Not shared with any workspace yet.
                </p>
              )}

              {shares.map((share) => (
                <ShareRow
                  key={share.id}
                  share={share}
                  isBusy={isBusy}
                  onRevoke={(target) => {
                    setError("");
                    revokeShare.mutate({ id: target.id });
                  }}
                  onUpdateExpiry={(target, nextExpiredAt) => {
                    setError("");
                    updateShare.mutate({ id: target.id, expiredAt: nextExpiredAt });
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-4 border-t border-[#315263] px-6 py-6">
          <Button
            variant="gold"
            onClick={onClose}
            className="flex-1 rounded-xl text-base font-normal tracking-[4px]"
          >
            DONE
          </Button>
        </div>
      </div>
    </div>
  );
}
