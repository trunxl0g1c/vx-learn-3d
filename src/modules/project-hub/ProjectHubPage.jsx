import { lazy, Suspense, useEffect, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useGlobalLoading } from "../loading/LoadingContext";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createProjectRecord,
  // The project catalogue no longer lists projects from IndexedDB — it's
  // fetched from the backend (GET /contents per workspace) below instead.
  // Kept imported-but-unused-here would break lint, so these two are
  // commented out rather than removed in case local-only listing needs to
  // come back:
  // getCachedProjectSummaries,
  // getProjectSummariesFromIndexedDb,
  getAllProjectsFromIndexedDb,
  saveProjectToIndexedDb,
  saveProjectDraftToIndexedDb,
  updateProjectInIndexedDb,
  clearViqubedIndexedDb,
} from "./storage/projectIndexedDb";
import { validateGlbFile } from "../../utils/glbValidator";
import ProjectHubLayout from "./layouts/ProjectHubLayout";
import ProjectHubToolbar from "./layouts/ProjectHubToolbar";
import ProjectHubGrid from "./components/ProjectHubGrid";
import { preloadProjectRoute } from "../../routeLoaders";
import { useAlert } from "../../components/dialog/AlertContext";
import {
  useCreateContent,
  useDeleteContent,
  listContentsRequest,
  getContentThumbnailUrl,
} from "./api/contents";
import { uploadFileInChunks } from "./api/uploads";
import { syncProjectToBackend } from "./api/projectSync";
import { hydrateProjectFromBackend } from "./api/projectHydrate";
import {
  useWorkspaces,
  listWorkspaceMembersRequest,
} from "../workspace/api/workspaces";
import { isEncryptedPackageFile } from "../../utils/cryptoUtils";
import { useAuth } from "../auth/AuthContext";
import { hasPermission } from "../../utils/permissions";


const CreateProjectDialog = lazy(() => import("./CreateProjectDialog"));
const ConfirmationDialog = lazy(
  () => import("../../components/dialog/ConfirmationDialog"),
);
const ImportProjectDialog = lazy(
  () => import("./components/ImportProjectDialog"),
);

function isVXPackFile(file) {
  return Boolean(file?.name?.toLowerCase().endsWith(".vxpack"));
}

function DialogLoadingFallback() {
  return (
    <div className="fixed inset-0 z-[1090] grid place-items-center bg-black/45 p-4">
      <div className="rounded-xl border border-divider-main bg-dark px-5 py-4 text-sm text-white shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
        Opening dialog...
      </div>
    </div>
  );
}

function formatLastOpened(project) {
  const value = project?.metadata?.lastOpenedAt;

  if (!value) return "Never opened";

  const date = new Date(value);

  return `Last opened ${date.toLocaleString()}`;
}

function getAccessLabel(role) {
  if (role === "EDITOR") return "Editor Access";
  if (role === "PLAYER") return "Player Access";

  return "Unknown Access";
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

export default function ProjectHubPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { showLoading, updateLoading, hideLoading } = useGlobalLoading();
  const { showAlert } = useAlert();
  const { user } = useAuth();

  const [openCreate, setOpenCreate] = useState(false);
  const [workspaceId, setWorkspaceId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [file, setFile] = useState(null);
  const [createRole, setCreateRole] = useState("EDITOR");

  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createContent = useCreateContent();
  const deleteContent = useDeleteContent();

  const [glbValidation, setGlbValidation] = useState(null);
  const [isValidatingGlb, setIsValidatingGlb] = useState(false);

  const [createProjectError, setCreateProjectError] = useState("");

  // Was `useState(getCachedProjectSummaries)` — the catalogue no longer
  // lists local IndexedDB projects directly (see the backend query below),
  // so the value itself is never read anymore. `setProjects` is kept
  // (only the unused value is dropped from the destructure) because
  // import/clear below still call it.
  const [, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [accessFilter, setAccessFilter] = useState("ALL");

  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearingProjects, setIsClearingProjects] = useState(false);
  const [isImportingProject, setIsImportingProject] = useState(false);
  const [importProjectError, setImportProjectError] = useState("");

  // A picked package doesn't import right away — it's held here while
  // ImportProjectDialog asks which workspace to upload it to (and, for a
  // .vxenc pick, the password that decrypts it).
  const [pendingImportFile, setPendingImportFile] = useState(null);
  const [importWorkspaceId, setImportWorkspaceId] = useState("");
  const [importPasswordValue, setImportPasswordValue] = useState("");
  const [importPasswordError, setImportPasswordError] = useState("");
  const [isPreparingImport, setIsPreparingImport] = useState(false);

  // Not the catalogue's data source (that's the backend query below) — this
  // is only a lookup used to decide, per backend content item, whether this
  // browser already has the matching local project and can open it directly
  // vs. showing the "not downloaded here" fallback.
  const [localProjectsByContentId, setLocalProjectsByContentId] = useState(
    () => ({}),
  );

  useEffect(() => {
    let active = true;

    // Catalogue listing previously came from IndexedDB:
    //
    // let frameId = null;
    // const loadProjectSummaries = async () => {
    //   try {
    //     const summaries = await getProjectSummariesFromIndexedDb();
    //     if (active) {
    //       setProjects(summaries);
    //       setIsProjectCatalogReady(true);
    //     }
    //   } catch (error) {
    //     console.error("Failed to load local project catalogue:", error);
    //     if (active) setIsProjectCatalogReady(true);
    //   }
    // };
    // if (typeof requestAnimationFrame === "function") {
    //   frameId = requestAnimationFrame(loadProjectSummaries);
    // } else {
    //   loadProjectSummaries();
    // }
    //
    // It now comes from the backend (GET /contents per workspace, below).
    // This effect only builds the local contentId -> project lookup used to
    // decide whether a backend content item can be opened directly.

    const loadLocalProjectsByContentId = async () => {
      try {
        const allProjects = await getAllProjectsFromIndexedDb();

        if (!active) return;

        const map = {};

        allProjects.forEach((project) => {
          const contentId = project?.remote?.contentId;

          if (contentId) {
            map[contentId] = {
              id: project.id,
              name: project.name,
              role: project.role,
              thumbnail: project.thumbnail,
              status: project.status,
              fileName: project.fileName,
              fileSize: project.fileSize,
              metadata: project.metadata,
              autosave: project.autosave,
            };
          }
        });

        setLocalProjectsByContentId(map);
      } catch (error) {
        console.error("Failed to read local content links:", error);
      }
    };

    loadLocalProjectsByContentId();

    return () => {
      active = false;
    };
  }, [location.key]);

  const {
    data: workspaces = [],
    isLoading: isWorkspacesLoading,
  } = useWorkspaces();

  const contentQueries = useQueries({
    queries: workspaces.map((workspace) => ({
      queryKey: ["contents", { workspaceId: workspace.id }],
      queryFn: () => listContentsRequest({ workspaceId: workspace.id }),
      enabled: Boolean(workspace.id),
      staleTime: 60_000,
    })),
  });

  // Per-workspace membership, fetched the same way as the per-workspace
  // content above — needed because roleInWorkspace ("owner"/"editor"/
  // "viewer", what AddMemberDialog actually assigns) can grant edit rights
  // in one workspace independently of the user's global content:update
  // permission. Unlike WorkspaceContentTab.jsx (scoped to a single
  // workspace), this page's catalogue spans every workspace the user
  // belongs to, so the lookup has to be keyed by workspaceId.
  const memberQueries = useQueries({
    queries: workspaces.map((workspace) => ({
      queryKey: ["workspaces", "members", workspace.id],
      queryFn: () => listWorkspaceMembersRequest(workspace.id),
      enabled: Boolean(workspace.id),
      staleTime: 60_000,
    })),
  });

  const roleInWorkspaceById = {};
  workspaces.forEach((workspace, index) => {
    const members = memberQueries[index]?.data || [];
    const membership = members.find((member) => {
      const memberUserId = member?.userId || member?.user?.id || member?.id;
      return memberUserId === user?.id;
    });

    roleInWorkspaceById[workspace.id] =
      membership?.roleInWorkspace || membership?.role || null;
  });

  // Same OR-with-global-permission gate WorkspaceContentTab.jsx uses: a
  // user without content:update can't hold the edit lock (the backend's
  // POST /content-locks/acquire is gated on that same permission) unless
  // their roleInWorkspace in THIS content's workspace is "editor"/"owner".
  // handleOpenProject below must never hand out "EDITOR" without this
  // check, regardless of what role got cached locally on a previous visit.
  function canEditContentInWorkspace(targetWorkspaceId) {
    const roleInWorkspace = roleInWorkspaceById[targetWorkspaceId];
    const canEditViaWorkspaceRole =
      roleInWorkspace === "owner" || roleInWorkspace === "editor";

    return canEditViaWorkspaceRole || hasPermission(user, "content", "update");
  }

  const isProjectCatalogReady =
    !isWorkspacesLoading && contentQueries.every((query) => !query.isLoading);

  // The catalogue itself: every backend content item across the user's
  // workspaces, enriched with the matching local project (if this browser
  // has one) so it can be opened directly instead of falling back to the
  // "not downloaded here" message.
  const backendProjects = workspaces.flatMap((workspace, index) => {
    const contents = contentQueries[index]?.data || [];

    return contents.map((content) => {
      const localProject = localProjectsByContentId[content.id];

      if (localProject) {
        return {
          ...localProject,
          name: content.title || localProject.name || "Untitled",
          workspace: workspace.name,
          isCloudOnly: false,
          workspaceId: workspace.id,
          contentId: content.id,
        };
      }

      return {
        id: `cloud-${content.id}`,
        name: content.title || "Untitled",
        role: null,
        workspace: workspace.name,
        thumbnail: getContentThumbnailUrl(content.id, content.modifiedAt),
        status: content.status || "DRAFT",
        fileName: "",
        fileSize: 0,
        metadata: {
          lastOpenedAt: null,
          updatedAt: content.updatedAt || content.createdAt,
          createdAt: content.createdAt,
        },
        autosave: null,
        isCloudOnly: true,
        workspaceId: workspace.id,
        contentId: content.id,
      };
    });
  });

  const clearCreateProjectError = () => {
    setCreateProjectError("");
  };

  const resetCreateProjectForm = () => {
    setWorkspaceId("");
    setProjectName("");
    setFile(null);
    setCreateRole("EDITOR");
    setGlbValidation(null);
    setIsValidatingGlb(false);
    setProgress(0);
    setProgressLabel("");
    setCreateProjectError("");
  };

  const handleCloseCreateProject = () => {
    if (isSubmitting) return;

    setOpenCreate(false);
    resetCreateProjectForm();
  };

  async function handleOpenProject(project) {
    if (project.isCloudOnly) {
      // Previously just told the user it couldn't be opened here:
      //
      // showAlert({
      //   title: "Not downloaded to this browser",
      //   message: `"${project.name}" exists in the "${project.workspace}" workspace but hasn't been opened on this device yet. View it from the workspace's Content tab.`,
      //   type: "info",
      // });
      //
      // Now it hydrates a local project record from the backend (settings/
      // chapters/flows/procedures/overrides) and opens straight into the
      // editor (or player, if this user can't edit) — the GLB itself isn't
      // downloaded here, useProjectLoader streams (and caches) it on open.
      const targetRole = canEditContentInWorkspace(project.workspaceId)
        ? "EDITOR"
        : "PLAYER";

      preloadProjectRoute(targetRole).catch(() => {});

      showLoading({
        title: "Opening Viqubed Project",
        text: project.name,
        progress: null,
      });

      try {
        const hydrated = await hydrateProjectFromBackend({
          workspaceId: project.workspaceId,
          contentId: project.contentId,
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
          title: "Failed to open project",
          message:
            error?.response?.data?.message ||
            error?.message ||
            "Could not load this content from the workspace.",
          type: "error",
        });
      }

      return;
    }

    // project.role reflects whatever this project was cached as, which can
    // predate a since-revoked permission (or predate a workspace role grant)
    // — re-check live instead of trusting it, same as the cloud-only branch
    // above.
    const openRole = canEditContentInWorkspace(project.workspaceId)
      ? project.role
      : "PLAYER";

    preloadProjectRoute(openRole).catch((error) => {
      console.warn("Unable to preload project route:", error);
    });

    showLoading({
      title: "Opening Viqubed Project",
      text: project.name,
      progress: null,
    });

    setTimeout(() => {
      updateLoading({
        text: openRole === "PLAYER" ? "Preparing viewer..." : "Preparing editor...",
      });

      if (openRole === "EDITOR") {
        navigate(`/viqubed/editor/${project.id}`);
        return;
      }

      navigate(`/viqubed/player/${project.id}`);
    }, 350);
  }

  async function handleSelectGlbFile(selectedFile) {
    setFile(selectedFile);
    setGlbValidation(null);
    setCreateProjectError("");

    if (!selectedFile) {
      setIsValidatingGlb(false);
      return;
    }

    const isGlbFile = selectedFile.name.toLowerCase().endsWith(".glb");

    if (!isGlbFile) {
      setCreateProjectError("Model file must be in .glb format.");

      setFile(null);
      return;
    }

    try {
      setIsValidatingGlb(true);

      const result = await validateGlbFile(selectedFile);

      setGlbValidation(result);

      if (!result?.valid) {
        setCreateProjectError(getGlbValidationError(result));
      }
    } catch (error) {
      console.error("Error validating GLB:", error);

      setGlbValidation(null);

      setCreateProjectError(
        error?.message || "Error encountered while validating GLB.",
      );
    } finally {
      setIsValidatingGlb(false);
    }
  }

  async function handleSubmitCreateProject() {
    if (isSubmitting) return;

    setCreateProjectError("");

    if (!workspaceId) {
      setCreateProjectError("Select a workspace.");
      return;
    }

    if (!projectName.trim()) {
      setCreateProjectError("Project name is required.");
      return;
    }

    if (!file) {
      setCreateProjectError("Choose a model file.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".glb")) {
      setCreateProjectError("Model file must be in .glb format.");
      return;
    }

    if (isValidatingGlb) {
      setCreateProjectError("Validating GLB file. Wait for a moment.");
      return;
    }

    if (!glbValidation) {
      setCreateProjectError("GLB file is not valid.");
      return;
    }

    if (!glbValidation.valid) {
      setCreateProjectError(getGlbValidationError(glbValidation));
      return;
    }

    try {
      setIsSubmitting(true);
      setProgress(5);
      setProgressLabel("Preparing project...");

      const project = createProjectRecord({
        name: projectName.trim(),
        file,
        role: createRole,
      });

      setProgress(15);
      setProgressLabel("Saving project locally...");

      await saveProjectToIndexedDb(project, file);

      setProgress(20);

      // The local project is already fully saved and openable at this point.
      // Syncing it to the backend workspace is best-effort from here on —
      // a failure here shouldn't block the user from entering the editor.
      let uploadedContentId = null;
      let modelUploaded = false;

      try {
        setProgressLabel("Creating workspace content...");

        const content = await createContent.mutateAsync({
          workspaceId,
          title: project.name,
        });

        uploadedContentId = content.id;

        setProgressLabel("Uploading model...");

        const { mediaId } = await uploadFileInChunks({
          contentId: content.id,
          file,
          onProgress: ({ uploadedBytes, totalBytes }) => {
            const uploadRatio = totalBytes > 0 ? uploadedBytes / totalBytes : 0;
            setProgress(20 + Math.round(uploadRatio * 65));
          },
        });
        modelUploaded = true;

        setProgress(90);
        setProgressLabel("Finalizing...");

        await updateProjectInIndexedDb(project.id, {
          remote: { workspaceId, contentId: content.id, mediaId },
        });

        // Push the rest of the project's editor data (settings/chapters/
        // flows/procedures/overrides) too — usually near-empty at creation
        // time, but this also establishes the local<->remote id maps that
        // later autosaves (useViewerAutosave) rely on to update instead of
        // re-creating these rows.
        setProgressLabel("Syncing project data...");

        await syncProjectToBackend({
          projectId: project.id,
          contentId: content.id,
          material: project.material,
          viewer: project.viewer,
          scene: project.scene,
        });
      } catch (backendError) {
        console.error("Failed to sync project to workspace:", backendError);

        // The GLB never made it to storage (a real failure mode — network
        // hiccups against R2's presigned-PUT step, a bad ETag, etc.) — the
        // content row just created has no usable model and would otherwise
        // sit in the workspace's Content list permanently broken. Clean it
        // up. Not done when the model uploaded fine but the lower-stakes
        // materi sync afterward failed, since the content is still usable
        // then.
        const modelUploadFailed = uploadedContentId && !modelUploaded;

        if (modelUploadFailed) {
          try {
            await deleteContent.mutateAsync({ id: uploadedContentId });
          } catch (cleanupError) {
            console.error(
              "Failed to clean up content after a failed model upload:",
              cleanupError,
            );
          }
        }

        showAlert({
          title: modelUploadFailed
            ? "Project saved locally only"
            : "Project created locally",
          message: modelUploadFailed
            ? `"${project.name}" is saved locally and ready to edit, but uploading its model to the workspace failed, so the incomplete workspace copy was removed: ${backendError?.response?.data?.message || backendError?.message || "Unknown error"}. You can retry syncing it from the editor later.`
            : `"${project.name}" was saved and is ready to edit, but syncing it to the workspace failed: ${backendError?.response?.data?.message || backendError?.message || "Unknown error"}. You can retry this later.`,
          type: "warning",
        });
      }

      setProgress(100);
      setOpenCreate(false);
      resetCreateProjectForm();

      showLoading({
        title: "Opening Viqubed Project",
        text: project.name,
        progress: null,
      });

      // A newly created project is an authoring workflow. Open the Editor
      // immediately instead of returning to the catalogue first.
      navigate(`/viqubed/editor/${project.id}`);
    } catch (error) {
      console.error("Gagal membuat project:", error);

      setCreateProjectError(
        error?.message || "Error encountered while creating project.",
      );
    } finally {
      setIsSubmitting(false);
      setProgress(0);
      setProgressLabel("");
    }
  }


  function handleImportProject(packageFile) {
    if (!packageFile || isImportingProject) return;

    const encrypted = isEncryptedPackageFile(packageFile);
    const plain = isVXPackFile(packageFile);

    if (!encrypted && !plain) {
      setImportProjectError("Choose a valid .vxpack or .vxenc project package.");
      return;
    }

    // Every import (encrypted or not) now needs a target workspace before
    // it can proceed, so both go through the same dialog — it just skips
    // the password field when the pick isn't encrypted.
    setPendingImportFile(packageFile);
    setImportWorkspaceId("");
    setImportPasswordValue("");
    setImportPasswordError("");
  }

  function handleCancelImportDialog() {
    if (isPreparingImport) return;

    setPendingImportFile(null);
    setImportWorkspaceId("");
    setImportPasswordValue("");
    setImportPasswordError("");
  }

  async function handleSubmitImportDialog() {
    if (!pendingImportFile || isPreparingImport) return;

    if (!importWorkspaceId) {
      setImportPasswordError("Choose a workspace to import into.");
      return;
    }

    const encrypted = isEncryptedPackageFile(pendingImportFile);

    if (encrypted && !importPasswordValue) {
      setImportPasswordError("Enter the package password.");
      return;
    }

    setIsPreparingImport(true);
    setImportPasswordError("");

    try {
      let packageSource = pendingImportFile;

      if (encrypted) {
        const { decryptBlobWithPassword } = await import(
          "../../utils/cryptoUtils"
        );
        packageSource = await decryptBlobWithPassword(
          pendingImportFile,
          importPasswordValue,
        );
      }

      const sourceFileName = pendingImportFile.name;
      const targetWorkspaceId = importWorkspaceId;

      setPendingImportFile(null);
      setImportWorkspaceId("");
      setImportPasswordValue("");

      await runImportProject(packageSource, {
        sourceFileName,
        workspaceId: targetWorkspaceId,
      });
    } catch (error) {
      console.error("Failed to prepare package for import:", error);
      setImportPasswordError(
        error?.message || "Incorrect password or corrupted file.",
      );
    } finally {
      setIsPreparingImport(false);
    }
  }

  // Shared by both a plain .vxpack pick and a .vxenc pick that's already
  // been decrypted — packageSource is a File in the first case and a plain
  // Blob (decrypted bytes, no .name) in the second, hence sourceFileName
  // being passed in separately rather than read off packageSource itself.
  async function runImportProject(packageSource, { sourceFileName, workspaceId }) {
    try {
      setIsImportingProject(true);
      setImportProjectError("");

      showLoading({
        title: "Importing Viqubed Project",
        text: "Reading package manifest...",
        progress: 15,
      });

      const { importVXPack } = await import("../../utils/vxpackUtils");
      const {
        project: packagedProject,
        material: packagedMaterial,
        viewer: packagedViewer,
        scene: packagedScene,
        modelFile,
      } = await importVXPack(packageSource, { createObjectUrl: false });

      if (!modelFile) {
        throw new Error("GLB model was not found in the package.");
      }

      updateLoading({
        text: "Saving project to local database...",
        progress: 60,
      });

      const projectName =
        packagedProject?.name ||
        packagedMaterial?.projectName ||
        packagedMaterial?.title ||
        sourceFileName.replace(/\.(vxpack|vxenc)$/i, "") ||
        "Imported Viqubed Project";
      const role = packagedProject?.role === "PLAYER" ? "PLAYER" : "EDITOR";

      preloadProjectRoute(role).catch(() => {});

      const baseProject = createProjectRecord({
        name: projectName,
        file: modelFile,
        role,
      });
      const now = new Date().toISOString();
      const material = {
        ...baseProject.material,
        ...(packagedMaterial || {}),
        projectId: baseProject.id,
        projectName,
        modelUrl: modelFile.name,
        chapters: Array.isArray(packagedMaterial?.chapters)
          ? packagedMaterial.chapters
          : [],
        flows: Array.isArray(packagedMaterial?.flows)
          ? packagedMaterial.flows
          : [],
        procedures: Array.isArray(packagedMaterial?.procedures)
          ? packagedMaterial.procedures
          : [],
      };
      const viewer = {
        ...baseProject.viewer,
        ...(packagedViewer || {}),
        background: {
          ...(baseProject.viewer?.background || {}),
          ...(packagedViewer?.background || {}),
        },
      };
      const scene = {
        ...baseProject.scene,
        ...(packagedScene || {}),
        markers: Array.isArray(packagedScene?.markers)
          ? packagedScene.markers
          : [],
        cut: {
          ...(baseProject.scene?.cut || {}),
          ...(packagedScene?.cut || {}),
        },
      };
      const importedProject = {
        ...baseProject,
        name: projectName,
        workspace: packagedProject?.workspace || baseProject.workspace,
        thumbnail:
          material.thumbnail || packagedProject?.thumbnail || baseProject.thumbnail,
        status: packagedProject?.status || "DRAFT",
        publishVersion: packagedProject?.publishVersion || null,
        material,
        viewer,
        scene,
        metadata: {
          ...baseProject.metadata,
          importedAt: now,
          sourcePackageName: sourceFileName,
        },
      };
      const draft = {
        projectId: importedProject.id,
        material,
        viewer,
        scene,
        updatedAt: now,
      };

      await saveProjectToIndexedDb(importedProject, modelFile);
      await saveProjectDraftToIndexedDb(importedProject.id, draft);

      setProjects((current) => [
        importedProject,
        ...current.filter((item) => item.id !== importedProject.id),
      ]);

      // Local save above is already enough for the project to be fully
      // usable, so this backend phase (create content, upload the model,
      // sync chapters/flows/procedures/media/settings) is best-effort —
      // same tolerance as ProjectHubPage's create-project flow and
      // projectDuplicate.js's duplicateContentAsNewProject: a failure here
      // is reported via backendSyncError instead of blocking the import.
      let content = null;
      let modelUploaded = false;
      let backendSyncError = null;

      try {
        updateLoading({
          text: "Creating workspace content...",
          progress: 65,
        });

        content = await createContent.mutateAsync({
          workspaceId,
          title: projectName,
        });

        updateLoading({ text: "Uploading model...", progress: 70 });

        const { mediaId } = await uploadFileInChunks({
          contentId: content.id,
          file: modelFile,
          onProgress: ({ uploadedBytes, totalBytes }) => {
            const uploadRatio =
              totalBytes > 0 ? uploadedBytes / totalBytes : 0;
            updateLoading({
              text: "Uploading model...",
              progress: 70 + Math.round(uploadRatio * 20),
            });
          },
        });
        modelUploaded = true;

        await updateProjectInIndexedDb(importedProject.id, {
          remote: { workspaceId, contentId: content.id, mediaId },
        });

        updateLoading({ text: "Syncing project data...", progress: 92 });

        await syncProjectToBackend({
          projectId: importedProject.id,
          contentId: content.id,
          material,
          viewer,
          scene,
        });
      } catch (error) {
        backendSyncError = error;

        // Same special case duplicateContentAsNewProject handles: if the
        // model itself never made it to storage, the content row just
        // created has no usable model — clean it up instead of leaving a
        // permanently-broken row in the workspace's Content list. A failure
        // AFTER the model uploaded (e.g. the materi sync) is lower-stakes
        // and left in place, since the content is still usable then.
        if (content && !modelUploaded) {
          try {
            await deleteContent.mutateAsync({ id: content.id });
          } catch (cleanupError) {
            console.error(
              "Failed to clean up content after a failed model upload:",
              cleanupError,
            );
          }
        }
      }

      const modelUploadFailed = Boolean(content) && !modelUploaded;

      if (backendSyncError) {
        showAlert({
          title: modelUploadFailed
            ? "Imported locally only"
            : "Imported, but not fully synced",
          message: modelUploadFailed
            ? `"${importedProject.name}" is saved locally and ready to use, but uploading its model to the workspace failed, so the incomplete workspace copy was removed: ${backendSyncError?.response?.data?.message || backendSyncError?.message || "Unknown error"}. You can retry syncing it from the editor later.`
            : `"${importedProject.name}" was imported and is ready to use, but syncing it to the workspace failed: ${backendSyncError?.response?.data?.message || backendSyncError?.message || "Unknown error"}. You can retry this later.`,
          type: "warning",
        });
      }

      updateLoading({
        text: "Opening imported project...",
        progress: 100,
      });

      navigate(
        role === "PLAYER"
          ? `/viqubed/player/${importedProject.id}`
          : `/viqubed/editor/${importedProject.id}`,
      );
    } catch (error) {
      console.error("Failed to import VXPACK project:", error);
      hideLoading();
      setImportProjectError(
        error?.message || "The VXPACK project could not be imported.",
      );
    } finally {
      setIsImportingProject(false);
    }
  }

  const filteredProjects = backendProjects.filter((project) => {
    const keyword = search.trim().toLowerCase();

    const matchSearch =
      !keyword ||
      project.name?.toLowerCase().includes(keyword) ||
      project.workspace?.toLowerCase().includes(keyword) ||
      project.fileName?.toLowerCase().includes(keyword);

    const matchAccess = accessFilter === "ALL" || project.role === accessFilter;

    return matchSearch && matchAccess;
  });

  const handleClearLocalProjects = async () => {
    if (isClearingProjects) return;

    try {
      setIsClearingProjects(true);

      await clearViqubedIndexedDb();

      setProjects([]);
      setIsClearConfirmOpen(false);
    } catch (error) {
      console.error("Failed to clear local projects:", error);
    } finally {
      setIsClearingProjects(false);
    }
  };

  return (
    <ProjectHubLayout>
      <ProjectHubToolbar
        search={search}
        setSearch={setSearch}
        accessFilter={accessFilter}
        setAccessFilter={setAccessFilter}
        onClearLocalDb={() => {
          setIsClearConfirmOpen(true);
        }}
      />

      <ProjectHubGrid
        projects={filteredProjects}
        isCatalogReady={isProjectCatalogReady}
        onCreate={() => {
          preloadProjectRoute("EDITOR").catch(() => {});
          setCreateProjectError("");
          setOpenCreate(true);
        }}
        onImport={handleImportProject}
        isImporting={isImportingProject}
        onOpenProject={handleOpenProject}
        onPreloadProject={(project) => {
          preloadProjectRoute(project.role).catch(() => {});
        }}
        getAccessLabel={getAccessLabel}
        formatLastOpened={formatLastOpened}
      />

      {openCreate && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <CreateProjectDialog
            open
            onClose={handleCloseCreateProject}
            workspaceId={workspaceId}
            setWorkspaceId={setWorkspaceId}
            projectName={projectName}
            setProjectName={setProjectName}
            file={file}
            setFile={handleSelectGlbFile}
            glbValidation={glbValidation}
            isValidatingGlb={isValidatingGlb}
            createRole={createRole}
            setCreateRole={setCreateRole}
            onSubmit={handleSubmitCreateProject}
            progress={progress}
            progressLabel={progressLabel}
            isSubmitting={isSubmitting}
            error={createProjectError}
            onClearError={clearCreateProjectError}
          />
        </Suspense>
      )}

      {Boolean(importProjectError) && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <ConfirmationDialog
            open
            title="Import Project Failed"
            message={importProjectError}
            description="The package was not added to the local project database."
            confirmText="Close"
            cancelText="Dismiss"
            confirmVariant="outline"
            onClose={() => setImportProjectError("")}
            onConfirm={() => setImportProjectError("")}
          />
        </Suspense>
      )}

      {pendingImportFile && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <ImportProjectDialog
            open
            fileName={pendingImportFile.name}
            isEncrypted={isEncryptedPackageFile(pendingImportFile)}
            workspaceId={importWorkspaceId}
            setWorkspaceId={setImportWorkspaceId}
            password={importPasswordValue}
            setPassword={setImportPasswordValue}
            isSubmitting={isPreparingImport}
            error={importPasswordError}
            onClearError={() => setImportPasswordError("")}
            onCancel={handleCancelImportDialog}
            onSubmit={handleSubmitImportDialog}
          />
        </Suspense>
      )}

      {isClearConfirmOpen && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <ConfirmationDialog
            open
            title="Clear Local Projects?"
            message={
              <>
                All projects stored locally in this browser will be permanently
                deleted.
              </>
            }
            description={
              <>
                Project files, editor data, thumbnails, chapters, settings, and
                local drafts will be removed. This action cannot be undone.
              </>
            }
            confirmText="Clear All"
            cancelText="Cancel"
            confirmVariant="destructive"
            isLoading={isClearingProjects}
            onClose={() => {
              if (!isClearingProjects) {
                setIsClearConfirmOpen(false);
              }
            }}
            onConfirm={handleClearLocalProjects}
          />
        </Suspense>
      )}
    </ProjectHubLayout>
  );
}
