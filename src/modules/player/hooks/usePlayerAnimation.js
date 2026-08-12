import { useEffect, useRef, useState } from "react";
import { createId } from "../../../utils/createId";
import { normalizeChapterAnimationAssignments } from "../../../engine/chapter";
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

  const playAuthoredAssignments = async (assignments = []) => {
    if (!modelScene) return false;
    const playable = (Array.isArray(assignments) ? assignments : []).filter(
      (assignment) =>
        assignment?.source === "authored" &&
        (assignment.animationId || assignment.name),
    );
    if (playable.length === 0) return false;

    stopAuthoredAnimations(true);
    const token = authoredPlaybackRef.current.token + 1;
    authoredPlaybackRef.current.token = token;
    const resolved = await Promise.all(
      playable.map(async (assignment) => ({
        assignment,
        definition: await resolveAuthoredDefinition(assignment),
      })),
    );

    if (authoredPlaybackRef.current.token !== token) return false;

    const entries = resolved
      .filter((item) => item.definition?.tracks?.length)
      .map(({ assignment, definition }) => ({
        assignment,
        definition,
        baseline: captureAuthoredAnimationBaseline(modelScene, definition),
        startedAt: performance.now(),
      }));
    if (entries.length === 0) return false;

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

        applyAuthoredAnimationAtTime(modelScene, entry.definition, time);
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

  const resetAnimationState = () => {
    autoPlayTokenRef.current += 1;
    stopAuthoredAnimations(true);
    setAnimations([]);
    setSelectedAnimations({});
    setAnimationCommand(null);
  };

  const stopCurrentAnimations = () => {
    autoPlayTokenRef.current += 1;
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

    setTimeout(() => {
      if (autoPlayTokenRef.current !== autoPlayToken) return;
      playAnimationAssignments(autoPlayAnimations);
    }, 10);
  };

  const playAnimationAssignments = (assignments = []) => {
    const normalized = normalizeChapterAnimationAssignments(assignments).filter(
      (animation) => animation.name || animation.animationId,
    );
    const embedded = normalized.filter(
      (animation) => animation.source !== "authored" && animation.name,
    );
    const authored = normalized.filter(
      (animation) => animation.source === "authored",
    );

    if (embedded.length > 0) {
      const nextSelectedAnimations = embedded.reduce((result, animation) => {
        result[animation.name] = {
          selected: true,
          loop: animation.loop === true,
          speed: Number(animation.speed) || 1,
        };
        return result;
      }, {});

      autoPlayTokenRef.current += 1;
      const playToken = autoPlayTokenRef.current;
      setSelectedAnimations(nextSelectedAnimations);
      setAnimationCommand(null);

      setTimeout(() => {
        if (autoPlayTokenRef.current !== playToken) return;
        setAnimationCommand({
          type: "playChapter",
          animations: embedded.map((animation) => ({
            name: animation.name,
            loop: animation.loop === true,
            speed: Number(animation.speed) || 1,
          })),
          id: createId(),
        });
      }, 10);
    }

    if (authored.length > 0) {
      void playAuthoredAssignments(authored);
    }

    return embedded.length > 0 || authored.length > 0;
  };

  const playChapterAnimations = () => {
    if (!activeChapter?.animations?.length) return false;
    return playAnimationAssignments(activeChapter.animations);
  };

  const stopChapterAnimations = () => {
    autoPlayTokenRef.current += 1;
    stopAuthoredAnimations(true);
    setAnimationCommand({
      type: "stop",
      reset: true,
      id: createId(),
    });
  };

  useEffect(
    () => () => {
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
