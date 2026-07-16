import { useEffect, useState } from "react";
import useProjectLoader from "../core/project/useProjectLoader";
import { importVXPack, isVXPackFile } from "../utils/vxpackUtils";
import { getCurrentUserName } from "../utils/authUser";


const VIEWER_LIGHTING_DEFAULTS = {
  exposure: 0.75,
  ambientLight: 0.5,
  mainLight: 0.8,
  fillLight: 0.5,
  hemiLight: 0.5,
  envIntensity: 0.8,
  metalness: 0.1,
  roughness: 0.1,
};

function normalizeLoadedViewerSettings(viewer = {}) {
  const normalizedViewer = {
    ...viewer,
  };

  Object.entries(VIEWER_LIGHTING_DEFAULTS).forEach(([key, fallback]) => {
    const numericValue = Number(normalizedViewer[key]);

    normalizedViewer[key] = Number.isFinite(numericValue)
      ? numericValue
      : fallback;
  });

  if (normalizedViewer.shaderMode === "enhanced") {
    normalizedViewer.shaderMode = "original";
  }

  return normalizedViewer;
}

function createInitialMaterial() {
  const currentUserName = getCurrentUserName();

  return {
    id: crypto.randomUUID(),
    title: "Materi 3D Baru",
    description: "",
    version: "1.0.0",
    author: currentUserName,
    thumbnail: "",
    availableOnMarketplace: false,
    modelUrl: "",
    chapters: [],
    objectNameOverrides: [],
  };
}

export function useViewerProject({
  projectId,
  markDirty,
  setCurrentProject,
  setProjectDraft,
  setViewerSettings,
  setMarkers,
  setActiveChapterId,
  setRightTab,
  updateLoading,
  hideLoading,
}) {
  const { loadProject } = useProjectLoader();

  const [material, setMaterial] = useState(() => createInitialMaterial());
  const [modelUrl, setModelUrl] = useState(null);
  const [modelFile, setModelFile] = useState(null);
  const [materialModelUrl, setMaterialModelUrl] = useState("");
  const [availableModels, setAvailableModels] = useState([]);

  const updateMaterialState = (updater) => {
    markDirty();
    setMaterial(updater);
  };

  useEffect(() => {
    if (!projectId || projectId === "demo") return;

    let cancelled = false;

    async function openProject() {
      try {
        updateLoading({
          title: "Opening VXplore Project",
          text: "Reading project data...",
          progress: null,
        });

        const loaded = await loadProject(projectId);

        if (!loaded || cancelled) {
          hideLoading();
          return;
        }

        const {
          project,
          projectFile,
          projectDraft,
          glbUrl,
          glbFileName,
          material,
          viewer,
          scene,
        } = loaded;

        setCurrentProject(project);
        setProjectDraft(projectDraft);

        updateLoading({
          text: `Opening ${project.name}...`,
        });

        await new Promise((resolve) => setTimeout(resolve, 500));

        if (cancelled) return;

        updateLoading({
          text: "Loading 3D model...",
        });

        setModelUrl(glbUrl);
        setModelFile(projectFile);
        setMaterialModelUrl(glbFileName || project.fileName || "");

        setMaterial((prev) => {
          const loadedMaterial = material || {};

          return {
            ...prev,
            ...loadedMaterial,
            thumbnail: loadedMaterial.thumbnail || project.thumbnail || "",
            projectId: project.id,
            projectName: project.name,
          };
        });

        if (viewer) {
          const normalizedViewer = normalizeLoadedViewerSettings(viewer);

          setViewerSettings((prev) => ({
            ...prev,
            ...normalizedViewer,
            background: {
              ...(prev?.background || {}),
              ...(normalizedViewer?.background || {}),
            },
          }));
        }

        if (scene?.markers) {
          setMarkers(scene.markers);
        }
      } catch (error) {
        console.error("Gagal membuka project:", error);

        updateLoading({
          title: "Failed to Open Project",
          text: error?.message || "Unknown error",
          progress: null,
        });

        setTimeout(() => {
          hideLoading();
        }, 1200);
      }
    }

    openProject();

    return () => {
      cancelled = true;
    };
  }, [
    projectId,
    loadProject,
    updateLoading,
    hideLoading,
    setCurrentProject,
    setProjectDraft,
    setViewerSettings,
    setMarkers,
  ]);

  useEffect(() => {
    fetch("/models/models.json")
      .then((res) => res.json())
      .then((data) => {
        setAvailableModels(data);
      });
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    try {
      if (isVXPackFile(file)) {
        const { manifest } = await importVXPack(file);

        setMaterial(manifest);
        setModelUrl(manifest.modelUrl);
        setMaterialModelUrl(manifest.originalModelUrl || "");
        setModelFile(null);
        setMarkers([]);

        if (manifest.viewerSettings) {
          const normalizedViewer = normalizeLoadedViewerSettings(manifest.viewerSettings);

          setViewerSettings((prev) => ({
            ...prev,
            ...normalizedViewer,
            background: {
              ...(prev?.background || {}),
              ...(normalizedViewer?.background || {}),
            },
          }));
        }

        setActiveChapterId(manifest.chapters?.[0]?.id || null);
        setRightTab("material");

        e.target.value = "";
        return;
      }

      const url = URL.createObjectURL(file);

      setModelUrl(url);
      setModelFile(file);
      setMaterialModelUrl(`/models/${file.name}`);
      setMarkers([]);

      e.target.value = "";
    } catch (error) {
      console.error("Gagal load file:", error);
      alert(error.message || "Failed to load file.");
    }
  };

  return {
    material,
    setMaterial: updateMaterialState,
    rawSetMaterial: setMaterial,
    modelUrl,
    modelFile,
    materialModelUrl,
    availableModels,
    handleFile,
  };
}
