import { Plus, X } from "lucide-react";
import Button from "../../ui/button";
import Input from "../../ui/input";

export default function ChapterParameterSection({
  chapter,
  addChapterParameter,
  updateChapterParameter,
  deleteChapterParameter,
}) {
  const parameters = chapter.parameters || [];

  return (
    <section className="space-y-3 px-2 pb-4">
      <div className="text-xs font-bold text-contrast-grayout">Parameter</div>

      {parameters.length === 0 ? (
        <div className="rounded-lg border border-dashed border-divider-main px-3 py-2 text-xs text-contrast-grayout">
          No parameter has not been added yet
        </div>
      ) : (
        <div className="space-y-2">
          {parameters.map((parameter) => (
            <div
              key={parameter.id}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2"
            >
              <Input
                value={parameter.name || ""}
                placeholder="Name"
                onChange={(e) =>
                  updateChapterParameter(
                    chapter.id,
                    parameter.id,
                    "name",
                    e.target.value,
                  )
                }
                className="h-9! w-32! rounded-lg px-2"
                inputClassName="text-xs"
              />

              <Input
                value={parameter.value || ""}
                placeholder="Value"
                onChange={(e) =>
                  updateChapterParameter(
                    chapter.id,
                    parameter.id,
                    "value",
                    e.target.value,
                  )
                }
                className="h-9! w-32! rounded-lg px-2"
                inputClassName="text-xs"
              />

              <Input
                value={parameter.unit || ""}
                placeholder="Unit"
                onChange={(e) =>
                  updateChapterParameter(
                    chapter.id,
                    parameter.id,
                    "unit",
                    e.target.value,
                  )
                }
                className="h-9! w-32! rounded-lg px-2"
                inputClassName="text-xs"
              />

              <Button
                size="sm"
                type="button"
                onClick={() => deleteChapterParameter(chapter.id, parameter.id)}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          addChapterParameter(chapter.id);
        }}
        className="gap-2 border-secondary-default text-white"
      >
        <Plus className="size-4" />
        Add New Parameter
      </Button>
    </section>
  );
}
