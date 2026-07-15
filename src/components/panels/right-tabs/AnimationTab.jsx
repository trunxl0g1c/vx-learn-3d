import { useEffect, useRef, useState } from "react";
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

export default function AnimationTab({
  animations = [],
  selectedAnimations = {},
  setSelectedAnimations,
  setAnimationCommand,
}) {
  const [playingMode, setPlayingMode] = useState(null);
  const [playingAnimationName, setPlayingAnimationName] = useState(null);

  const commandTimerRef = useRef(null);
  const finishTimerRef = useRef(null);

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
    setPlayingAnimationName(null);
  };

  const getAnimationConfig = (animationName) => {
    const config = selectedAnimations?.[animationName] || {};

    return {
      selected: Boolean(config.selected),
      loop: Boolean(config.loop),
      speed: normalizeSpeed(config.speed),
    };
  };

  const stopAnimation = () => {
    clearAnimationTimers();
    resetPlayingState();

    setAnimationCommand?.({
      type: "stop",
      id: crypto.randomUUID(),
    });
  };

  const scheduleFinish = (durationInSeconds, speed = 1) => {
    clearFinishTimer();

    const normalizedDuration = Number(durationInSeconds);
    const normalizedSpeed = normalizeSpeed(speed);

    if (!Number.isFinite(normalizedDuration) || normalizedDuration <= 0) {
      return;
    }

    finishTimerRef.current = setTimeout(
      () => {
        resetPlayingState();
        finishTimerRef.current = null;
      },
      (normalizedDuration / normalizedSpeed) * 1000 + 100,
    );
  };

  const scheduleAllFinish = (configsByName) => {
    const hasLoopingAnimation = animations.some((animation, index) => {
      const animationName = getAnimationName(animation, index);
      return configsByName[animationName]?.loop === true;
    });

    if (hasLoopingAnimation) {
      clearFinishTimer();
      return;
    }

    const maximumDuration = animations.reduce((highestDuration, animation, index) => {
      const animationName = getAnimationName(animation, index);
      const duration = Number(animation?.duration);
      const speed = normalizeSpeed(configsByName[animationName]?.speed);

      if (!Number.isFinite(duration)) return highestDuration;

      return Math.max(highestDuration, duration / speed);
    }, 0);

    scheduleFinish(maximumDuration, 1);
  };

  const playSingleAnimation = (animation, index) => {
    const animationName = getAnimationName(animation, index);
    const config = getAnimationConfig(animationName);

    const isCurrentAnimationPlaying =
      isPlayingSingle && playingAnimationName === animationName;

    if (isCurrentAnimationPlaying) {
      stopAnimation();
      return;
    }

    clearAnimationTimers();

    setAnimationCommand?.({
      type: "stop",
      id: crypto.randomUUID(),
    });

    setPlayingMode("single");
    setPlayingAnimationName(animationName);

    commandTimerRef.current = setTimeout(() => {
      setAnimationCommand?.({
        type: "play",
        selectedAnimations: {
          [animationName]: {
            selected: true,
            loop: config.loop,
            speed: config.speed,
          },
        },
        id: crypto.randomUUID(),
      });

      commandTimerRef.current = null;
    }, 10);

    if (config.loop) {
      clearFinishTimer();
    } else {
      scheduleFinish(Number(animation?.duration), config.speed);
    }
  };

  const playAllAnimations = () => {
    if (animations.length === 0) return;

    if (isPlayingAll) {
      stopAnimation();
      return;
    }

    clearAnimationTimers();

    setAnimationCommand?.({
      type: "stop",
      id: crypto.randomUUID(),
    });

    const nextSelectedAnimations = animations.reduce(
      (result, animation, index) => {
        const animationName = getAnimationName(animation, index);
        const config = getAnimationConfig(animationName);

        result[animationName] = {
          selected: true,
          loop: config.loop,
          speed: config.speed,
        };

        return result;
      },
      {},
    );

    setPlayingMode("all");
    setPlayingAnimationName(null);

    commandTimerRef.current = setTimeout(() => {
      setAnimationCommand?.({
        type: "play",
        selectedAnimations: nextSelectedAnimations,
        id: crypto.randomUUID(),
      });

      commandTimerRef.current = null;
    }, 10);

    scheduleAllFinish(nextSelectedAnimations);
  };

  const updateAnimationConfig = (animation, index, changes) => {
    const animationName = getAnimationName(animation, index);
    const currentConfig = getAnimationConfig(animationName);
    const nextConfig = {
      ...currentConfig,
      ...changes,
      speed: normalizeSpeed(changes.speed ?? currentConfig.speed),
    };

    setSelectedAnimations?.((previousState) => ({
      ...(previousState || {}),
      [animationName]: {
        ...(previousState?.[animationName] || {}),
        ...nextConfig,
      },
    }));

    const isAnimationCurrentlyPlaying =
      isPlayingAll ||
      (isPlayingSingle && playingAnimationName === animationName);

    if (!isAnimationCurrentlyPlaying) return;

    setAnimationCommand?.(
      createUpdateAnimationConfigCommand(animationName, nextConfig),
    );

    if (isPlayingAll) {
      const nextAllConfigs = animations.reduce((result, item, itemIndex) => {
        const itemName = getAnimationName(item, itemIndex);

        result[itemName] =
          itemName === animationName
            ? nextConfig
            : getAnimationConfig(itemName);

        return result;
      }, {});

      scheduleAllFinish(nextAllConfigs);
      return;
    }

    if (nextConfig.loop) {
      clearFinishTimer();
    } else {
      scheduleFinish(Number(animation?.duration), nextConfig.speed);
    }
  };

  useEffect(() => {
    if (!setSelectedAnimations) return;

    setSelectedAnimations((previousState) => {
      const nextState = { ...(previousState || {}) };
      let changed = false;

      animations.forEach((animation, index) => {
        const animationName = getAnimationName(animation, index);
        const currentConfig = nextState[animationName];

        if (!currentConfig) {
          nextState[animationName] = {
            selected: false,
            loop: false,
            speed: DEFAULT_ANIMATION_SPEED,
          };
          changed = true;
          return;
        }

        const normalizedSpeed = normalizeSpeed(currentConfig.speed);

        if (currentConfig.speed !== normalizedSpeed) {
          nextState[animationName] = {
            ...currentConfig,
            speed: normalizedSpeed,
          };
          changed = true;
        }
      });

      return changed ? nextState : previousState;
    });
  }, [animations, setSelectedAnimations]);

  useEffect(() => {
    return () => {
      clearAnimationTimers();
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex h-16 shrink-0 items-center bg-dark-alpha px-4 text-lg font-normal">
        Animation
      </div>

      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-4">
        {animations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-divider-main px-3 py-3 text-sm text-contrast-grayout">
            No animations available for this model.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {animations.map((animation, index) => {
                const animationName = getAnimationName(animation, index);
                const config = getAnimationConfig(animationName);

                const isPlaying =
                  isPlayingAll ||
                  (isPlayingSingle && playingAnimationName === animationName);

                return (
                  <div
                    key={`${animationName}-${index}`}
                    onClick={(event) => event.stopPropagation()}
                    className={[
                      "w-full overflow-hidden rounded-lg border",
                      "bg-dark-alpha",
                      "border-contrast-grayout",
                      "transition-colors duration-200",
                      "hover:border-accent-main",
                    ].join(" ")}
                  >
                    <div className="flex h-12 items-center justify-between gap-3 px-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-normal text-white">
                          {animationName}
                        </div>

                        <div className="mt-0.5 text-[10px] text-contrast-grayout">
                          {animation?.duration?.toFixed?.(2) || 0}s
                        </div>
                      </div>

                      <button
                        type="button"
                        title={isPlaying ? "Stop animation" : "Play animation"}
                        aria-label={
                          isPlaying
                            ? `Stop ${animationName}`
                            : `Play ${animationName}`
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          playSingleAnimation(animation, index);
                        }}
                        className={[
                          "grid size-8 shrink-0 cursor-pointer",
                          "place-items-center rounded-lg",
                          "transition-colors",
                          "hover:bg-white/5",
                        ].join(" ")}
                      >
                        <MaterialIcon
                          name={isPlaying ? "stop" : "play_arrow"}
                          fill={1}
                          size={isPlaying ? 21 : 25}
                          className={
                            isPlaying
                              ? "text-accent-contrast"
                              : "text-secondary-default"
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
                            updateAnimationConfig(animation, index, {
                              loop: checked === true,
                            });
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
                          htmlFor={`animation-speed-${index}`}
                          className="text-xs font-normal text-contrast-grayout"
                        >
                          Speed
                        </label>

                        <select
                          id={`animation-speed-${index}`}
                          value={String(config.speed)}
                          onChange={(event) => {
                            updateAnimationConfig(animation, index, {
                              speed: Number(event.target.value),
                            });
                          }}
                          className={[
                            "h-8 w-20 cursor-pointer rounded-md",
                            "border border-divider-main",
                            "bg-primary px-2",
                            "text-xs text-white outline-none",
                            "transition-colors",
                            "hover:border-accent-main",
                            "focus:border-accent-main",
                          ].join(" ")}
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
              })}
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
                isPlayingAll ? "border-accent-contrast!" : "",
              ].join(" ")}
            >
              <MaterialIcon
                name={isPlayingAll ? "stop" : "play_arrow"}
                fill={1}
                size={23}
                className={
                  isPlayingAll
                    ? "text-accent-contrast"
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
