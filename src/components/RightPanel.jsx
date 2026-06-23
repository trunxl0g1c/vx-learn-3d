import { useEffect, useState } from "react"

const formatObjectName = (name) => {
  return (name || "Unnamed Object").replaceAll("_", " ").trim()
}

const getNodeKey = (item) => {
  return item.object?.uuid || item.name
}

const setObjectVisibility = (object, visible) => {
  if (!object) return

  object.visible = visible

  object.traverse?.((child) => {
    child.visible = visible
  })
}

const isObjectVisible = (object) => {
  if (!object) return true

  let current = object

  while (current) {
    if (current.visible === false) return false
    current = current.parent
  }

  return true
}

const filterTree = (nodes, search, treeDepth) => {
  const keyword = (search || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .trim()

  const walk = (items) => {
    return items
      .map((node) => {
        const isWithinDepth = node.level < treeDepth

        const children = isWithinDepth
          ? walk(node.children || [])
          : []

        if (!keyword) {
          return isWithinDepth
            ? {
                ...node,
                children,
              }
            : null
        }

        const selfMatch =
          isWithinDepth &&
          node.name
            ?.toLowerCase()
            .replaceAll("_", " ")
            .includes(keyword)

        if (selfMatch || children.length > 0) {
          return {
            ...node,
            children,
          }
        }

        return null
      })
      .filter(Boolean)
  }

  return walk(nodes)
}

const collectOpenMap = (nodes, value = true) => {
  const result = {}

  const walk = (items) => {
    items.forEach((item) => {
      result[getNodeKey(item)] = value

      if (item.children?.length) {
        walk(item.children)
      }
    })
  }

  walk(nodes)

  return result
}

function TreeItem({
  item,
  selectedObject,
  highlightObject,
  makeXrayExcept,
  focusObject,
  setSelectedObjectName,
  treeDepth,
  openMap,
  setOpenMap,
  visibilityVersion,
  refreshVisibility,
}) {
  const nodeKey = getNodeKey(item)
  const open = openMap?.[nodeKey] ?? true
  const hasChildren = item.children && item.children.length > 0
  const displayName = formatObjectName(item.name)
  const visible = isObjectVisible(item.object)

  const handleSelect = () => {
    setSelectedObjectName(displayName)
    highlightObject(item.object)
    makeXrayExcept(item.object)
    focusObject(item.object)
  }

  const handleToggleVisibility = (e) => {
    e.stopPropagation()

    const nextVisible = !visible
    setObjectVisibility(item.object, nextVisible)

    if (!nextVisible && selectedObject === item.object) {
      setSelectedObjectName("")
    }

    refreshVisibility()
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "24px minmax(0, 1fr) 82px 34px",
          alignItems: "center",
          gap: 8,
          padding: "7px 8px",
          marginBottom: 6,
          borderRadius: 8,
          background:
            selectedObject === item.object ? "#2563eb" : "rgba(255,255,255,0.08)",
          marginLeft: item.level * 14,
          fontSize: 13,
          opacity: visible ? 1 : 0.55,
        }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setOpenMap((prev) => ({
                ...prev,
                [nodeKey]: !open,
              }))
            }}
            style={{
              width: 22,
              height: 22,
              border: "none",
              borderRadius: 6,
              background: "#111827",
              color: "white",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {open ? "−" : "+"}
          </button>
        ) : (
          <span style={{ width: 22 }} />
        )}

        <div
          onClick={handleSelect}
          title={displayName}
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            cursor: "pointer",
            fontWeight: selectedObject === item.object ? "bold" : "normal",
          }}
        >
          {displayName}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            handleSelect()
          }}
          style={{
            padding: "5px 10px",
            borderRadius: 999,
            border: "1px solid rgba(56,189,248,0.45)",
            background: "rgba(15,23,42,0.55)",
            color: "white",
            cursor: "pointer",
            fontSize: 11,
            fontWeight: "bold",
          }}
        >
          SELECT
        </button>

        <button
          onClick={handleToggleVisibility}
          title={visible ? "Hide object" : "Show object"}
          style={{
            width: 24,
            height: 24,
            borderRadius: 999,
            border: visible
              ? "1px solid rgba(125,211,252,0.85)"
              : "1px solid rgba(255,255,255,0.35)",
            background: visible
              ? "rgba(14,165,233,0.30)"
              : "rgba(255,255,255,0.05)",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: visible ? "#67e8f9" : "transparent",
              display: "block",
            }}
          />
        </button>
      </div>

      {open &&
        hasChildren &&
        item.level < treeDepth - 1 &&
        item.children.map((child, index) => (
          <TreeItem
            key={getNodeKey(child) || index}
            item={child}
            selectedObject={selectedObject}
            highlightObject={highlightObject}
            makeXrayExcept={makeXrayExcept}
            focusObject={focusObject}
            setSelectedObjectName={setSelectedObjectName}
            treeDepth={treeDepth}
            openMap={openMap}
            setOpenMap={setOpenMap}
            visibilityVersion={visibilityVersion}
            refreshVisibility={refreshVisibility}
          />
        ))}
    </div>
  )
}

export default function RightPanel({
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
  const filteredObjectList = filterTree(
    objectList,
    searchObject,
    treeDepth
  )

  const [openMap, setOpenMap] = useState({})
  const [treeViewMode, setTreeViewMode] = useState("expand")
  const [visibilityVersion, setVisibilityVersion] = useState(0)

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
        onChange={(e) => setSearchObject(e.target.value)}
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
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 10,
          }}
        >
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
              background:
                treeViewMode === "expand"
                  ? "#2563eb"
                  : "#374151",
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
              background:
                treeViewMode === "collapse"
                  ? "#2563eb"
                  : "#374151",
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
            onChange={(e) => setTreeDepth(Number(e.target.value))}
            style={{
              padding: 4,
              borderRadius: 6,
            }}
          >
            {Array.from({ length: maxTreeDepth || 1 }, (_, i) => i + 1).map(
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
          <TreeItem
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
            visibilityVersion={visibilityVersion}
            refreshVisibility={refreshVisibility}
          />
        ))}
      </div>
    </div>
  )
}
