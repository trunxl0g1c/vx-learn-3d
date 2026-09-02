import MaterialIcon from "../../../ui/material-icon";
import Button from "../../../ui/button";
import { Section } from "./PanelPrimitives";
import SelectField from "../../../ui/select";

export default function ProcedureSelectionSection({
  procedural,
  newProcedureType,
  setNewProcedureType,
}) {
  return (
    <Section title="Create or Select Procedure">
      <div className="space-y-2">
        <SelectField
          value={procedural?.activeProcedureId || ""}
          onChange={(value) => procedural?.selectProcedure?.(value)}
          placeholder="Select procedure"
          options={(procedural?.procedures || []).map((item) => ({
            value: item.id,
            label: `${item.name} · ${item.type || "guided"}`,
          }))}
          className="h-10! w-full"
        />

        <div className="flex gap-2">
          <SelectField
            value={procedural?.activeStepId || ""}
            onChange={(value) => procedural?.selectStep?.(value)}
            placeholder="Select step"
            options={(procedural?.steps || []).map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            className="h-9! w-full"
          />
          <Button
            size="sm"
            onClick={() => procedural?.createProcedure?.(newProcedureType)}
          >
            New
            <MaterialIcon name="add" size={20} />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            variant="accentOutline"
            disabled={
              !procedural?.activeProcedureId ||
              procedural?.isLoadingActiveProcedure
            }
            onClick={() =>
              procedural?.duplicateProcedure?.(procedural.activeProcedureId)
            }
            title="Duplicate the procedure"
          >
            <MaterialIcon name="content_copy" size={20} />
            Duplicate
          </Button>

          <Button
            type="button"
            size="sm"
            variant="accentOutline"
            disabled={
              !procedural?.activeProcedureId ||
              procedural?.isLoadingActiveProcedure
            }
            onClick={() =>
              procedural?.duplicateProcedure?.(procedural.activeProcedureId, {
                reverse: true,
              })
            }
            title="Duplicate and reverse the procedure"
          >
            <MaterialIcon name="swap_vert" size={20} />
            Reverse
          </Button>
        </div>
      </div>
    </Section>
  );
}
