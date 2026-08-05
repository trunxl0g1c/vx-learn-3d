import MaterialIcon from "../../../ui/material-icon";
import Button from "../../../ui/button";
import { Section } from "./PanelPrimitives";

export default function ProcedureSelectionSection({
  procedural,
  newProcedureType,
  setNewProcedureType,
}) {
  return (
    <Section title="Create or Select Procedure" step="1">
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
      </div>

      {(procedural?.procedures || []).length === 0 && (
        <p className="mt-3 text-xs leading-5 text-contrast-grayout">
          Create a procedure first. It will appear as one playable material in
          Player.
        </p>
      )}
    </Section>
  );
}
