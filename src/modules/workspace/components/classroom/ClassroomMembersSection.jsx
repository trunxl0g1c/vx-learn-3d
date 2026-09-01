import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import Input from "../../../../components/ui/input";
import InlineAlert from "../../../../components/ui/inline-alert";
import MaterialIcon from "../../../../components/ui/material-icon";
import { useWorkspaceMembers } from "../../api/workspaces";
import {
  useAddClassroomMember,
  useClassroomMembers,
  useRemoveClassroomMember,
} from "../../../classroom/api/classrooms";

function getMemberName(member) {
  return member?.user?.name || member?.user?.email || "Unnamed User";
}

function MemberAvatar({ name }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-main text-xs font-semibold text-white">
      {initial}
    </div>
  );
}

// Previously only reachable through a separate "edit members" dialog you had
// to open per classroom, close, reopen to check your work, etc. Inlined
// directly into the classroom detail panel instead — both lists (who's in,
// who else could join) are visible together the whole time you're looking
// at a classroom, so adding/removing several workspace members in a row is
// click-search-click-search rather than open dialog-click-close-reopen.
export default function ClassroomMembersSection({ classroom, canManage }) {
  const [currentSearch, setCurrentSearch] = useState("");
  const [addSearch, setAddSearch] = useState("");
  const [error, setError] = useState("");

  const { data: workspaceMembers = [] } = useWorkspaceMembers(
    classroom.workspaceId,
  );
  const {
    data: classroomMembers = [],
    isLoading,
    isError,
    error: loadError,
  } = useClassroomMembers(classroom.id);

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

  const isBusy = addMember.isPending || removeMember.isPending;

  if (!canManage) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-normal text-contrast-grayout">
          {classroomMembers.length} member
          {classroomMembers.length === 1 ? "" : "s"} in this classroom
        </p>
        <div className="max-h-[26rem] space-y-1 overflow-y-auto rounded-lg bg-primary p-2">
          {classroomMembers.map((member) => {
            const name = getMemberName(member.workspaceMember);
            return (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2"
              >
                <MemberAvatar name={name} />
                <span className="min-w-0 flex-1 truncate text-sm text-white">
                  {name}
                </span>
              </div>
            );
          })}
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
            "Failed to load classroom members."
          }
        />
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="flex min-h-0 flex-col space-y-2">
          <label className="block text-sm font-normal text-contrast-grayout">
            Current Members ({classroomMembers.length})
          </label>

          <Input
            value={currentSearch}
            placeholder="Search current members"
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
            {!isLoading && filteredCurrentMembers.length === 0 && (
              <p className="px-2 py-6 text-center text-xs text-contrast-grayout">
                {classroomMembers.length === 0
                  ? "No members in this classroom yet — add some from the right."
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
  );
}
