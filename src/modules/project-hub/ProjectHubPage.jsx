import { useEffect, useState } from "react";
import { useGlobalLoading } from "../loading/LoadingContext";
import { useLocation, useNavigate } from "react-router-dom";
import CreateProjectDialog from "./CreateProjectDialog";
import {
  createProjectRecord,
  getAllProjectsFromIndexedDb,
  saveProjectToIndexedDb,
  clearVXploreIndexedDb,
} from "./storage/projectIndexedDb";
import { validateGlbFile } from "../../utils/glbValidator";
import ProjectHubLayout from "./layouts/ProjectHubLayout";
import ProjectHubToolbar from "./layouts/ProjectHubToolbar";
import ProjectHubGrid from "./components/ProjectHubGrid";
import ConfirmationDialog from "../../components/dialog/ConfirmationDialog";

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

  const { showLoading, updateLoading } = useGlobalLoading();

  const [openCreate, setOpenCreate] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [file, setFile] = useState(null);
  const [createRole, setCreateRole] = useState("EDITOR");

  const [progress, setProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [glbValidation, setGlbValidation] = useState(null);
  const [isValidatingGlb, setIsValidatingGlb] = useState(false);

  const [createProjectError, setCreateProjectError] = useState("");

  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [accessFilter, setAccessFilter] = useState("ALL");

  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearingProjects, setIsClearingProjects] = useState(false);

  useEffect(() => {
    getAllProjectsFromIndexedDb().then(setProjects);
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
    showLoading({
      title: "Opening VXplore Project",
      text: project.name,
      progress: null,
    });

    setTimeout(() => {
      updateLoading({
        text: "Preparing editor...",
      });

      if (project.role === "EDITOR") {
        navigate(`/vxplore/editor/${project.id}`);
        return;
      }

      navigate(`/vxplore/player/${project.id}`);
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

      const updatedProjects = await getAllProjectsFromIndexedDb();

      setProjects(updatedProjects);
      setProgress(100);

      setOpenCreate(false);
      resetCreateProjectForm();
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

      await clearVXploreIndexedDb();

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
        onCreate={() => {
          setCreateProjectError("");
          setOpenCreate(true);
        }}
        onOpenProject={handleOpenProject}
        getAccessLabel={getAccessLabel}
        formatLastOpened={formatLastOpened}
      />

      <CreateProjectDialog
        open={openCreate}
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

      <ConfirmationDialog
        open={isClearConfirmOpen}
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
    </ProjectHubLayout>
  );
}
