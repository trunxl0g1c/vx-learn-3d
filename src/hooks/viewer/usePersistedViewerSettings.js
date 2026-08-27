import { useCallback, useRef, useState } from "react";
import {
  applyTopLevelHistorySnapshot,
  createTopLevelHistorySnapshot,
} from "../../engine/history";

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

export function usePersistedViewerSettings({
  createInitialSettings,
  markDirty,
  historyEngine,
}) {
  const settingsRef = useRef(null);
  const [settings, setSettingsState] = useState(() => {
    const initialSettings = createInitialSettings();
    settingsRef.current = initialSettings;
    return initialSettings;
  });

  const setSettings = useCallback((updater) => {
    const previousSettings = settingsRef.current;
    const nextSettings =
      typeof updater === "function"
        ? updater(previousSettings)
        : updater;

    if (Object.is(previousSettings, nextSettings)) return previousSettings;

    settingsRef.current = nextSettings;
    setSettingsState(nextSettings);
    return nextSettings;
  }, []);

  const applySettingsHistorySnapshot = useCallback(
    (snapshot) => {
      const nextSettings = applyTopLevelHistorySnapshot(
        settingsRef.current,
        snapshot,
      );
      settingsRef.current = nextSettings;
      setSettingsState(nextSettings);
      markDirty();
    },
    [markDirty],
  );

  const updatePersistedSettings = useCallback(
    (updater) => {
      const previousSettings = settingsRef.current;
      const nextSettings =
        typeof updater === "function"
          ? updater(previousSettings)
          : updater;

      if (Object.is(previousSettings, nextSettings)) return previousSettings;

      const changedKeys = getChangedTopLevelKeys(previousSettings, nextSettings);

      if (changedKeys.length > 0) {
        historyEngine?.recordSnapshot?.({
          label: "Edit viewer settings",
          before: createTopLevelHistorySnapshot(previousSettings, changedKeys),
          after: createTopLevelHistorySnapshot(nextSettings, changedKeys),
          apply: applySettingsHistorySnapshot,
          mergeKey: `viewer-settings:${changedKeys.join(",")}`,
          mergeWindowMs: 500,
        });
      }

      settingsRef.current = nextSettings;
      setSettingsState(nextSettings);
      markDirty();
      return nextSettings;
    },
    [applySettingsHistorySnapshot, historyEngine, markDirty],
  );

  return {
    settings,
    setSettings,
    updatePersistedSettings,
  };
}
