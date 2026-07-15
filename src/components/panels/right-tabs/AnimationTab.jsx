import { useEffect, useRef, useState } from "react";
import Button from "../../ui/button";
import Checkbox from "../../ui/checkbox";
import MaterialIcon from "../../ui/material-icon";

export default function AnimationTab({ animations = [], setAnimationCommand }) {
  const [playingMode, setPlayingMode] = useState(null);
  const [playingAnimationName, setPlayingAnimationName] = useState(null);

  const [loopUiState, setLoopUiState] = useState({});
  const [speedUiState, setSpeedUiState] = useState({});

  const commandTimerRef = useRef(null);
  const finishTimerRef = useRef(null);

  const isPlayingAll = playingMode === "all";
  const isPlayingSingle = playingMode === "single";

  const clearAnimationTimers = () => {
    if (commandTimerRef.current) {
      clearTimeout(commandTimerRef.current);
      commandTimerRef.current = null;
    }

    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
  };

  const resetPlayingState = () => {
    setPlayingMode(null);
    setPlayingAnimationName(null);
  };

  const stopAnimation = () => {
    clearAnimationTimers();
    resetPlayingState();

    setAnimationCommand?.({
      type: "stop",
      id: crypto.randomUUID(),
    });
  };

  const scheduleFinish = (durationInSeconds) => {
    if (!Number.isFinite(durationInSeconds) || durationInSeconds <= 0) {
      return;
    }

    finishTimerRef.current = setTimeout(
      () => {
        resetPlayingState();
        finishTimerRef.current = null;
      },
      durationInSeconds * 1000 + 100,
    );
  };

  const playSingleAnimation = (anim, index) => {
    const animationName = anim?.name || `Animation Name ${index + 1}`;

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
            loop: false,
          },
        },
        id: crypto.randomUUID(),
      });

      commandTimerRef.current = null;
    }, 10);

    scheduleFinish(Number(anim?.duration));
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

    const selectedAnimations = animations.reduce((result, anim, index) => {
      const animationName = anim?.name || `Animation Name ${index + 1}`;

      result[animationName] = {
        selected: true,
        loop: false,
      };

      return result;
    }, {});

    setPlayingMode("all");
    setPlayingAnimationName(null);

    commandTimerRef.current = setTimeout(() => {
      setAnimationCommand?.({
        type: "play",
        selectedAnimations,
        id: crypto.randomUUID(),
      });

      commandTimerRef.current = null;
    }, 10);

    const maximumDuration = animations.reduce((highestDuration, anim) => {
      const duration = Number(anim?.duration);

      if (!Number.isFinite(duration)) {
        return highestDuration;
      }

      return Math.max(highestDuration, duration);
    }, 0);

    scheduleFinish(maximumDuration);
  };

  const updateLoopUi = (animationName, checked) => {
    setLoopUiState((previousState) => ({
      ...previousState,
      [animationName]: checked === true,
    }));
  };

  const updateSpeedUi = (animationName, value) => {
    setSpeedUiState((previousState) => ({
      ...previousState,
      [animationName]: value,
    }));
  };

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
              {animations.map((anim, index) => {
                const animationName =
                  anim?.name || `Animation Name ${index + 1}`;

                const isPlaying =
                  isPlayingAll ||
                  (isPlayingSingle && playingAnimationName === animationName);

                const isLoopChecked = loopUiState[animationName] === true;

                const speedValue = speedUiState[animationName] || "1";

                return (
                  <div
                    key={`${animationName}-${index}`}
                    onClick={(event) => event.stopPropagation()}
                    className={[
                      "w-full overflow-hidden rounded-lg border",
                      "bg-dark-alpha",
                      "transition-colors duration-200",
                      isPlaying
                        ? "border-contrast-grayout"
                        : "border-contrast-grayout",
                      "hover:border-accent-main",
                    ].join(" ")}
                  >
                    {/* Header animasi */}
                    <div className="flex h-12 items-center justify-between gap-3 px-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-normal text-white">
                          {animationName}
                        </div>

                        <div className="mt-0.5 text-[10px] text-contrast-grayout">
                          {anim?.duration?.toFixed?.(2) || 0}s
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
                          playSingleAnimation(anim, index);
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
                          checked={isLoopChecked}
                          onCheckedChange={(checked) => {
                            updateLoopUi(animationName, checked);
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
                          value={speedValue}
                          onChange={(event) => {
                            updateSpeedUi(animationName, event.target.value);
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
