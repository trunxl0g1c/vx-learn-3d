import { Plus, Trash2 } from "lucide-react";
import { normalizeChapterFlowAssignments } from "../../../engine/chapter";
import Button from "../../ui/button";
import Checkbox from "../../ui/checkbox";
import SelectField from "../../ui/select";

function getAvailableFlowOptions(flows, assignments, currentFlowId) {
  const selectedFlowIds = new Set(
    assignments
      .map((assignment) => assignment.flowId)
      .filter((flowId) => flowId && flowId !== currentFlowId),
  );

  const options = (flows || [])
    .filter((flow) => flow?.enabled !== false)
    .map((flow) => ({
      label: flow.name || "Untitled Flow",
      value: flow.id,
    }))
    .filter((option) => !selectedFlowIds.has(option.value));

  if (
    currentFlowId &&
    !options.some((option) => option.value === currentFlowId)
  ) {
    options.unshift({
      label: "Unavailable Flow",
      value: currentFlowId,
    });
  }

  return options;
}

export default function ChapterFlowSection({
  chapter,
  flows = [],
  addChapterFlow,
  updateChapterFlow,
  removeChapterFlow,
}) {
  const assignments = normalizeChapterFlowAssignments(chapter?.flows);
  const assignedFlowIds = new Set(
    assignments.map((assignment) => assignment.flowId).filter(Boolean),
  );
  const enabledFlows = flows.filter((flow) => flow?.enabled !== false);
  const hasEmptyAssignment = assignments.some(
    (assignment) => !assignment.flowId,
  );
  const canAdd =
    !hasEmptyAssignment &&
    enabledFlows.some((flow) => !assignedFlowIds.has(flow.id));

  return (
    <section className="space-y-3 border-t border-divider-main p-4">
      <div>
        <div className="text-sm font-normal text-contrast-grayout">Flow</div>
        <p className="mt-1 text-xs leading-5 text-contrast-grayout">
          Pilih Flow yang disertakan pada materi ini.
        </p>
      </div>

      {enabledFlows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-divider-main px-3 py-3 text-sm leading-5 text-contrast-grayout">
          Belum ada Flow yang tersedia.
        </div>
      ) : (
        <>
          {assignments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-divider-main px-3 py-3 text-sm leading-5 text-contrast-grayout">
              Belum ada Flow yang disertakan.
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => {
                const selectedFlow = flows.find(
                  (flow) => flow.id === assignment.flowId,
                );

                return (
                  <div
                    key={assignment.assignmentId}
                    className="rounded-lg border border-divider-main bg-primary/60 p-3"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-start gap-2">
                      <SelectField
                        value={assignment.flowId}
                        placeholder="Select flow"
                        options={getAvailableFlowOptions(
                          enabledFlows,
                          assignments,
                          assignment.flowId,
                        )}
                        onChange={(flowId) => {
                          const flow = flows.find((item) => item.id === flowId);
                          updateChapterFlow?.(
                            chapter.id,
                            assignment.assignmentId,
                            {
                              flowId,
                              name: flow?.name || "",
                            },
                          );
                        }}
                      />

                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        title="Remove flow"
                        className="h-[46px] w-[46px] shrink-0 p-0"
                        onClick={() =>
                          removeChapterFlow?.(
                            chapter.id,
                            assignment.assignmentId,
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    {selectedFlow && (selectedFlow.points?.length || 0) < 2 && (
                      <div className="mt-2 text-xs text-warning-main">
                        Flow ini belum memiliki minimal dua waypoint.
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-contrast-grayout">
                        Play automatically when material opens
                      </span>
                      <Checkbox
                        checked={assignment.autoPlay}
                        disabled={!assignment.flowId}
                        onCheckedChange={(autoPlay) =>
                          updateChapterFlow?.(
                            chapter.id,
                            assignment.assignmentId,
                            { autoPlay },
                          )
                        }
                      />
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
            onClick={() => addChapterFlow?.(chapter.id)}
          >
            Add Flow
            <Plus className="size-4" />
          </Button>
        </>
      )}
    </section>
  );
}
