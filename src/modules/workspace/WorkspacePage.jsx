import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProjectHubLayout from "../project-hub/layouts/ProjectHubLayout";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import InlineAlert from "../../components/ui/inline-alert";
import MaterialIcon from "../../components/ui/material-icon";
import { getWorkspaceThumbnailUrl, useWorkspaces } from "./api/workspaces";

const CreateWorkspaceDialog = lazy(() => import("./CreateWorkspaceDialog"));

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

function formatContentInfo(workspace) {
  const parts = [];

  if (workspace.memberCount != null) {
    parts.push(`${workspace.memberCount} Member`);
  }

  if (workspace.contentCount != null) {
    parts.push(`${workspace.contentCount} Content`);
  }

  return parts.length > 0 ? parts.join(", ") : "—";
}

function WorkspaceAvatar({ id, name, thumbnail, modifiedAt }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  const thumbnailUrl = thumbnail
    ? getWorkspaceThumbnailUrl(id, modifiedAt)
    : "";
  const [failed, setFailed] = useState(false);

  if (thumbnailUrl && !failed) {
    return (
      <img
        src={thumbnailUrl}
        alt=""
        onError={() => setFailed(true)}
        className="size-9 shrink-0 rounded-lg object-cover"
      />
    );
  }

  return (
    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-main text-sm font-semibold text-white">
      {initial}
    </div>
  );
}

export default function WorkspacePage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: workspaces = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useWorkspaces({ search: debouncedSearch || undefined });

  return (
    <ProjectHubLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Input
            value={search}
            placeholder="Search workspace"
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
            onClick={() => setOpenCreate(true)}
            className="rounded-lg"
          >
            <MaterialIcon name="add" size={18} />
            Create New Workspace
          </Button>
        </div>

        {isError && (
          <InlineAlert
            type="error"
            autoHide={false}
            message={
              error?.response?.data?.message || "Failed to load workspaces."
            }
          />
        )}

        <div className="overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b-2 border-divider-main text-sm tracking-wide text-contrast-grayout">
                  <th className="px-4 py-3 font-normal text-secondary-default">
                    Name
                  </th>
                  <th className="px-4 py-3 font-normal text-secondary-default">
                    Description
                  </th>
                  <th className="px-4 py-3 font-normal text-secondary-default">
                    Content Info
                  </th>
                  <th className="px-4 py-3 font-normal text-secondary-default">
                    Created At
                  </th>
                  <th className="px-4 py-3 font-normal text-secondary-default">
                    Created By
                  </th>
                </tr>
              </thead>

              <tbody>
                {workspaces.map((workspace) => (
                  <tr
                    key={workspace.id}
                    onClick={() => navigate(`/workspace/${workspace.id}`)}
                    className="cursor-pointer border-b-2 border-divider-main last:border-b-0 hover:bg-white/5"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <WorkspaceAvatar
                          id={workspace.id}
                          name={workspace.name}
                          thumbnail={workspace.thumbnail}
                          modifiedAt={workspace.modifiedAt}
                        />
                        <span className="truncate font-medium text-accent-contrast">
                          {workspace.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-white">
                      {workspace.description || "—"}
                    </td>

                    <td className="px-4 py-3 text-white">
                      {formatContentInfo(workspace)}
                    </td>

                    <td className="px-4 py-3 text-white">
                      {formatDate(workspace.createdAt)}
                    </td>

                    <td className="px-4 py-3 text-white">
                      {workspace.createdBy?.name || workspace.createdBy || "—"}
                    </td>
                  </tr>
                ))}

                {!isLoading && workspaces.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-contrast-grayout"
                    >
                      No workspaces found
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
          <CreateWorkspaceDialog
            open
            onClose={() => setOpenCreate(false)}
            onCreated={() => {
              setOpenCreate(false);
              refetch();
            }}
          />
        </Suspense>
      )}
    </ProjectHubLayout>
  );
}
