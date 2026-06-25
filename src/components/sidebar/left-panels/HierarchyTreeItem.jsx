import { ChevronRight } from "lucide-react";
import {
  formatObjectName,
  getNodeKey,
  isObjectVisible,
  setObjectVisibility,
} from "../../../utils/hierarchyTreeUtils";

export default function HierarchyTreeItem({
  item,
  selectedObject,
  setSelectedObject,
  highlightObject,
  makeXrayExcept,
  focusObject,
  setSelectedObjectName,
  treeDepth,
  openMap,
  setOpenMap,
  refreshVisibility,
}) {
  const nodeKey = getNodeKey(item);
  const open = openMap?.[nodeKey] ?? true;
  const hasChildren = item.children && item.children.length > 0;
  const displayName = formatObjectName(item.name);
  const visible = isObjectVisible(item.object);
  const selected = selectedObject === item.object;

  const handleSelect = () => {
    if (selected) {
      setSelectedObject?.(null);
      setSelectedObjectName("");
      return;
    }

    setSelectedObject?.(item.object);
    setSelectedObjectName(displayName);
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

  const handleToggleVisibility = (event) => {
    event.stopPropagation();

    const nextVisible = !visible;
    setObjectVisibility(item.object, nextVisible);

    if (!nextVisible && selected) {
      setSelectedObject?.(null);
      setSelectedObjectName("");
    }

    refreshVisibility();
  };

  return (
    <div>
      <div
        className={[
          "grid grid-cols-[18px_minmax(0,1fr)_68px_22px] items-center gap-2 rounded-md py-1.5 pr-1 text-xs transition",
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
            <ChevronRight
              className={[
                "size-4 transition-transform",
                open ? "rotate-90" : "rotate-0",
              ].join(" ")}
            />
          ) : (
            <span />
          )}
        </button>

        <button
          type="button"
          onClick={handleSelect}
          title={displayName}
          className={[
            "truncate cursor-pointer text-left transition hover:text-secondary-default",
            selected ? "font-semibold text-secondary-default" : "font-medium",
          ].join(" ")}
        >
          {displayName}
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleSelect();
          }}
          className={[
            "h-5 cursor-pointer rounded-full border px-2 text-[9px] font-bold uppercase transition",
            selected
              ? "border-accent-main bg-accent-main text-white"
              : "border-secondary-default/50 bg-transparent text-white hover:bg-white/5",
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
            focusObject={focusObject}
            setSelectedObjectName={setSelectedObjectName}
            treeDepth={treeDepth}
            openMap={openMap}
            setOpenMap={setOpenMap}
            refreshVisibility={refreshVisibility}
          />
        ))}
    </div>
  );
}
