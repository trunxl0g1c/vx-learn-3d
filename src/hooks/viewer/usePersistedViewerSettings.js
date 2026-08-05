import { useCallback, useRef, useState } from "react";

export function usePersistedViewerSettings({
  createInitialSettings,
  markDirty,
}) {
  const settingsRef = useRef(null);
  const [settings, setSettingsState] = useState(() => {
    const initialSettings = createInitialSettings();
    settingsRef.current = initialSettings;
    return initialSettings;
  });

  const setSettings = useCallback((updater) => {
    setSettingsState((previousSettings) => {
      const nextSettings =
        typeof updater === "function"
          ? updater(previousSettings)
          : updater;

      settingsRef.current = nextSettings;
      return nextSettings;
    });
  }, []);

  const updatePersistedSettings = useCallback(
    (updater) => {
      const previousSettings = settingsRef.current;
      const nextSettings =
        typeof updater === "function"
          ? updater(previousSettings)
          : updater;

      if (Object.is(previousSettings, nextSettings)) return;

      settingsRef.current = nextSettings;
      setSettingsState(nextSettings);
      markDirty();
    },
    [markDirty],
  );

  return {
    settings,
    setSettings,
    updatePersistedSettings,
  };
}
