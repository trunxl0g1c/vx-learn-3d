import { useState } from "react";
import { useNavigate } from "react-router-dom";
import InlineAlert from "../../../components/ui/inline-alert";
import MaterialIcon from "../../../components/ui/material-icon";
import { useGlobalLoading } from "../../loading/LoadingContext";
import { useAlert } from "../../../components/dialog/AlertContext";
import { useIncomingContentPublic } from "../../content-public/api/contentPublic";
import { getContentThumbnailUrl } from "../../project-hub/api/contents";
import { openContentInPlayer } from "../../project-hub/openContentInPlayer";

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

function ContentThumbnail({ content }) {
  const [failed, setFailed] = useState(false);
  const thumbnailUrl = getContentThumbnailUrl(content?.id, content?.modifiedAt);
  const initial = (content?.title || "?").trim().charAt(0).toUpperCase() || "?";

  if (!thumbnailUrl || failed) {
    return (
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-main text-sm font-semibold text-white">
        {initial}
      </div>
    );
  }

  return (
    <img
      src={thumbnailUrl}
      alt=""
      loading="lazy"
      className="size-9 shrink-0 rounded-lg bg-secondary-dark object-cover"
      onError={() => setFailed(true)}
    />
  );
}

// Content shared *to* this workspace by another workspace — always
// read-only (see content-access.service.ts's assertCanViewContent), so
// opening a row always goes to the Player, never the Editor.
export default function WorkspaceContentPublicTab({ workspaceId }) {
  const navigate = useNavigate();
  const { showLoading, updateLoading, hideLoading } = useGlobalLoading();
  const { showAlert } = useAlert();

  const {
    data: shares = [],
    isLoading,
    isError,
    error,
  } = useIncomingContentPublic(workspaceId);

  async function handleOpen(share) {
    try {
      await openContentInPlayer({
        workspaceId: share.content?.workspaceId,
        contentId: share.content?.id,
        title: share.content?.title,
        showLoading,
        updateLoading,
        hideLoading,
        navigate,
      });
    } catch (openError) {
      console.error("Failed to open shared content:", openError);
      showAlert({
        title: "Failed to open content",
        message:
          openError?.response?.data?.message ||
          openError?.message ||
          "Could not load this content.",
        type: "error",
      });
    }
  }

  return (
    <div className="space-y-5">
      {isError && (
        <InlineAlert
          type="error"
          autoHide={false}
          message={
            error?.response?.data?.message ||
            "Failed to load content shared with this workspace."
          }
        />
      )}

      <div className="overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-divider-main text-sm tracking-wide text-secondary-default">
                <th className="px-4 py-3 font-normal">Content</th>
                <th className="px-4 py-3 font-normal">Shared By</th>
                <th className="px-4 py-3 font-normal">Expires</th>
              </tr>
            </thead>

            <tbody>
              {shares.map((share) => (
                <tr
                  key={share.id}
                  onClick={() => handleOpen(share)}
                  className="cursor-pointer border-b border-divider-main last:border-b-0 hover:bg-white/5"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ContentThumbnail content={share.content} />
                      <span className="truncate font-medium text-accent-contrast">
                        {share.content?.title || "Untitled"}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-white">
                    {share.content?.workspace?.name || "Unknown workspace"}
                  </td>

                  <td className="px-4 py-3 text-white">
                    {share.expiredAt ? formatDate(share.expiredAt) : "Never"}
                  </td>
                </tr>
              ))}

              {!isLoading && !isError && shares.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-contrast-grayout"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <MaterialIcon
                        name="share"
                        fill={1}
                        size={28}
                        className="text-secondary-default"
                      />
                      No content has been shared with this workspace yet.
                    </div>
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
    </div>
  );
}
