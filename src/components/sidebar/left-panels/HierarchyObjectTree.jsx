import { useCallback, useEffect, useRef, useState } from "react";
import HierarchyTreeItem from "./HierarchyTreeItem";
import {
  collectOpenMap,
  filterTree,
  findObjectTreePath,
  getNodeKey,
  setObjectVisibility,
} from "../../../utils/hierarchyTreeUtils";
import Input from "../../ui/input";
import { Search } from "lucide-react";
import Button from "../../ui/button";

export default function HierarchyObjectTree({
  objectList,
  selectedObject,
  selectedObjects,
  multipleSelectEnabled,
  selectObjectFromList,
  clearSelection,
  setSelectedObject,
  highlightObject,
  makeXrayExcept,
  resetXray,
  focusObject,
  setSelectedObjectName,
  treeDepth,
  setTreeDepth,
  maxTreeDepth,
  searchObject,
  setSearchObject,
  showAllObjects,
  hideAllObjects,
  setRightTab,
  renameObject,
}) {
  const filteredObjectList = filterTree(objectList, searchObject, treeDepth);

  const [openMap, setOpenMap] = useState({});
  const [pendingScrollNodeKey, setPendingScrollNodeKey] = useState(null);
  const nodeElementMapRef = useRef(new Map());
  const scrollContainerRef = useRef(null);
  const revealedSelectionRef = useRef({
    objectList: null,
    selectedObject: null,
  });
  const [, setVisibilityVersion] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [treeViewMode, setTreeViewMode] = useState("expand");

  const refreshVisibility = () => {
    setVisibilityVersion((prev) => prev + 1);
  };

  const registerNodeRef = useCallback((nodeKey, element) => {
    if (!nodeKey) return;

    if (element) {
      nodeElementMapRef.current.set(nodeKey, element);
      return;
    }

    nodeElementMapRef.current.delete(nodeKey);
  }, []);

  useEffect(() => {
    setOpenMap(collectOpenMap(objectList, true));
  }, [objectList]);


  useEffect(() => {
    if (!selectedObject) {
      revealedSelectionRef.current = {
        objectList,
        selectedObject: null,
      };
      return;
    }

    const previousReveal = revealedSelectionRef.current;

    if (
      previousReveal.objectList === objectList &&
      previousReveal.selectedObject === selectedObject
    ) {
      return;
    }

    revealedSelectionRef.current = {
      objectList,
      selectedObject,
    };

    const selectedPath = findObjectTreePath(objectList, selectedObject);
    if (selectedPath.length === 0) return;

    const selectedNode = selectedPath[selectedPath.length - 1];
    const selectedNodeKey = getNodeKey(selectedNode);
    const requiredDepth = Number(selectedNode.level || 0) + 1;

    setOpenMap((previousMap) => {
      let changed = false;
      const nextMap = { ...previousMap };

      selectedPath.slice(0, -1).forEach((ancestor) => {
        const ancestorKey = getNodeKey(ancestor);

        if (ancestorKey && nextMap[ancestorKey] !== true) {
          nextMap[ancestorKey] = true;
          changed = true;
        }
      });

      return changed ? nextMap : previousMap;
    });

    if (treeDepth < requiredDepth) {
      setTreeDepth?.(requiredDepth);
    }

    const visibleDepth = Math.max(treeDepth, requiredDepth);
    const visiblePath = findObjectTreePath(
      filterTree(objectList, searchObject, visibleDepth),
      selectedObject,
    );

    // A viewport selection must remain discoverable even when the current
    // search filter excludes it. A selection already made from a visible row
    // keeps the user's search untouched.
    if (visiblePath.length === 0 && searchObject) {
      setSearchObject?.("");
    }

    setPendingScrollNodeKey(selectedNodeKey);
  }, [
    objectList,
    searchObject,
    selectedObject,
    setSearchObject,
    setTreeDepth,
    treeDepth,
  ]);

  useEffect(() => {
    if (!pendingScrollNodeKey) return undefined;

    let firstFrame = 0;
    let secondFrame = 0;

    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const selectedElement =
          nodeElementMapRef.current.get(pendingScrollNodeKey);

        if (!selectedElement) return;

        const scrollContainer = scrollContainerRef.current;

        if (!scrollContainer) return;

        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = selectedElement.getBoundingClientRect();
        const centeredOffset =
          (scrollContainer.clientHeight - selectedElement.offsetHeight) / 2;
        const targetScrollTop =
          scrollContainer.scrollTop +
          (elementRect.top - containerRect.top) -
          centeredOffset;

        // Keep auto-focus local to the Object List. scrollIntoView() may also
        // scroll viewport ancestors, which can move the Editor top bar out of
        // view when the sidebar is positioned inside the full-screen layout.
        scrollContainer.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: "smooth",
        });

        setPendingScrollNodeKey((currentKey) =>
          currentKey === pendingScrollNodeKey ? null : currentKey,
        );
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [pendingScrollNodeKey, openMap, searchObject, treeDepth]);

  const handleShowAll = () => {
    setIsVisible(true);
    if (showAllObjects) showAllObjects();
    else objectList.forEach((item) => setObjectVisibility(item.object, true));

    refreshVisibility();
  };

  const handleHideAll = () => {
    setIsVisible(false);
    if (hideAllObjects) hideAllObjects();
    else objectList.forEach((item) => setObjectVisibility(item.object, false));

    refreshVisibility();
  };

  return (
    <div className="flex h-full min-h-0 flex-col text-white">
      <div
        ref={scrollContainerRef}
        className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3"
      >
        <Input
          type="text"
          placeholder="search object"
          value={searchObject}
          onChange={(event) => setSearchObject(event.target.value)}
          leftIcon={<Search className="size-5" />}
          className="mb-4 h-8.5! rounded-full px-2!"
          inputClassName="text-base"
        />

        <div className="mb-3 flex items-center gap-3">
          <Button
            size="sm"
            variant={treeViewMode === "expand" ? "default" : "outline"}
            onClick={() => {
              setOpenMap(collectOpenMap(filteredObjectList, true));
              setTreeViewMode("expand");
            }}
            className="h-8 flex-1"
          >
            Expand All
          </Button>

          <Button
            size="sm"
            variant={treeViewMode === "collapse" ? "default" : "outline"}
            onClick={() => {
              setOpenMap(collectOpenMap(filteredObjectList, false));
              setTreeViewMode("collapse");
            }}
            className="h-8 flex-1"
          >
            Collapse All
          </Button>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <label className="text-base font-normal">Level:</label>

          <select
            value={treeDepth}
            onChange={(event) => setTreeDepth(Number(event.target.value))}
            className="h-7 cursor-pointer rounded-md border border-divider-main bg-primary px-2 text-sm text-white outline-none"
          >
            {Array.from(
              { length: maxTreeDepth || 1 },
              (_, index) => index + 1,
            ).map((depth) => (
              <option key={depth} value={depth}>
                {depth}
              </option>
            ))}

            <option value={999}>All</option>
          </select>
        </div>

        <div className="mb-3 grid grid-cols-[1fr_auto] items-center gap-3">
          <h3 className="text-sm font-normal text-white">Object Name</h3>

          <div className="flex items-center gap-1 text-sm font-normal">
            <button
              className={`cursor-pointer ${isVisible ? "text-secondary-default" : "text-contrast-grayout"}`}
              type="button"
              onClick={handleShowAll}
            >
              Show All
            </button>
            <span>|</span>
            <button
              className={`cursor-pointer ${isVisible ? "text-contrast-grayout" : "text-secondary-default"}`}
              type="button"
              onClick={handleHideAll}
            >
              Hide All
            </button>
          </div>
        </div>

        <div className="space-y-1">
          {filteredObjectList.map((item, index) => (
            <HierarchyTreeItem
              key={getNodeKey(item) || index}
              item={item}
              selectedObject={selectedObject}
              selectedObjects={selectedObjects}
              multipleSelectEnabled={multipleSelectEnabled}
              selectObjectFromList={selectObjectFromList}
              clearSelection={clearSelection}
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
            />
          ))}
        </div>
      </div>
    </div>
  );
}
