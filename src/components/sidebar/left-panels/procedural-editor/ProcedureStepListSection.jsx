import MaterialIcon from "../../../ui/material-icon";
import Button from "../../../ui/button";
import { Section, StatusBadge } from "./PanelPrimitives";

function getStepClickTargets(procedural, item, isAssembly) {
  const normalized =
    procedural?.normalizeClickTargets?.(item, isAssembly) || [];

  if (normalized.length > 0) return normalized;
  return item?.targetObject ? [item.targetObject] : [];
}

function getStepReadyState(procedural, item, isAssembly) {
  const clickTargets = getStepClickTargets(procedural, item, isAssembly);
  const animatedEntries =
    procedural?.normalizeAnimatedObjects?.(item, isAssembly) ||
    item.animatedObjects ||
    [];

  return Boolean(
    clickTargets.length > 0 &&
      animatedEntries.length > 0 &&
      animatedEntries.every(
        (entry) => entry.startTransform && entry.endTransform,
      ) &&
      (!isAssembly || item.cameraView),
  );
}

export default function ProcedureStepListSection({
  procedural,
  procedure,
  isAssembly,
}) {
  return (
    <Section title="Procedure Steps" step="3">
      <Button
        type="button"
        size="sm"
        variant="cyanOutline"
        className="w-full"
        onClick={procedural.createStep}
      >
        <MaterialIcon name="add_task" className="size-5" />
        {isAssembly ? "Add Assembly Step" : "Add Procedure Step"}
      </Button>

      <div className="mt-3 space-y-2">
        {(procedure.steps || []).length === 0 ? (
          <div className="rounded-lg border border-dashed border-secondary-default/50 p-4 text-center text-xs text-contrast-grayout">
            {isAssembly
              ? "No steps yet. Add the first component to install."
              : "No steps yet. Add the first object interaction."}
          </div>
        ) : (
          procedure.steps.map((item, index) => {
            const active = item.id === procedural.activeStepId;
            const ready = getStepReadyState(procedural, item, isAssembly);
            const clickTargets = getStepClickTargets(
              procedural,
              item,
              isAssembly,
            );
            const animatedEntries =
              procedural?.normalizeAnimatedObjects?.(item, isAssembly) || [];
            const animationMode =
              item.action?.animatedObjectMode === "sequential"
                ? "Sequential"
                : "Together";

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => procedural.setActiveStepId(item.id)}
                className={[
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition",
                  active
                    ? "border-accent-main bg-accent-main/10"
                    : "border-secondary-default/40 bg-primary/50 hover:border-secondary-default",
                ].join(" ")}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-main text-xs font-bold text-white">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-white">
                    {item.name}
                  </span>
                  <span className="mt-1 block truncate text-[10px] text-contrast-grayout">
                    {isAssembly ? "Part" : "Click"}:{" "}
                    {isAssembly
                      ? clickTargets[0]?.name || "not assigned"
                      : clickTargets.length > 0
                        ? `${clickTargets.length} target${clickTargets.length === 1 ? "" : "s"}`
                        : "not assigned"}
                  </span>
                  {!isAssembly && (
                    <span className="mt-0.5 block truncate text-[10px] text-contrast-grayout">
                      Animate: {animatedEntries.length || 0} object
                      {animatedEntries.length === 1 ? "" : "s"} · {animationMode}
                    </span>
                  )}
                </span>
                <StatusBadge ready={ready}>
                  {ready ? "Ready" : "Setup"}
                </StatusBadge>
              </button>
            );
          })
        )}
      </div>
    </Section>
  );
}
