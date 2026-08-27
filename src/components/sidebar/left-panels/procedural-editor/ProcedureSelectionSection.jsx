import MaterialIcon from "../../../ui/material-icon";
import Button from "../../../ui/button";
import { Section } from "./PanelPrimitives";

export default function ProcedureSelectionSection({
  procedural,
  newProcedureType,
  setNewProcedureType,
}) {
  return (
    <Section title="Create or Select Procedure">
      <div className="space-y-2">
        <select
          value={procedural?.activeProcedureId || ""}
          onChange={(event) => procedural?.selectProcedure?.(event.target.value)}
          className="h-10 w-full rounded-lg border border-secondary-default/70 bg-primary px-3 text-sm text-white outline-none"
        >
          <option value="">Select procedure</option>
          {(procedural?.procedures || []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.type || "guided"}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <select
            value={newProcedureType}
            onChange={(event) => setNewProcedureType(event.target.value)}
            className="h-10 min-w-0 flex-1 rounded-lg border border-secondary-default/70 bg-primary px-3 text-sm text-white outline-none"
          >
            <option value="assembly">Assembly</option>
            <option value="guided">Guided Procedure</option>
          </select>
          <Button
            size="sm"
            onClick={() => procedural?.createProcedure?.(newProcedureType)}
          >
            <MaterialIcon name="add" className="size-5" />
            New
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            variant="cyanOutline"
            className="min-w-0"
            disabled={
              !procedural?.activeProcedureId ||
              procedural?.isLoadingActiveProcedure
            }
            onClick={() =>
              procedural?.duplicateProcedure?.(procedural.activeProcedureId)
            }
          >
            <MaterialIcon name="content_copy" className="size-5" />
            Duplicate
          </Button>

          <Button
            type="button"
            size="sm"
            variant="cyanOutline"
            className="min-w-0"
            disabled={
              !procedural?.activeProcedureId ||
              procedural?.isLoadingActiveProcedure
            }
            onClick={() =>
              procedural?.duplicateProcedure?.(procedural.activeProcedureId, {
                reverse: true,
              })
            }
          >
            <MaterialIcon name="swap_vert" className="size-5" />
            Duplicate Reverse
          </Button>
        </div>
      </div>
    </Section>
  );
}
