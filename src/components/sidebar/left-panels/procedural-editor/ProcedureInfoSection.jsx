import Button from "../../../ui/button";
import MaterialIcon from "../../../ui/material-icon";
import { Section } from "./PanelPrimitives";

export default function ProcedureInfoSection({ procedural, procedure }) {
  return (
    <Section title="Procedure Information">
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs text-contrast-grayout">
            Procedure Name
          </span>
          <input
            value={procedure.name}
            onChange={(event) =>
              procedural.updateProcedure(procedure.id, {
                name: event.target.value,
              })
            }
            className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs text-contrast-grayout">
            Description
          </span>
          <textarea
            value={procedure.description}
            onChange={(event) =>
              procedural.updateProcedure(procedure.id, {
                description: event.target.value,
              })
            }
            rows={3}
            className="w-full resize-none rounded-lg border border-secondary-default/60 bg-primary p-3 text-sm text-white outline-none"
            placeholder="Example: Remove all bolts, then open the engine cover."
          />
        </label>

        <div className="border-t border-divider-main pt-3">
          <Button
            size="sm"
            type="button"
            variant="destructive"
            onClick={() => procedural.deleteProcedure(procedure.id)}
            className="w-full"
          >
            <MaterialIcon name="delete_forever" size={20} />
            Delete Procedure
          </Button>
        </div>
      </div>
    </Section>
  );
}
