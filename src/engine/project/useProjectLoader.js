import { useCallback, useEffect, useRef, useState } from "react";
import {
  getProjectFromIndexedDb,
  getProjectFileFromIndexedDb,
  getProjectDraftFromIndexedDb,
  getAdditionalProjectModelFilesFromIndexedDb,
  saveAdditionalProjectModelFile,
  deleteAdditionalProjectModelFile,
  updateProjectInIndexedDb,
  saveProjectToIndexedDb,
} from "../../modules/project-hub/storage/projectIndexedDb";
import { readGlbLicenseMetadata } from "../model/GlbLicenseMetadata";
import {
  mergeDetectedModelLicenses,
  PRIMARY_MODEL_ASSET_ID,
} from "./ModelLicenseSettings";
import { waitForProjectWrites } from "../../modules/project-hub/storage/projectWriteCoordinator";

const OBJECT_URL_RELEASE_DELAY_MS = 15000;

async function readProjectWithCompatibilityFallback(projectId) {
  try {
    return await getProjectFromIndexedDb(projectId, { mode: "summary" });
  } catch (summaryError) {
    console.warn(
      "Partial project read failed; retrying with full legacy hydration.",
      summaryError,
    );

    return getProjectFromIndexedDb(projectId, { mode: "full" });
  }
}

async function readDraftWithCompatibilityFallback(projectId) {
  try {
    return await getProjectDraftFromIndexedDb(projectId, {
      mode: "summary",
    });
  } catch (summaryError) {
    console.warn(
      "Partial draft read failed; retrying with full legacy hydration.",
      summaryError,
    );

    try {
      return await getProjectDraftFromIndexedDb(projectId, {
        mode: "full",
      });
    } catch (fullError) {
      console.warn(
        "Legacy draft could not be loaded; the saved project will be used.",
        fullError,
      );
      return null;
    }
  }
}

function withDetectedModelLicenses(material, detectedLicenses = []) {
  if (!material || typeof material !== "object") return material;

  return {
    ...material,
    modelLicenses: mergeDetectedModelLicenses(
      material.modelLicenses,
      detectedLicenses,
    ),
  };
}

function createLoadedProjectSnapshot({ storedProject, fileData, initialDraft, objectUrl, additionalModels = [] }) {
  const normalizedProjectId = storedProject.id;
  const normalizedProjectName = storedProject.name || "Untitled Project";
  const normalizedFileName =
    fileData.fileName || storedProject.fileName || "model.glb";

  return {
    project: storedProject,
    projectFile: fileData.blob,
    projectDraft: initialDraft,

    projectId: normalizedProjectId,
    projectName: normalizedProjectName,
    glbUrl: objectUrl,
    glbFileName: normalizedFileName,
    additionalModels,

    material: initialDraft.material || storedProject.material || null,
    viewer: initialDraft.viewer || storedProject.viewer || null,
    scene: initialDraft.scene || storedProject.scene || null,
  };
}

export default function useProjectLoader() {
  const objectUrlRef = useRef(null);
  const additionalObjectUrlsRef = useRef(new Map());
  const loadedSnapshotRef = useRef(null);
  const activeLoadRef = useRef({ projectId: null, promise: null });
  const loadSequenceRef = useRef(0);
  const revokeTimersRef = useRef(new Set());

  const [project, setProject] = useState(null);
  const [projectFile, setProjectFile] = useState(null);
  const [projectDraft, setProjectDraft] = useState(null);

  const [projectId, setProjectId] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [glbUrl, setGlbUrl] = useState(null);
  const [glbFileName, setGlbFileName] = useState("");

  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const scheduleObjectUrlRevocation = useCallback((url) => {
    if (!url) return;

    const timer = globalThis.setTimeout(() => {
      URL.revokeObjectURL(url);
      revokeTimersRef.current.delete(timer);
    }, OBJECT_URL_RELEASE_DELAY_MS);

    revokeTimersRef.current.add(timer);
  }, []);

  const releaseCurrentObjectUrl = useCallback(() => {
    const currentUrl = objectUrlRef.current;
    objectUrlRef.current = null;

    if (currentUrl) {
      // GLTFLoader can still be decoding embedded images when React starts a
      // replacement load or unmounts the scene. Delayed release prevents the
      // active blob resource from disappearing during that final decode phase.
      scheduleObjectUrlRevocation(currentUrl);
    }
  }, [scheduleObjectUrlRevocation]);

  const releaseAdditionalObjectUrls = useCallback(() => {
    additionalObjectUrlsRef.current.forEach((url) => {
      scheduleObjectUrlRevocation(url);
    });
    additionalObjectUrlsRef.current.clear();
  }, [scheduleObjectUrlRevocation]);

  const applySnapshotToState = useCallback((snapshot) => {
    setProject(snapshot.project);
    setProjectFile(snapshot.projectFile);
    setProjectDraft(snapshot.projectDraft);

    setProjectId(snapshot.projectId);
    setProjectName(snapshot.projectName);
    setGlbUrl(snapshot.glbUrl);
    setGlbFileName(snapshot.glbFileName);
  }, []);

  const loadProject = useCallback(
    async (id, { force = false } = {}) => {
      if (!id || id === "demo") {
        setLoadError("Project ID tidak valid.");
        return null;
      }

      if (!force && loadedSnapshotRef.current?.projectId === id) {
        return loadedSnapshotRef.current;
      }

      if (!force && activeLoadRef.current.projectId === id) {
        return activeLoadRef.current.promise;
      }

      const loadSequence = ++loadSequenceRef.current;
      setIsLoadingProject(true);
      setLoadError(null);

      const loadPromise = (async () => {
        try {
          // A previous ViewerPage instance may still be completing Project A
          // persistence after navigation. Hydrate only after that write lane is
          // drained so summaries/lazy records are read from one consistent save.
          await waitForProjectWrites(id);

          if (loadSequence !== loadSequenceRef.current) {
            return null;
          }

          const storedProject = await readProjectWithCompatibilityFallback(id);

          if (!storedProject) {
            throw new Error("Project tidak ditemukan di IndexedDB.");
          }

          const fileData = await getProjectFileFromIndexedDb(id);

          if (!(fileData?.blob instanceof Blob) || fileData.blob.size <= 0) {
            throw new Error("File GLB project tidak ditemukan atau kosong.");
          }

          const additionalModelFiles =
            await getAdditionalProjectModelFilesFromIndexedDb(id);

          updateProjectInIndexedDb(storedProject.id, {
            metadata: {
              ...(storedProject.metadata || {}),
              lastOpenedAt: new Date().toISOString(),
            },
          }).catch((error) => {
            console.warn("Unable to update project last-opened time", error);
          });

          const savedDraft = await readDraftWithCompatibilityFallback(id);

          if (loadSequence !== loadSequenceRef.current) {
            return null;
          }

          let initialDraft = savedDraft || {
            projectId: storedProject.id,
            material: storedProject.material || null,
            viewer: storedProject.viewer || null,
            scene: storedProject.scene || null,
            updatedAt: new Date().toISOString(),
          };

          const primaryFileName =
            fileData.fileName || storedProject.fileName || "model.glb";
          const detectedLicenses = [];

          try {
            detectedLicenses.push(
              await readGlbLicenseMetadata(fileData.blob, {
                modelAssetId: PRIMARY_MODEL_ASSET_ID,
                fileName: primaryFileName,
              }),
            );
          } catch (metadataError) {
            console.warn("Unable to read primary GLB license metadata", metadataError);
          }

          const objectUrl = URL.createObjectURL(fileData.blob);
          const previousUrl = objectUrlRef.current;
          objectUrlRef.current = objectUrl;

          if (previousUrl && previousUrl !== objectUrl) {
            scheduleObjectUrlRevocation(previousUrl);
          }

          releaseAdditionalObjectUrls();
          const additionalDescriptors = Array.isArray(
            initialDraft?.material?.additionalModels,
          )
            ? initialDraft.material.additionalModels
            : Array.isArray(storedProject?.material?.additionalModels)
              ? storedProject.material.additionalModels
              : [];
          const descriptorById = new Map(
            additionalDescriptors.map((descriptor) => [descriptor?.id, descriptor]),
          );
          const additionalModels = additionalModelFiles
            .filter((record) => record?.modelId && record?.blob instanceof Blob)
            .map((record) => {
              const url = URL.createObjectURL(record.blob);
              additionalObjectUrlsRef.current.set(record.modelId, url);
              const descriptor = descriptorById.get(record.modelId) || {};

              return {
                ...descriptor,
                id: record.modelId,
                name: descriptor.name || record.fileName || "Additional GLB",
                fileName: record.fileName || descriptor.fileName || "model.glb",
                fileType: record.fileType || "model/gltf-binary",
                fileSize: Number(record.fileSize || record.blob.size || 0),
                url,
                file: record.blob,
              };
            })
            .sort((a, b) => {
              const ai = additionalDescriptors.findIndex((item) => item?.id === a.id);
              const bi = additionalDescriptors.findIndex((item) => item?.id === b.id);
              if (ai < 0 && bi < 0) return 0;
              if (ai < 0) return 1;
              if (bi < 0) return -1;
              return ai - bi;
            });

          for (const model of additionalModels) {
            if (!(model?.file instanceof Blob) || !model?.id) continue;
            try {
              detectedLicenses.push(
                await readGlbLicenseMetadata(model.file, {
                  modelAssetId: model.id,
                  fileName: model.fileName || model.name || "model.glb",
                }),
              );
            } catch (metadataError) {
              console.warn(
                `Unable to read GLB license metadata for ${model.fileName || model.id}`,
                metadataError,
              );
            }
          }

          const detectedMaterial = withDetectedModelLicenses(
            initialDraft.material || storedProject.material || null,
            detectedLicenses,
          );
          initialDraft = {
            ...initialDraft,
            material: detectedMaterial,
          };

          const snapshot = createLoadedProjectSnapshot({
            storedProject,
            fileData,
            initialDraft,
            objectUrl,
            additionalModels,
          });

          loadedSnapshotRef.current = snapshot;

          if (loadSequence === loadSequenceRef.current) {
            applySnapshotToState(snapshot);
          }

          return snapshot;
        } catch (error) {
          console.error("Failed to load project:", error);

          if (loadSequence === loadSequenceRef.current) {
            setLoadError(error.message || "Gagal memuat project.");
          }

          return null;
        } finally {
          if (loadSequence === loadSequenceRef.current) {
            setIsLoadingProject(false);
          }
        }
      })();

      activeLoadRef.current = { projectId: id, promise: loadPromise };

      try {
        return await loadPromise;
      } finally {
        if (activeLoadRef.current.promise === loadPromise) {
          activeLoadRef.current = { projectId: null, promise: null };
        }
      }
    },
    [applySnapshotToState, releaseAdditionalObjectUrls, scheduleObjectUrlRevocation],
  );

  const addAdditionalModelFile = useCallback(
    async (id, file) => {
      if (!id || id === "demo") {
        throw new Error("Additional GLB requires a saved project.");
      }
      if (!(file instanceof Blob) || file.size <= 0) {
        throw new Error("GLB file is empty or invalid.");
      }

      const modelId = globalThis.crypto?.randomUUID?.() ||
        `glb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const record = await saveAdditionalProjectModelFile(id, modelId, file);
      const url = URL.createObjectURL(record.blob);
      additionalObjectUrlsRef.current.set(modelId, url);

      const runtimeModel = {
        id: modelId,
        name: record.fileName || file.name || "Additional GLB",
        fileName: record.fileName || file.name || "model.glb",
        fileType: record.fileType || file.type || "model/gltf-binary",
        fileSize: Number(record.fileSize || file.size || 0),
        url,
        file: record.blob,
      };

      if (loadedSnapshotRef.current?.projectId === id) {
        loadedSnapshotRef.current = {
          ...loadedSnapshotRef.current,
          additionalModels: [
            ...(loadedSnapshotRef.current.additionalModels || []).filter(
              (model) => model.id !== modelId,
            ),
            runtimeModel,
          ],
        };
      }

      return runtimeModel;
    },
    [],
  );

  const removeAdditionalModelFile = useCallback(
    async (id, modelId) => {
      if (!id || !modelId) return false;
      await deleteAdditionalProjectModelFile(id, modelId);

      const url = additionalObjectUrlsRef.current.get(modelId);
      if (url) {
        additionalObjectUrlsRef.current.delete(modelId);
        scheduleObjectUrlRevocation(url);
      }

      if (loadedSnapshotRef.current?.projectId === id) {
        loadedSnapshotRef.current = {
          ...loadedSnapshotRef.current,
          additionalModels: (loadedSnapshotRef.current.additionalModels || []).filter(
            (model) => model.id !== modelId,
          ),
        };
      }

      return true;
    },
    [scheduleObjectUrlRevocation],
  );

  const updateProject = useCallback(async (updatedProject, file) => {
    if (!updatedProject?.id) return null;

    await saveProjectToIndexedDb(updatedProject, file);
    setProject(updatedProject);

    if (loadedSnapshotRef.current?.projectId === updatedProject.id) {
      loadedSnapshotRef.current = {
        ...loadedSnapshotRef.current,
        project: updatedProject,
        projectFile: file || loadedSnapshotRef.current.projectFile,
      };
    }

    return updatedProject;
  }, []);

  const clearLoadedProject = useCallback(() => {
    loadSequenceRef.current += 1;
    activeLoadRef.current = { projectId: null, promise: null };
    loadedSnapshotRef.current = null;
    releaseCurrentObjectUrl();
    releaseAdditionalObjectUrls();

    setProject(null);
    setProjectFile(null);
    setProjectDraft(null);
    setProjectId(null);
    setProjectName("");
    setGlbUrl(null);
    setGlbFileName("");
    setLoadError(null);
    setIsLoadingProject(false);
  }, [releaseAdditionalObjectUrls, releaseCurrentObjectUrl]);

  useEffect(() => {
    return () => {
      loadSequenceRef.current += 1;
      releaseCurrentObjectUrl();
      releaseAdditionalObjectUrls();
    };
  }, [releaseAdditionalObjectUrls, releaseCurrentObjectUrl]);

  return {
    project,
    projectFile,
    projectDraft,
    projectId,
    projectName,
    glbUrl,
    glbFileName,
    isLoadingProject,
    loadError,
    loadProject,
    addAdditionalModelFile,
    removeAdditionalModelFile,
    updateProject,
    clearLoadedProject,
  };
}
