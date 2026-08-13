import { useMemo, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import Button from "../../../components/ui/button";
import InlineAlert from "../../../components/ui/inline-alert";
import Switch from "../../../components/ui/switch";
import {
  addClassroomContentRequest,
  listClassroomContentsRequest,
  removeClassroomContentRequest,
  useClassrooms,
} from "../../classroom/api/classrooms";

export default function AssignToClassroomDialog({ open, workspaceId, content, onClose }) {
  const { data: classrooms = [], isLoading: isLoadingClassrooms } = useClassrooms({
    workspaceId,
  });
  const queryClient = useQueryClient();

  const [pendingIds, setPendingIds] = useState(() => new Set());
  const [error, setError] = useState("");

  // No single "which classrooms is this content in" endpoint — classrooms
  // per workspace are expected to stay small (same non-paginated assumption
  // WorkspaceTrashTab makes about a workspace's trash), so this just fetches
  // each classroom's content list in parallel and checks membership locally.
  const contentQueries = useQueries({
    queries: classrooms.map((classroom) => ({
      queryKey: ["classrooms", "contents", classroom.id],
      queryFn: () => listClassroomContentsRequest(classroom.id),
      enabled: open && Boolean(classroom.id),
    })),
  });

  const assignedClassroomIds = useMemo(() => {
    const ids = new Set();

    classrooms.forEach((classroom, index) => {
      const rows = contentQueries[index]?.data || [];
      if (rows.some((row) => row.contentId === content?.id)) {
        ids.add(classroom.id);
      }
    });

    return ids;
  }, [classrooms, contentQueries, content?.id]);

  if (!open || !content) return null;

  const isPublished = content.status === "PUBLISHED";
  const isLoading =
    isLoadingClassrooms || contentQueries.some((query) => query.isLoading);

  async function handleToggle(classroom, isAssigned) {
    setError("");
    setPendingIds((prev) => new Set(prev).add(classroom.id));

    try {
      if (isAssigned) {
        await removeClassroomContentRequest({
          classroomId: classroom.id,
          contentId: content.id,
        });
      } else {
        await addClassroomContentRequest({
          classroomId: classroom.id,
          contentId: content.id,
        });
      }

      queryClient.invalidateQueries({
        queryKey: ["classrooms", "contents", classroom.id],
      });
    } catch (mutationError) {
      setError(
        mutationError?.response?.data?.message ||
          "Failed to update classroom assignment.",
      );
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(classroom.id);
        return next;
      });
    }
  }

  return (
    <div className="fixed inset-0 z-999 grid place-items-center bg-black/45 backdrop-blur-sm">
      <div className="w-125 overflow-hidden rounded-[20px] bg-dark-alpha text-white shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="flex h-18 items-center justify-between bg-dark-alpha px-5">
          <h2 className="text-base font-normal">
            Assign &ldquo;{content.title || "Untitled"}&rdquo; to Classroom
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="grid size-9 cursor-pointer place-items-center rounded-lg text-[#69cbe3] hover:bg-white/5"
          >
            <X className="size-6" />
          </button>
        </div>

        <div className="space-y-4 px-5 pb-5 pt-4">
          <InlineAlert type="error" message={error} autoHide={false} />

          {!isPublished && (
            <InlineAlert
              type="warning"
              autoHide={false}
              message="This content must be Published before it can be assigned to a classroom — publish it from the editor's top bar first."
            />
          )}

          {!isLoading && classrooms.length === 0 && (
            <p className="rounded-lg border border-divider-main bg-primary px-4 py-6 text-center text-sm text-contrast-grayout">
              No classrooms in this workspace yet. Create one from the
              Classroom tab first.
            </p>
          )}

          <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg bg-primary p-2">
            {classrooms.map((classroom) => {
              const isAssigned = assignedClassroomIds.has(classroom.id);
              const isBusy = pendingIds.has(classroom.id);

              return (
                <div
                  key={classroom.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/5"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-white">
                    {classroom.name}
                  </span>

                  <Switch
                    checked={isAssigned}
                    disabled={!isPublished || isBusy}
                    onCheckedChange={() => handleToggle(classroom, isAssigned)}
                  />
                </div>
              );
            })}
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
