import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../../../components/ui/input";
import InlineAlert from "../../../components/ui/inline-alert";
import MaterialIcon from "../../../components/ui/material-icon";
import { useAlert } from "../../../components/dialog/AlertContext";
import { useGlobalLoading } from "../../loading/LoadingContext";
import { useContents } from "../../project-hub/api/contents";
import { hydrateProjectFromBackend } from "../../project-hub/api/projectHydrate";
import { getAllProjectsFromIndexedDb } from "../../project-hub/storage/projectIndexedDb";
import { preloadProjectRoute } from "../../../routeLoaders";

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

function ContentAvatar({ title }) {
  const initial = (title || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-main text-sm font-semibold text-white">
      {initial}
    </div>
  );
}

export default function WorkspaceContentTab({ workspaceId }) {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { showLoading, updateLoading, hideLoading } = useGlobalLoading();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Content lives on the backend, but the full editable project (chapters,
  // flows, viewer settings, the GLB itself for offline use) still only
  // lives in this browser's IndexedDB — see the local+backend dual-write in
  // ProjectHubPage. Content rows can only open into the editor when this
  // browser is the one that created them, hence this lookup.
  const [localProjectByContentId, setLocalProjectByContentId] = useState({});

  useEffect(() => {
    let active = true;

    getAllProjectsFromIndexedDb()
      .then((projects) => {
        if (!active) return;

        const map = {};

        projects.forEach((project) => {
          const contentId = project?.remote?.contentId;

          if (contentId) {
            map[contentId] = {
              id: project.id,
              name: project.name,
              role: project.role,
            };
          }
        });

        setLocalProjectByContentId(map);
      })
      .catch((error) => {
        console.error("Failed to read local project catalogue:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: contents = [],
    isLoading,
    isError,
    error,
  } = useContents({ workspaceId, search: debouncedSearch || undefined });

  async function handleOpenContent(content) {
    const localProject = localProjectByContentId[content.id];

    if (localProject) {
      preloadProjectRoute(localProject.role).catch(() => {});

      showLoading({
        title: "Opening Viqubed Project",
        text: localProject.name || content.title,
        progress: null,
      });

      setTimeout(() => {
        updateLoading({ text: "Preparing editor..." });

        navigate(
          localProject.role === "PLAYER"
            ? `/viqubed/player/${localProject.id}`
            : `/viqubed/editor/${localProject.id}`,
        );
      }, 350);

      return;
    }

    // Previously just told the user it couldn't be opened here:
    //
    // showAlert({
    //   title: "Not available here",
    //   message: `"${content.title || "This content"}" isn't linked to a project in this browser, so it can't be opened yet.`,
    //   type: "info",
    // });
    //
    // Now it hydrates a local project record from the backend and opens
    // straight into the editor — the GLB streams (and gets cached) on open.
    preloadProjectRoute("EDITOR").catch(() => {});

    showLoading({
      title: "Opening Viqubed Project",
      text: content.title,
      progress: null,
    });

    try {
      const hydrated = await hydrateProjectFromBackend({
        workspaceId,
        contentId: content.id,
        role: "EDITOR",
      });

      updateLoading({ text: "Preparing editor..." });
      navigate(`/viqubed/editor/${hydrated.id}`);
    } catch (error) {
      console.error("Failed to hydrate cloud project:", error);
      hideLoading();
      showAlert({
        title: "Failed to open content",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Could not load this content from the workspace.",
        type: "error",
      });
    }
  }

  return (
    <div className="space-y-5">
      <Input
        value={search}
        placeholder="Search content"
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

      {isError && (
        <InlineAlert
          type="error"
          autoHide={false}
          message={error?.response?.data?.message || "Failed to load content."}
        />
      )}

      <div className="overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-divider-main text-sm tracking-wide text-secondary-default">
                <th className="px-4 py-3 font-normal">Title</th>
                <th className="px-4 py-3 font-normal">Description</th>
                <th className="px-4 py-3 font-normal">Created At</th>
              </tr>
            </thead>

            <tbody>
              {contents.map((content) => (
                <tr
                  key={content.id}
                  onClick={() => handleOpenContent(content)}
                  className="cursor-pointer border-b-2 border-divider-main last:border-b-0 hover:bg-white/5"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ContentAvatar title={content.title} />
                      <span className="truncate font-medium text-accent-contrast">
                        {content.title || "Untitled"}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-white">
                    {content.description || "—"}
                  </td>

                  <td className="px-4 py-3 text-white">
                    {formatDate(content.createdAt)}
                  </td>
                </tr>
              ))}

              {!isLoading && !isError && contents.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-contrast-grayout"
                  >
                    No content found
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
  );
}
