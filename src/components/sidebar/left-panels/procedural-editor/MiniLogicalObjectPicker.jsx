import { useMemo } from "react";
import MaterialIcon from "../../../ui/material-icon";
import Button from "../../../ui/button";
import {
  getLogicalObjectParent,
  getLogicalObjectPath,
  resolveObjectTreeRoot,
} from "../../../../utils/objectTreeUtils";
import { StatusBadge } from "./PanelPrimitives";
import { getObjectLabel } from "./utils";

export default function MiniLogicalObjectPicker({
  procedural,
  role,
  title,
  icon,
  assignedReference,
  assignedCount = 0,
  embedded = false,
  hideHeader = false,
}) {
  const selectedObject = procedural?.selectedLogicalObject || null;
  const assignedObject =
    procedural?.resolveObjectReference?.(assignedReference) || null;
  const currentObject = selectedObject || assignedObject || null;
  const rootObject = resolveObjectTreeRoot(procedural?.modelScene);

  const parentObject = useMemo(
    () => getLogicalObjectParent(currentObject, rootObject),
    [currentObject, rootObject],
  );
  const objectPath = useMemo(
    () => getLogicalObjectPath(currentObject, rootObject),
    [currentObject, rootObject],
  );

  const currentName = getObjectLabel(currentObject);
  const roleLabel = role === "animated" ? "Animated Object" : "Click Target";
  const assigned =
    role === "target"
      ? assignedCount > 0 || Boolean(assignedReference)
      : Boolean(assignedReference);
  const assignedText =
    role === "target" && assignedCount > 1
      ? `${assignedCount} click targets assigned`
      : assignedReference?.name || "No object assigned";

  const content = (
    <>
      {!hideHeader && (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white">{title}</p>
            <p className="mt-1 truncate text-[10px] text-contrast-grayout">
              {assignedText}
            </p>
          </div>
          <StatusBadge ready={assigned}>
            {assigned ? "Assigned" : "Required"}
          </StatusBadge>
        </div>
      )}

      <div
        className={[
          "rounded-lg border border-secondary-default/50 bg-[#111717] p-2",
          hideHeader ? "" : "mt-3",
        ].join(" ")}
      >
        <div className="flex items-center gap-2 rounded-md border border-accent-main/60 bg-accent-main/10 px-2 py-2">
          <MaterialIcon
            name={icon}
            className="size-4 shrink-0 text-secondary-default"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] uppercase tracking-wide text-secondary-default">
              Current object selected in viewport
            </span>
            <span className="block truncate text-[11px] font-semibold text-white">
              {currentObject ? currentName : "Select an object in the viewport"}
            </span>
          </span>
          {currentObject && (
            <span className="rounded-full border border-accent-main/40 px-1.5 py-0.5 text-[8px] text-secondary-default">
              Logical
            </span>
          )}
        </div>

        {currentObject && objectPath.length > 0 && (
          <p
            className="mt-2 truncate px-1 text-[9px] text-contrast-grayout"
            title={objectPath.map(getObjectLabel).join(" / ")}
          >
            {objectPath.map(getObjectLabel).join(" / ")}
          </p>
        )}

        <Button
          type="button"
          size="xs"
          variant="cyanOutline"
          className="mt-2 w-full"
          disabled={!parentObject}
          onClick={() => procedural?.selectAuthoringObject?.(parentObject)}
          title={
            parentObject
              ? `Select parent ${getObjectLabel(parentObject)}`
              : "This object has no selectable parent"
          }
        >
          <MaterialIcon name="arrow_upward" className="size-4" />
          Get Parent of This Object
        </Button>
      </div>

      <Button
        type="button"
        size="xs"
        variant="cyanOutline"
        className="mt-3 w-full"
        disabled={!currentObject}
        onClick={() => {
          procedural?.selectAuthoringObject?.(currentObject);
          procedural?.assignObject?.(currentObject, role);
        }}
      >
        <MaterialIcon name={icon} className="size-4" />
        {currentObject
          ? role === "target"
            ? `Add ${currentName} as Click Target`
            : `Use ${currentName} as ${roleLabel}`
          : `Select ${roleLabel.toLowerCase()}`}
      </Button>
    </>
  );

  if (embedded) {
    return <div>{content}</div>;
  }

  return (
    <div className="rounded-lg border border-secondary-default/50 bg-primary/60 p-3">
      {content}
    </div>
  );
}
