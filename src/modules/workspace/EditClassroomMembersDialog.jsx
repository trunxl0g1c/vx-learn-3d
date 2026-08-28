import { useMemo, useState } from "react";
import { Trash2, X } from "lucide-react";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import InlineAlert from "../../components/ui/inline-alert";
import MaterialIcon from "../../components/ui/material-icon";
import { useWorkspaceMembers } from "./api/workspaces";
import {
  useAddClassroomMember,
  useClassroomMembers,
  useRemoveClassroomMember,
} from "../classroom/api/classrooms";

function getMemberName(member) {
  return member?.user?.name || member?.user?.email || "Unnamed User";
}

function MemberAvatar({ name, size = "size-8" }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={`grid ${size} shrink-0 place-items-center rounded-lg bg-accent-main text-xs font-semibold text-white`}
    >
      {initial}
    </div>
  );
}

export default function EditClassroomMembersDialog({ open, classroom, onClose }) {
  const [currentSearch, setCurrentSearch] = useState("");
  const [addSearch, setAddSearch] = useState("");
  const [error, setError] = useState("");

  const { data: workspaceMembers = [] } = useWorkspaceMembers(classroom?.workspaceId);
  const {
    data: classroomMembers = [],
    isLoading,
    isError,
    error: loadError,
  } = useClassroomMembers(classroom?.id);

  const addMember = useAddClassroomMember({
    onError: (mutationError) => {
      setError(
        mutationError?.response?.data?.message ||
          "Failed to add member to the classroom.",
      );
    },
  });
  const removeMember = useRemoveClassroomMember({
    onError: (mutationError) => {
      setError(
        mutationError?.response?.data?.message ||
          "Failed to remove member from the classroom.",
      );
    },
  });

  const classroomWorkspaceMemberIds = useMemo(
    () => new Set(classroomMembers.map((member) => member.workspaceMemberId)),
    [classroomMembers],
  );

  const filteredCurrentMembers = useMemo(() => {
    const query = currentSearch.trim().toLowerCase();

    if (!query) return classroomMembers;

    return classroomMembers.filter((member) => {
      const name = getMemberName(member.workspaceMember).toLowerCase();
      const email = (member.workspaceMember?.user?.email || "").toLowerCase();

      return name.includes(query) || email.includes(query);
    });
  }, [classroomMembers, currentSearch]);

  const candidateMembers = useMemo(() => {
    const query = addSearch.trim().toLowerCase();

    return workspaceMembers.filter((member) => {
      if (classroomWorkspaceMemberIds.has(member.id)) return false;
      if (!query) return true;

      const name = getMemberName(member).toLowerCase();
      const email = (member?.user?.email || "").toLowerCase();

      return name.includes(query) || email.includes(query);
    });
  }, [workspaceMembers, classroomWorkspaceMemberIds, addSearch]);

  if (!open || !classroom) return null;

  const isBusy = addMember.isPending || removeMember.isPending;

  return (
    <div className="fixed inset-0 z-999 grid place-items-center bg-black/45 backdrop-blur-sm p-4">
      <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-[20px] bg-dark-alpha text-white shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="flex h-18 shrink-0 items-center justify-between bg-dark-alpha px-6">
          <div>
            <h2 className="text-base font-normal">
              &ldquo;{classroom.name}&rdquo; Members
            </h2>
            <p className="text-xs text-contrast-grayout">
              {classroomMembers.length} member
              {classroomMembers.length === 1 ? "" : "s"} in this classroom
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid size-9 cursor-pointer place-items-center rounded-lg text-[#69cbe3] hover:bg-white/5"
          >
            <X className="size-6" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <InlineAlert type="error" message={error} autoHide={false} />
          {isError && (
            <InlineAlert
              type="error"
              autoHide={false}
              message={
                loadError?.response?.data?.message ||
                "Failed to load classroom members."
              }
            />
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex min-h-0 flex-col space-y-2">
              <label className="block text-sm font-normal text-contrast-grayout">
                Current Members
              </label>

              <Input
                value={currentSearch}
                placeholder="Search current members"
                onChange={(event) => setCurrentSearch(event.target.value)}
                className="h-[42px] rounded-lg bg-dark-alpha!"
                inputClassName="text-sm italic"
                leftIcon={
                  <MaterialIcon
                    name="search"
                    fill={1}
                    size={20}
                    className="text-secondary-default"
                  />
                }
              />

              <div className="max-h-[26rem] min-h-[16rem] space-y-1 overflow-y-auto rounded-lg bg-primary p-2">
                {!isLoading && filteredCurrentMembers.length === 0 && (
                  <p className="px-2 py-6 text-center text-xs text-contrast-grayout">
                    {classroomMembers.length === 0
                      ? "No members in this classroom yet."
                      : "No members match your search."}
                  </p>
                )}

                {filteredCurrentMembers.map((member) => {
                  const name = getMemberName(member.workspaceMember);

                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5"
                    >
                      <MemberAvatar name={name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-white">
                          {name}
                        </span>
                        <span className="block truncate text-xs text-contrast-grayout">
                          {member.workspaceMember?.user?.email}
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setError("");
                          removeMember.mutate({
                            classroomId: classroom.id,
                            workspaceMemberId: member.workspaceMemberId,
                          });
                        }}
                        className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-contrast-grayout transition hover:bg-warning-main/10 hover:text-warning-main disabled:pointer-events-none disabled:opacity-50"
                        aria-label={`Remove ${name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex min-h-0 flex-col space-y-2">
              <label className="block text-sm font-normal text-contrast-grayout">
                Add Workspace Member
              </label>

              <Input
                value={addSearch}
                placeholder="Search workspace members"
                onChange={(event) => setAddSearch(event.target.value)}
                disabled={isBusy}
                className="h-[42px] rounded-lg bg-dark-alpha!"
                inputClassName="text-sm italic"
                leftIcon={
                  <MaterialIcon
                    name="search"
                    fill={1}
                    size={20}
                    className="text-secondary-default"
                  />
                }
              />

              <div className="max-h-[26rem] min-h-[16rem] space-y-1 overflow-y-auto rounded-lg bg-primary p-2">
                {candidateMembers.length === 0 && (
                  <p className="px-2 py-6 text-center text-xs text-contrast-grayout">
                    No matching workspace members to add.
                  </p>
                )}

                {candidateMembers.map((member) => {
                  const name = getMemberName(member);

                  return (
                    <button
                      key={member.id}
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        setError("");
                        addMember.mutate({
                          classroomId: classroom.id,
                          workspaceMemberId: member.id,
                        });
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50"
                    >
                      <MemberAvatar name={name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-white">
                          {name}
                        </span>
                        <span className="block truncate text-xs text-contrast-grayout">
                          {member?.user?.email}
                        </span>
                      </span>
                      <MaterialIcon name="add" size={18} className="text-accent-main" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-4 border-t border-[#315263] px-6 py-6">
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
