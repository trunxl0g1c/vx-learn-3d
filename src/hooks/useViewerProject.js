import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  normalizeAuthoredAnimationDefinition,
  normalizeAuthoredAnimationDefinitions,
} from "../engine/animation";
import {
  normalizeQuizDefinition,
  normalizeQuizDefinitions,
} from "../engine/quiz";
import { normalizeSlideDefinition, normalizeSlideDefinitions } from "../engine/slide";
import {
  getChapterFromIndexedDb,
  getFlowFromIndexedDb,
  getAuthoredAnimationFromIndexedDb,
  getProcedureFromIndexedDb,
  getQuizFromIndexedDb,
  getSlideFromIndexedDb,
  saveAdditionalProjectModelFile,
} from "../modules/project-hub/storage/projectIndexedDb";
import {
  isLazyMaterialRecord,
  replaceMaterialRecord,
} from "../engine/project/LazyMaterialRecords";
import { normalizeLoadedViewerSettings } from "./viewer/normalizeViewerSettings";
import { cloneHistoryValue } from "../engine/history";
import { validateGlbFile } from "../utils/glbValidator";
import { normalizeProToolsSettings } from "../engine/project/ProToolsSettings";
import { readGlbLicenseMetadata } from "../engine/model/GlbLicenseMetadata";
import {
  createModelLicenseCatalog,
  normalizeModelLicenseEntry,
  PRIMARY_MODEL_ASSET_ID,
  removeModelLicenseEntry,
  upsertModelLicenseEntry,
} from "../engine/project/ModelLicenseSettings";

function getChangedTopLevelKeys(previousValue = {}, nextValue = {}) {
  return Array.from(
    new Set([
      ...Object.keys(previousValue || {}),
      ...Object.keys(nextValue || {}),
    ]),
  )
    .filter((key) => !Object.is(previousValue?.[key], nextValue?.[key]))
    .sort();
}

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
    additionalModels: [],
    modelLicenses: [],
    chapters: [],
    flows: [],
    authoredAnimations: [],
    procedures: [],
    quizzes: [],
    slides: [],
    objectNameOverrides: [],
    playerSettings: normalizePlayerSettings(),
    proToolsSettings: normalizeProToolsSettings(),
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
  historyEngine,
}) {
  const {
    loadProject,
    addAdditionalModelFile,
    removeAdditionalModelFile,
  } = useProjectLoader();

  const materialRef = useRef(null);
  const [material, setMaterialState] = useState(() => {
    const initialMaterial = createInitialMaterial();
    materialRef.current = initialMaterial;
    return initialMaterial;
  });
  const [modelUrl, setModelUrl] = useState(null);
  const [modelFile, setModelFile] = useState(null);
  const [additionalModels, setAdditionalModels] = useState([]);
  const [materialModelUrl, setMaterialModelUrl] = useState("");
  const [availableModels, setAvailableModels] = useState([]);
  const pendingMaterialRecordLoadsRef = useRef(new Map());

  useEffect(() => {
    pendingMaterialRecordLoadsRef.current.clear();
  }, [projectId]);

  const rawSetMaterial = useCallback((updater) => {
    const previousMaterial = materialRef.current;
    const nextMaterial =
      typeof updater === "function" ? updater(previousMaterial) : updater;

    if (Object.is(previousMaterial, nextMaterial)) return previousMaterial;

    materialRef.current = nextMaterial;
    setMaterialState(nextMaterial);
    return nextMaterial;
  }, []);

  const applyMaterialHistorySnapshot = useCallback(
    (snapshot) => {
      const nextMaterial = cloneHistoryValue(snapshot);
      materialRef.current = nextMaterial;
      setMaterialState(nextMaterial);
      markDirty();
    },
    [markDirty],
  );


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

          rawSetMaterial((currentMaterial) => {
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
    [projectId, rawSetMaterial],
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

  const loadAnimationRecord = useCallback(
    (animationId) =>
      hydrateMaterialRecord(
        "authoredAnimations",
        animationId,
        getAuthoredAnimationFromIndexedDb,
        normalizeAuthoredAnimationDefinition,
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

  const loadQuizRecord = useCallback(
    (quizId) =>
      hydrateMaterialRecord(
        "quizzes",
        quizId,
        getQuizFromIndexedDb,
        normalizeQuizDefinition,
      ),
    [hydrateMaterialRecord],
  );

  const loadSlideRecord = useCallback(
    (slideId) =>
      hydrateMaterialRecord(
        "slides",
        slideId,
        getSlideFromIndexedDb,
        normalizeSlideDefinition,
      ),
    [hydrateMaterialRecord],
  );

  const updateMaterialState = useCallback(
    (updater) => {
      const previousMaterial = materialRef.current;
      const nextMaterial =
        typeof updater === "function" ? updater(previousMaterial) : updater;

      if (Object.is(previousMaterial, nextMaterial)) return previousMaterial;

      const changedKeys = getChangedTopLevelKeys(previousMaterial, nextMaterial);

      historyEngine?.recordSnapshot?.({
        label: "Edit project content",
        before: cloneHistoryValue(previousMaterial),
        after: cloneHistoryValue(nextMaterial),
        apply: applyMaterialHistorySnapshot,
        mergeKey: changedKeys.length > 0
          ? `project-material:${changedKeys.join(",")}`
          : null,
        mergeWindowMs: 500,
      });

      materialRef.current = nextMaterial;
      setMaterialState(nextMaterial);
      markDirty();
      return nextMaterial;
    },
    [applyMaterialHistorySnapshot, historyEngine, markDirty],
  );

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
          additionalModels: loadedAdditionalModels = [],
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
        setAdditionalModels(loadedAdditionalModels);

        rawSetMaterial((prev) => {
          const loadedMaterial = material || {};

          return {
            ...prev,
            ...loadedMaterial,
            playerSettings: normalizePlayerSettings(
              loadedMaterial.playerSettings || prev.playerSettings,
            ),
            proToolsSettings: normalizeProToolsSettings(
              loadedMaterial.proToolsSettings || prev.proToolsSettings,
            ),
            additionalModels: Array.isArray(loadedMaterial.additionalModels)
              ? loadedMaterial.additionalModels
              : [],
            flows: normalizeFlowDefinitions(loadedMaterial.flows),
            authoredAnimations: normalizeAuthoredAnimationDefinitions(loadedMaterial.authoredAnimations),
            procedures: normalizeProceduralDefinitions(loadedMaterial.procedures),
            quizzes: normalizeQuizDefinitions(loadedMaterial.quizzes),
            slides: normalizeSlideDefinitions(loadedMaterial.slides),
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
    rawSetMaterial,
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
          additionalModels: importedAdditionalModels = [],
          scene: importedScene,
        } = await importVXPack(file);

        rawSetMaterial({
          ...importedMaterial,
          modelUrl: manifest.modelUrl,
          playerSettings: normalizePlayerSettings(importedMaterial.playerSettings),
          proToolsSettings: normalizeProToolsSettings(importedMaterial.proToolsSettings),
          additionalModels: Array.isArray(importedMaterial.additionalModels)
            ? importedMaterial.additionalModels
            : [],
          flows: normalizeFlowDefinitions(importedMaterial.flows),
          authoredAnimations: normalizeAuthoredAnimationDefinitions(importedMaterial.authoredAnimations),
          procedures: normalizeProceduralDefinitions(importedMaterial.procedures),
          quizzes: normalizeQuizDefinitions(importedMaterial.quizzes),
          slides: normalizeSlideDefinitions(importedMaterial.slides),
        });
        setModelUrl(manifest.modelUrl);
        setMaterialModelUrl(
          importedModelFile?.name || manifest.originalModelUrl || "",
        );
        setModelFile(importedModelFile);
        setAdditionalModels(importedAdditionalModels);
        if (projectId && projectId !== "demo") {
          for (const additionalModel of importedAdditionalModels) {
            if (!additionalModel?.id || !(additionalModel.file instanceof Blob)) continue;
            await saveAdditionalProjectModelFile(
              projectId,
              additionalModel.id,
              additionalModel.file,
            );
          }
        }
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

  const handleAddAdditionalGlbFiles = useCallback(
    async (files = []) => {
      if (!projectId || projectId === "demo") {
        throw new Error("Save/open a Viqubed project before adding another GLB.");
      }

      const incomingFiles = Array.from(files || []).filter(Boolean);
      if (incomingFiles.length === 0) return [];

      const validations = await Promise.all(
        incomingFiles.map(async (file) => ({
          file,
          validation: await validateGlbFile(file),
        })),
      );
      const invalidEntry = validations.find(({ validation }) => !validation.valid);

      if (invalidEntry) {
        throw new Error(
          `${invalidEntry.file.name}: ${
            invalidEntry.validation.errors?.[0] || "GLB is not valid."
          }`,
        );
      }

      const addedModels = [];
      const detectedLicenseEntries = [];

      try {
        for (let index = 0; index < incomingFiles.length; index += 1) {
          const file = incomingFiles[index];
          const runtimeModel = await addAdditionalModelFile(projectId, file);
          addedModels.push(runtimeModel);

          const detected = validations[index]?.validation?.info?.licenseMetadata;
          if (detected) {
            detectedLicenseEntries.push(
              normalizeModelLicenseEntry({
                ...detected,
                modelAssetId: runtimeModel.id,
                modelName:
                  detected.modelName || runtimeModel.name || runtimeModel.fileName,
              }),
            );
          }
        }
      } catch (error) {
        await Promise.allSettled(
          addedModels.map((model) =>
            removeAdditionalModelFile(projectId, model.id),
          ),
        );
        throw error;
      }

      setAdditionalModels((current) => {
        const byId = new Map(current.map((model) => [model.id, model]));
        addedModels.forEach((model) => byId.set(model.id, model));
        return Array.from(byId.values());
      });

      updateMaterialState((current) => {
        let modelLicenses = current?.modelLicenses || [];
        detectedLicenseEntries.forEach((entry) => {
          modelLicenses = upsertModelLicenseEntry(modelLicenses, entry);
        });

        return {
          ...current,
          additionalModels: [
            ...(Array.isArray(current?.additionalModels)
              ? current.additionalModels
              : []),
            ...addedModels.map((model) => ({
              id: model.id,
              name: model.name || model.fileName,
              fileName: model.fileName,
              fileType: model.fileType,
              fileSize: model.fileSize,
            })),
          ],
          modelLicenses,
        };
      });

      return addedModels;
    },
    [
      addAdditionalModelFile,
      projectId,
      removeAdditionalModelFile,
      updateMaterialState,
    ],
  );

  const handleRemoveAdditionalGlb = useCallback(
    async (modelId) => {
      if (!projectId || !modelId) return false;
      await removeAdditionalModelFile(projectId, modelId);
      setAdditionalModels((current) =>
        current.filter((model) => model.id !== modelId),
      );
      updateMaterialState((current) => ({
        ...current,
        additionalModels: (current?.additionalModels || []).filter(
          (model) => model?.id !== modelId,
        ),
        modelLicenses: removeModelLicenseEntry(
          current?.modelLicenses,
          modelId,
        ),
      }));
      return true;
    },
    [projectId, removeAdditionalModelFile, updateMaterialState],
  );

  const modelLicenseModels = useMemo(
    () =>
      createModelLicenseCatalog({
        entries: material?.modelLicenses,
        primaryFileName: modelFile?.name || materialModelUrl || "model.glb",
        additionalModels,
        additionalEnabled: true,
      }),
    [additionalModels, material?.modelLicenses, materialModelUrl, modelFile?.name],
  );

  const handleUpdateModelLicense = useCallback(
    (modelAssetId, patch = {}) => {
      if (!modelAssetId) return null;

      return updateMaterialState((current) => ({
        ...current,
        modelLicenses: upsertModelLicenseEntry(current?.modelLicenses, {
          ...(current?.modelLicenses || []).find(
            (entry) => entry?.modelAssetId === modelAssetId,
          ),
          ...patch,
          modelAssetId,
        }),
      }));
    },
    [updateMaterialState],
  );

  const handleReadModelLicenseMetadata = useCallback(
    async (modelAssetId) => {
      if (!modelAssetId) {
        throw new Error("Model license target is missing.");
      }

      const runtimeModel =
        modelAssetId === PRIMARY_MODEL_ASSET_ID
          ? {
              id: PRIMARY_MODEL_ASSET_ID,
              file: modelFile,
              fileName: modelFile?.name || materialModelUrl || "model.glb",
            }
          : additionalModels.find((model) => model?.id === modelAssetId);

      if (!(runtimeModel?.file instanceof Blob)) {
        throw new Error("GLB file is not available for metadata reading.");
      }

      const detected = await readGlbLicenseMetadata(runtimeModel.file, {
        modelAssetId,
        fileName: runtimeModel.fileName || runtimeModel.name || "model.glb",
      });

      if (detected.metadataDetected) {
        const patch = {
          metadataDetected: true,
          metadataCopyright: detected.metadataCopyright,
          metadataGenerator: detected.metadataGenerator,
          metadataReadAt: detected.metadataReadAt,
        };

        if (detected.metadataModelNameDetected && detected.modelName) {
          patch.modelName = detected.modelName;
        }
        if (detected.creatorName) patch.creatorName = detected.creatorName;
        if (detected.license) patch.license = detected.license;
        if (detected.sourceUrl) patch.sourceUrl = detected.sourceUrl;

        handleUpdateModelLicense(modelAssetId, patch);
      }
      return detected;
    },
    [
      additionalModels,
      handleUpdateModelLicense,
      materialModelUrl,
      modelFile,
    ],
  );

  return {
    material,
    setMaterial: updateMaterialState,
    rawSetMaterial,
    modelUrl,
    modelFile,
    additionalModels,
    materialModelUrl,
    modelLicenseModels,
    handleUpdateModelLicense,
    handleReadModelLicenseMetadata,
    availableModels,
    loadChapterRecord,
    loadFlowRecord,
    loadAnimationRecord,
    loadProcedureRecord,
    loadQuizRecord,
    loadSlideRecord,
    handleFile,
    handleAddAdditionalGlbFiles,
    handleRemoveAdditionalGlb,
  };
}
