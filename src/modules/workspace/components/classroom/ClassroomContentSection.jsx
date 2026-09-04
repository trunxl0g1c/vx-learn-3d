import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import Input from "../../../../components/ui/input";
import InlineAlert from "../../../../components/ui/inline-alert";
import MaterialIcon from "../../../../components/ui/material-icon";
import { useContents } from "../../../project-hub/api/contents";
import {
  useAddClassroomContent,
  useClassroomContents,
  useRemoveClassroomContent,
} from "../../../classroom/api/classrooms";

const CONTENT_PAGE_SIZE = 200;

// Same "current on the left, candidates to add on the right" shape as
// ClassroomMembersSection, so managing what a classroom can see follows one
// consistent pattern whether it's who's in it or what's in it — instead of
// members living in this tab but content assignment only reachable from a
// content row's own context menu on a completely different tab
// (AssignToClassroomDialog, still there for that entry point too).
export default function ClassroomContentSection({ classroom, canManage }) {
  const [currentSearch, setCurrentSearch] = useState("");
  const [addSearch, setAddSearch] = useState("");
  const [error, setError] = useState("");

  const {
    data: assignedContent = [],
    isLoading,
    isError,
    error: loadError,
  } = useClassroomContents(classroom.id);

  const { data: workspaceContent = [] } = useContents({
    workspaceId: classroom.workspaceId,
    pageSize: CONTENT_PAGE_SIZE,
  });

  const addContent = useAddClassroomContent({
    onError: (mutationError) => {
      setError(
        mutationError?.response?.data?.message ||
          "Failed to assign content to the classroom.",
      );
    },
  });
  const removeContent = useRemoveClassroomContent({
    onError: (mutationError) => {
      setError(
        mutationError?.response?.data?.message ||
          "Failed to remove content from the classroom.",
      );
    },
  });

  const assignedContentIds = useMemo(
    () => new Set(assignedContent.map((row) => row.contentId)),
    [assignedContent],
  );

  const filteredAssignedContent = useMemo(() => {
    const query = currentSearch.trim().toLowerCase();
    if (!query) return assignedContent;

    return assignedContent.filter((row) =>
      (row.content?.title || "").toLowerCase().includes(query),
    );
  }, [assignedContent, currentSearch]);

  const candidateContent = useMemo(() => {
    const query = addSearch.trim().toLowerCase();

    return workspaceContent.filter((content) => {
      if (content.status !== "PUBLISHED") return false;
      if (assignedContentIds.has(content.id)) return false;
      if (!query) return true;

      return (content.title || "").toLowerCase().includes(query);
    });
  }, [workspaceContent, assignedContentIds, addSearch]);

  const isBusy = addContent.isPending || removeContent.isPending;

  if (!canManage) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-normal text-contrast-grayout">
          {assignedContent.length} content item
          {assignedContent.length === 1 ? "" : "s"} in this classroom
        </p>
        <div className="max-h-[26rem] space-y-1 overflow-y-auto rounded-lg bg-primary p-2">
          {assignedContent.map((row) => (
            <div key={row.id} className="rounded-lg px-2 py-2 text-sm text-white">
              {row.content?.title || "Untitled"}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <InlineAlert type="error" message={error} autoHide={false} />
      {isError && (
        <InlineAlert
          type="error"
          autoHide={false}
          message={
            loadError?.response?.data?.message ||
            "Failed to load classroom content."
          }
        />
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="flex min-h-0 flex-col space-y-2">
          <label className="block text-sm font-normal text-contrast-grayout">
            Assigned Content ({assignedContent.length})
          </label>

          <Input
            value={currentSearch}
            placeholder="Search assigned content"
            onChange={(event) => setCurrentSearch(event.target.value)}
            className="h-[42px] rounded-lg bg-dark-alpha!"
            inputClassName="text-sm"
            leftIcon={
              <MaterialIcon
                name="search"
                fill={1}
                size={20}
                className="text-secondary-default"
              />
            }
          />

          <div className="max-h-[22rem] min-h-[12rem] space-y-1 overflow-y-auto rounded-lg bg-primary p-2">
            {!isLoading && filteredAssignedContent.length === 0 && (
              <p className="px-2 py-6 text-center text-xs text-contrast-grayout">
                {assignedContent.length === 0
                  ? "No content assigned yet — add published content from the right."
                  : "No content matches your search."}
              </p>
            )}

            {filteredAssignedContent.map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5"
              >
                <MaterialIcon
                  name="deployed_code"
                  size={18}
                  className="shrink-0 text-secondary-default"
                />
                <span className="min-w-0 flex-1 truncate text-sm text-white">
                  {row.content?.title || "Untitled"}
                </span>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    setError("");
                    removeContent.mutate({
                      classroomId: classroom.id,
                      contentId: row.contentId,
                    });
                  }}
                  className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-contrast-grayout transition hover:bg-warning-main/10 hover:text-warning-main disabled:pointer-events-none disabled:opacity-50"
                  aria-label={`Remove ${row.content?.title || "content"}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-col space-y-2">
          <label className="block text-sm font-normal text-contrast-grayout">
            Add Published Content
          </label>

          <Input
            value={addSearch}
            placeholder="Search published content"
            onChange={(event) => setAddSearch(event.target.value)}
            disabled={isBusy}
            className="h-[42px] rounded-lg bg-dark-alpha!"
            inputClassName="text-sm"
            leftIcon={
              <MaterialIcon
                name="search"
                fill={1}
                size={20}
                className="text-secondary-default"
              />
            }
          />

          <div className="max-h-[22rem] min-h-[12rem] space-y-1 overflow-y-auto rounded-lg bg-primary p-2">
            {candidateContent.length === 0 && (
              <p className="px-2 py-6 text-center text-xs text-contrast-grayout">
                No matching published content to add — content must be
                published from the editor first.
              </p>
            )}

            {candidateContent.map((content) => (
              <button
                key={content.id}
                type="button"
                disabled={isBusy}
                onClick={() => {
                  setError("");
                  addContent.mutate({
                    classroomId: classroom.id,
                    contentId: content.id,
                  });
                }}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50"
              >
                <MaterialIcon
                  name="deployed_code"
                  size={18}
                  className="shrink-0 text-secondary-default"
                />
                <span className="min-w-0 flex-1 truncate text-sm text-white">
                  {content.title || "Untitled"}
                </span>
                <MaterialIcon name="add" size={18} className="text-accent-main" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
