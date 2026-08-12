import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import InlineAlert from "../../components/ui/inline-alert";
import SelectField from "../../components/ui/select";
import { useAddWorkspaceMember } from "./api/workspaces";
import { useSearchUsers } from "./api/users";

const SEARCH_DEBOUNCE_MS = 300;

const ROLE_OPTIONS = [
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

function getInitials(name) {
  const parts = (name || "?").trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AddMemberDialog({
  open,
  workspaceId,
  existingMemberIds = [],
  onClose,
  onAdded,
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [role, setRole] = useState("editor");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: users = [],
    isLoading: isSearching,
    isError: isSearchError,
    error: searchError,
  } = useSearchUsers(
    { search: debouncedSearch },
    { enabled: debouncedSearch.length > 0 && !selectedUser },
  );

  const addMember = useAddWorkspaceMember({
    onSuccess: (member) => {
      onAdded?.(member);
    },
    onError: (mutationError) => {
      setError(
        mutationError?.response?.data?.message ||
          "Error encountered while adding member.",
      );
    },
  });

  if (!open) return null;

  const isSubmitting = addMember.isPending;
  const availableUsers = users.filter(
    (user) => !existingMemberIds.includes(user.id),
  );

  function handleClose() {
    if (isSubmitting) return;

    onClose?.();
  }

  function handleSubmit() {
    setError("");

    if (!selectedUser) {
      setError("Search for a user and select one to add.");
      return;
    }

    addMember.mutate({
      workspaceId,
      userId: selectedUser.id,
      roleInWorkspace: role,
    });
  }

  return (
    <div className="fixed inset-0 z-999 grid place-items-center bg-black/45 backdrop-blur-sm">
      <div className="w-125 overflow-hidden rounded-[20px] bg-dark-alpha text-white shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="flex h-18 items-center justify-between bg-dark-alpha px-5">
          <h2 className="text-base font-normal">Add Member</h2>

          {!isSubmitting && (
            <button
              type="button"
              onClick={handleClose}
              className="grid size-9 cursor-pointer place-items-center rounded-lg text-[#69cbe3] hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50"
            >
              <X className="size-6" />
            </button>
          )}
        </div>

        <div className="space-y-4 px-5 pb-5 pt-4">
          <InlineAlert type="error" message={error} autoHide={false} />

          <div className="space-y-2">
            <label className="block text-sm font-normal text-contrast-grayout">
              Name
            </label>

            <div className="flex flex-col">
              <Input
                value={search}
                placeholder="Search by name"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSelectedUser(null);
                  setError("");
                }}
                disabled={isSubmitting}
                className="h-[44px] rounded-lg bg-dark-alpha!"
                inputClassName="text-sm"
                rightIcon={
                  selectedUser ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(null);
                        setSearch("");
                        setError("");
                      }}
                      disabled={isSubmitting}
                      className="grid cursor-pointer place-items-center rounded-full p-1 text-secondary-default hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50"
                    >
                      <X className="size-4" />
                    </button>
                  ) : null
                }
              />

              {debouncedSearch && !selectedUser && (
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg bg-primary p-2">
                  {isSearching && (
                    <p className="px-2 py-2 text-xs text-contrast-grayout">
                      Searching…
                    </p>
                  )}

                  {!isSearching && availableUsers.length === 0 && (
                    <p className="px-2 py-2 text-xs text-contrast-grayout">
                      No matching users.
                    </p>
                  )}

                  {availableUsers.map((user) => {
                    const name = user.name || user.email;
                    const isSelected = selectedUser?.id === user.id;

                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setSelectedUser(user);
                          setSearch(name);
                          setError("");
                        }}
                        disabled={isSubmitting}
                        className={[
                          "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition disabled:pointer-events-none disabled:opacity-50",
                          isSelected
                            ? "border-accent-main bg-white/5"
                            : "border-transparent hover:bg-white/5",
                        ].join(" ")}
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-main text-xs font-semibold text-white">
                          {getInitials(name)}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-white">
                            {name}
                          </span>
                          <span className="block truncate text-xs text-contrast-grayout">
                            {user.email}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {isSearchError && (
            <InlineAlert
              type="error"
              autoHide={false}
              message={
                searchError?.response?.data?.message ||
                "Failed to search users."
              }
            />
          )}

          <div className="space-y-2">
            <label className="block text-sm font-normal text-contrast-grayout">
              Role
            </label>

            <SelectField
              value={role}
              onChange={setRole}
              options={ROLE_OPTIONS}
              disabled={isSubmitting}
              className="h-11! rounded-lg border-secondary-default!"
            />
          </div>
        </div>

        <div className="flex gap-4 border-t border-[#315263] px-6 py-6">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 rounded-xl border-accent-contrast! bg-transparent text-base font-normal tracking-[4px]"
          >
            CANCEL
          </Button>

          <Button
            variant="gold"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 rounded-xl text-base font-normal tracking-[4px]"
          >
            {isSubmitting ? "ADDING..." : "SUBMIT"}
          </Button>
        </div>
      </div>
    </div>
  );
}
