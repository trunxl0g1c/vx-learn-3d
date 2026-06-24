import { Play } from "lucide-react";
import Button from "../../ui/button";
import Checkbox from "../../ui/checkbox";

export default function AnimationTab(props) {
  const {
    selectedObjectName,
    createChapterFromSelectedObject,
    saveCameraViewToActiveChapter,
    saveMaterial,
    applyShaderMode,
    shaderMode,
    metalness,
    setMetalness,
    roughness,
    setRoughness,
    viewerSettings,
    setViewerSettings,
    updateEnvIntensity,
    material,
    activeChapterId,
    setActiveChapterId,
    panelSectionStyle,
    inputStyle,
    mediaButtonStyle,
    updateChapterField,
    addChapterParameter,
    updateChapterParameter,
    deleteChapterParameter,
    deleteMarkerFromActiveChapter,
    animations,
    selectedAnimations,
    setSelectedAnimations,
    setAnimationCommand,
    isChapterAnimationSelected,
    getChapterAnimationConfig,
    toggleChapterAnimation,
    updateChapterAnimationField,
    playAnimationPreview,
    stopAnimationPreview,
    addChapterMedia,
    deleteChapterMedia,
  } = props;

  return (
    <div className="flex flex-col gap-1 px-3">
      <div className="bg-dark-alpha p-3 rounded-2xl mb-3">
        <h3 className="font-bold text-base mb-3">Animasi Advance</h3>

        {animations.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              color: "#9ca3af",
            }}
          >
            Tidak ada animasi pada model ini
          </div>
        ) : (
          <>
            <div className="flex gap-3 mb-4 w-full items-center justify-center">
              <Button
                size="sm"
                onClick={() => {
                  const next = {};

                  animations.forEach((anim) => {
                    next[anim.name] = {
                      ...(selectedAnimations[anim.name] || {}),
                      selected: true,
                    };
                  });

                  setSelectedAnimations(next);
                }}
                className="w-1/2"
              >
                Select All
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  const next = {};

                  animations.forEach((anim) => {
                    next[anim.name] = {
                      ...(selectedAnimations[anim.name] || {}),
                      selected: false,
                    };
                  });

                  setSelectedAnimations(next);
                }}
                className="w-1/2"
              >
                Clear
              </Button>
            </div>

            <div className="sidebar-scroll mb-3 max-h-[180px] overflow-y-auto rounded-lg border border-divider-main">
              {animations.map((anim) => {
                const config = selectedAnimations[anim.name] || {
                  selected: false,
                  loop: false,
                };

                return (
                  <div
                    key={anim.name}
                    className="grid grid-cols-[24px_1fr_70px] items-center gap-2 border-b border-divider-main p-2 last:border-b-0"
                  >
                    <Checkbox
                      checked={config.selected}
                      onCheckedChange={(checked) => {
                        setSelectedAnimations((prev) => ({
                          ...prev,
                          [anim.name]: {
                            ...(prev[anim.name] || {}),
                            selected: checked,
                          },
                        }));
                      }}
                    />

                    <div>
                      <div className="text-sm font-bold text-white">
                        {anim.name}
                      </div>
                      <div className="text-[11px] text-contrast-grayout">
                        {anim.duration?.toFixed?.(2) || 0}s
                      </div>
                    </div>

                    <Checkbox
                      label="Loop"
                      checked={config.loop}
                      onCheckedChange={(checked) => {
                        setSelectedAnimations((prev) => ({
                          ...prev,
                          [anim.name]: {
                            ...(prev[anim.name] || {}),
                            loop: checked,
                          },
                        }));
                      }}
                      labelClassName="text-[11px] text-white"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  setAnimationCommand(null);

                  setTimeout(() => {
                    setAnimationCommand({
                      type: "play",
                      id: crypto.randomUUID(),
                    });
                  }, 10);
                }}
              >
                <Play className="size-4" />
                Play Selected
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setAnimationCommand({
                    type: "stop",
                    id: crypto.randomUUID(),
                  });
                }}
              >
                Stop
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
