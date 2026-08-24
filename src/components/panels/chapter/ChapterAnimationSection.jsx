import { Plus, Trash2 } from "lucide-react";
import { normalizeChapterAnimationAssignments } from "../../../engine/chapter";
import Button from "../../ui/button";
import Checkbox from "../../ui/checkbox";
import SelectField from "../../ui/select";

function getAssignmentValue(assignment) {
  if (assignment?.source === "authored") {
    return assignment.animationId
      ? `authored::${assignment.animationId}`
      : `authored-name::${assignment.name || ""}`;
  }

  return assignment?.name ? `embedded::${assignment.name}` : "";
}

function createAnimationOptions(embeddedAnimations, authoredAnimations) {
  const options = [];
  const embeddedNames = new Set();

  (embeddedAnimations || []).forEach((animation, index) => {
    const name = String(
      animation?.name || `Unnamed Animation ${index + 1}`,
    ).trim();
    if (!name || embeddedNames.has(name)) return;
    embeddedNames.add(name);
    options.push({
      key: `embedded-${name}`,
      label: `GLB · ${name}`,
      value: `embedded::${name}`,
      source: "embedded",
      name,
      animationId: "",
    });
  });

  (authoredAnimations || []).forEach((animation, index) => {
    const id = String(animation?.id || "").trim();
    const name = String(animation?.name || `Animation ${index + 1}`).trim();
    if (!id || !name) return;
    options.push({
      key: `authored-${id}`,
      label: `Authored · ${name}`,
      value: `authored::${id}`,
      source: "authored",
      name,
      animationId: id,
    });
  });

  return options;
}

function getAvailableAnimationOptions(allOptions, assignments, currentValue) {
  const selectedValues = new Set(
    assignments
      .map(getAssignmentValue)
      .filter((value) => value && value !== currentValue),
  );
  const options = allOptions.filter(
    (option) => !selectedValues.has(option.value),
  );

  if (currentValue && !options.some((option) => option.value === currentValue)) {
    options.unshift({
      key: `unavailable-${currentValue}`,
      label: `${currentValue.split("::").pop()} (Unavailable)`,
      value: currentValue,
    });
  }

  return options;
}

export default function ChapterAnimationSection({
  chapter,
  animations = [],
  authoredAnimations = [],
  addChapterAnimation,
  updateChapterAnimation,
  removeChapterAnimation,
}) {
  const assignments = normalizeChapterAnimationAssignments(chapter?.animations);
  const allOptions = createAnimationOptions(animations, authoredAnimations);
  const assignedValues = new Set(assignments.map(getAssignmentValue).filter(Boolean));
  const hasEmptyAssignment = assignments.some(
    (assignment) => !getAssignmentValue(assignment),
  );
  const canAdd =
    !hasEmptyAssignment &&
    allOptions.some((option) => !assignedValues.has(option.value));

  return (
    <section className="space-y-3 border-t border-divider-main p-4">
      <div>
        <div className="text-sm font-normal text-contrast-grayout">Animation</div>
        <p className="mt-1 text-xs leading-5 text-contrast-grayout">
          Assign embedded GLB clips or animations authored in Pro → Animation Creation.
        </p>
      </div>

      {allOptions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-divider-main px-3 py-3 text-sm leading-5 text-contrast-grayout">
          No embedded or authored animations are available.
        </div>
      ) : (
        <>
          {assignments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-divider-main px-3 py-3 text-sm leading-5 text-contrast-grayout">
              No animation has been assigned to this chapter.
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => {
                const currentValue = getAssignmentValue(assignment);
                const options = getAvailableAnimationOptions(
                  allOptions,
                  assignments,
                  currentValue,
                );

                return (
                  <div
                    key={assignment.assignmentId}
                    className="rounded-lg border border-divider-main bg-primary/60 p-3"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-start gap-2">
                      <SelectField
                        value={currentValue}
                        placeholder="Select animation"
                        options={options}
                        onChange={(value) => {
                          const option = allOptions.find(
                            (item) => item.value === value,
                          );

                          updateChapterAnimation?.(
                            chapter.id,
                            assignment.assignmentId,
                            option
                              ? {
                                  source: option.source,
                                  name: option.name,
                                  animationId: option.animationId,
                                }
                              : {
                                  source: "embedded",
                                  name: "",
                                  animationId: "",
                                },
                          );
                        }}
                      />

                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        title="Remove animation"
                        className="h-[46px] w-[46px] shrink-0 p-0"
                        onClick={() =>
                          removeChapterAnimation?.(
                            chapter.id,
                            assignment.assignmentId,
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="mt-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-contrast-grayout">
                          Play automatically when chapter opens
                        </span>
                        <Checkbox
                          checked={assignment.autoPlay}
                          disabled={!currentValue}
                          onCheckedChange={(autoPlay) =>
                            updateChapterAnimation?.(
                              chapter.id,
                              assignment.assignmentId,
                              { autoPlay: autoPlay === true },
                            )
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-contrast-grayout">
                          Loop animation
                        </span>
                        <Checkbox
                          checked={assignment.loop}
                          disabled={!currentValue}
                          onCheckedChange={(loop) =>
                            updateChapterAnimation?.(
                              chapter.id,
                              assignment.assignmentId,
                              { loop: loop === true },
                            )
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <label
                          htmlFor={`content-animation-speed-${assignment.assignmentId}`}
                          className="text-xs text-contrast-grayout"
                        >
                          Speed
                        </label>
                        <select
                          id={`content-animation-speed-${assignment.assignmentId}`}
                          value={String(assignment.speed || 1)}
                          disabled={!currentValue}
                          onChange={(event) =>
                            updateChapterAnimation?.(
                              chapter.id,
                              assignment.assignmentId,
                              { speed: Number(event.target.value) || 1 },
                            )
                          }
                          className={[
                            "h-8 w-20 rounded-md border border-divider-main",
                            "bg-primary px-2 text-xs text-white outline-none",
                            "transition-colors hover:border-accent-main",
                            "focus:border-accent-main",
                            "disabled:cursor-not-allowed disabled:opacity-50",
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
          )}

          <Button
            size="sm"
            type="button"
            variant="outline"
            disabled={!canAdd}
            className="w-full"
            onClick={() => addChapterAnimation?.(chapter.id)}
          >
            <Plus className="size-4" />
            Add Animation
          </Button>
        </>
      )}
    </section>
  );
}
