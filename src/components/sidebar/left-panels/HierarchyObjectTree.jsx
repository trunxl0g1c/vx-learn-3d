import { useEffect, useState } from "react"
import HierarchyTreeItem from "./HierarchyTreeItem"
import {
  collectOpenMap,
  filterTree,
  getNodeKey,
  setObjectVisibility,
} from "../../../utils/hierarchyTreeUtils"

export default function HierarchyObjectTree({
  objectList,
  selectedObject,
  highlightObject,
  makeXrayExcept,
  focusObject,
  setSelectedObjectName,
  treeDepth,
  setTreeDepth,
  maxTreeDepth,
  searchObject,
  setSearchObject,
  showAllObjects,
  hideAllObjects,
}) {
  const filteredObjectList = filterTree(objectList, searchObject, treeDepth)

  const [openMap, setOpenMap] = useState({})
  const [treeViewMode, setTreeViewMode] = useState("expand")
  const [, setVisibilityVersion] = useState(0)

  const refreshVisibility = () => {
    setVisibilityVersion((prev) => prev + 1)
  }

  useEffect(() => {
    setOpenMap(collectOpenMap(objectList, true))
  }, [objectList])

  const handleShowAll = () => {
    if (showAllObjects) {
      showAllObjects()
    } else {
      objectList.forEach((item) => setObjectVisibility(item.object, true))
    }

    refreshVisibility()
  }

  const handleHideAll = () => {
    if (hideAllObjects) {
      hideAllObjects()
    } else {
      objectList.forEach((item) => setObjectVisibility(item.object, false))
    }

    refreshVisibility()
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        color: "white",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        overflow: "hidden",
      }}
    >
      <input
        type="text"
        placeholder="🔍 Search Object..."
        value={searchObject}
        onChange={(event) => setSearchObject(event.target.value)}
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.06)",
          color: "white",
          outline: "none",
          boxSizing: "border-box",
        }}
      />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          padding: 12,
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button
            onClick={() => {
              setOpenMap(collectOpenMap(filteredObjectList, true))
              setTreeViewMode("expand")
            }}
            style={{
              flex: 1,
              padding: 8,
              borderRadius: 6,
              border: "none",
              background: treeViewMode === "expand" ? "#2563eb" : "#374151",
              color: "white",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Expand All
          </button>

          <button
            onClick={() => {
              setOpenMap(collectOpenMap(filteredObjectList, false))
              setTreeViewMode("collapse")
            }}
            style={{
              flex: 1,
              padding: 8,
              borderRadius: 6,
              border: "none",
              background: treeViewMode === "collapse" ? "#2563eb" : "#374151",
              color: "white",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Collapse All
          </button>
        </div>

        <div
          style={{
            marginBottom: 10,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span>Level:</span>

          <select
            value={treeDepth}
            onChange={(event) => setTreeDepth(Number(event.target.value))}
            style={{ padding: 4, borderRadius: 6 }}
          >
            {Array.from({ length: maxTreeDepth || 1 }, (_, index) => index + 1).map(
              (depth) => (
                <option key={depth} value={depth}>
                  {depth}
                </option>
              )
            )}

            <option value={999}>All</option>
          </select>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <h3 style={{ margin: 0 }}>Object Tree</h3>

          <div
            style={{
              display: "flex",
              gap: 6,
              fontSize: 12,
              color: "#67e8f9",
              fontWeight: "bold",
            }}
          >
            <button
              onClick={handleShowAll}
              style={{
                border: "none",
                background: "transparent",
                color: "#67e8f9",
                cursor: "pointer",
                fontWeight: "bold",
                padding: 0,
              }}
            >
              Show All
            </button>

            <span>|</span>

            <button
              onClick={handleHideAll}
              style={{
                border: "none",
                background: "transparent",
                color: "#67e8f9",
                cursor: "pointer",
                fontWeight: "bold",
                padding: 0,
              }}
            >
              Hide All
            </button>
          </div>
        </div>

        {filteredObjectList.map((item, index) => (
          <HierarchyTreeItem
            key={getNodeKey(item) || index}
            item={item}
            selectedObject={selectedObject}
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
    </div>
  )
}
