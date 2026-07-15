import Button from "../../ui/button";
import MaterialIcon from "../../ui/material-icon";

export default function ChapterParameterSection({
  chapter,
  addChapterParameter,
  updateChapterParameter,
  deleteChapterParameter,
}) {
  const parameters = chapter?.parameters || [];

  const handleUpdateParameter = (parameterId, field, value) => {
    if (typeof updateChapterParameter !== "function") return;

    updateChapterParameter(chapter.id, parameterId, field, value);
  };

  const handleDeleteParameter = (parameterId) => {
    if (typeof deleteChapterParameter !== "function") return;

    deleteChapterParameter(chapter.id, parameterId);
  };

  const handleAddParameter = (event) => {
    event.stopPropagation();

    if (typeof addChapterParameter !== "function") return;

    addChapterParameter(chapter.id);
  };

  return (
    <section className="space-y-3 p-4">
      <div className="text-sm font-normal text-contrast-grayout">Parameter</div>

      {parameters.length > 0 ? (
        <div className="space-y-2">
          {parameters.map((parameter) => (
            <div
              key={parameter.id}
              onClick={(event) => event.stopPropagation()}
              className={[
                "grid h-10 w-full",
                "grid-cols-[minmax(0,1fr)_90px_72px_28px]",
                "items-center",
                "overflow-hidden rounded-[9px]",
                "border border-secondary-default",
                "bg-transparent",
                "transition-colors",
                "focus-within:border-accent-main",
              ].join(" ")}
            >
              {/* Label */}
              <input
                type="text"
                value={parameter.name || ""}
                placeholder="Label"
                onChange={(event) =>
                  handleUpdateParameter(
                    parameter.id,
                    "name",
                    event.target.value,
                  )
                }
                className={[
                  "h-full min-w-0 bg-transparent px-3",
                  "text-sm text-white",
                  "outline-none",
                  "placeholder:text-sm",
                  "placeholder:font-normal",
                  "placeholder:italic",
                  "placeholder:text-[#86899B]",
                ].join(" ")}
              />

              {/* Value */}
              <input
                type="text"
                value={parameter.value || ""}
                placeholder="Value"
                onChange={(event) =>
                  handleUpdateParameter(
                    parameter.id,
                    "value",
                    event.target.value,
                  )
                }
                className={[
                  "h-full min-w-0 bg-transparent px-2",
                  "text-right text-sm text-white",
                  "outline-none",
                  "placeholder:text-sm",
                  "placeholder:font-normal",
                  "placeholder:italic",
                  "placeholder:text-[#86899B]",
                ].join(" ")}
              />

              {/* Unit */}
              <div className="flex h-5 items-center border-l border-secondary-default">
                <input
                  type="text"
                  value={parameter.unit || ""}
                  placeholder="Unit"
                  onChange={(event) =>
                    handleUpdateParameter(
                      parameter.id,
                      "unit",
                      event.target.value,
                    )
                  }
                  className={[
                    "h-full w-full min-w-0 bg-transparent px-2",
                    "text-center text-sm text-white",
                    "outline-none",
                    "placeholder:text-sm",
                    "placeholder:font-normal",
                    "placeholder:italic",
                    "placeholder:text-[#86899B]",
                  ].join(" ")}
                />
              </div>

              {/* Delete */}
              <button
                type="button"
                title="Delete parameter"
                aria-label="Delete parameter"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  handleDeleteParameter(parameter.id);
                }}
                className={[
                  "grid size-7 cursor-pointer place-items-center",
                  "text-secondary-default",
                  "transition-colors",
                  "hover:text-accent-main",
                ].join(" ")}
              >
                <MaterialIcon
                  name="delete"
                  fill={1}
                  size={15}
                  className="text-current"
                />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-divider-main px-3 py-2 text-sm text-contrast-grayout">
          No parameter has not been added yet
        </div>
      )}

      <Button
        size="sm"
        variant="cyanOutline"
        onClick={handleAddParameter}
        className="gap-2 text-white bg-dark-alpha rounded-lg!"
      >
        <MaterialIcon
          name="add"
          fill={0}
          size={22}
          className="text-secondary-default"
        />
        Add New Parameter
      </Button>
    </section>
  );
}
