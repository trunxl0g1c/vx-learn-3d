import { useCallback, useEffect, useRef, useState } from "react";
import {
  getProjectFromIndexedDb,
  getProjectFileFromIndexedDb,
  getProjectDraftFromIndexedDb,
  updateProjectInIndexedDb,
  saveProjectToIndexedDb,
} from "../../modules/project-hub/storage/projectIndexedDb";

export default function useProjectLoader() {
  const objectUrlRef = useRef(null);

  const [project, setProject] = useState(null);
  const [projectFile, setProjectFile] = useState(null);
  const [projectDraft, setProjectDraft] = useState(null);

  const [projectId, setProjectId] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [glbUrl, setGlbUrl] = useState(null);
  const [glbFileName, setGlbFileName] = useState("");

  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const revokeCurrentObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const loadProject = useCallback(
    async (id) => {
      if (!id || id === "demo") {
        setLoadError("Project ID tidak valid.");
        return null;
      }

      setIsLoadingProject(true);
      setLoadError(null);

      try {
        revokeCurrentObjectUrl();

        const storedProject = await getProjectFromIndexedDb(id);

        if (!storedProject) {
          throw new Error("Project tidak ditemukan di IndexedDB.");
        }

        await updateProjectInIndexedDb(storedProject.id, {
          metadata: {
            ...(storedProject.metadata || {}),
            lastOpenedAt: new Date().toISOString(),
          },
        });

        const fileData = await getProjectFileFromIndexedDb(id);

        if (!fileData?.blob) {
          throw new Error("File GLB project tidak ditemukan.");
        }

        const savedDraft = await getProjectDraftFromIndexedDb(id);

        const initialDraft = savedDraft || {
          projectId: storedProject.id,
          material: storedProject.material || null,
          viewer: storedProject.viewer || null,
          scene: storedProject.scene || null,
          updatedAt: new Date().toISOString(),
        };

        const objectUrl = URL.createObjectURL(fileData.blob);
        objectUrlRef.current = objectUrl;

        const normalizedProjectId = storedProject.id;
        const normalizedProjectName = storedProject.name || "Untitled Project";
        const normalizedFileName =
          fileData.fileName || storedProject.fileName || "model.glb";

        setProject(storedProject);
        setProjectFile(fileData.blob);
        setProjectDraft(initialDraft);

        setProjectId(normalizedProjectId);
        setProjectName(normalizedProjectName);
        setGlbUrl(objectUrl);
        setGlbFileName(normalizedFileName);

        return {
          project: storedProject,
          projectFile: fileData.blob,
          projectDraft: initialDraft,

          projectId: normalizedProjectId,
          projectName: normalizedProjectName,
          glbUrl: objectUrl,
          glbFileName: normalizedFileName,

          material: initialDraft.material || storedProject.material || null,
          viewer: initialDraft.viewer || storedProject.viewer || null,
          scene: initialDraft.scene || storedProject.scene || null,
        };
      } catch (error) {
        console.error("Failed to load project:", error);
        setLoadError(error.message || "Gagal memuat project.");
        return null;
      } finally {
        setIsLoadingProject(false);
      }
    },
    [revokeCurrentObjectUrl]
  );

  const updateProject = useCallback(async (updatedProject, file) => {
    if (!updatedProject?.id) return null;

    await saveProjectToIndexedDb(updatedProject, file);
    setProject(updatedProject);

    return updatedProject;
  }, []);

  const clearLoadedProject = useCallback(() => {
    revokeCurrentObjectUrl();

    setProject(null);
    setProjectFile(null);
    setProjectDraft(null);

    setProjectId(null);
    setProjectName("");
    setGlbUrl(null);
    setGlbFileName("");

    setLoadError(null);
    setIsLoadingProject(false);
  }, [revokeCurrentObjectUrl]);

  useEffect(() => {
    return () => {
      revokeCurrentObjectUrl();
    };
  }, [revokeCurrentObjectUrl]);

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
    updateProject,
    clearLoadedProject,
  };
}