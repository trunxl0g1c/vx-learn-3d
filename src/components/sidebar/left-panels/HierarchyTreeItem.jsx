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
  focusObject,
  setSelectedObjectName,
  treeDepth,
  openMap,
  setOpenMap,
  refreshVisibility,
  setRightTab,
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
      setRightTab?.(null);
      return;
    }

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

        <button
          type="button"
          onClick={handleSelect}
          title={displayName}
          className={[
            "truncate pt-1 cursor-pointer text-left transition hover:text-secondary-default",
            selected ? "font-normal text-secondary-default" : "font-normal",
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
          aria-label={visible ? "Hide object" : "Show object"}
          className={[
            "grid size-4.5 cursor-pointer place-items-center rounded-full border transition",
            selected
              ? "border-grayout-main"
              : visible
                ? "border-grayout-main"
                : "border-contrast-grayout",
          ].join(" ")}
        >
          <span
            className={[
              "block size-2 rounded-full transition",
              selected
                ? "bg-primary! hidden"
                : visible
                  ? "bg-secondary-default!"
                  : "bg-transparent",
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
            setRightTab={setRightTab}
          />
        ))}
    </div>
  );
}
