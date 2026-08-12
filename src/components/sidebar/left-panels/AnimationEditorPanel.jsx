import MaterialIcon from "../../ui/material-icon";
import Button from "../../ui/button";
import AnimationSelectionSection from "./animation-editor/AnimationSelectionSection";
import AnimationInfoSection from "./animation-editor/AnimationInfoSection";
import AnimationTrackSection from "./animation-editor/AnimationTrackSection";
import AnimationTimelineSection from "./animation-editor/AnimationTimelineSection";

export default function AnimationEditorPanel({
  animationAuthoring,
  selectedObjectName,
  onBack,
}) {
  const animation = animationAuthoring?.activeAnimation;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex h-16 shrink-0 items-center gap-2 bg-[#14201f] px-3 pr-14">
        <button
          type="button"
          onClick={() => {
            animationAuthoring?.stopAuthoring?.();
            onBack?.();
          }}
          className="grid size-9 place-items-center rounded-lg text-secondary-default transition hover:bg-white/10"
          title="Back to Pro Tools"
        >
          <MaterialIcon name="arrow_back" className="size-6" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-white">
            Animation Authoring
          </p>
          <p className="text-[11px] text-contrast-grayout">
            Keyframe-based multi-object animation
          </p>
        </div>
      </div>

      <div className="sidebar-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <AnimationSelectionSection animationAuthoring={animationAuthoring} />

        {animationAuthoring?.isLoadingActiveAnimation && (
          <div className="rounded-xl border border-divider-main bg-dark-alpha p-4 text-sm text-contrast-grayout">
            Loading Animation details...
          </div>
        )}

        {animation && !animationAuthoring?.isLoadingActiveAnimation && (
          <>
            <AnimationInfoSection animationAuthoring={animationAuthoring} />
            <AnimationTrackSection
              animationAuthoring={animationAuthoring}
              selectedObjectName={selectedObjectName}
            />
            <AnimationTimelineSection animationAuthoring={animationAuthoring} />
          </>
        )}

        {!animation && (
          <div className="rounded-xl border border-dashed border-divider-main bg-primary/20 p-5 text-center">
            <MaterialIcon
              name="animation"
              className="mx-auto size-8 text-secondary-default"
            />
            <p className="mt-3 text-sm font-semibold text-white">
              No authored animation selected
            </p>
            <p className="mt-1 text-xs leading-5 text-contrast-grayout">
              Create an animation, add logical object tracks, then capture
              transforms as keyframes.
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-4"
              onClick={animationAuthoring?.createAnimation}
            >
              <MaterialIcon name="add" className="size-4" />
              Create Animation
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
