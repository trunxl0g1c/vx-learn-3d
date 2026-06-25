import HierarchyObjectTree from "./HierarchyObjectTree";

export default function HierarchyPanel({
  objectList,
  selectedObject,
  highlightObject,
  makeXrayExcept,
  focusObject,
  markers,
  setSelectedObjectName,
  setSelectedObject,
  treeDepth,
  setTreeDepth,
  maxTreeDepth,
  searchObject,
  setSearchObject,
  showAllObjects,
  hideAllObjects,
}) {
  return (
    <div className="min-h-0 flex-1 space-y-2 overflow-auto sidebar-scroll">
      <div className="sticky top-0 z-10 flex h-16 items-center bg-[#14201f] px-4 text-lg font-semibold">
        Object List
      </div>

      <HierarchyObjectTree
        objectList={objectList}
        selectedObject={selectedObject}
        highlightObject={highlightObject}
        makeXrayExcept={makeXrayExcept}
        focusObject={focusObject}
        markers={markers}
        setSelectedObjectName={setSelectedObjectName}
        treeDepth={treeDepth}
        setTreeDepth={setTreeDepth}
        maxTreeDepth={maxTreeDepth}
        searchObject={searchObject}
        setSearchObject={setSearchObject}
        showAllObjects={showAllObjects}
        hideAllObjects={hideAllObjects}
        setSelectedObject={setSelectedObject}
      />
    </div>
  );
}
