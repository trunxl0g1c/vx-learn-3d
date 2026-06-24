import {
  formatObjectName,
  getNodeKey,
  isObjectVisible,
  setObjectVisibility,
} from "../../../utils/hierarchyTreeUtils"

export default function HierarchyTreeItem({
  item,
  selectedObject,
  highlightObject,
  makeXrayExcept,
  focusObject,
  setSelectedObjectName,
  treeDepth,
  openMap,
  setOpenMap,
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

  const handleToggleVisibility = (event) => {
    event.stopPropagation()

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
            onClick={(event) => {
              event.stopPropagation()
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
          onClick={(event) => {
            event.stopPropagation()
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
          <HierarchyTreeItem
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
            refreshVisibility={refreshVisibility}
          />
        ))}
    </div>
  )
}
