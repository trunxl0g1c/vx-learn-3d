import { useCallback, useEffect, useMemo, useRef } from "react";
import { createAnimationPlaybackManagerAdapter } from "../managers/AnimationPlaybackManager";
import { isLazyMaterialRecord } from "../engine/project/LazyMaterialRecords";

function normalizeRuntimeConfig(animation, config = {}) {
  const defaultLoop = animation?.settings?.loop === true;
  const defaultSpeed = Number(animation?.settings?.speed) || 1;
  const speed = Number(config.speed ?? defaultSpeed);

  return {
    loop: config.loop ?? defaultLoop,
    speed: Number.isFinite(speed) && speed > 0 ? speed : 1,
  };
}

export function useEditorAnimationPlayback({
  enabled = false,
  modelScene,
  animationEngine = null,
  hydrateAnimationRecord = null,
  showObjects,
  highlightObjects,
  focusObjects,
}) {
  const manager = useMemo(
    () => createAnimationPlaybackManagerAdapter(animationEngine),
    [animationEngine],
  );
  const targetRequestRef = useRef(0);
  const playbackRef = useRef({
    token: 0,
    frameId: 0,
    entries: [],
    tick: null,
  });

  const resolveAuthoredDefinition = useCallback(
    async (animation) => {
      let definition = animation;

      if (
        definition?.id &&
        isLazyMaterialRecord(definition, "authoredAnimations") &&
        hydrateAnimationRecord
      ) {
        definition =
          (await hydrateAnimationRecord(definition.id)) || definition;
      }

      return manager.normalizeAuthoredDefinition(definition);
    },
    [hydrateAnimationRecord, manager],
  );

  const resolveEntries = useCallback(
    async (entries = []) =>
      Promise.all(
        (Array.isArray(entries) ? entries : []).map(async (entry) => ({
          ...entry,
          animation:
            entry?.source === "authored"
              ? await resolveAuthoredDefinition(entry.animation)
              : entry?.animation,
        })),
      ),
    [resolveAuthoredDefinition],
  );

  const presentTargetObjects = useCallback(
    (targets = []) => {
      const resolvedTargets = Array.from(new Set(targets.filter(Boolean)));
      if (resolvedTargets.length === 0) return false;

      showObjects?.(resolvedTargets);
      modelScene?.updateMatrixWorld?.(true);
      highlightObjects?.(
        resolvedTargets,
        resolvedTargets.at(-1) || null,
        { openInfo: false },
      );
      focusObjects?.(resolvedTargets);
      return true;
    },
    [focusObjects, highlightObjects, modelScene, showObjects],
  );

  const focusAnimationTargets = useCallback(
    async (entries = []) => {
      if (!modelScene) return false;
      const requestId = targetRequestRef.current + 1;
      targetRequestRef.current = requestId;

      try {
        const resolvedEntries = await resolveEntries(entries);
        if (targetRequestRef.current !== requestId) return false;

        const targets = resolvedEntries.flatMap((entry) =>
          manager.resolveTargets(modelScene, entry),
        );
        return presentTargetObjects(targets);
      } catch (error) {
        if (targetRequestRef.current === requestId) {
          console.error("Failed to focus animation objects:", error);
        }
        return false;
      }
    },
    [manager, modelScene, presentTargetObjects, resolveEntries],
  );

  const stopAuthoredAnimations = useCallback(
    (reset = true) => {
      const state = playbackRef.current;
      state.token += 1;

      if (state.frameId) cancelAnimationFrame(state.frameId);
      state.frameId = 0;
      state.tick = null;

      if (reset) {
        state.entries.forEach((entry) => {
          manager.restoreBaseline(entry.baseline || []);
        });
        modelScene?.updateMatrixWorld?.(true);
      }

      state.entries = [];
      return true;
    },
    [manager, modelScene],
  );

  const playAuthoredAnimations = useCallback(
    async (items = [], options = {}) => {
      const playableItems = (Array.isArray(items) ? items : []).filter(
        (item) => item?.animation,
      );
      if (!modelScene || playableItems.length === 0) return false;

      stopAuthoredAnimations(true);
      const state = playbackRef.current;
      const token = state.token;

      try {
        const resolved = await Promise.all(
          playableItems.map(async (item) => ({
            definition: await resolveAuthoredDefinition(item.animation),
            config: normalizeRuntimeConfig(item.animation, item),
          })),
        );
        if (playbackRef.current.token !== token) return false;

        if (options.focusTargets !== false) {
          const definitionById = new Map(
            resolved.map((item) => [item.definition.id, item.definition]),
          );
          const targetEntries =
            options.targetEntries ||
            playableItems.map((item) => ({
              source: "authored",
              animation: item.animation,
            }));

          await focusAnimationTargets(
            targetEntries.map((entry) => ({
              ...entry,
              animation:
                entry?.source === "authored"
                  ? definitionById.get(entry.animation?.id) || entry.animation
                  : entry.animation,
            })),
          );
          if (playbackRef.current.token !== token) return false;
        }

        const startedAt = performance.now();
        const entries = resolved
          .filter((item) => item.definition?.tracks?.length)
          .map(({ definition, config }) => ({
            animationId: definition.id,
            definition,
            baseline: manager.captureBaseline(modelScene, definition),
            duration: Math.max(0.1, Number(definition.duration) || 2),
            loop: config.loop === true,
            speed: config.speed,
            currentTime: 0,
            startedAt,
          }));
        if (entries.length === 0) return false;

        state.entries = entries;
        const tick = (now) => {
          if (playbackRef.current.token !== token) return;
          let keepPlaying = false;

          state.entries.forEach((entry) => {
            const elapsed = Math.max(
              0,
              ((now - entry.startedAt) / 1000) * entry.speed,
            );
            const time = entry.loop
              ? elapsed % entry.duration
              : Math.min(elapsed, entry.duration);
            entry.currentTime = time;
            manager.applyAtTime(
              modelScene,
              entry.definition,
              time,
              entry.baseline,
            );
            if (entry.loop || elapsed < entry.duration) keepPlaying = true;
          });

          if (keepPlaying) {
            state.frameId = requestAnimationFrame(tick);
          } else {
            state.frameId = 0;
          }
        };

        state.tick = tick;
        state.frameId = requestAnimationFrame(tick);
        return true;
      } catch (error) {
        if (playbackRef.current.token === token) {
          console.error("Failed to play authored animation:", error);
        }
        return false;
      }
    },
    [
      focusAnimationTargets,
      manager,
      modelScene,
      resolveAuthoredDefinition,
      stopAuthoredAnimations,
    ],
  );

  const updateAuthoredAnimationConfig = useCallback(
    (animationId, changes = {}) => {
      const entry = playbackRef.current.entries.find(
        (item) => item.animationId === animationId,
      );
      if (!entry) return false;

      const now = performance.now();
      const nextSpeed = Number(changes.speed ?? entry.speed);
      const normalizedSpeed =
        Number.isFinite(nextSpeed) && nextSpeed > 0 ? nextSpeed : 1;
      entry.startedAt = now - (entry.currentTime / normalizedSpeed) * 1000;
      entry.speed = normalizedSpeed;
      if (Object.prototype.hasOwnProperty.call(changes, "loop")) {
        entry.loop = changes.loop === true;
      }

      const state = playbackRef.current;
      if (!state.frameId && entry.loop && state.tick) {
        state.frameId = requestAnimationFrame(state.tick);
      }
      return true;
    },
    [],
  );

  useEffect(() => {
    if (enabled) return;
    targetRequestRef.current += 1;
    stopAuthoredAnimations(true);
  }, [enabled, stopAuthoredAnimations]);

  useEffect(
    () => () => {
      targetRequestRef.current += 1;
      stopAuthoredAnimations(true);
    },
    [stopAuthoredAnimations],
  );

  return {
    focusAnimationTargets,
    playAuthoredAnimations,
    stopAuthoredAnimations,
    updateAuthoredAnimationConfig,
  };
}

export default useEditorAnimationPlayback;
