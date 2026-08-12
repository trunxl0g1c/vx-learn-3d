import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import HierarchyObjectTree from "../sidebar/left-panels/HierarchyObjectTree";
import { getMaxTreeDepth } from "../../utils/objectTreeUtils";

function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function filterMaterialTree(nodes, search) {
  const keyword = normalizeSearch(search);
  if (!keyword) return nodes;

  return (nodes || []).flatMap((node) => {
    const children = filterMaterialTree(node.children || [], keyword);
    const objectName = normalizeSearch(node.name);
    const chapterTitle = normalizeSearch(node.chapterTitle);
    const matches = objectName.includes(keyword) || chapterTitle.includes(keyword);

    if (!matches && children.length === 0) return [];

    return [{ ...node, children }];
  });
}

function collectExpandableIds(nodes, target = new Set()) {
  (nodes || []).forEach((node) => {
    if ((node.children || []).length > 0) {
      target.add(node.chapterId || node.object?.uuid || node.name);
      collectExpandableIds(node.children, target);
    }
  });
  return target;
}

function MaterialObjectRow({
  item,
  activeChapterId,
  expandedIds,
  setExpandedIds,
  onSelectChapter,
  forceExpanded = false,
}) {
  const children = item.children || [];
  const hasChildren = children.length > 0;
  const itemId = item.chapterId || item.object?.uuid || item.name;
  const expanded = forceExpanded || expandedIds.has(itemId);
  const active = item.chapterId === activeChapterId;
  const objectLabel = String(item.name || item.chapter?.objectName || "Object").replaceAll(
    "_",
    " ",
  );
  const materialLabel = item.chapterTitle || objectLabel;
  const showSubtitle = normalizeSearch(materialLabel) !== normalizeSearch(objectLabel);

  const toggleExpanded = () => {
    if (!hasChildren) return;

    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  return (
    <div>
      <div
        className={[
          "flex w-full items-center gap-1 rounded-xl border px-1.5 py-1 transition",
          active
            ? "border-secondary-default/70 bg-secondary-default/10"
            : "border-transparent hover:border-white/10 hover:bg-white/[0.04]",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={toggleExpanded}
          disabled={!hasChildren}
          className="grid size-7 shrink-0 place-items-center rounded-lg text-secondary-default transition hover:bg-white/5 disabled:cursor-default disabled:text-transparent"
          title={hasChildren ? (expanded ? "Collapse" : "Expand") : undefined}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />
          ) : (
            <span className="size-4" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onSelectChapter?.(item.chapterId)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-left text-white/80 transition hover:text-white"
          title={`Open material: ${materialLabel}`}
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary-default/10 text-secondary-default">
            <BookOpen className="size-4" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium">{objectLabel}</span>
            {showSubtitle && (
              <span className="mt-0.5 block truncate text-[10px] text-white/45">
                {materialLabel}
              </span>
            )}
          </span>

          <ChevronRight className="size-4 shrink-0 text-white/35" />
        </button>
      </div>

      {hasChildren && expanded && (
        <div className="ml-5 border-l border-white/10 pl-2">
          {children.map((child) => (
            <MaterialObjectRow
              key={child.chapterId || child.object?.uuid || child.name}
              item={child}
              activeChapterId={activeChapterId}
              expandedIds={expandedIds}
              setExpandedIds={setExpandedIds}
              onSelectChapter={onSelectChapter}
              forceExpanded={forceExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlayerMaterialObjectListPanel({
  objectList = [],
  fullObjectList = [],
  mode = "info",
  onModeChange,
  activeChapterId = null,
  onSelectChapter,
  onClose,
  searchObject = "",
  setSearchObject,
  selectedObject = null,
  onSelectObject,
  onClearSelection,
  onFocusObject,
  onResetXray,
  onShowAllObjects,
  onHideAllObjects,
}) {
  const filteredTree = useMemo(
    () => filterMaterialTree(objectList, searchObject),
    [objectList, searchObject],
  );
  const [expandedIds, setExpandedIds] = useState(
    () => collectExpandableIds(objectList),
  );

  useEffect(() => {
    setExpandedIds((current) => {
      const next = new Set(current);
      collectExpandableIds(objectList).forEach((id) => next.add(id));
      return next;
    });
  }, [objectList]);

  const forceExpanded = normalizeSearch(searchObject).length > 0;
  const [treeDepth, setTreeDepth] = useState(999);
  const maxTreeDepth = useMemo(() => getMaxTreeDepth(fullObjectList), [fullObjectList]);
  const showAllMode = mode === "all";

  const selectMode = (nextMode) => {
    if (nextMode === mode) return;
    setSearchObject?.("");
    onModeChange?.(nextMode);
  };

  return (
    <aside className="vx-player-panel vx-player-panel--full-mobile absolute bottom-7 left-23 top-7 z-40 flex w-100 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#182223]/75 text-white shadow-2xl backdrop-blur-xl">
      <div className="flex h-14 shrink-0 items-center gap-3 px-6 pt-1">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-white">Object List</h3>
          <p className="text-[10px] text-white/45">
            {showAllMode ? "Complete model hierarchy" : "Objects with material only"}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="grid size-8 cursor-pointer place-items-center rounded-lg text-white transition hover:bg-white/10"
          title="Close object list"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="px-6 pb-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/20 p-1">
          <button
            type="button"
            onClick={() => selectMode("all")}
            className={[
              "h-8 rounded-lg px-2 text-[10px] font-semibold transition",
              showAllMode
                ? "bg-accent-main text-white shadow-sm"
                : "text-white/55 hover:bg-white/5 hover:text-white",
            ].join(" ")}
          >
            Show All
          </button>
          <button
            type="button"
            onClick={() => selectMode("info")}
            className={[
              "h-8 rounded-lg px-2 text-[10px] font-semibold transition",
              !showAllMode
                ? "bg-accent-main text-white shadow-sm"
                : "text-white/55 hover:bg-white/5 hover:text-white",
            ].join(" ")}
          >
            Only Object with Info
          </button>
        </div>
      </div>

      {!showAllMode && (
        <div className="px-6 pb-3">
        <label className="flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-black/20 px-3 text-white/70 focus-within:border-secondary-default/70">
          <Search className="size-4 shrink-0 text-secondary-default" />
          <input
            value={searchObject}
            onChange={(event) => setSearchObject?.(event.target.value)}
            placeholder="Search material object"
            className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/35"
          />
        </label>
        </div>
      )}

      {showAllMode ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <HierarchyObjectTree
            objectList={fullObjectList}
            selectedObject={selectedObject}
            selectedObjects={[]}
            multipleSelectEnabled={false}
            selectObjectFromList={onSelectObject}
            clearSelection={onClearSelection}
            resetXray={onResetXray}
            focusObject={onFocusObject}
            treeDepth={treeDepth}
            setTreeDepth={setTreeDepth}
            maxTreeDepth={maxTreeDepth}
            searchObject={searchObject}
            setSearchObject={setSearchObject}
            showAllObjects={onShowAllObjects}
            hideAllObjects={onHideAllObjects}
          />
        </div>
      ) : (
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5">
        {filteredTree.length > 0 ? (
          <div className="space-y-1">
            {filteredTree.map((item) => (
              <MaterialObjectRow
                key={item.chapterId || item.object?.uuid || item.name}
                item={item}
                activeChapterId={activeChapterId}
                expandedIds={expandedIds}
                setExpandedIds={setExpandedIds}
                onSelectChapter={onSelectChapter}
                forceExpanded={forceExpanded}
              />
            ))}
          </div>
        ) : (
          <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-white/10 px-6 text-center">
            <div>
              <BookOpen className="mx-auto mb-2 size-6 text-white/30" />
              <p className="text-xs text-white/55">No material object found.</p>
              <p className="mt-1 text-[10px] leading-4 text-white/35">
                Only objects that have Create Content material are shown here.
              </p>
            </div>
          </div>
        )}
      </div>
      )}
    </aside>
  );
}
