import { lazy, Suspense, useState } from "react";
import { Trash2 } from "lucide-react";
import MaterialIcon from "../../../../components/ui/material-icon";
import { useDeleteClassroom } from "../../../classroom/api/classrooms";
import ClassroomInfoSection from "./ClassroomInfoSection";
import ClassroomMembersSection from "./ClassroomMembersSection";
import ClassroomContentSection from "./ClassroomContentSection";

const ConfirmationDialog = lazy(
  () => import("../../../../components/dialog/ConfirmationDialog"),
);

const SECTIONS = [
  { id: "info", label: "Info", icon: "info" },
  { id: "members", label: "Members", icon: "group" },
  { id: "content", label: "Content", icon: "deployed_code" },
];

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

export default function ClassroomDetailPanel({
  classroom,
  canManage,
  onDeleted,
}) {
  const [section, setSection] = useState("info");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteClassroom = useDeleteClassroom({
    onSuccess: () => {
      setConfirmDelete(false);
      onDeleted?.(classroom.id);
    },
  });

  if (!classroom) {
    return (
      <div className="flex min-h-[24rem] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-divider-main text-center text-sm text-contrast-grayout">
        <MaterialIcon
          name="school"
          fill={1}
          size={32}
          className="text-secondary-default"
        />
        Select a classroom on the left to see its details.
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4 rounded-lg border border-divider-main p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-medium text-white">
            {classroom.name}
          </h2>
          <p className="mt-0.5 text-xs text-contrast-grayout">
            Created {formatDate(classroom.createdAt)}
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-contrast-grayout transition hover:bg-warning-main/10 hover:text-warning-main"
          >
            <Trash2 className="size-3.5" />
            Delete Classroom
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-divider-main">
        {SECTIONS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSection(tab.id)}
            className={[
              "flex cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition",
              section === tab.id
                ? "border-accent-main text-white"
                : "border-transparent text-secondary-default hover:text-white",
            ].join(" ")}
          >
            <MaterialIcon name={tab.icon} size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {/* Keyed by classroom.id: switching the selected classroom fully
            remounts whichever section is active, so its local state (search
            boxes, draft fields) starts fresh instead of leaking the
            previous classroom's search text/filters into this one. */}
        {section === "info" && (
          <ClassroomInfoSection
            key={classroom.id}
            classroom={classroom}
            canManage={canManage}
          />
        )}
        {section === "members" && (
          <ClassroomMembersSection
            key={classroom.id}
            classroom={classroom}
            canManage={canManage}
          />
        )}
        {section === "content" && (
          <ClassroomContentSection
            key={classroom.id}
            classroom={classroom}
            canManage={canManage}
          />
        )}
      </div>

      {confirmDelete && (
        <Suspense fallback={null}>
          <ConfirmationDialog
            open
            title="Delete Classroom?"
            message={`"${classroom.name}" and its member/content assignments will be permanently deleted.`}
            confirmText="Delete"
            cancelText="Cancel"
            confirmVariant="destructive"
            isLoading={deleteClassroom.isPending}
            onClose={() => {
              if (!deleteClassroom.isPending) setConfirmDelete(false);
            }}
            onConfirm={() => deleteClassroom.mutate({ id: classroom.id })}
          />
        </Suspense>
      )}
    </div>
  );
}
