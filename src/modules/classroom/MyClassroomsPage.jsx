import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProjectHubLayout from "../project-hub/layouts/ProjectHubLayout";
import InlineAlert from "../../components/ui/inline-alert";
import MaterialIcon from "../../components/ui/material-icon";
import { useGlobalLoading } from "../loading/LoadingContext";
import { useAlert } from "../../components/dialog/AlertContext";
import { useDecryptedImageSrc } from "../../hooks/useDecryptedImageSrc";
import { useMyClassroomContents, useMyClassrooms } from "./api/classrooms";
import { getContentThumbnailUrl } from "../project-hub/api/contents";
import { openContentInPlayer } from "../project-hub/openContentInPlayer";

function ContentThumbnail({ content }) {
  const [failed, setFailed] = useState(false);
  const rawThumbnailUrl = getContentThumbnailUrl(content.id, content.modifiedAt);
  const thumbnailUrl = useDecryptedImageSrc(rawThumbnailUrl);
  const initial = (content.title || "?").trim().charAt(0).toUpperCase() || "?";

  if (!thumbnailUrl || failed) {
    return (
      <div className="grid h-full w-full place-items-center bg-secondary-dark text-2xl font-semibold text-white">
        {initial}
      </div>
    );
  }

  return (
    <img
      src={thumbnailUrl}
      alt=""
      loading="lazy"
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function ClassroomContentCard({ row, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group min-h-[190px] w-full cursor-pointer overflow-hidden rounded-lg border border-secondary-dark bg-dark text-left transition hover:border-accent-main hover:bg-white/5"
    >
      <div className="h-[128px] w-full overflow-hidden">
        <ContentThumbnail content={row.content || {}} />
      </div>

      <div className="flex min-h-[62px] items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-[500] leading-4 text-white">
            {row.content?.title || "Untitled"}
          </h3>
          {row.content?.description && (
            <p className="mt-1 truncate text-[11px] font-normal text-contrast-grayout">
              {row.content.description}
            </p>
          )}
        </div>

        <div className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-main text-primary">
          <MaterialIcon name="play_arrow" size={20} />
        </div>
      </div>
    </button>
  );
}

// Classroom members never get a real WorkspaceMember row, so this is their
// only entry point into content — always opens read-only in the Player,
// never the Editor (see openContentInPlayer).
//
// Laid out as classroom list (left) + that classroom's content as a card
// grid (right), the same master-detail shape WorkspaceClassroomTab now uses
// on the admin side — a member browsing several classrooms sees the same
// "pick a classroom on the left, its stuff shows on the right" pattern an
// admin managing those classrooms does, instead of one flat table that
// repeats the classroom name on every single row.
export default function MyClassroomsPage() {
  const navigate = useNavigate();
  const { showLoading, updateLoading, hideLoading } = useGlobalLoading();
  const { showAlert } = useAlert();
  const [selectedClassroomId, setSelectedClassroomId] = useState(null);

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

  const contentCountByClassroomId = useMemo(() => {
    const counts = new Map();
    contents.forEach((row) => {
      const id = row.classroomId;
      counts.set(id, (counts.get(id) || 0) + 1);
    });
    return counts;
  }, [contents]);

  // Derived, not stored: defaults to the first classroom once the list
  // loads, or falls back to it again if the previously-selected one drops
  // out of the list (e.g. membership changed) — without an effect+setState
  // round trip just to pick an initial value.
  const effectiveSelectedId = classrooms.some(
    (room) => room.id === selectedClassroomId,
  )
    ? selectedClassroomId
    : classrooms[0]?.id ?? null;

  const selectedClassroom = classrooms.find(
    (room) => room.id === effectiveSelectedId,
  );
  const selectedContents = contents.filter(
    (row) => row.classroomId === effectiveSelectedId,
  );

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
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
            <div className="max-h-[65vh] overflow-y-auto rounded-lg border border-divider-main">
              {isLoading && (
                <div className="space-y-2 p-2">
                  {[0, 1, 2].map((index) => (
                    <div
                      key={index}
                      className="h-14 animate-pulse rounded-lg bg-white/5"
                    />
                  ))}
                </div>
              )}

              <div className="divide-y divide-divider-main">
                {classrooms.map((classroom) => {
                  const isSelected = classroom.id === effectiveSelectedId;

                  return (
                    <button
                      key={classroom.id}
                      type="button"
                      onClick={() => setSelectedClassroomId(classroom.id)}
                      className={[
                        "flex w-full min-w-0 cursor-pointer flex-col gap-1 px-3 py-2.5 text-left transition",
                        isSelected ? "bg-accent-main/15" : "hover:bg-white/5",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "truncate text-sm font-medium",
                          isSelected ? "text-white" : "text-accent-contrast",
                        ].join(" ")}
                      >
                        {classroom.name}
                      </span>
                      <span className="flex items-center gap-3 text-xs text-contrast-grayout">
                        <span className="truncate">
                          {classroom.workspace?.name || "Workspace"}
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          <MaterialIcon name="deployed_code" size={14} />
                          {contentCountByClassroomId.get(classroom.id) || 0}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-w-0">
              {selectedContents.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-divider-main text-center text-sm text-contrast-grayout">
                  <MaterialIcon
                    name="school"
                    fill={1}
                    size={28}
                    className="text-secondary-default"
                  />
                  {selectedClassroom
                    ? `No content has been assigned to "${selectedClassroom.name}" yet.`
                    : "Select a classroom to see its content."}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                  {selectedContents.map((row) => (
                    <ClassroomContentCard
                      key={row.id}
                      row={row}
                      onOpen={() => handleOpenContent(row)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ProjectHubLayout>
  );
}
