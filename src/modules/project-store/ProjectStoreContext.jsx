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
  // Local save (IndexedDB) and backend sync are now independent: every edit
  // still autosaves locally, but nothing pushes to the database until the
  // user presses "Bulk Update" in EditorTopBar. pendingSync tracks whether
  // there are local changes the backend doesn't have yet — it's set on every
  // edit (alongside dirty) but only cleared by markSynced(), not by the
  // local-only markSaved().
  const [pendingSync, setPendingSync] = useState(false);

  const markDirty = useCallback(() => {
    setDirty(true);
    setSaveStatus("saving");
    setPendingSync(true);
  }, []);

  const markSaved = useCallback(() => {
    setDirty(false);
    setSaveStatus("saved");
  }, []);

  const markSaveError = useCallback(() => {
    setSaveStatus("error");
  }, []);

  const markSynced = useCallback(() => {
    setPendingSync(false);
  }, []);

  const updateProjectDraft = useCallback((updater) => {
    setProjectDraft((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return next;
    });

    setDirty(true);
    setSaveStatus("saving");
    setPendingSync(true);
  }, []);

  const resetProjectStore = useCallback(() => {
    setCurrentProject(null);
    setProjectDraft(null);
    setDirty(false);
    setSaveStatus("saved");
    setPendingSync(false);
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

      pendingSync,

      markDirty,
      markSaved,
      markSaveError,
      markSynced,
      resetProjectStore,
    }),
    [
      currentProject,
      projectDraft,
      updateProjectDraft,
      dirty,
      saveStatus,
      pendingSync,
      markDirty,
      markSaved,
      markSaveError,
      markSynced,
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