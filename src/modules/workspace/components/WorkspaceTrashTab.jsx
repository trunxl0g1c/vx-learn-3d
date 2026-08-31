import { lazy, Suspense, useEffect, useState } from "react";
import Input from "../../../components/ui/input";
import InlineAlert from "../../../components/ui/inline-alert";
import MaterialIcon from "../../../components/ui/material-icon";
import { useAlert } from "../../../components/dialog/AlertContext";
import { useDecryptedImageSrc } from "../../../hooks/useDecryptedImageSrc";
import {
  useDeletedContents,
  useRecoverContent,
  getContentThumbnailUrl,
} from "../../project-hub/api/contents";

const ConfirmationDialog = lazy(
  () => import("../../../components/dialog/ConfirmationDialog"),
);

const SEARCH_DEBOUNCE_MS = 300;

function DialogLoadingFallback() {
  return (
    <div className="fixed inset-0 z-[1090] grid place-items-center bg-black/45 p-4">
      <div className="rounded-xl border border-divider-main bg-dark px-5 py-4 text-sm text-white shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
        Opening dialog...
      </div>
    </div>
  );
}

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

function ContentAvatar({ title }) {
  const initial = (title || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-main text-sm font-semibold text-white">
      {initial}
    </div>
  );
}

function ContentThumbnail({ content }) {
  const [failed, setFailed] = useState(false);
  const rawThumbnailUrl = getContentThumbnailUrl(
    content.id,
    content.modifiedAt || content.updatedAt,
  );
  const thumbnailUrl = useDecryptedImageSrc(rawThumbnailUrl);
  const showThumbnail = Boolean(thumbnailUrl) && !failed;

  if (!showThumbnail) {
    return <ContentAvatar title={content.title} />;
  }

  return (
    <img
      src={thumbnailUrl}
      alt=""
      loading="lazy"
      decoding="async"
      className="size-9 shrink-0 rounded-lg bg-secondary-dark object-cover opacity-60"
      onError={() => setFailed(true)}
    />
  );
}

// Owner-only, both here (this tab is only ever rendered for the workspace
// owner — see WorkspaceDetailPage.jsx) and on the backend (GET
// /contents/deleted is gated the same way as recover()) — no extra
// permission plumbing needed inside this component itself.
export default function WorkspaceTrashTab({ workspaceId }) {
  const { showAlert } = useAlert();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: contents = [],
    isLoading,
    isError,
    error,
  } = useDeletedContents({ workspaceId, search: debouncedSearch || undefined });

  const [restoreTarget, setRestoreTarget] = useState(null);
  const recoverContent = useRecoverContent({
    onSuccess: () => setRestoreTarget(null),
    onError: (recoverError) => {
      showAlert({
        title: "Failed to restore content",
        message:
          recoverError?.response?.data?.message ||
          recoverError?.message ||
          "Could not restore this content.",
        type: "error",
      });
    },
  });

  return (
    <div className="space-y-5">
      <Input
        value={search}
        placeholder="Search deleted content"
        onChange={(event) => setSearch(event.target.value)}
        className="h-9! w-full! min-w-0 rounded-lg sm:max-w-[320px]"
        leftIcon={
          <MaterialIcon
            name="search"
            fill={1}
            size={24}
            className="text-secondary-default"
          />
        }
        inputClassName="min-w-0 text-sm italic"
      />

      <InlineAlert
        type="error"
        autoHide={false}
        message="Deleted content is permanently removed 2 days after deletion unless restored."
      />

      {isError && (
        <InlineAlert
          type="error"
          autoHide={false}
          message={
            error?.response?.data?.message || "Failed to load deleted content."
          }
        />
      )}

      <div className="overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-divider-main text-sm tracking-wide text-secondary-default">
                <th className="px-4 py-3 font-normal">Title</th>
                <th className="px-4 py-3 font-normal">Deleted At</th>
                <th className="px-4 py-3 font-normal" aria-label="Actions" />
              </tr>
            </thead>

            <tbody>
              {contents.map((content) => (
                <tr
                  key={content.id}
                  className="border-b-2 border-divider-main last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ContentThumbnail content={content} />
                      <span className="truncate font-medium text-contrast-grayout">
                        {content.title || "Untitled"}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-white">
                    {formatDate(content.deletedAt)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setRestoreTarget(content)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-accent-main transition bg-accent-main/10 hover:bg-accent-main/20"
                    >
                      <MaterialIcon name="restore" size={18} />
                      Restore
                    </button>
                  </td>
                </tr>
              ))}

              {!isLoading && !isError && contents.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-contrast-grayout"
                  >
                    Trash is empty
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {isLoading && (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-10 animate-pulse rounded-lg bg-white/5"
              />
            ))}
          </div>
        )}
      </div>

      {restoreTarget && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <ConfirmationDialog
            open
            title="Restore Content?"
            message={
              <>
                “{restoreTarget.title || "Untitled"}” will be restored and
                visible in this workspace's Content tab again.
              </>
            }
            confirmText="Restore"
            cancelText="Cancel"
            confirmVariant="default"
            isLoading={recoverContent.isPending}
            onClose={() => {
              if (!recoverContent.isPending) {
                setRestoreTarget(null);
              }
            }}
            onConfirm={() =>
              recoverContent.mutate({ id: restoreTarget.id })
            }
          />
        </Suspense>
      )}
    </div>
  );
}
