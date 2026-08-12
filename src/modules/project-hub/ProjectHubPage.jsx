import { lazy, Suspense, useEffect, useState } from "react";
import { useGlobalLoading } from "../loading/LoadingContext";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createProjectRecord,
  getCachedProjectSummaries,
  getProjectSummariesFromIndexedDb,
  saveProjectToIndexedDb,
  saveProjectDraftToIndexedDb,
  clearViqubedIndexedDb,
} from "./storage/projectIndexedDb";
import { validateGlbFile } from "../../utils/glbValidator";
import ProjectHubLayout from "./layouts/ProjectHubLayout";
import ProjectHubToolbar from "./layouts/ProjectHubToolbar";
import ProjectHubGrid from "./components/ProjectHubGrid";
import { preloadProjectRoute } from "../../routeLoaders";


const CreateProjectDialog = lazy(() => import("./CreateProjectDialog"));
const ConfirmationDialog = lazy(
  () => import("../../components/dialog/ConfirmationDialog"),
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

  const [openCreate, setOpenCreate] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [file, setFile] = useState(null);
  const [createRole, setCreateRole] = useState("EDITOR");

  const [progress, setProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [glbValidation, setGlbValidation] = useState(null);
  const [isValidatingGlb, setIsValidatingGlb] = useState(false);

  const [createProjectError, setCreateProjectError] = useState("");

  const [projects, setProjects] = useState(getCachedProjectSummaries);
  const [isProjectCatalogReady, setIsProjectCatalogReady] = useState(false);
  const [search, setSearch] = useState("");
  const [accessFilter, setAccessFilter] = useState("ALL");

  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearingProjects, setIsClearingProjects] = useState(false);
  const [isImportingProject, setIsImportingProject] = useState(false);
  const [importProjectError, setImportProjectError] = useState("");

  useEffect(() => {
    let active = true;
    let frameId = null;

    const loadProjectSummaries = async () => {
      try {
        const summaries = await getProjectSummariesFromIndexedDb();

        if (active) {
          setProjects(summaries);
          setIsProjectCatalogReady(true);
        }
      } catch (error) {
        console.error("Failed to load local project catalogue:", error);

        if (active) {
          setIsProjectCatalogReady(true);
        }
      }
    };

    if (typeof requestAnimationFrame === "function") {
      frameId = requestAnimationFrame(loadProjectSummaries);
    } else {
      loadProjectSummaries();
    }

    return () => {
      active = false;

      if (frameId !== null && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(frameId);
      }
    };
  }, [location.key]);

  const clearCreateProjectError = () => {
    setCreateProjectError("");
  };

  const resetCreateProjectForm = () => {
    setProjectName("");
    setFile(null);
    setCreateRole("EDITOR");
    setGlbValidation(null);
    setIsValidatingGlb(false);
    setProgress(0);
    setCreateProjectError("");
  };

  const handleCloseCreateProject = () => {
    if (isSubmitting) return;

    setOpenCreate(false);
    resetCreateProjectForm();
  };

  function handleOpenProject(project) {
    preloadProjectRoute(project.role).catch((error) => {
      console.warn("Unable to preload project route:", error);
    });

    showLoading({
      title: "Opening Viqubed Project",
      text: project.name,
      progress: null,
    });

    setTimeout(() => {
      updateLoading({
        text: "Preparing editor...",
      });

      if (project.role === "EDITOR") {
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
      setProgress(10);

      const project = createProjectRecord({
        name: projectName.trim(),
        file,
        role: createRole,
      });

      setProgress(40);

      await saveProjectToIndexedDb(project, file);

      setProgress(80);

      setProgress(100);
      setOpenCreate(false);
      resetCreateProjectForm();

      showLoading({
        title: "Opening New Project",
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
    }
  }


  async function handleImportProject(packageFile) {
    if (!packageFile || isImportingProject) return;

    if (!isVXPackFile(packageFile)) {
      setImportProjectError("Choose a valid .vxpack project package.");
      return;
    }

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
      } = await importVXPack(packageFile, { createObjectUrl: false });

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
        packageFile.name.replace(/\.vxpack$/i, "") ||
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
        authoredAnimations: Array.isArray(packagedMaterial?.authoredAnimations)
          ? packagedMaterial.authoredAnimations
          : [],
        procedures: Array.isArray(packagedMaterial?.procedures)
          ? packagedMaterial.procedures
          : [],
        quizzes: Array.isArray(packagedMaterial?.quizzes)
          ? packagedMaterial.quizzes
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
          sourcePackageName: packageFile.name,
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

  const filteredProjects = projects.filter((project) => {
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
