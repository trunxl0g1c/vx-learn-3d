import { useEffect, useMemo, useState } from "react";
import MaterialIcon from "../../../ui/material-icon";
import Button from "../../../ui/button";
import {
  getLogicalObjectChildren,
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
}) {
  const selectedObject = procedural?.selectedLogicalObject || null;
  const assignedObject =
    procedural?.resolveObjectReference?.(assignedReference) || null;
  const rootObject = resolveObjectTreeRoot(procedural?.modelScene);
  const [browserObject, setBrowserObject] = useState(
    () => selectedObject || assignedObject || rootObject || null,
  );

  useEffect(() => {
    if (selectedObject) setBrowserObject(selectedObject);
  }, [selectedObject?.uuid]);

  useEffect(() => {
    setBrowserObject((current) => current || assignedObject || rootObject || null);
  }, [assignedObject?.uuid, rootObject?.uuid]);

  const currentObject =
    browserObject || selectedObject || assignedObject || rootObject;
  const parentObject = useMemo(
    () => getLogicalObjectParent(currentObject, rootObject),
    [currentObject, rootObject],
  );
  const childObjects = useMemo(
    () => getLogicalObjectChildren(currentObject),
    [currentObject],
  );
  const objectPath = useMemo(
    () => getLogicalObjectPath(currentObject, rootObject),
    [currentObject, rootObject],
  );

  const currentName = getObjectLabel(currentObject);
  const assignedName = assignedReference?.name || "No object assigned";
  const assigned = Boolean(assignedReference);
  const roleLabel = role === "animated" ? "Animated Object" : "Click Target";

  const browseTo = (object) => {
    if (!object) return;

    setBrowserObject(object);
    procedural?.highlightAuthoringObject?.(object);
  };

  return (
    <div className="rounded-lg border border-secondary-default/50 bg-primary/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white">{title}</p>
          <p className="mt-1 truncate text-[10px] text-contrast-grayout">
            {assignedName}
          </p>
        </div>
        <StatusBadge ready={assigned}>
          {assigned ? "Assigned" : "Required"}
        </StatusBadge>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-secondary-default/50 bg-[#111717]">
        <div className="flex items-center gap-2 border-b border-secondary-default/30 px-2 py-2">
          <MaterialIcon
            name="account_tree"
            className="size-4 shrink-0 text-secondary-default"
          />
          <p className="min-w-0 flex-1 truncate text-[10px] text-contrast-grayout">
            {objectPath.length > 0
              ? objectPath.map(getObjectLabel).join(" / ")
              : "Select an object in the viewport"}
          </p>
          <button
            type="button"
            onClick={() => browseTo(selectedObject)}
            disabled={!selectedObject}
            className="grid size-7 shrink-0 place-items-center rounded-md border border-secondary-default/40 text-secondary-default transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
            title="Return to viewport selection"
          >
            <MaterialIcon name="my_location" className="size-4" />
          </button>
        </div>

        <div className="p-2">
          <button
            type="button"
            onClick={() => browseTo(parentObject)}
            disabled={!parentObject}
            className="mb-2 flex w-full items-center gap-2 rounded-md border border-secondary-default/35 px-2 py-2 text-left transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <MaterialIcon
              name="arrow_upward"
              className="size-4 shrink-0 text-secondary-default"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[9px] uppercase tracking-wide text-contrast-grayout">
                Parent
              </span>
              <span className="block truncate text-[11px] font-semibold text-white">
                {parentObject ? getObjectLabel(parentObject) : "Top level"}
              </span>
            </span>
          </button>

          <div className="flex items-center gap-2 rounded-md border border-accent-main/60 bg-accent-main/10 px-2 py-2">
            <MaterialIcon
              name={icon}
              className="size-4 shrink-0 text-secondary-default"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[9px] uppercase tracking-wide text-secondary-default">
                Current candidate · highlighted in viewport
              </span>
              <span className="block truncate text-[11px] font-semibold text-white">
                {currentObject ? currentName : "No object selected"}
              </span>
            </span>
            {currentObject && (
              <span className="rounded-full border border-accent-main/40 px-1.5 py-0.5 text-[8px] text-secondary-default">
                Logical
              </span>
            )}
          </div>

          <div className="mt-2 max-h-32 space-y-1 overflow-y-auto pr-1">
            {childObjects.length > 0 ? (
              childObjects.map((child) => (
                <button
                  key={child.uuid}
                  type="button"
                  onClick={() => browseTo(child)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition hover:bg-white/5"
                >
                  <MaterialIcon
                    name="subdirectory_arrow_right"
                    className="size-4 shrink-0 text-secondary-default"
                  />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-white">
                    {getObjectLabel(child)}
                  </span>
                  <MaterialIcon
                    name="chevron_right"
                    className="size-4 shrink-0 text-contrast-grayout"
                  />
                </button>
              ))
            ) : (
              <p className="px-2 py-2 text-[10px] text-contrast-grayout">
                This logical object has no child objects. Use Parent to move up.
              </p>
            )}
          </div>
        </div>
      </div>

      <Button
        type="button"
        size="xs"
        variant="cyanOutline"
        className="mt-3 w-full"
        disabled={!currentObject}
        onClick={() => {
          procedural?.highlightAuthoringObject?.(currentObject);
          procedural?.assignObject?.(currentObject, role);
        }}
      >
        <MaterialIcon name={icon} className="size-4" />
        {currentObject
          ? `Use ${currentName} as ${roleLabel}`
          : `Select ${roleLabel.toLowerCase()}`}
      </Button>
    </div>
  );
}
