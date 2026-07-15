import HierarchyObjectTree from "./HierarchyObjectTree";

export default function HierarchyPanel({
  objectList,
  selectedObject,
  highlightObject,
  makeXrayExcept,
  resetXray,
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
  setRightTab,
  renameObject,
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex h-16 shrink-0 items-center bg-[#14201f] px-4 text-lg font-normal">
        Object List
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <HierarchyObjectTree
          objectList={objectList}
          selectedObject={selectedObject}
          highlightObject={highlightObject}
          makeXrayExcept={makeXrayExcept}
          resetXray={resetXray}
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
          setRightTab={setRightTab}
          renameObject={renameObject}
        />
      </div>
    </div>
  );
}