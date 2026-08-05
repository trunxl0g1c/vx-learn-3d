import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import Button from "../../../components/ui/button";
import Input from "../../../components/ui/input";
import InlineAlert from "../../../components/ui/inline-alert";
import MaterialIcon from "../../../components/ui/material-icon";
import { useRemoveWorkspaceMember, useWorkspaceMembers } from "../api/workspaces";

const AddMemberDialog = lazy(() => import("../AddMemberDialog"));
const ConfirmationDialog = lazy(
  () => import("../../../components/dialog/ConfirmationDialog"),
);

const SEARCH_DEBOUNCE_MS = 300;

function getMemberUser(member) {
  return member?.user || member;
}

function getMemberUserId(member) {
  return member?.userId || member?.user?.id || member?.id;
}

function getMemberName(member) {
  const user = getMemberUser(member);
  return user?.name || user?.username || "Unnamed User";
}

function getMemberEmail(member) {
  const user = getMemberUser(member);
  return user?.email || user?.username || "—";
}

function getMemberRole(member) {
  return member?.roleInWorkspace || member?.role || "—";
}

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

function MemberAvatar({ name }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-main text-sm font-semibold text-white">
      {initial}
    </div>
  );
}

export default function WorkspaceMemberTab({ workspaceId }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openAddMember, setOpenAddMember] = useState(false);
  const [memberPendingRemoval, setMemberPendingRemoval] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: members = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useWorkspaceMembers(workspaceId);

  const removeMember = useRemoveWorkspaceMember({
    onSuccess: () => {
      setMemberPendingRemoval(null);
    },
  });

  const filteredMembers = useMemo(() => {
    if (!debouncedSearch) return members;

    return members.filter((member) => {
      const name = getMemberName(member).toLowerCase();
      const email = getMemberEmail(member).toLowerCase();

      return name.includes(debouncedSearch) || email.includes(debouncedSearch);
    });
  }, [members, debouncedSearch]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={search}
          placeholder="Search member name"
          onChange={(event) => setSearch(event.target.value)}
          className="h-10! w-full! min-w-0 rounded-lg border-accent-main! sm:max-w-[320px]"
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

        <Button
          variant="gold"
          size="sm"
          onClick={() => setOpenAddMember(true)}
          className="rounded-lg"
        >
          <MaterialIcon name="add" size={18} />
          Add new Member
        </Button>
      </div>

      {isError && (
        <InlineAlert
          type="error"
          autoHide={false}
          message={
            error?.response?.data?.message || "Failed to load members."
          }
        />
      )}

      {removeMember.isError && (
        <InlineAlert
          type="error"
          autoHide={false}
          message={
            removeMember.error?.response?.data?.message ||
            "Failed to remove member."
          }
        />
      )}

      <div className="overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-divider-main text-sm tracking-wide text-secondary-default">
                <th className="px-4 py-3 font-normal">Name</th>
                <th className="px-4 py-3 font-normal">Email</th>
                <th className="px-4 py-3 font-normal">Role in Workspace</th>
                <th className="px-4 py-3 font-normal">Created At</th>
                <th className="px-4 py-3 font-normal">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredMembers.map((member) => {
                const userId = getMemberUserId(member);
                const name = getMemberName(member);

                return (
                  <tr
                    key={userId}
                    className="border-b-2 border-divider-main last:border-b-0 hover:bg-white/5"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <MemberAvatar name={name} />
                        <span className="truncate font-medium text-accent-contrast">
                          {name}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-white">
                      {getMemberEmail(member)}
                    </td>

                    <td className="px-4 py-3 capitalize text-white">
                      {getMemberRole(member)}
                    </td>

                    <td className="px-4 py-3 text-white">
                      {formatDate(member?.createdAt)}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          setMemberPendingRemoval({ userId, name })
                        }
                        className="grid size-8 cursor-pointer place-items-center rounded-lg text-contrast-grayout transition hover:bg-warning-main/10 hover:text-warning-main"
                        aria-label={`Remove ${name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!isLoading && !isError && filteredMembers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-contrast-grayout"
                  >
                    No members found
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

      {openAddMember && (
        <Suspense fallback={null}>
          <AddMemberDialog
            open
            workspaceId={workspaceId}
            existingMemberIds={members.map(getMemberUserId).filter(Boolean)}
            onClose={() => setOpenAddMember(false)}
            onAdded={() => {
              setOpenAddMember(false);
              refetch();
            }}
          />
        </Suspense>
      )}

      {memberPendingRemoval && (
        <Suspense fallback={null}>
          <ConfirmationDialog
            open
            title="Remove Member?"
            message={`${memberPendingRemoval.name} will lose access to this workspace.`}
            confirmText="Remove"
            cancelText="Cancel"
            confirmVariant="destructive"
            isLoading={removeMember.isPending}
            onClose={() => setMemberPendingRemoval(null)}
            onConfirm={() =>
              removeMember.mutate({
                workspaceId,
                userId: memberPendingRemoval.userId,
              })
            }
          />
        </Suspense>
      )}
    </div>
  );
}
