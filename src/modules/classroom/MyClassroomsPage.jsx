import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProjectHubLayout from "../project-hub/layouts/ProjectHubLayout";
import InlineAlert from "../../components/ui/inline-alert";
import MaterialIcon from "../../components/ui/material-icon";
import { useGlobalLoading } from "../loading/LoadingContext";
import { useAlert } from "../../components/dialog/AlertContext";
import { useMyClassroomContents, useMyClassrooms } from "./api/classrooms";
import { getContentThumbnailUrl } from "../project-hub/api/contents";
import { openContentInPlayer } from "../project-hub/openContentInPlayer";

function ContentThumbnail({ content }) {
  const [failed, setFailed] = useState(false);
  const thumbnailUrl = getContentThumbnailUrl(content.id, content.modifiedAt);
  const initial = (content.title || "?").trim().charAt(0).toUpperCase() || "?";

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

// Classroom members never get a real WorkspaceMember row, so this is their
// only entry point into content — always opens read-only in the Player,
// never the Editor (see openContentInPlayer).
export default function MyClassroomsPage() {
  const navigate = useNavigate();
  const { showLoading, updateLoading, hideLoading } = useGlobalLoading();
  const { showAlert } = useAlert();

  const {
    data: classrooms = [],
    isLoading: isLoadingClassrooms,
    isError: isClassroomsError,
    error: classroomsError,
  } = useMyClassrooms();

  const {
    data: contents = [],
    isLoading: isLoadingContents,
    isError: isContentsError,
    error: contentsError,
  } = useMyClassroomContents();

  async function handleOpenContent(row) {
    try {
      await openContentInPlayer({
        workspaceId: row.classroom?.workspaceId,
        contentId: row.content?.id,
        title: row.content?.title,
        showLoading,
        updateLoading,
        hideLoading,
        navigate,
      });
    } catch (error) {
      console.error("Failed to open classroom content:", error);
      showAlert({
        title: "Failed to open content",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Could not load this content.",
        type: "error",
      });
    }
  }

  const isLoading = isLoadingClassrooms || isLoadingContents;

  return (
    <ProjectHubLayout>
      <div className="space-y-5">
        <h1 className="text-lg font-medium text-white">My Classrooms</h1>

        {isClassroomsError && (
          <InlineAlert
            type="error"
            autoHide={false}
            message={
              classroomsError?.response?.data?.message ||
              "Failed to load your classrooms."
            }
          />
        )}

        {isContentsError && (
          <InlineAlert
            type="error"
            autoHide={false}
            message={
              contentsError?.response?.data?.message ||
              "Failed to load classroom content."
            }
          />
        )}

        {!isLoading && classrooms.length === 0 && (
          <div className="flex min-h-40 items-center justify-center rounded-lg border border-divider-main bg-dark text-sm text-contrast-grayout">
            You haven't been added to any classroom yet.
          </div>
        )}

        {classrooms.length > 0 && (
          <div className="overflow-hidden rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-divider-main text-sm tracking-wide text-secondary-default">
                    <th className="px-4 py-3 font-normal">Content</th>
                    <th className="px-4 py-3 font-normal">Classroom</th>
                    <th className="px-4 py-3 font-normal">Description</th>
                  </tr>
                </thead>

                <tbody>
                  {contents.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleOpenContent(row)}
                      className="cursor-pointer border-b border-divider-main last:border-b-0 hover:bg-white/5"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ContentThumbnail content={row.content || {}} />
                          <span className="truncate font-medium text-accent-contrast">
                            {row.content?.title || "Untitled"}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-white">
                        {row.classroom?.name || "—"}
                      </td>

                      <td className="px-4 py-3 text-white">
                        {row.content?.description || "—"}
                      </td>
                    </tr>
                  ))}

                  {!isLoading && contents.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-10 text-center text-contrast-grayout"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <MaterialIcon
                            name="school"
                            fill={1}
                            size={28}
                            className="text-secondary-default"
                          />
                          No content has been assigned to your classrooms yet.
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
        )}
      </div>
    </ProjectHubLayout>
  );
}
