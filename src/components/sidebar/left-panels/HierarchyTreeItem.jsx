import { useRef, useState } from "react";
import {
  formatObjectName,
  getNodeKey,
  isObjectVisible,
  setObjectVisibility,
} from "../../../utils/hierarchyTreeUtils";
import MaterialIcon from "../../ui/material-icon";

export default function HierarchyTreeItem({
  item,
  selectedObject,
  selectedObjects = [],
  multipleSelectEnabled = false,
  selectObjectFromList,
  clearSelection: clearSelectionFromController,
  setSelectedObject,
  highlightObject,
  makeXrayExcept,
  resetXray,
  focusObject,
  setSelectedObjectName,
  treeDepth,
  openMap,
  setOpenMap,
  refreshVisibility,
  registerNodeRef,
  setRightTab,
  renameObject,
  getObjectDescription,
  onOpenObjectDescription,
}) {
  const nodeKey = getNodeKey(item);
  const open = openMap?.[nodeKey] ?? true;
  const hasChildren = item.children && item.children.length > 0;
  const displayName = formatObjectName(item.name);
  const visible = isObjectVisible(item.object);
  const selected = multipleSelectEnabled
    ? selectedObjects.includes(item.object)
    : selectedObject === item.object;
  const active = selectedObject === item.object;
  const canRename = typeof renameObject === "function";
  const supportsDescriptionIndicator =
    typeof getObjectDescription === "function" &&
    typeof onOpenObjectDescription === "function";
  const objectDescription = getObjectDescription?.(item.object, item.name) || null;
  const hasDescriptionData = Boolean(
    objectDescription &&
      (String(objectDescription.description || "").trim() ||
        Number(objectDescription.parameterCount || 0) > 0 ||
        (objectDescription.parameters || []).some((parameter) =>
          [parameter?.name, parameter?.value, parameter?.unit].some((value) =>
            String(value ?? "").trim(),
          ),
        ) ||
        (String(objectDescription.title || "").trim() &&
          String(objectDescription.title || "").trim() !==
            String(objectDescription.objectName || "").trim())),
  );

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(displayName);
  const cancelEditRef = useRef(false);

  const clearSelection = () => {
    if (clearSelectionFromController) {
      clearSelectionFromController();
      return;
    }

    resetXray?.();
    setSelectedObject?.(null);
    setSelectedObjectName("");
    setRightTab?.(null);
  };

  const handleSelect = ({ shouldFocus = false } = {}) => {
    if (selectObjectFromList) {
      selectObjectFromList(item.object, { shouldFocus });
      return;
    }

    if (selected) {
      clearSelection();
      return;
    }

    setSelectedObject?.(item.object);
    setSelectedObjectName(displayName);
    setRightTab?.("info");
    highlightObject?.(item.object);

    if (shouldFocus) {
      focusObject?.(item.object);
    }
  };

  const handleFocus = (event) => {
    event.stopPropagation();

    if (selectObjectFromList) {
      selectObjectFromList(item.object, {
        shouldFocus: true,
        forceSelect: true,
      });
      return;
    }

    setSelectedObject?.(item.object);
    setSelectedObjectName(displayName);
    setRightTab?.("info");
    highlightObject?.(item.object);
    focusObject?.(item.object);
  };

  const handleToggleOpen = (event) => {
    event.stopPropagation();

    if (!hasChildren) return;

    setOpenMap((prev) => ({
      ...prev,
      [nodeKey]: !open,
    }));
  };

  const isSelectionInsideObject = () => {
    const selectionCandidates = multipleSelectEnabled
      ? selectedObjects
      : selectedObject
        ? [selectedObject]
        : [];

    return selectionCandidates.some((candidate) => {
      let current = candidate;

      while (current) {
        if (current === item.object) return true;
        current = current.parent;
      }

      return false;
    });
  };

  const handleToggleVisibility = (event) => {
    event.stopPropagation();

    const nextVisible = !visible;
    const hidesCurrentSelection = !nextVisible && isSelectionInsideObject();

    setObjectVisibility(item.object, nextVisible);

    if (hidesCurrentSelection) {
      clearSelection();
    }

    refreshVisibility();
  };

  const openObjectDescription = (event) => {
    event.stopPropagation();
    if (!objectDescription) return;

    if (selectObjectFromList) {
      selectObjectFromList(item.object, {
        shouldFocus: false,
        forceSelect: true,
      });
    } else {
      setSelectedObject?.(item.object);
      setSelectedObjectName(displayName);
      highlightObject?.(item.object, { openInfo: false });
    }

    onOpenObjectDescription?.(objectDescription.id, item.object);
  };

  const startEditing = (event) => {
    event.stopPropagation();
    cancelEditRef.current = false;
    setDraftName(displayName);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    cancelEditRef.current = true;
    setDraftName(displayName);
    setIsEditing(false);
  };

  const commitEditing = () => {
    if (cancelEditRef.current) {
      cancelEditRef.current = false;
      return;
    }

    const nextName = draftName.trim();

    if (!nextName || nextName === displayName) {
      setDraftName(displayName);
      setIsEditing(false);
      return;
    }

    renameObject?.(item.object, nextName);
    setIsEditing(false);
  };

  return (
    <div>
      <div
        ref={(element) => registerNodeRef?.(nodeKey, element)}
        className={[
          supportsDescriptionIndicator && canRename
            ? "grid grid-cols-[18px_minmax(0,1fr)_68px_22px_22px_22px] items-center gap-2 rounded-md py-1.5 pr-1 text-xs transition"
            : canRename || supportsDescriptionIndicator
              ? "grid grid-cols-[18px_minmax(0,1fr)_68px_22px_22px] items-center gap-2 rounded-md py-1.5 pr-1 text-xs transition"
              : "grid grid-cols-[18px_minmax(0,1fr)_68px_22px] items-center gap-2 rounded-md py-1.5 pr-1 text-xs transition",
          selected ? "text-secondary-default" : "text-white",
          active && multipleSelectEnabled ? "bg-accent-main/10" : "",
          visible ? "opacity-100" : "opacity-50",
        ].join(" ")}
        style={{ paddingLeft: `${item.level * 18}px` }}
      >
        <button
          type="button"
          onClick={handleToggleOpen}
          className="grid size-4 cursor-pointer place-items-center text-secondary-default"
        >
          {hasChildren ? (
            <MaterialIcon
              name="arrow_back_2"
              fill={1}
              size={20}
              className={[
                "transition-transform duration-200 ease-in-out",
                open ? "-rotate-90" : "rotate-180",
              ].join(" ")}
            />
          ) : (
            <span />
          )}
        </button>

        {isEditing ? (
          <input
            autoFocus
            value={draftName}
            maxLength={64}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={commitEditing}
            onKeyDown={(event) => {
              event.stopPropagation();

              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }

              if (event.key === "Escape") {
                event.preventDefault();
                cancelEditing();
              }
            }}
            className="h-7 min-w-0 rounded-md border border-secondary-default bg-primary px-2 text-xs text-white outline-none"
            aria-label={`Rename ${displayName}`}
          />
        ) : (
          <button
            type="button"
            onClick={(event) => {
              if (event.detail > 1) return;
              handleSelect({ shouldFocus: false });
            }}
            onDoubleClick={handleFocus}
            title={`${displayName} — double click to focus`}
            className={[
              "truncate pt-1 cursor-pointer text-left transition hover:text-secondary-default",
              selected ? "font-normal text-secondary-default" : "font-normal",
            ].join(" ")}
          >
            {displayName}
          </button>
        )}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleSelect({ shouldFocus: true });
          }}
          className={[
            "h-5 cursor-pointer rounded-full border px-2 text-[9px] font-normal uppercase transition",
            selected
              ? "border-grayout-dark bg-accent-main text-white"
              : "border-grayout-dark bg-dark-alpha text-white hover:bg-white/5",
          ].join(" ")}
          title={
            active && multipleSelectEnabled
              ? "Active authoring object (last selected)"
              : undefined
          }
        >
          {selected ? "DESELECT" : "SELECT"}
        </button>

        <button
          type="button"
          onClick={handleToggleVisibility}
          title={visible ? "Hide object" : "Show object"}
          aria-label={visible ? "Hide object" : "Show object"}
          className={[
            "grid size-4.5 cursor-pointer place-items-center rounded-full border transition",
            visible ? "border-grayout-main" : "border-contrast-grayout",
          ].join(" ")}
        >
          <span
            className={[
              "block size-2 rounded-full transition",
              visible ? "bg-secondary-default!" : "bg-transparent",
            ].join(" ")}
          />
        </button>

        {supportsDescriptionIndicator && (
          hasDescriptionData ? (
            <button
              type="button"
              onClick={openObjectDescription}
              title={`Edit description for ${displayName}`}
              aria-label={`Edit description for ${displayName}`}
              className="grid size-5 cursor-pointer place-items-center rounded text-secondary-default transition hover:bg-white/10 hover:text-white"
            >
              <MaterialIcon name="menu_book" fill={1} size={17} />
            </button>
          ) : (
            <span
              title={`No description for ${displayName}`}
              aria-label={`No description for ${displayName}`}
              className="grid size-5 place-items-center rounded text-secondary-default/30 opacity-60"
            >
              <MaterialIcon name="menu_book" fill={1} size={17} />
            </span>
          )
        )}

        {canRename && (
          <button
            type="button"
            onClick={startEditing}
            title={`Rename ${displayName}`}
            className="grid size-5 cursor-pointer place-items-center rounded text-secondary-default transition hover:bg-white/10 hover:text-white"
          >
            <MaterialIcon name="edit_square" size={16} />
          </button>
        )}
      </div>

      {open &&
        hasChildren &&
        item.level < treeDepth - 1 &&
        item.children.map((child, index) => (
          <HierarchyTreeItem
            key={getNodeKey(child) || index}
            item={child}
            selectedObject={selectedObject}
            selectedObjects={selectedObjects}
            multipleSelectEnabled={multipleSelectEnabled}
            selectObjectFromList={selectObjectFromList}
            clearSelection={clearSelectionFromController}
            setSelectedObject={setSelectedObject}
            highlightObject={highlightObject}
            makeXrayExcept={makeXrayExcept}
            resetXray={resetXray}
            focusObject={focusObject}
            setSelectedObjectName={setSelectedObjectName}
            treeDepth={treeDepth}
            openMap={openMap}
            setOpenMap={setOpenMap}
            refreshVisibility={refreshVisibility}
            registerNodeRef={registerNodeRef}
            setRightTab={setRightTab}
            renameObject={renameObject}
            getObjectDescription={getObjectDescription}
            onOpenObjectDescription={onOpenObjectDescription}
          />
        ))}
    </div>
  );
}
