import { lazy, Suspense, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import Button from "../../../components/ui/button";
import Input from "../../../components/ui/input";
import InlineAlert from "../../../components/ui/inline-alert";
import MaterialIcon from "../../../components/ui/material-icon";
import { useAuth } from "../../auth/AuthContext";
import { useWorkspaceMembers } from "../api/workspaces";
import { useClassrooms, useDeleteClassroom } from "../../classroom/api/classrooms";
import { sanitizeText } from "../../../utils/validation";

const CreateClassroomDialog = lazy(() => import("../CreateClassroomDialog"));
const EditClassroomMembersDialog = lazy(
  () => import("../EditClassroomMembersDialog"),
);
const ConfirmationDialog = lazy(
  () => import("../../../components/dialog/ConfirmationDialog"),
);

const SEARCH_DEBOUNCE_MS = 300;

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

export default function WorkspaceClassroomTab({ workspaceId }) {
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(sanitizeText(search, { maxLength: 100 }));
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: classrooms = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useClassrooms({ workspaceId, search: debouncedSearch || undefined });

  const { data: members = [] } = useWorkspaceMembers(workspaceId);
  const currentUserRoleInWorkspace =
    members.find((member) => member.userId === user?.id)?.roleInWorkspace ||
    null;
  const canManageClassrooms =
    currentUserRoleInWorkspace === "owner" ||
    currentUserRoleInWorkspace === "editor";

  const deleteClassroom = useDeleteClassroom({
    onSuccess: () => setDeleteTarget(null),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={search}
          placeholder="Search classroom"
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

        {canManageClassrooms && (
          <Button
            variant="gold"
            size="sm"
            onClick={() => setOpenCreate(true)}
            className="rounded-lg"
          >
            <MaterialIcon name="add" size={18} />
            Create New Classroom
          </Button>
        )}
      </div>

      {isError && (
        <InlineAlert
          type="error"
          autoHide={false}
          message={error?.response?.data?.message || "Failed to load classrooms."}
        />
      )}

      {deleteClassroom.isError && (
        <InlineAlert
          type="error"
          autoHide={false}
          message={
            deleteClassroom.error?.response?.data?.message ||
            "Failed to delete classroom."
          }
        />
      )}

      <div className="overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-divider-main text-sm tracking-wide text-secondary-default">
                <th className="px-4 py-3 font-normal">Name</th>
                <th className="px-4 py-3 font-normal">Description</th>
                <th className="px-4 py-3 font-normal">Members</th>
                <th className="px-4 py-3 font-normal">Content</th>
                <th className="px-4 py-3 font-normal">Created At</th>
                <th className="px-4 py-3 font-normal" aria-label="Actions" />
              </tr>
            </thead>

            <tbody>
              {classrooms.map((classroom) => (
                <tr
                  key={classroom.id}
                  className="border-b border-divider-main last:border-b-0 hover:bg-white/5"
                >
                  <td className="px-4 py-3">
                    <span className="truncate font-medium text-accent-contrast">
                      {classroom.name}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-white">
                    {classroom.description || "—"}
                  </td>

                  <td className="px-4 py-3 text-white">
                    {classroom._count?.members ?? 0}
                  </td>

                  <td className="px-4 py-3 text-white">
                    {classroom._count?.contents ?? 0}
                  </td>

                  <td className="px-4 py-3 text-white">
                    {formatDate(classroom.createdAt)}
                  </td>

                  <td className="px-4 py-3">
                    {canManageClassrooms && (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setEditTarget({ ...classroom, workspaceId })
                          }
                          className="grid size-8 cursor-pointer place-items-center rounded-lg text-secondary-default transition hover:bg-white/10"
                          aria-label={`Edit members of ${classroom.name}`}
                        >
                          <Pencil className="size-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(classroom)}
                          className="grid size-8 cursor-pointer place-items-center rounded-lg text-contrast-grayout transition hover:bg-warning-main/10 hover:text-warning-main"
                          aria-label={`Delete ${classroom.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {!isLoading && !isError && classrooms.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-contrast-grayout"
                  >
                    No classrooms found
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

      {openCreate && (
        <Suspense fallback={null}>
          <CreateClassroomDialog
            open
            workspaceId={workspaceId}
            onClose={() => setOpenCreate(false)}
            onCreated={() => {
              setOpenCreate(false);
              refetch();
            }}
          />
        </Suspense>
      )}

      {editTarget && (
        <Suspense fallback={null}>
          <EditClassroomMembersDialog
            open
            classroom={editTarget}
            onClose={() => setEditTarget(null)}
          />
        </Suspense>
      )}

      {deleteTarget && (
        <Suspense fallback={null}>
          <ConfirmationDialog
            open
            title="Delete Classroom?"
            message={`"${deleteTarget.name}" and its member/content assignments will be permanently deleted.`}
            confirmText="Delete"
            cancelText="Cancel"
            confirmVariant="destructive"
            isLoading={deleteClassroom.isPending}
            onClose={() => {
              if (!deleteClassroom.isPending) setDeleteTarget(null);
            }}
            onConfirm={() => deleteClassroom.mutate({ id: deleteTarget.id })}
          />
        </Suspense>
      )}
    </div>
  );
}
