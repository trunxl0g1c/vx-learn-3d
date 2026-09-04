import { useEffect, useRef, useState } from "react";
import { createId } from "../../../utils/createId";
import {
  createChapterAnimationPlaybackGroups,
  normalizeChapterAnimationAssignments,
} from "../../../engine/chapter";
import {
  applyAuthoredAnimationAtTime,
  captureAuthoredAnimationBaseline,
  normalizeAuthoredAnimationDefinition,
  restoreAuthoredAnimationBaseline,
} from "../../../engine/animation";
import { isLazyMaterialRecord } from "../../../engine/project/LazyMaterialRecords";
import { getAuthoredAnimationFromIndexedDb } from "../../project-hub/storage/projectIndexedDb";

export default function usePlayerAnimation(activeChapter, material, modelScene) {
  const [animations, setAnimations] = useState([]);
  const [selectedAnimations, setSelectedAnimations] = useState({});
  const [animationCommand, setAnimationCommand] = useState(null);
  const autoPlayTokenRef = useRef(0);
  const playbackTimeoutsRef = useRef([]);
  const authoredPlaybackRef = useRef({ token: 0, frameId: 0, entries: [] });

  const getChapterAnimationConfig = (chapter) => {
    const next = {};

    normalizeChapterAnimationAssignments(chapter?.animations)
      .filter((animation) => animation.source !== "authored")
      .forEach((animation) => {
        if (!animation.name) return;

        next[animation.name] = {
          selected: true,
          loop: Boolean(animation.loop),
          speed: Number(animation.speed) || 1,
        };
      });

    return next;
  };

  const stopAuthoredAnimations = (reset = true) => {
    const state = authoredPlaybackRef.current;
    state.token += 1;
    if (state.frameId) cancelAnimationFrame(state.frameId);
    state.frameId = 0;

    if (reset) {
      state.entries.forEach((entry) => {
        restoreAuthoredAnimationBaseline(entry.baseline || []);
      });
      modelScene?.updateMatrixWorld?.(true);
    }

    state.entries = [];
  };

  const resolveAuthoredDefinition = async (assignment) => {
    const authoredAnimations = Array.isArray(material?.authoredAnimations)
      ? material.authoredAnimations
      : [];
    let definition = assignment.animationId
      ? authoredAnimations.find((item) => item?.id === assignment.animationId)
      : authoredAnimations.find((item) => item?.name === assignment.name);

    if (
      definition &&
      isLazyMaterialRecord(definition, "authoredAnimations") &&
      material?.projectId
    ) {
      definition = await getAuthoredAnimationFromIndexedDb(
        material.projectId,
        definition.id,
      );
    }

    return definition ? normalizeAuthoredAnimationDefinition(definition) : null;
  };

  const clearScheduledPlayback = () => {
    playbackTimeoutsRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    playbackTimeoutsRef.current = [];
  };

  const startResolvedAuthoredAssignments = (resolved = []) => {
    if (!modelScene) return false;
    const playable = (Array.isArray(resolved) ? resolved : []).filter(
      (item) => item.definition?.tracks?.length,
    );
    if (playable.length === 0) return false;

    stopAuthoredAnimations(true);
    const token = authoredPlaybackRef.current.token + 1;
    authoredPlaybackRef.current.token = token;
    const startedAt = performance.now();
    const entries = playable.map(({ assignment, definition }) => ({
      assignment,
      definition,
      baseline: captureAuthoredAnimationBaseline(modelScene, definition),
      startedAt,
    }));

    authoredPlaybackRef.current.entries = entries;

    const tick = (now) => {
      if (authoredPlaybackRef.current.token !== token) return;
      let keepPlaying = false;

      entries.forEach((entry) => {
        const duration = Math.max(0.1, Number(entry.definition.duration) || 2);
        const speed = Math.max(0.05, Number(entry.assignment.speed) || 1);
        const elapsed = Math.max(0, ((now - entry.startedAt) / 1000) * speed);
        const loop = entry.assignment.loop === true;
        const time = loop ? elapsed % duration : Math.min(elapsed, duration);

        applyAuthoredAnimationAtTime(
          modelScene,
          entry.definition,
          time,
          entry.baseline,
        );
        if (loop || elapsed < duration) keepPlaying = true;
      });

      if (keepPlaying) {
        authoredPlaybackRef.current.frameId = requestAnimationFrame(tick);
      } else {
        authoredPlaybackRef.current.frameId = 0;
      }
    };

    authoredPlaybackRef.current.frameId = requestAnimationFrame(tick);
    return true;
  };

  const preparePlaybackGroup = async (assignments = []) => {
    const prepared = await Promise.all(
      assignments.map(async (assignment) => {
        const authored = assignment.source === "authored";
        const definition = authored
          ? await resolveAuthoredDefinition(assignment)
          : null;
        const embeddedSummary = authored
          ? null
          : animations.find((item) => item?.name === assignment.name);
        const playable = authored
          ? Boolean(definition?.tracks?.length)
          : Boolean(assignment.name);
        const sourceDuration = authored
          ? Number(definition?.duration)
          : Number(embeddedSummary?.duration);
        const speed = Math.max(0.05, Number(assignment.speed) || 1);
        const fallbackDuration = authored ? 2 : 0.1;
        const duration =
          Math.max(0.1, sourceDuration || fallbackDuration) / speed;

        return {
          assignment,
          definition,
          playable,
          duration: assignment.loop === true ? Infinity : duration,
        };
      }),
    );
    const entries = prepared.filter((item) => item.playable);

    return {
      entries,
      duration: entries.reduce(
        (longest, entry) => Math.max(longest, entry.duration),
        0,
      ),
    };
  };

  const startPlaybackGroup = (group, playToken) => {
    if (autoPlayTokenRef.current !== playToken) return;

    const embedded = group.entries.filter(
      (entry) => entry.assignment.source !== "authored",
    );
    const authored = group.entries.filter(
      (entry) => entry.assignment.source === "authored",
    );

    stopAuthoredAnimations(true);

    if (embedded.length > 0) {
      const nextSelectedAnimations = embedded.reduce((result, entry) => {
        result[entry.assignment.name] = {
          selected: true,
          loop: entry.assignment.loop === true,
          speed: Number(entry.assignment.speed) || 1,
        };
        return result;
      }, {});

      setSelectedAnimations(nextSelectedAnimations);
      setAnimationCommand({
        type: "playChapter",
        animations: embedded.map((entry) => ({
          name: entry.assignment.name,
          loop: entry.assignment.loop === true,
          speed: Number(entry.assignment.speed) || 1,
        })),
        id: createId(),
      });
    } else {
      setSelectedAnimations({});
      setAnimationCommand({ type: "stop", reset: true, id: createId() });
    }

    if (authored.length > 0) {
      startResolvedAuthoredAssignments(authored);
    }
  };

  const resetAnimationState = () => {
    autoPlayTokenRef.current += 1;
    clearScheduledPlayback();
    stopAuthoredAnimations(true);
    setAnimations([]);
    setSelectedAnimations({});
    setAnimationCommand(null);
  };

  const stopCurrentAnimations = () => {
    autoPlayTokenRef.current += 1;
    clearScheduledPlayback();
    stopAuthoredAnimations(true);
    setAnimationCommand({
      type: "stop",
      id: createId(),
    });
  };

  const prepareChapterAnimations = (chapter) => {
    const assignments = normalizeChapterAnimationAssignments(
      chapter?.animations,
    ).filter((animation) => animation.name || animation.animationId);
    const autoPlayAnimations = assignments.filter(
      (animation) => animation.autoPlay,
    );

    setSelectedAnimations(getChapterAnimationConfig(chapter));
    stopCurrentAnimations();

    if (autoPlayAnimations.length === 0) return;
    const autoPlayToken = autoPlayTokenRef.current;

    const timeoutId = setTimeout(() => {
      if (autoPlayTokenRef.current !== autoPlayToken) return;
      playAnimationAssignments(autoPlayAnimations);
    }, 10);
    playbackTimeoutsRef.current.push(timeoutId);
  };

  const playAnimationAssignments = (assignments = []) => {
    const groups = createChapterAnimationPlaybackGroups(assignments);
    if (groups.length === 0) return false;

    autoPlayTokenRef.current += 1;
    const playToken = autoPlayTokenRef.current;
    clearScheduledPlayback();
    stopAuthoredAnimations(true);
    setSelectedAnimations({});
    setAnimationCommand({ type: "stop", reset: true, id: createId() });

    void Promise.all(groups.map(preparePlaybackGroup))
      .then((preparedGroups) => {
        if (autoPlayTokenRef.current !== playToken) return;

        let delayMs = 10;
        preparedGroups.forEach((group) => {
          if (group.entries.length === 0 || !Number.isFinite(delayMs)) return;

          const timeoutId = setTimeout(() => {
            startPlaybackGroup(group, playToken);
          }, delayMs);
          playbackTimeoutsRef.current.push(timeoutId);

          if (!Number.isFinite(group.duration)) {
            delayMs = Infinity;
          } else {
            delayMs += Math.max(0, group.duration * 1000);
          }
        });
      })
      .catch((error) => {
        if (autoPlayTokenRef.current !== playToken) return;
        console.error("Failed to prepare animation sequence:", error);
      });

    return true;
  };

  const playChapterAnimations = () => {
    if (!activeChapter?.animations?.length) return false;
    return playAnimationAssignments(activeChapter.animations);
  };

  const stopChapterAnimations = () => {
    autoPlayTokenRef.current += 1;
    clearScheduledPlayback();
    stopAuthoredAnimations(true);
    setAnimationCommand({
      type: "stop",
      reset: true,
      id: createId(),
    });
  };

  useEffect(
    () => () => {
      clearScheduledPlayback();
      stopAuthoredAnimations(true);
    },
    // The cleanup intentionally uses the latest ref state and modelScene object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return {
    animations,
    selectedAnimations,
    animationCommand,
    setAnimations,
    setSelectedAnimations,
    setAnimationCommand,
    resetAnimationState,
    stopCurrentAnimations,
    getChapterAnimationConfig,
    prepareChapterAnimations,
    playAnimationAssignments,
    playChapterAnimations,
    stopChapterAnimations,
  };
}
