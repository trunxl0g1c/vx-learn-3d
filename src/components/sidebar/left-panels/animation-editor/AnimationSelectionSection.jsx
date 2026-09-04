import MaterialIcon from "../../../ui/material-icon";
import Button from "../../../ui/button";

export default function AnimationSelectionSection({ animationAuthoring }) {
  const animations = animationAuthoring?.animations || [];

  return (
    <section className="rounded-xl border border-secondary-default/60 bg-[#171b1b] p-4">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-7 place-items-center rounded-full bg-accent-main text-xs font-bold text-white">
          1
        </span>
        <h3 className="text-sm font-semibold text-white">
          Create or Select Animation
        </h3>
      </div>

      <div className="flex gap-2">
        <select
          value={animationAuthoring?.activeAnimationId || ""}
          onChange={(event) =>
            animationAuthoring?.selectAnimation?.(event.target.value || null)
          }
          className="h-10 min-w-0 flex-1 rounded-lg border border-secondary-default/70 bg-primary px-3 text-sm text-white outline-none focus:border-secondary-default"
        >
          <option value="">Select animation</option>
          {animations.map((animation) => (
            <option key={animation.id} value={animation.id}>
              {animation.name}
            </option>
          ))}
        </select>
        <Button size="sm" type="button" onClick={animationAuthoring?.createAnimation}>
          <MaterialIcon name="add" className="size-5" />
          New
        </Button>
      </div>

      {animationAuthoring?.activeAnimation && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="xs"
            variant="darkOutline"
            onClick={animationAuthoring?.duplicateAnimation}
          >
            <MaterialIcon name="content_copy" className="size-4" />
            Duplicate
          </Button>
          <Button
            type="button"
            size="xs"
            variant="darkOutline"
            onClick={() => animationAuthoring?.deleteAnimation?.()}
          >
            <MaterialIcon name="delete" className="size-4" />
            Delete
          </Button>
        </div>
      )}
    </section>
  );
}
