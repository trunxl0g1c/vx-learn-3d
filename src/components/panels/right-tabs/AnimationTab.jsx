import { useEffect, useMemo, useRef, useState } from "react";
import { createId } from "../../../utils/createId";
import Button from "../../ui/button";
import Checkbox from "../../ui/checkbox";
import MaterialIcon from "../../ui/material-icon";
import { createUpdateAnimationConfigCommand } from "../../../engine/animation";

const DEFAULT_ANIMATION_SPEED = 1;

function normalizeSpeed(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : DEFAULT_ANIMATION_SPEED;
}

function getAnimationName(animation, index) {
  return animation?.name || `Animation Name ${index + 1}`;
}

function createAnimationEntries(animations, source) {
  return (Array.isArray(animations) ? animations : []).map(
    (animation, index) => {
      const name = getAnimationName(animation, index);
      const authored = source === "authored";
      const identity = authored ? animation?.id || name : name;

      return {
        key: `${source}-${identity}-${index}`,
        configKey: authored ? `authored::${identity}` : name,
        source,
        animation,
        name,
        duration: Number(animation?.duration) || 0,
        defaultLoop: authored && animation?.settings?.loop === true,
        defaultSpeed: authored
          ? normalizeSpeed(animation?.settings?.speed)
          : DEFAULT_ANIMATION_SPEED,
      };
    },
  );
}

function getTargetCount(entry) {
  if (entry.source === "authored") {
    const hydratedCount = entry.animation?.tracks?.length;
    const storedCount = Number(entry.animation?.trackCount);
    return Number.isFinite(storedCount)
      ? Math.max(storedCount, 0)
      : hydratedCount || 0;
  }

  return Array.isArray(entry.animation?.targetNames)
    ? entry.animation.targetNames.length
    : 0;
}

export default function AnimationTab({
  animations = [],
  authoredAnimations = null,
  selectedAnimations = {},
  setSelectedAnimations,
  setAnimationCommand,
  animationInteraction = null,
  showHeader = true,
  className = "",
  contentClassName = "p-4",
}) {
  const [playingMode, setPlayingMode] = useState(null);
  const [playingAnimationKey, setPlayingAnimationKey] = useState(null);
  const commandTimerRef = useRef(null);
  const finishTimerRef = useRef(null);
  const embeddedEntries = useMemo(
    () => createAnimationEntries(animations, "embedded"),
    [animations],
  );
  const authoredEntries = useMemo(
    () => createAnimationEntries(authoredAnimations, "authored"),
    [authoredAnimations],
  );
  const allEntries = useMemo(
    () => [...embeddedEntries, ...authoredEntries],
    [authoredEntries, embeddedEntries],
  );
  const authoredListEnabled = Array.isArray(authoredAnimations);
  const isPlayingAll = playingMode === "all";
  const isPlayingSingle = playingMode === "single";

  const clearCommandTimer = () => {
    if (!commandTimerRef.current) return;
    clearTimeout(commandTimerRef.current);
    commandTimerRef.current = null;
  };

  const clearFinishTimer = () => {
    if (!finishTimerRef.current) return;
    clearTimeout(finishTimerRef.current);
    finishTimerRef.current = null;
  };

  const clearAnimationTimers = () => {
    clearCommandTimer();
    clearFinishTimer();
  };

  const resetPlayingState = () => {
    setPlayingMode(null);
    setPlayingAnimationKey(null);
  };

  const getAnimationConfig = (entry) => {
    const config = selectedAnimations?.[entry.configKey] || {};

    return {
      selected: Boolean(config.selected),
      loop: config.loop ?? entry.defaultLoop,
      speed: normalizeSpeed(config.speed ?? entry.defaultSpeed),
    };
  };

  const toTargetEntry = (entry) => ({
    source: entry.source,
    animation: entry.animation,
  });

  const focusEntry = (entry) => {
    void animationInteraction?.focusAnimationTargets?.([
      toTargetEntry(entry),
    ]);
  };

  const stopAnimation = () => {
    clearAnimationTimers();
    resetPlayingState();
    animationInteraction?.stopAuthoredAnimations?.(true);
    setAnimationCommand?.({ type: "stop", id: createId() });
  };

  const scheduleFinish = (durationInSeconds, speed = 1) => {
    clearFinishTimer();
    const normalizedDuration = Number(durationInSeconds);
    const normalizedSpeed = normalizeSpeed(speed);

    if (!Number.isFinite(normalizedDuration) || normalizedDuration <= 0) return;

    finishTimerRef.current = setTimeout(
      () => {
        resetPlayingState();
        finishTimerRef.current = null;
      },
      (normalizedDuration / normalizedSpeed) * 1000 + 100,
    );
  };

  const scheduleAllFinish = (configsByKey) => {
    const hasLoopingAnimation = allEntries.some(
      (entry) => configsByKey[entry.configKey]?.loop === true,
    );
    if (hasLoopingAnimation) {
      clearFinishTimer();
      return;
    }

    const maximumDuration = allEntries.reduce((highestDuration, entry) => {
      const speed = normalizeSpeed(configsByKey[entry.configKey]?.speed);
      return Math.max(highestDuration, entry.duration / speed);
    }, 0);
    scheduleFinish(maximumDuration, 1);
  };

  const playSingleAnimation = (entry) => {
    const config = getAnimationConfig(entry);
    const isCurrentAnimationPlaying =
      isPlayingSingle && playingAnimationKey === entry.key;

    if (isCurrentAnimationPlaying) {
      stopAnimation();
      return;
    }

    clearAnimationTimers();
    animationInteraction?.stopAuthoredAnimations?.(true);
    setAnimationCommand?.({ type: "stop", id: createId() });
    setPlayingMode("single");
    setPlayingAnimationKey(entry.key);

    if (entry.source === "authored") {
      void animationInteraction?.playAuthoredAnimations?.(
        [{ animation: entry.animation, ...config }],
        { targetEntries: [toTargetEntry(entry)] },
      );
    } else {
      focusEntry(entry);
      commandTimerRef.current = setTimeout(() => {
        setAnimationCommand?.({
          type: "play",
          selectedAnimations: {
            [entry.name]: {
              selected: true,
              loop: config.loop,
              speed: config.speed,
            },
          },
          id: createId(),
        });
        commandTimerRef.current = null;
      }, 10);
    }

    if (config.loop) clearFinishTimer();
    else scheduleFinish(entry.duration, config.speed);
  };

  const playAllAnimations = () => {
    if (allEntries.length === 0) return;
    if (isPlayingAll) {
      stopAnimation();
      return;
    }

    clearAnimationTimers();
    animationInteraction?.stopAuthoredAnimations?.(true);
    setAnimationCommand?.({ type: "stop", id: createId() });

    const configsByKey = allEntries.reduce((result, entry) => {
      result[entry.configKey] = getAnimationConfig(entry);
      return result;
    }, {});
    const nextSelectedAnimations = embeddedEntries.reduce((result, entry) => {
      const config = configsByKey[entry.configKey];
      result[entry.name] = {
        selected: true,
        loop: config.loop,
        speed: config.speed,
      };
      return result;
    }, {});

    setPlayingMode("all");
    setPlayingAnimationKey(null);

    if (authoredEntries.length > 0) {
      void animationInteraction?.playAuthoredAnimations?.(
        authoredEntries.map((entry) => ({
          animation: entry.animation,
          ...configsByKey[entry.configKey],
        })),
        { targetEntries: allEntries.map(toTargetEntry) },
      );
    } else {
      void animationInteraction?.focusAnimationTargets?.(
        allEntries.map(toTargetEntry),
      );
    }

    if (embeddedEntries.length > 0) {
      commandTimerRef.current = setTimeout(() => {
        setAnimationCommand?.({
          type: "play",
          selectedAnimations: nextSelectedAnimations,
          id: createId(),
        });
        commandTimerRef.current = null;
      }, 10);
    }

    scheduleAllFinish(configsByKey);
  };

  const updateAnimationConfig = (entry, changes) => {
    const currentConfig = getAnimationConfig(entry);
    const nextConfig = {
      ...currentConfig,
      ...changes,
      speed: normalizeSpeed(changes.speed ?? currentConfig.speed),
    };

    setSelectedAnimations?.((previousState) => ({
      ...(previousState || {}),
      [entry.configKey]: {
        ...(previousState?.[entry.configKey] || {}),
        ...nextConfig,
      },
    }));

    const isAnimationCurrentlyPlaying =
      isPlayingAll ||
      (isPlayingSingle && playingAnimationKey === entry.key);
    if (!isAnimationCurrentlyPlaying) return;

    if (entry.source === "authored") {
      animationInteraction?.updateAuthoredAnimationConfig?.(
        entry.animation?.id,
        nextConfig,
      );
    } else {
      setAnimationCommand?.(
        createUpdateAnimationConfigCommand(entry.name, nextConfig),
      );
    }

    if (isPlayingAll) {
      const nextAllConfigs = allEntries.reduce((result, item) => {
        result[item.configKey] =
          item.key === entry.key ? nextConfig : getAnimationConfig(item);
        return result;
      }, {});
      scheduleAllFinish(nextAllConfigs);
    } else if (nextConfig.loop) {
      clearFinishTimer();
    } else {
      scheduleFinish(entry.duration, nextConfig.speed);
    }
  };

  useEffect(() => {
    if (!setSelectedAnimations) return;

    setSelectedAnimations((previousState) => {
      const nextState = { ...(previousState || {}) };
      let changed = false;

      allEntries.forEach((entry) => {
        const currentConfig = nextState[entry.configKey];
        if (!currentConfig) {
          nextState[entry.configKey] = {
            selected: false,
            loop: entry.defaultLoop,
            speed: entry.defaultSpeed,
          };
          changed = true;
          return;
        }

        const normalizedSpeed = normalizeSpeed(currentConfig.speed);
        if (currentConfig.speed !== normalizedSpeed) {
          nextState[entry.configKey] = {
            ...currentConfig,
            speed: normalizedSpeed,
          };
          changed = true;
        }
      });

      return changed ? nextState : previousState;
    });
  }, [allEntries, setSelectedAnimations]);

  useEffect(
    () => () => {
      clearAnimationTimers();
    },
    [],
  );

  const renderAnimationCard = (entry, index) => {
    const config = getAnimationConfig(entry);
    const isPlaying =
      isPlayingAll ||
      (isPlayingSingle && playingAnimationKey === entry.key);
    const targetCount = getTargetCount(entry);
    const sourceLabel =
      entry.source === "authored" ? "Animation Creation" : "Embedded GLB";

    return (
      <div
        key={entry.key}
        className={[
          "w-full overflow-hidden rounded-lg border",
          "bg-dark-alpha border-contrast-grayout",
          "transition-colors duration-200 hover:border-accent-main",
        ].join(" ")}
      >
        <div className="flex min-h-12 items-stretch justify-between gap-2 px-1">
          <button
            type="button"
            title={
              animationInteraction?.focusAnimationTargets
                ? `Focus objects used by ${entry.name}`
                : undefined
            }
            disabled={!animationInteraction?.focusAnimationTargets}
            onClick={(event) => {
              event.stopPropagation();
              focusEntry(entry);
            }}
            className={[
              "min-w-0 flex-1 px-2 py-2 text-left",
              animationInteraction?.focusAnimationTargets
                ? "cursor-pointer"
                : "cursor-default",
            ].join(" ")}
          >
            <span className="block truncate text-sm font-normal text-white">
              {entry.name}
            </span>
            <span className="mt-0.5 block truncate text-[10px] text-contrast-grayout">
              {entry.duration.toFixed(2)}s
              {authoredListEnabled ? ` · ${sourceLabel}` : ""}
              {authoredListEnabled && targetCount > 0
                ? ` · ${targetCount} target`
                : ""}
            </span>
          </button>

          <button
            type="button"
            title={isPlaying ? "Stop animation" : "Play animation"}
            aria-label={isPlaying ? `Stop ${entry.name}` : `Play ${entry.name}`}
            onClick={(event) => {
              event.stopPropagation();
              playSingleAnimation(entry);
            }}
            className="grid size-10 shrink-0 cursor-pointer place-items-center self-center rounded-lg transition-colors hover:bg-white/5"
          >
            <MaterialIcon
              name={isPlaying ? "stop" : "play_arrow"}
              fill={1}
              size={isPlaying ? 21 : 25}
              className={
                isPlaying ? "text-accent-main" : "text-secondary-default"
              }
            />
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-divider-main px-3 py-2.5">
          <div
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <Checkbox
              label="Loop"
              checked={config.loop}
              onCheckedChange={(checked) => {
                updateAnimationConfig(entry, { loop: checked === true });
              }}
              labelClassName="text-xs font-normal text-white"
            />
          </div>

          <div
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            className="flex items-center gap-2"
          >
            <label
              htmlFor={`animation-speed-${entry.source}-${index}`}
              className="text-xs font-normal text-contrast-grayout"
            >
              Speed
            </label>
            <select
              id={`animation-speed-${entry.source}-${index}`}
              value={String(config.speed)}
              onChange={(event) => {
                updateAnimationConfig(entry, {
                  speed: Number(event.target.value),
                });
              }}
              className="h-8 w-20 cursor-pointer rounded-md border border-divider-main bg-primary px-2 text-xs text-white outline-none transition-colors hover:border-accent-main focus:border-accent-main"
            >
              <option value="0.25">0.25x</option>
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  const renderSection = (title, entries) => {
    if (entries.length === 0) return null;

    return (
      <section className="space-y-3">
        {authoredListEnabled && (
          <div className="flex items-center justify-between text-xs text-contrast-grayout">
            <span>{title}</span>
            <span>{entries.length}</span>
          </div>
        )}
        <div className="flex flex-col gap-4">
          {entries.map(renderAnimationCard)}
        </div>
      </section>
    );
  };

  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden ${className}`}>
      {showHeader && (
        <div className="flex h-16 shrink-0 items-center bg-dark-alpha px-4 text-lg font-normal">
          Animation
        </div>
      )}

      <div
        className={`sidebar-scroll min-h-0 flex-1 overflow-y-auto ${contentClassName}`}
      >
        {allEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-divider-main px-3 py-3 text-sm text-contrast-grayout">
            {authoredListEnabled
              ? "No embedded or Animation Creation animations are available."
              : "No animations available for this model."}
          </div>
        ) : (
          <>
            <div className="space-y-5">
              {renderSection("Embedded GLB", embeddedEntries)}
              {renderSection("Animation Creation", authoredEntries)}
            </div>

            <Button
              size="sm"
              type="button"
              variant={isPlayingAll ? "outline" : "cyanOutline"}
              onClick={(event) => {
                event.stopPropagation();
                playAllAnimations();
              }}
              className={[
                "mt-5 h-10 w-full gap-2 rounded-lg!",
                "bg-dark-alpha text-sm font-normal text-white",
                isPlayingAll ? "border-accent-main!" : "",
              ].join(" ")}
            >
              <MaterialIcon
                name={isPlayingAll ? "stop" : "play_arrow"}
                fill={1}
                size={23}
                className={
                  isPlayingAll
                    ? "text-accent-main"
                    : "text-secondary-default"
                }
              />
              {isPlayingAll ? "Stop All Animation" : "Play All Animation"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
