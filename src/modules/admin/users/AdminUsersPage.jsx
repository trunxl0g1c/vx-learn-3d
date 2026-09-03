import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import ProjectHubLayout from "../../project-hub/layouts/ProjectHubLayout";
import Button from "../../../components/ui/button";
import Input from "../../../components/ui/input";
import InlineAlert from "../../../components/ui/inline-alert";
import MaterialIcon from "../../../components/ui/material-icon";
import {
  useDeleteUser,
  useSearchUsers,
  useSetUserActiveStatus,
} from "../../workspace/api/users";
import { useLicenseInfo } from "../../license/api/license";
import { useAuth } from "../../auth/AuthContext";
import UserRowMenu from "./UserRowMenu";

const CreateUserDialog = lazy(() => import("./CreateUserDialog"));
const EditUserDialog = lazy(() => import("./EditUserDialog"));
const ChangeUserPasswordDialog = lazy(
  () => import("./ChangeUserPasswordDialog"),
);
const ConfirmationDialog = lazy(
  () => import("../../../components/dialog/ConfirmationDialog"),
);

const SEARCH_DEBOUNCE_MS = 300;

const SEAT_QUOTA_KEYS = new Set([
  "max_user_editor",
  "max_user_viewer",
  "combined_user_seats",
]);

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

function SeatQuotaBar({ label, used, max }) {
  const hasMax = typeof max === "number" && max > 0;
  const ratio = hasMax && typeof used === "number" ? Math.min(used / max, 1) : 0;
  const atLimit = hasMax && typeof used === "number" && used >= max;

  return (
    <div className="min-w-[180px] flex-1 space-y-1.5 rounded-lg border border-divider-main bg-primary/60 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-contrast-grayout">{label}</span>
        <span
          className={`font-medium ${atLimit ? "text-warning-main" : "text-white"}`}
        >
          {used ?? "—"}
          {hasMax ? ` / ${max}` : ""}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-300 ${atLimit ? "bg-warning-main" : "bg-accent-main"}`}
          style={{ width: `${hasMax ? ratio * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);
  const [userPendingDeletion, setUserPendingDeletion] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: users = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useSearchUsers({ search: debouncedSearch || undefined, pageSize: 100 });

  const { data: license } = useLicenseInfo();

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [users],
  );

  const seatQuotas = useMemo(
    () => (license?.quotas || []).filter((quota) => SEAT_QUOTA_KEYS.has(quota.key)),
    [license],
  );

  const setActiveStatus = useSetUserActiveStatus();
  const deleteUser = useDeleteUser({
    onSuccess: () => setUserPendingDeletion(null),
  });

  return (
    <ProjectHubLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-medium text-white">User Management</h1>
        </div>

        {seatQuotas.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {seatQuotas.map((quota) => (
              <SeatQuotaBar key={quota.key} {...quota} />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Input
            value={search}
            placeholder="Search by name or email"
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

          <Button
            variant="gold"
            size="sm"
            onClick={() => setOpenCreate(true)}
            className="rounded-lg"
          >
            <MaterialIcon name="person_add" size={18} />
            Create User
          </Button>
        </div>

        {isError && (
          <InlineAlert
            type="error"
            autoHide={false}
            message={error?.response?.data?.message || "Failed to load users."}
          />
        )}

        {setActiveStatus.isError && (
          <InlineAlert
            type="error"
            autoHide={false}
            message={
              setActiveStatus.error?.response?.data?.message ||
              "Failed to update user status."
            }
          />
        )}

        {deleteUser.isError && (
          <InlineAlert
            type="error"
            autoHide={false}
            message={
              deleteUser.error?.response?.data?.message ||
              "Failed to delete user."
            }
          />
        )}

        <div className="overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-divider-main text-sm tracking-wide text-secondary-default">
                  <th className="px-4 py-3 font-normal">Name</th>
                  <th className="px-4 py-3 font-normal">Email</th>
                  <th className="px-4 py-3 font-normal">Role</th>
                  <th className="px-4 py-3 font-normal">Status</th>
                  <th className="px-4 py-3 font-normal">Created At</th>
                  <th className="px-4 py-3 font-normal">Actions</th>
                </tr>
              </thead>

              <tbody>
                {sortedUsers.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  const isTogglingThisUser =
                    setActiveStatus.isPending &&
                    setActiveStatus.variables?.id === user.id;
                  const activeLabel = user.isActive ? "Active" : "Inactive";

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-divider-main last:border-b-0 hover:bg-white/5"
                    >
                      <td className="px-4 py-3">
                        <span className="truncate font-medium text-accent-contrast">
                          {user.name}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-white">{user.email}</td>

                      <td className="px-4 py-3 text-white">
                        {user.role?.name || "—"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            user.isActive
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-white/10 text-contrast-grayout"
                          }`}
                        >
                          {isTogglingThisUser ? "Updating…" : activeLabel}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-white">
                        {formatDate(user.createdAt)}
                      </td>

                      <td className="px-4 py-3">
                        <UserRowMenu
                          isActive={user.isActive}
                          isTogglingActive={isTogglingThisUser}
                          disableToggleActive={isSelf}
                          disableToggleActiveReason="You cannot deactivate your own account"
                          disableDelete={isSelf}
                          disableDeleteReason="You cannot delete your own account"
                          onEdit={() => setEditingUser(user)}
                          onChangePassword={() => setPasswordUser(user)}
                          onToggleActive={() =>
                            setActiveStatus.mutate({
                              id: user.id,
                              isActive: !user.isActive,
                            })
                          }
                          onDelete={() => setUserPendingDeletion(user)}
                        />
                      </td>
                    </tr>
                  );
                })}

                {!isLoading && !isError && sortedUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-contrast-grayout"
                    >
                      No users found
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
      </div>

      {openCreate && (
        <Suspense fallback={null}>
          <CreateUserDialog
            open
            onClose={() => setOpenCreate(false)}
            onCreated={() => {
              setOpenCreate(false);
              refetch();
            }}
          />
        </Suspense>
      )}

      {editingUser && (
        <Suspense fallback={null}>
          <EditUserDialog
            open
            user={editingUser}
            onClose={() => setEditingUser(null)}
            onUpdated={() => {
              setEditingUser(null);
              refetch();
            }}
          />
        </Suspense>
      )}

      {passwordUser && (
        <Suspense fallback={null}>
          <ChangeUserPasswordDialog
            open
            user={passwordUser}
            onClose={() => setPasswordUser(null)}
            onChanged={() => setPasswordUser(null)}
          />
        </Suspense>
      )}

      {userPendingDeletion && (
        <Suspense fallback={null}>
          <ConfirmationDialog
            open
            title="Delete User?"
            message={`${userPendingDeletion.name} will be permanently deleted.`}
            description="This frees up their editor/viewer seat immediately, unlike deactivating a user. This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
            confirmVariant="destructive"
            isLoading={deleteUser.isPending}
            onClose={() => setUserPendingDeletion(null)}
            onConfirm={() => deleteUser.mutate({ id: userPendingDeletion.id })}
          />
        </Suspense>
      )}
    </ProjectHubLayout>
  );
}
