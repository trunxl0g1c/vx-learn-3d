import { lazy, Suspense, useEffect, useState } from "react";
import Button from "../../../../components/ui/button";
import Input from "../../../../components/ui/input";
import InlineAlert from "../../../../components/ui/inline-alert";
import MaterialIcon from "../../../../components/ui/material-icon";
import { useClassrooms } from "../../../classroom/api/classrooms";
import { sanitizeText } from "../../../../utils/validation";

const CreateClassroomDialog = lazy(() => import("../../CreateClassroomDialog"));

const SEARCH_DEBOUNCE_MS = 300;

// The list itself scrolls internally (rather than the whole page) so the
// "New Classroom" button and search box stay put while browsing a long
// list — same convention a mail client's folder list uses. Everything else
// on this tab still flows with the page like the rest of the app.
export default function ClassroomListPanel({
  workspaceId,
  selectedId,
  onSelect,
  canManageClassrooms,
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);

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

  // Keep a selection alive whenever possible: land on the first classroom
  // once the list loads if nothing is picked yet, and don't silently strand
  // the user on a row search just filtered out.
  useEffect(() => {
    if (isLoading || classrooms.length === 0) return;
    if (selectedId && classrooms.some((room) => room.id === selectedId)) return;

    onSelect(classrooms[0]);
  }, [isLoading, classrooms, selectedId, onSelect]);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Input
        value={search}
        placeholder="Search classroom"
        onChange={(event) => setSearch(event.target.value)}
        className="h-9! w-full! rounded-lg"
        leftIcon={
          <MaterialIcon
            name="search"
            fill={1}
            size={22}
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
          className="w-full rounded-lg"
        >
          New Classroom
          <MaterialIcon name="add" size={18} />
        </Button>
      )}

      {isError && (
        <InlineAlert
          type="error"
          autoHide={false}
          message={
            error?.response?.data?.message || "Failed to load classrooms."
          }
        />
      )}

      <div className="max-h-[65vh] min-h-24 overflow-y-auto rounded-lg border border-divider-main">
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

        {!isLoading && classrooms.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-contrast-grayout">
            <MaterialIcon
              name="school"
              fill={1}
              size={26}
              className="text-secondary-default"
            />
            {debouncedSearch
              ? "No classrooms match your search."
              : canManageClassrooms
                ? "No classrooms yet — create one to get started."
                : "No classrooms yet."}
          </div>
        )}

        <div className="divide-y divide-divider-main">
          {classrooms.map((classroom) => {
            const isSelected = classroom.id === selectedId;

            return (
              <button
                key={classroom.id}
                type="button"
                onClick={() => onSelect(classroom)}
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
                  <span className="flex items-center gap-1">
                    <MaterialIcon name="group" size={14} />
                    {classroom._count?.members ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MaterialIcon name="deployed_code" size={14} />
                    {classroom._count?.contents ?? 0}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {openCreate && (
        <Suspense fallback={null}>
          <CreateClassroomDialog
            open
            workspaceId={workspaceId}
            onClose={() => setOpenCreate(false)}
            onCreated={(classroom) => {
              setOpenCreate(false);
              refetch();
              onSelect(classroom);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
