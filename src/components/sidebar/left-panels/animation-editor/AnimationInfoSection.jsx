export default function AnimationInfoSection({ animationAuthoring }) {
  const animation = animationAuthoring?.activeAnimation;
  if (!animation) return null;

  return (
    <section className="rounded-xl border border-secondary-default/60 bg-[#171b1b] p-4">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-7 place-items-center rounded-full bg-accent-main text-xs font-bold text-white">
          2
        </span>
        <h3 className="text-sm font-semibold text-white">Animation Information</h3>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs text-contrast-grayout">Name</span>
          <input
            value={animation.name}
            onChange={(event) =>
              animationAuthoring.updateAnimation(animation.id, {
                name: event.target.value,
              })
            }
            className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none focus:border-secondary-default"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs text-contrast-grayout">
            Description
          </span>
          <textarea
            value={animation.description || ""}
            rows={2}
            onChange={(event) =>
              animationAuthoring.updateAnimation(animation.id, {
                description: event.target.value,
              })
            }
            className="w-full resize-none rounded-lg border border-secondary-default/60 bg-primary p-3 text-sm text-white outline-none focus:border-secondary-default"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs text-contrast-grayout">
              Duration (sec)
            </span>
            <input
              type="number"
              min="0.1"
              max="3600"
              step="0.1"
              value={animation.duration}
              onChange={(event) =>
                animationAuthoring.updateAnimation(animation.id, {
                  duration: Number(event.target.value) || 0.1,
                })
              }
              className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none focus:border-secondary-default"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs text-contrast-grayout">
              Speed
            </span>
            <select
              value={animation.settings?.speed || 1}
              onChange={(event) =>
                animationAuthoring.updateAnimation(animation.id, {
                  settings: { speed: Number(event.target.value) || 1 },
                })
              }
              className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none focus:border-secondary-default"
            >
              {[0.25, 0.5, 0.75, 1, 1.5, 2, 3].map((speed) => (
                <option key={speed} value={speed}>
                  {speed}x
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center justify-between rounded-lg border border-divider-main bg-primary/40 px-3 py-2.5">
            <span className="text-xs text-white">Loop Preview</span>
            <input
              type="checkbox"
              checked={animation.settings?.loop === true}
              onChange={(event) =>
                animationAuthoring.updateAnimation(animation.id, {
                  settings: { loop: event.target.checked },
                })
              }
              className="size-4 accent-accent-main"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs text-contrast-grayout">
              Default Easing
            </span>
            <select
              value={animation.settings?.defaultEasing || "easeInOut"}
              onChange={(event) =>
                animationAuthoring.updateAnimation(animation.id, {
                  settings: { defaultEasing: event.target.value },
                })
              }
              className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-xs text-white outline-none focus:border-secondary-default"
            >
              <option value="linear">Linear</option>
              <option value="easeIn">Ease In</option>
              <option value="easeOut">Ease Out</option>
              <option value="easeInOut">Ease In Out</option>
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}
