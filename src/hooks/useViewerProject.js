import { useCallback, useEffect, useRef, useState } from "react";
import { createId } from "../utils/createId";
import useProjectLoader from "../core/project/useProjectLoader";
import { importVXPack, isVXPackFile } from "../utils/vxpackUtils";
import { getCurrentUserName } from "../utils/authUser";
import { normalizePlayerSettings } from "../modules/material/playerSettings";
import {
  normalizeFlowDefinition,
  normalizeFlowDefinitions,
} from "../engine/flow";
import {
  normalizeProceduralDefinition,
  normalizeProceduralDefinitions,
} from "../engine/procedural";
import {
  getChapterFromIndexedDb,
  getFlowFromIndexedDb,
  getProcedureFromIndexedDb,
} from "../modules/project-hub/storage/projectIndexedDb";
import {
  isLazyMaterialRecord,
  replaceMaterialRecord,
} from "../engine/project/LazyMaterialRecords";
import { normalizeLoadedViewerSettings } from "./viewer/normalizeViewerSettings";

function createInitialMaterial() {
  const currentUserName = getCurrentUserName();

  return {
    id: createId(),
    title: "Materi 3D Baru",
    description: "",
    version: "1.0.0",
    author: currentUserName,
    thumbnail: "",
    availableOnMarketplace: false,
    modelUrl: "",
    chapters: [],
    flows: [],
    procedures: [],
    objectNameOverrides: [],
    playerSettings: normalizePlayerSettings(),
  };
}

export function useViewerProject({
  projectId,
  markDirty,
  setCurrentProject,
  setProjectDraft,
  setViewerSettings,
  setCameraProjectionMode,
  setMarkers,
  activeChapterId,
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
  const pendingMaterialRecordLoadsRef = useRef(new Map());

  useEffect(() => {
    pendingMaterialRecordLoadsRef.current.clear();
  }, [projectId]);

  const hydrateMaterialRecord = useCallback(
    async (field, recordId, getter, normalizeRecord = null) => {
      if (!projectId || !recordId) return null;

      const requestKey = `${projectId}:${field}:${recordId}`;
      const pendingRequest =
        pendingMaterialRecordLoadsRef.current.get(requestKey);

      if (pendingRequest) return pendingRequest;

      const request = getter(projectId, recordId)
        .then((storedRecord) => {
          if (!storedRecord) return null;

          const hydratedRecord = normalizeRecord
            ? normalizeRecord(storedRecord)
            : storedRecord;

          setMaterial((currentMaterial) => {
            if (currentMaterial?.projectId !== projectId) {
              return currentMaterial;
            }

            const currentRecord = currentMaterial?.[field]?.find(
              (record) => record?.id === recordId,
            );

            // Do not restore a record deleted during a pending read, and never
            // overwrite an already-hydrated record that may contain newer edits.
            if (!isLazyMaterialRecord(currentRecord, field)) {
              return currentMaterial;
            }

            return {
              ...currentMaterial,
              [field]: replaceMaterialRecord(
                currentMaterial?.[field],
                recordId,
                hydratedRecord,
              ),
            };
          });

          return hydratedRecord;
        })
        .finally(() => {
          pendingMaterialRecordLoadsRef.current.delete(requestKey);
        });

      pendingMaterialRecordLoadsRef.current.set(requestKey, request);
      return request;
    },
    [projectId],
  );

  const loadChapterRecord = useCallback(
    (chapterId) =>
      hydrateMaterialRecord("chapters", chapterId, getChapterFromIndexedDb),
    [hydrateMaterialRecord],
  );

  const loadFlowRecord = useCallback(
    (flowId) =>
      hydrateMaterialRecord(
        "flows",
        flowId,
        getFlowFromIndexedDb,
        normalizeFlowDefinition,
      ),
    [hydrateMaterialRecord],
  );

  const loadProcedureRecord = useCallback(
    (procedureId) =>
      hydrateMaterialRecord(
        "procedures",
        procedureId,
        getProcedureFromIndexedDb,
        normalizeProceduralDefinition,
      ),
    [hydrateMaterialRecord],
  );

  const updateMaterialState = (updater) => {
    markDirty();
    setMaterial(updater);
  };

  useEffect(() => {
    if (!activeChapterId) return;

    const chapters = Array.isArray(material?.chapters)
      ? material.chapters
      : [];
    const chapter = chapters.find((item) => item.id === activeChapterId);

    if (!chapter) return;

    let cancelled = false;
    const activeChapterRequest = isLazyMaterialRecord(chapter, "chapters")
      ? loadChapterRecord(activeChapterId)
      : Promise.resolve(chapter);

    activeChapterRequest
      .then(() => {
        if (cancelled) return;

        const activeIndex = chapters.findIndex(
          (item) => item.id === activeChapterId,
        );
        const nextChapter = chapters[activeIndex + 1];

        if (!isLazyMaterialRecord(nextChapter, "chapters")) return;

        const prefetch = () => {
          if (!cancelled) {
            loadChapterRecord(nextChapter.id).catch(() => {});
          }
        };

        if (typeof window.requestIdleCallback === "function") {
          window.requestIdleCallback(prefetch, { timeout: 1200 });
        } else {
          window.setTimeout(prefetch, 160);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Failed to load chapter detail:", error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeChapterId, loadChapterRecord, material?.chapters]);

  useEffect(() => {
    if (!projectId || projectId === "demo") return;

    let cancelled = false;

    async function openProject() {
      try {
        updateLoading({
          title: "Opening Viqubed Project",
          text: "Reading project data...",
          progress: null,
        });

        const loaded = await loadProject(projectId, {
          // Only fires for a cold (never-opened-on-this-browser) project,
          // where the GLB has to be fetched from the backend — the local
          // fast path never triggers this. Without it, the dialog just sat
          // on the stale "Reading project data..." label with no movement
          // for however long the model download took.
          onDownloadProgress: (loadedBytes, totalBytes) => {
            if (cancelled) return;

            const percent = totalBytes
              ? Math.round((loadedBytes / totalBytes) * 100)
              : null;
            const loadedMb = (loadedBytes / (1024 * 1024)).toFixed(1);

            updateLoading({
              text:
                percent != null
                  // ? `Downloading 3D model... ${percent}%`
                  ? `Downloading 3D model...`
                  : `Downloading 3D model... ${loadedMb} MB`,
              progress: percent,
            });
          },
        });

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
            playerSettings: normalizePlayerSettings(
              loadedMaterial.playerSettings || prev.playerSettings,
            ),
            flows: normalizeFlowDefinitions(loadedMaterial.flows),
            procedures: normalizeProceduralDefinitions(loadedMaterial.procedures),
            thumbnail: loadedMaterial.thumbnail || project.thumbnail || "",
            projectId: project.id,
            projectName: project.name,
          };
        });

        if (viewer) {
          const normalizedViewer = normalizeLoadedViewerSettings(viewer);

          setCameraProjectionMode?.(normalizedViewer.cameraProjectionMode);
          setViewerSettings((prev) => ({
            ...prev,
            ...normalizedViewer,
            background: {
              ...(prev?.background || {}),
              ...(normalizedViewer?.background || {}),
            },
          }));
        } else {
          setCameraProjectionMode?.("perspective");
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
    setCameraProjectionMode,
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
        const {
          manifest,
          material: importedMaterial,
          viewer: importedViewer,
          modelFile: importedModelFile,
          scene: importedScene,
        } = await importVXPack(file);

        setMaterial({
          ...importedMaterial,
          modelUrl: manifest.modelUrl,
          playerSettings: normalizePlayerSettings(importedMaterial.playerSettings),
          flows: normalizeFlowDefinitions(importedMaterial.flows),
          procedures: normalizeProceduralDefinitions(importedMaterial.procedures),
        });
        setModelUrl(manifest.modelUrl);
        setMaterialModelUrl(
          importedModelFile?.name || manifest.originalModelUrl || "",
        );
        setModelFile(importedModelFile);
        setMarkers(importedScene?.markers || manifest.scene?.markers || []);

        if (importedViewer) {
          const normalizedViewer = normalizeLoadedViewerSettings(importedViewer);

          setCameraProjectionMode?.(normalizedViewer.cameraProjectionMode);
          setViewerSettings((prev) => ({
            ...prev,
            ...normalizedViewer,
            background: {
              ...(prev?.background || {}),
              ...(normalizedViewer?.background || {}),
            },
          }));
        } else {
          setCameraProjectionMode?.("perspective");
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
    loadChapterRecord,
    loadFlowRecord,
    loadProcedureRecord,
    handleFile,
  };
}
