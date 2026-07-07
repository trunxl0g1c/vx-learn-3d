import { useEffect, useState } from "react";
import { useGlobalLoading } from "../loading/LoadingContext";
import { useLocation, useNavigate } from "react-router-dom";
import "./ProjectHub.css";
import CreateProjectDialog from "./CreateProjectDialog";
import {
  createProjectRecord,
  getAllProjectsFromIndexedDb,
  saveProjectToIndexedDb,
  clearVXploreIndexedDb,
} from "./storage/projectIndexedDb";
import { validateGlbFile } from "../../utils/glbValidator";

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


function getProjectThumbnail(project) {
  return project?.thumbnail || project?.material?.thumbnail || "";
}

export default function ProjectHubPage() {
  const [glbValidation, setGlbValidation] = useState(null);
  const [isValidatingGlb, setIsValidatingGlb] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { showLoading, updateLoading } = useGlobalLoading();
  const [openCreate, setOpenCreate] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [file, setFile] = useState(null);
  const [createRole, setCreateRole] = useState("EDITOR");
  const [progress, setProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [accessFilter, setAccessFilter] = useState("ALL");
  useEffect(() => {
    getAllProjectsFromIndexedDb().then(setProjects);
  }, [location.key]);
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

    if (!selectedFile) return;

    setIsValidatingGlb(true);

    const result = await validateGlbFile(selectedFile);

    setGlbValidation(result);
    setIsValidatingGlb(false);
  }

  async function handleSubmitCreateProject() {
    if (isSubmitting) return;

    if (!projectName.trim()) {
        alert("Project name wajib diisi");
        return;
    }

    if (!file) {
        alert("Pilih file GLB");
        return;
    }

    if (!file.name.toLowerCase().endsWith(".glb")) {
        alert("File harus format .glb");
        return;
    }

    if (isValidatingGlb) {
      alert("GLB masih divalidasi, tunggu sebentar.");
      return;
    }

    if (!glbValidation) {
        alert("GLB belum divalidasi.");
        return;
    }

    if (!glbValidation.valid) {
        alert("GLB tidak valid.");
        return;
    }

    setIsSubmitting(true);
    setProgress(100);

    const project = createProjectRecord({
      name: projectName.trim(),
      file,
      role: createRole,
    });

    await saveProjectToIndexedDb(project, file);

    const updatedProjects = await getAllProjectsFromIndexedDb();
    setProjects(updatedProjects);

    setCreateRole("EDITOR");

    setOpenCreate(false);
    setProjectName("");
    setFile(null);
    setGlbValidation(null);
    setIsValidatingGlb(false);
    setProgress(0);
    setIsSubmitting(false);
  }


  const filteredProjects = projects.filter((project) => {
    const keyword = search.trim().toLowerCase();

    const matchSearch =
      !keyword ||
      project.name?.toLowerCase().includes(keyword) ||
      project.workspace?.toLowerCase().includes(keyword) ||
      project.fileName?.toLowerCase().includes(keyword);

    const matchAccess =
      accessFilter === "ALL" || project.role === accessFilter;

    return matchSearch && matchAccess;
  });

  return (
    <div className="vxhub">
      <aside className="vxhub-sidebar">
        <div className="vxhub-logo">VXE</div>

        <nav className="vxhub-menu">
          <button className="active">My Catalogue</button>
          <button>Workspace</button>
          <button>Library</button>
          <hr />
          <button>Assets Marketplace</button>
          <button>VXLearn</button>
          <button>GLB Compression</button>
          <hr />
          <button>Profile</button>
          <button>Documentation</button>
          <button>Support</button>
        </nav>
      </aside>

      <main className="vxhub-main">
        <header className="vxhub-topbar">
          <div />
          <div className="vxhub-user">Jhon ▼</div>
        </header>

        <section className="vxhub-content">
          <div className="vxhub-toolbar">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find the content you want to learn..."
            />
            <button>All Workspaces ▼</button>
            <button>Last Viewed ▼</button>
            <select
              className="vxhub-select"
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value)}
            >
              <option value="ALL">All Access</option>
              <option value="EDITOR">Editor Access</option>
              <option value="PLAYER">Player Access</option>
            </select>
            <button
              className="vxhub-dev-clear"
              onClick={async () => {
                const confirmed = window.confirm(
                  "Clear all local VXplore projects? This is for development only."
                );

                if (!confirmed) return;

                await clearVXploreIndexedDb();
                setProjects([]);
              }}
            >
              Clear Local DB
            </button>
          </div>
            
          <div className="vxhub-grid">
            <button
                className="vxhub-create-card"
                onClick={() => setOpenCreate(true)}
            >
                <div className="vxhub-plus">+</div>
                <span>Create New Project</span>
            </button>
           
            {filteredProjects.map((project) => (
            <button
                className="vxhub-card"
                key={project.id}
                onClick={() => handleOpenProject(project)}
            >
                {getProjectThumbnail(project) ? (
                  <img
                    className="vxhub-thumb"
                    src={getProjectThumbnail(project)}
                    alt={`${project.name} thumbnail`}
                    loading="lazy"
                  />
                ) : (
                  <div className="vxhub-thumb placeholder" />
                )}

                <div className="vxhub-card-body">
                <div>
                    <h3>{project.name}</h3>
                    <p>{project.workspace || "Default Workspace"}</p>
                    <p className="vxhub-card-meta">{formatLastOpened(project)}</p>
                </div>

                <div className="vxhub-card-actions">
                  <span className="vxhub-access-badge">
                    {getAccessLabel(project.role)}
                  </span>

                  <span className="vxhub-action">
                    {project.role === "EDITOR" ? "✎" : "▶"}
                  </span>
                </div>
                </div>
            </button>
            ))}
            {filteredProjects.length === 0 && (
              <div className="vxhub-empty">
                No projects found
              </div>
            )}
            </div>
        </section>
      </main>

      <CreateProjectDialog
        open={openCreate}
        onClose={() => {
            setOpenCreate(false);
            setFile(null);
            setGlbValidation(null);
            setIsValidatingGlb(false);
        }}
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
      />
    </div>
  );
}