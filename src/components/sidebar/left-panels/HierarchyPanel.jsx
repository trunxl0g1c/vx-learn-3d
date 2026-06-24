import HierarchyObjectTree from './HierarchyObjectTree'

export default function HierarchyPanel({
  objectList,
  selectedObject,
  highlightObject,
  makeXrayExcept,
  focusObject,
  markers,
  setSelectedObjectName,
  treeDepth,
  setTreeDepth,
  maxTreeDepth,
  searchObject,
  setSearchObject,
  showAllObjects,
  hideAllObjects,
}) {
  return (
    <>
      <div style={{ fontWeight: "bold", fontSize: 15, marginBottom: 10 }}>
        Object Hierarchy
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
      />
    </>
  )
}
