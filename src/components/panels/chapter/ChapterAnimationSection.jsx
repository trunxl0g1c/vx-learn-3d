import { Plus, Trash2 } from "lucide-react";
import { normalizeChapterAnimationAssignments } from "../../../engine/chapter";
import Button from "../../ui/button";
import Checkbox from "../../ui/checkbox";
import SelectField from "../../ui/select";

function getAvailableAnimationOptions(animations, assignments, currentName) {
  const selectedNames = new Set(
    assignments
      .map((assignment) => assignment.name)
      .filter((name) => name && name !== currentName),
  );

  const uniqueAnimationsByName = new Map();

  (animations || []).forEach((animation, index) => {
    const name = animation?.name || `Unnamed Animation ${index + 1}`;

    if (!uniqueAnimationsByName.has(name)) {
      uniqueAnimationsByName.set(name, animation);
    }
  });

  const options = Array.from(uniqueAnimationsByName.keys())
    .map((name) => ({
      key: `chapter-animation-option-${name}`,
      label: name,
      value: name,
    }))
    .filter((option) => !selectedNames.has(option.value));

  if (currentName && !options.some((option) => option.value === currentName)) {
    options.unshift({
      label: `${currentName} (Unavailable)`,
      value: currentName,
    });
  }

  return options;
}

export default function ChapterAnimationSection({
  chapter,
  animations = [],
  addChapterAnimation,
  updateChapterAnimation,
  removeChapterAnimation,
}) {
  const assignments = normalizeChapterAnimationAssignments(
    chapter?.animations,
  );
  const assignedNames = new Set(
    assignments.map((assignment) => assignment.name).filter(Boolean),
  );
  const hasEmptyAssignment = assignments.some(
    (assignment) => !assignment.name,
  );
  const canAdd =
    !hasEmptyAssignment &&
    animations.some((animation, index) => {
      const name = animation?.name || `Unnamed Animation ${index + 1}`;
      return !assignedNames.has(name);
    });

  return (
    <section className="space-y-3 border-t border-divider-main p-4">
      <div>
        <div className="text-sm font-normal text-contrast-grayout">
          Animation
        </div>
        <p className="mt-1 text-xs leading-5 text-contrast-grayout">
          Pilih animasi GLB yang disertakan pada materi ini.
        </p>
      </div>

      {animations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-divider-main px-3 py-3 text-sm leading-5 text-contrast-grayout">
          Tidak ada animasi yang terdeteksi pada file GLB ini.
        </div>
      ) : (
        <>
          {assignments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-divider-main px-3 py-3 text-sm leading-5 text-contrast-grayout">
              Belum ada animasi yang disertakan.
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.assignmentId}
                  className="rounded-lg border border-divider-main bg-primary/60 p-3"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex items-start gap-2">
                    <SelectField
                      value={assignment.name}
                      placeholder="Select animation"
                      options={getAvailableAnimationOptions(
                        animations,
                        assignments,
                        assignment.name,
                      )}
                      onChange={(name) =>
                        updateChapterAnimation?.(
                          chapter.id,
                          assignment.assignmentId,
                          { name },
                        )
                      }
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

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-contrast-grayout">
                      Play automatically when material opens
                    </span>
                    <Checkbox
                      checked={assignment.autoPlay}
                      disabled={!assignment.name}
                      onCheckedChange={(autoPlay) =>
                        updateChapterAnimation?.(
                          chapter.id,
                          assignment.assignmentId,
                          { autoPlay },
                        )
                      }
                    />
                  </div>
                </div>
              ))}
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
