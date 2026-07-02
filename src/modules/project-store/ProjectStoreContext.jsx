import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const ProjectStoreContext = createContext(null);

export function ProjectStoreProvider({ children }) {
  const [currentProject, setCurrentProject] = useState(null);
  const [projectDraft, setProjectDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState("saved");

  const markDirty = useCallback(() => {
    setDirty(true);
    setSaveStatus("saving");
  }, []);

  const markSaved = useCallback(() => {
    setDirty(false);
    setSaveStatus("saved");
  }, []);

  const markSaveError = useCallback(() => {
    setSaveStatus("error");
  }, []);

  const updateProjectDraft = useCallback((updater) => {
    setProjectDraft((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return next;
    });

    setDirty(true);
    setSaveStatus("saving");
  }, []);

  const resetProjectStore = useCallback(() => {
    setCurrentProject(null);
    setProjectDraft(null);
    setDirty(false);
    setSaveStatus("saved");
  }, []);

  const value = useMemo(
    () => ({
      currentProject,
      setCurrentProject,

      projectDraft,
      setProjectDraft,
      updateProjectDraft,

      dirty,
      setDirty,

      saveStatus,
      setSaveStatus,

      markDirty,
      markSaved,
      markSaveError,
      resetProjectStore,
    }),
    [
      currentProject,
      projectDraft,
      updateProjectDraft,
      dirty,
      saveStatus,
      markDirty,
      markSaved,
      markSaveError,
      resetProjectStore,
    ],
  );

  return (
    <ProjectStoreContext.Provider value={value}>
      {children}
    </ProjectStoreContext.Provider>
  );
}

export function useProjectStore() {
  const context = useContext(ProjectStoreContext);

  if (!context) {
    throw new Error("useProjectStore harus dipakai di dalam ProjectStoreProvider");
  }

  return context;
}