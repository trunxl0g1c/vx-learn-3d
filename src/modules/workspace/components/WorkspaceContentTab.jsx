import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import Input from "../../../components/ui/input";
import InlineAlert from "../../../components/ui/inline-alert";
import MaterialIcon from "../../../components/ui/material-icon";
import { useAlert } from "../../../components/dialog/AlertContext";
import { useGlobalLoading } from "../../loading/LoadingContext";
import { useAuth } from "../../auth/AuthContext";
import {
  useContents,
  useCreateContent,
  useDeleteContent,
  getContentThumbnailUrl,
} from "../../project-hub/api/contents";
import {
  useWorkspaceContentLocks,
  useRevokeContentLock,
} from "../../project-hub/api/contentLocks";
import { hydrateProjectFromBackend } from "../../project-hub/api/projectHydrate";
import { duplicateContentAsNewProject } from "../../project-hub/api/projectDuplicate";
import { exportContentAsEncryptedPackage } from "../../project-hub/api/projectExport";
import {
  getAllProjectsFromIndexedDb,
  deleteProjectFromIndexedDb,
} from "../../project-hub/storage/projectIndexedDb";
import { preloadProjectRoute } from "../../../routeLoaders";
import { useWorkspaceMembers } from "../api/workspaces";
import { CONTENT_LOCK_PRESENCE_POLL_INTERVAL_MS } from "../../../constants/contentLock";
import { hasPermission } from "../../../utils/permissions";
import { validateGlbFile } from "../../../utils/glbValidator";
import {
  SAFE_LABEL_MAX_LENGTH,
  SAFE_LABEL_REGEX,
  SAFE_LABEL_REGEX_MESSAGE,
  sanitizeText,
  validatePasswordComplexity,
  validateRequiredText,
} from "../../../utils/validation";
import ContentRowMenu from "./ContentRowMenu";

const ConfirmationDialog = lazy(
  () => import("../../../components/dialog/ConfirmationDialog"),
);
const DuplicateContentDialog = lazy(
  () => import("./DuplicateContentDialog"),
);
const ExportContentDialog = lazy(() => import("./ExportContentDialog"));
const AssignToClassroomDialog = lazy(
  () => import("./AssignToClassroomDialog"),
);
const ShareContentDialog = lazy(() => import("./ShareContentDialog"));

const SEARCH_DEBOUNCE_MS = 300;

function DialogLoadingFallback() {
  return (
    <div className="fixed inset-0 z-[1090] grid place-items-center bg-black/45 p-4">
      <div className="rounded-xl border border-divider-main bg-dark px-5 py-4 text-sm text-white shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
        Opening dialog...
      </div>
    </div>
  );
}

function getGlbValidationError(validation) {
  const errors = Array.isArray(validation?.errors)
    ? validation.errors.filter(Boolean)
    : [];

  if (errors.length > 0) {
    return errors;
  }

  return "GLB file is not valid.";
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

function ContentAvatar({ title }) {
  const initial = (title || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-main text-sm font-semibold text-white">
      {initial}
    </div>
  );
}

function ContentThumbnail({ content }) {
  const [failed, setFailed] = useState(false);
  // Always returns a URL, whether or not the content actually has a
  // thumbnail uploaded — a content with none 404s, hence the onError
  // fallback below (same pattern as ProjectHubCard).
  const thumbnailUrl = getContentThumbnailUrl(
    content.id,
    content.modifiedAt || content.updatedAt,
  );
  const showThumbnail = Boolean(thumbnailUrl) && !failed;

  if (!showThumbnail) {
    return <ContentAvatar title={content.title} />;
  }

  return (
    <img
      src={thumbnailUrl}
      alt=""
      loading="lazy"
      decoding="async"
      className="size-9 shrink-0 rounded-lg bg-secondary-dark object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function formatLockedSince(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const EDITING_POPOVER_WIDTH = 220;

function EditingAvatar({ lock }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);
  const closeTimerRef = useRef(null);

  const name = lock?.lockedByUser?.name || "Someone";
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const since = formatLockedSince(lock?.lockedAt);

  // Table this lives in scrolls both ways and sits inside overflow-hidden
  // ancestors — same clipping problem ContentRowMenu solves, same fix:
  // portal to <body>, position computed from the trigger's own rect.
  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setPosition({
      top: rect.bottom + 6,
      left: Math.min(
        rect.right - EDITING_POPOVER_WIDTH,
        window.innerWidth - EDITING_POPOVER_WIDTH - 6,
      ),
    });
  }, []);

  const openPopover = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    updatePosition();
    setOpen(true);
  }, [updatePosition]);

  // A short delay instead of closing immediately on mouseleave lets the
  // pointer travel from the trigger into the popover itself — otherwise
  // hovering into the popover to read a long name never works.
  const scheduleClose = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setOpen(false), 120);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    function handleDismiss() {
      setOpen(false);
    }

    window.addEventListener("scroll", handleDismiss, true);
    window.addEventListener("resize", handleDismiss);

    return () => {
      window.removeEventListener("scroll", handleDismiss, true);
      window.removeEventListener("resize", handleDismiss);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onMouseEnter={openPopover}
        onMouseLeave={scheduleClose}
        onFocus={openPopover}
        onBlur={scheduleClose}
        onClick={(event) => {
          event.stopPropagation();

          if (open) {
            setOpen(false);
          } else {
            openPopover();
          }
        }}
        aria-label={`${name} is editing`}
        className="ml-auto grid size-7 shrink-0 cursor-pointer place-items-center rounded-full border-2 border-primary bg-accent-main text-xs font-semibold text-white"
      >
        {initial}
      </button>

      {open &&
        position &&
        createPortal(
          <div
            role="tooltip"
            onMouseEnter={openPopover}
            onMouseLeave={scheduleClose}
            style={{
              top: position.top,
              left: position.left,
              width: EDITING_POPOVER_WIDTH,
            }}
            className="fixed z-1000 rounded-lg border border-divider-main bg-primary px-3 py-2.5 shadow-xl"
          >
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-main text-xs font-semibold text-white">
                {initial}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {name}
                </p>
                <p className="text-xs text-contrast-grayout">
                  {since ? `Editing since ${since}` : "Currently editing"}
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export default function WorkspaceContentTab({ workspaceId }) {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { showLoading, updateLoading, hideLoading } = useGlobalLoading();
  const { user } = useAuth();

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
      setDebouncedSearch(sanitizeText(search, { maxLength: 100 }));
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: contents = [],
    isLoading,
    isError,
    error,
  } = useContents({ workspaceId, search: debouncedSearch || undefined });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const deleteContent = useDeleteContent();

  const { data: contentLocks = [] } = useWorkspaceContentLocks(workspaceId, {
    refetchInterval: CONTENT_LOCK_PRESENCE_POLL_INTERVAL_MS,
  });

  const locksByContentId = useMemo(() => {
    const map = {};

    contentLocks.forEach((lock) => {
      if (lock?.contentId) map[lock.contentId] = lock;
    });

    return map;
  }, [contentLocks]);

  const { data: members = [] } = useWorkspaceMembers(workspaceId);

  // roleInWorkspace is what AddMemberDialog actually assigns ("owner" /
  // "editor" / "viewer") — it's specific to this workspace and can grant
  // edit rights independently of the user's global content:update
  // permission (e.g. a global "viewer" account assigned "editor" in one
  // workspace should be able to edit there). hasPermission stays in the mix
  // as an OR so a global editor doesn't lose access in a workspace they
  // simply haven't been explicitly assigned a role in yet.
  const currentUserRoleInWorkspace = useMemo(() => {
    const membership = members.find((member) => {
      const memberUserId = member?.userId || member?.user?.id || member?.id;
      return memberUserId === user?.id;
    });

    return membership?.roleInWorkspace || membership?.role || null;
  }, [members, user?.id]);

  const isCurrentUserOwner = currentUserRoleInWorkspace === "owner";
  const canEditInWorkspace =
    currentUserRoleInWorkspace === "owner" ||
    currentUserRoleInWorkspace === "editor";

  const canDeleteContent = hasPermission(user, "content", "delete");
  const canEditContent =
    canEditInWorkspace || hasPermission(user, "content", "update");
  const canDuplicateContent = hasPermission(user, "content", "create");

  const [revokeTarget, setRevokeTarget] = useState(null);
  const revokeContentLock = useRevokeContentLock({
    onSuccess: () => setRevokeTarget(null),
  });

  const [duplicateTarget, setDuplicateTarget] = useState(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [duplicateFile, setDuplicateFile] = useState(null);
  const [duplicateGlbValidation, setDuplicateGlbValidation] = useState(null);
  const [isValidatingDuplicateGlb, setIsValidatingDuplicateGlb] =
    useState(false);
  const [duplicateProgress, setDuplicateProgress] = useState(0);
  const [duplicateProgressLabel, setDuplicateProgressLabel] = useState("");
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateError, setDuplicateError] = useState("");
  const createContent = useCreateContent();

  const [assignClassroomTarget, setAssignClassroomTarget] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);

  const [exportTarget, setExportTarget] = useState(null);
  const [exportPassword, setExportPassword] = useState("");
  const [exportConfirmPassword, setExportConfirmPassword] = useState("");
  const [exportProgress, setExportProgress] = useState(0);
  const [exportProgressLabel, setExportProgressLabel] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  async function handleOpenContent(content) {
    const localProject = localProjectByContentId[content.id];
    // A user without content:update can't hold the edit lock (the backend's
    // POST /content-locks/acquire is gated on that same permission) — open
    // them straight into the read-only Player instead of letting them click
    // into the Editor only to bounce off a 403 there.
    const targetRole = canEditContent ? "EDITOR" : "PLAYER";

    if (localProject) {
      const openRole = canEditContent ? localProject.role : "PLAYER";
      preloadProjectRoute(openRole).catch(() => {});

      showLoading({
        title: "Opening Viqubed Project",
        text: localProject.name || content.title,
        progress: null,
      });

      setTimeout(() => {
        updateLoading({
          text: openRole === "PLAYER" ? "Preparing viewer..." : "Preparing editor...",
        });

        navigate(
          openRole === "PLAYER"
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
    // straight into the editor (or player, if the user can't edit) — the
    // GLB streams (and gets cached) on open.
    preloadProjectRoute(targetRole).catch(() => {});

    showLoading({
      title: "Opening Viqubed Project",
      text: content.title,
      progress: null,
    });

    try {
      const hydrated = await hydrateProjectFromBackend({
        workspaceId,
        contentId: content.id,
        role: targetRole,
      });

      updateLoading({
        text: targetRole === "PLAYER" ? "Preparing viewer..." : "Preparing editor...",
      });
      navigate(
        targetRole === "PLAYER"
          ? `/viqubed/player/${hydrated.id}`
          : `/viqubed/editor/${hydrated.id}`,
      );
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

  async function handleConfirmDelete() {
    if (!deleteTarget || deleteContent.isPending) return;

    try {
      await deleteContent.mutateAsync({ id: deleteTarget.id });

      const localProject = localProjectByContentId[deleteTarget.id];

      if (localProject) {
        await deleteProjectFromIndexedDb(localProject.id);

        setLocalProjectByContentId((current) => {
          const next = { ...current };
          delete next[deleteTarget.id];
          return next;
        });
      }

      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete content:", error);
      showAlert({
        title: "Failed to delete content",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Could not delete this content and its assets.",
        type: "error",
      });
    }
  }

  function handleOpenDuplicate(content) {
    setDuplicateTarget(content);
    setDuplicateName(`${content.title || "Untitled"} Copy`.slice(0, 64));
    setDuplicateFile(null);
    setDuplicateGlbValidation(null);
    setIsValidatingDuplicateGlb(false);
    setDuplicateProgress(0);
    setDuplicateProgressLabel("");
    setDuplicateError("");
  }

  function handleCloseDuplicate() {
    if (isDuplicating) return;

    setDuplicateTarget(null);
  }

  async function handleSelectDuplicateGlbFile(selectedFile) {
    setDuplicateFile(selectedFile);
    setDuplicateGlbValidation(null);
    setDuplicateError("");

    if (!selectedFile) {
      setIsValidatingDuplicateGlb(false);
      return;
    }

    const isGlbFile = selectedFile.name.toLowerCase().endsWith(".glb");

    if (!isGlbFile) {
      setDuplicateError("Model file must be in .glb format.");
      setDuplicateFile(null);
      return;
    }

    try {
      setIsValidatingDuplicateGlb(true);

      const result = await validateGlbFile(selectedFile);

      setDuplicateGlbValidation(result);

      if (!result?.valid) {
        setDuplicateError(getGlbValidationError(result));
      }
    } catch (error) {
      console.error("Error validating GLB:", error);

      setDuplicateGlbValidation(null);

      setDuplicateError(
        error?.message || "Error encountered while validating GLB.",
      );
    } finally {
      setIsValidatingDuplicateGlb(false);
    }
  }

  async function handleSubmitDuplicate() {
    if (isDuplicating || !duplicateTarget) return;

    setDuplicateError("");

    const { value: sanitizedDuplicateName, error: duplicateNameError } =
      validateRequiredText(duplicateName, {
        fieldLabel: "Project name",
        maxLength: SAFE_LABEL_MAX_LENGTH,
        pattern: SAFE_LABEL_REGEX,
        patternMessage: SAFE_LABEL_REGEX_MESSAGE,
      });

    if (duplicateNameError) {
      setDuplicateError(duplicateNameError);
      return;
    }

    if (!duplicateFile) {
      setDuplicateError("Choose a model file.");
      return;
    }

    if (!duplicateFile.name.toLowerCase().endsWith(".glb")) {
      setDuplicateError("Model file must be in .glb format.");
      return;
    }

    if (isValidatingDuplicateGlb) {
      setDuplicateError("Validating GLB file. Wait for a moment.");
      return;
    }

    if (!duplicateGlbValidation) {
      setDuplicateError("GLB file is not valid.");
      return;
    }

    if (!duplicateGlbValidation.valid) {
      setDuplicateError(getGlbValidationError(duplicateGlbValidation));
      return;
    }

    try {
      setIsDuplicating(true);

      const { project, backendSyncError, modelUploadFailed } =
        await duplicateContentAsNewProject({
          sourceContentId: duplicateTarget.id,
          workspaceId,
          name: sanitizedDuplicateName,
          file: duplicateFile,
          role: "EDITOR",
          createContentFn: createContent.mutateAsync,
          deleteContentFn: deleteContent.mutateAsync,
          onProgress: ({ percent, label }) => {
            setDuplicateProgress(percent);
            setDuplicateProgressLabel(label);
          },
        });

      if (backendSyncError) {
        showAlert({
          title: modelUploadFailed
            ? "Duplicate saved locally only"
            : "Duplicate created locally",
          message: modelUploadFailed
            ? `"${project.name}" is saved locally and ready to edit, but uploading its model to the workspace failed, so the incomplete workspace copy was removed: ${backendSyncError?.response?.data?.message || backendSyncError?.message || "Unknown error"}. You can retry syncing it from the editor later.`
            : `"${project.name}" was saved and is ready to edit, but syncing it to the workspace failed: ${backendSyncError?.response?.data?.message || backendSyncError?.message || "Unknown error"}. You can retry this later.`,
          type: "warning",
        });
      }

      setDuplicateTarget(null);

      showLoading({
        title: "Opening Viqubed Project",
        text: project.name,
        progress: null,
      });

      navigate(`/viqubed/editor/${project.id}`);
    } catch (error) {
      console.error("Failed to duplicate content:", error);

      setDuplicateError(
        error?.message || "Error encountered while duplicating this content.",
      );
    } finally {
      setIsDuplicating(false);
      setDuplicateProgress(0);
      setDuplicateProgressLabel("");
    }
  }

  function handleOpenExport(content) {
    setExportTarget(content);
    setExportPassword("");
    setExportConfirmPassword("");
    setExportProgress(0);
    setExportProgressLabel("");
    setExportError("");
  }

  function handleCloseExport() {
    if (isExporting) return;

    setExportTarget(null);
  }

  async function handleSubmitExport() {
    if (isExporting || !exportTarget) return;

    setExportError("");

    const passwordCheck = validatePasswordComplexity(exportPassword);

    if (!passwordCheck.valid) {
      setExportError(`Password must include ${passwordCheck.reasons.join(", ")}.`);
      return;
    }

    if (exportPassword !== exportConfirmPassword) {
      setExportError("Passwords do not match.");
      return;
    }

    try {
      setIsExporting(true);

      await exportContentAsEncryptedPackage({
        content: exportTarget,
        localProject: localProjectByContentId[exportTarget.id] || null,
        password: exportPassword,
        onProgress: ({ percent, label }) => {
          setExportProgress(percent);
          setExportProgressLabel(label);
        },
      });

      setExportTarget(null);
    } catch (error) {
      console.error("Failed to export content:", error);

      setExportError(
        error?.message || "Error encountered while exporting this content.",
      );
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setExportProgressLabel("");
    }
  }

  return (
    <div className="space-y-5">
      <Input
        value={search}
        placeholder="Search content"
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
              <tr className="border-b border-divider-main text-sm tracking-wide text-secondary-default">
                <th className="px-4 py-3 font-normal">Title</th>
                <th className="px-4 py-3 font-normal">Description</th>
                <th className="px-4 py-3 font-normal">Created At</th>
                <th className="px-4 py-3 font-normal" aria-label="Actions" />
              </tr>
            </thead>

            <tbody>
              {contents.map((content) => (
                <tr
                  key={content.id}
                  onClick={() => handleOpenContent(content)}
                  className="cursor-pointer border-b border-divider-main last:border-b-0 hover:bg-white/5"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ContentThumbnail content={content} />
                      <span className="truncate font-medium text-accent-contrast">
                        {content.title || "Untitled"}
                      </span>
                      {locksByContentId[content.id] && (
                        <EditingAvatar lock={locksByContentId[content.id]} />
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-white">
                    {content.description || "—"}
                  </td>

                  <td className="px-4 py-3 text-white">
                    {formatDate(content.createdAt)}
                  </td>

                  <td
                    className="px-4 py-3 text-right"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <ContentRowMenu
                      onDelete={() => setDeleteTarget(content)}
                      onRevoke={() =>
                        setRevokeTarget({
                          id: content.id,
                          title: content.title,
                          lockedByUser: locksByContentId[content.id]
                            ?.lockedByUser,
                        })
                      }
                      onDuplicate={() => handleOpenDuplicate(content)}
                      onExport={() => handleOpenExport(content)}
                      onAssignToClassroom={() =>
                        setAssignClassroomTarget(content)
                      }
                      onShareToWorkspace={() => setShareTarget(content)}
                      hasActiveLock={Boolean(locksByContentId[content.id])}
                      isCurrentUserOwner={isCurrentUserOwner}
                      canDelete={canDeleteContent}
                      canDuplicate={canDuplicateContent}
                      canExport
                      canAssignToClassroom={canEditInWorkspace}
                      canShareToWorkspace={canEditInWorkspace}
                    />
                  </td>
                </tr>
              ))}

              {!isLoading && !isError && contents.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
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

      {deleteTarget && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <ConfirmationDialog
            open
            title="Delete Content?"
            message={
              <>
                “{deleteTarget.title || "Untitled"}” will be permanently
                deleted.
              </>
            }
            description={
              <>
                Its 3D model, thumbnail, gallery media, chapters, flows, and
                procedures will also be removed from this workspace. This
                action cannot be undone.
              </>
            }
            confirmText="Delete"
            cancelText="Cancel"
            confirmVariant="destructive"
            isLoading={deleteContent.isPending}
            onClose={() => {
              if (!deleteContent.isPending) {
                setDeleteTarget(null);
              }
            }}
            onConfirm={handleConfirmDelete}
          />
        </Suspense>
      )}

      {revokeTarget && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <ConfirmationDialog
            open
            title="Revoke Edit Access?"
            message={
              <>
                {revokeTarget.lockedByUser?.name || "This user"} will be
                immediately removed from editing “
                {revokeTarget.title || "Untitled"}”.
              </>
            }
            confirmText="Revoke"
            cancelText="Cancel"
            confirmVariant="destructive"
            isLoading={revokeContentLock.isPending}
            onClose={() => {
              if (!revokeContentLock.isPending) {
                setRevokeTarget(null);
              }
            }}
            onConfirm={() =>
              revokeContentLock.mutate({ contentId: revokeTarget.id })
            }
          />
        </Suspense>
      )}

      {duplicateTarget && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <DuplicateContentDialog
            open
            sourceTitle={duplicateTarget.title}
            name={duplicateName}
            setName={setDuplicateName}
            file={duplicateFile}
            setFile={handleSelectDuplicateGlbFile}
            glbValidation={duplicateGlbValidation}
            isValidatingGlb={isValidatingDuplicateGlb}
            isSubmitting={isDuplicating}
            progress={duplicateProgress}
            progressLabel={duplicateProgressLabel}
            error={duplicateError}
            onClearError={() => setDuplicateError("")}
            onClose={handleCloseDuplicate}
            onSubmit={handleSubmitDuplicate}
          />
        </Suspense>
      )}

      {assignClassroomTarget && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <AssignToClassroomDialog
            open
            workspaceId={workspaceId}
            content={assignClassroomTarget}
            onClose={() => setAssignClassroomTarget(null)}
          />
        </Suspense>
      )}

      {shareTarget && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <ShareContentDialog
            open
            workspaceId={workspaceId}
            content={shareTarget}
            onClose={() => setShareTarget(null)}
          />
        </Suspense>
      )}

      {exportTarget && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <ExportContentDialog
            open
            sourceTitle={exportTarget.title}
            password={exportPassword}
            setPassword={setExportPassword}
            confirmPassword={exportConfirmPassword}
            setConfirmPassword={setExportConfirmPassword}
            isSubmitting={isExporting}
            progress={exportProgress}
            progressLabel={exportProgressLabel}
            error={exportError}
            onClearError={() => setExportError("")}
            onClose={handleCloseExport}
            onSubmit={handleSubmitExport}
          />
        </Suspense>
      )}
    </div>
  );
}
