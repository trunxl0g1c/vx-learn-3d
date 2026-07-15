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
  setRightTab,
  renameObject,
}) {
  const nodeKey = getNodeKey(item);
  const open = openMap?.[nodeKey] ?? true;
  const hasChildren = item.children && item.children.length > 0;
  const displayName = formatObjectName(item.name);
  const visible = isObjectVisible(item.object);
  const selected = selectedObject === item.object;
  const canRename = typeof renameObject === "function";

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(displayName);
  const cancelEditRef = useRef(false);

  const clearSelection = () => {
    resetXray?.();
    setSelectedObject?.(null);
    setSelectedObjectName("");
    setRightTab?.(null);
  };

  const handleSelect = ({ shouldFocus = false } = {}) => {
    if (selected) {
      clearSelection();
      return;
    }

    setSelectedObject?.(item.object);
    setSelectedObjectName(displayName);
    setRightTab?.("info");

    highlightObject(item.object);
    makeXrayExcept(item.object);

    if (shouldFocus) {
      focusObject?.(item.object);
    }
  };

  const handleFocus = (event) => {
    event.stopPropagation();

    setSelectedObject?.(item.object);
    setSelectedObjectName(displayName);
    setRightTab?.("info");
    highlightObject(item.object);
    makeXrayExcept(item.object);
    focusObject(item.object);
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
    if (!selectedObject || !item.object) return false;

    let current = selectedObject;

    while (current) {
      if (current === item.object) return true;
      current = current.parent;
    }

    return false;
  };

  const handleToggleVisibility = (event) => {
    event.stopPropagation();

    const nextVisible = !visible;
    const hidesCurrentSelection = !nextVisible && isSelectionInsideObject();

    setObjectVisibility(item.object, nextVisible);

    // Hiding a selected object (or one of its ancestors) must end the
    // selection session. Otherwise the old selection can appear active again
    // when the object is shown because the selected object reference survives.
    if (hidesCurrentSelection) {
      clearSelection();
    }

    refreshVisibility();
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
        className={[
          canRename
            ? "grid grid-cols-[18px_minmax(0,1fr)_68px_22px_22px] items-center gap-2 rounded-md py-1.5 pr-1 text-xs transition"
            : "grid grid-cols-[18px_minmax(0,1fr)_68px_22px] items-center gap-2 rounded-md py-1.5 pr-1 text-xs transition",
          selected ? "text-secondary-default" : "text-white",
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
        >
          {selected ? "DESELECT" : "SELECT"}
        </button>

        <button
          type="button"
          onClick={handleToggleVisibility}
          title={visible ? "Hide object" : "Show object"}
          className={[
            "cursor-pointer grid size-4.5 place-items-center rounded-full border transition",
            visible ? "border-secondary-default" : "border-contrast-grayout",
          ].join(" ")}
        >
          <span
            className={[
              "block size-2 rounded-full",
              visible ? "bg-secondary-default" : "bg-transparent",
            ].join(" ")}
          />
        </button>

        {canRename && (
          <button
            type="button"
            onClick={startEditing}
            title={`Rename ${displayName}`}
            className="grid size-5 cursor-pointer place-items-center rounded text-secondary-default transition hover:bg-white/10 hover:text-white"
          >
            <MaterialIcon name="edit" size={16} />
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
            setRightTab={setRightTab}
            renameObject={renameObject}
          />
        ))}
    </div>
  );
}
