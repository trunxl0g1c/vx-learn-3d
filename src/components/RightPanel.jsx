import { useState } from "react"

const formatObjectName = (name) => {
  return (name || "Unnamed Object").replaceAll("_", " ").trim()
}

function TreeItem({
  item,
  selectedObject,
  highlightObject,
  makeXrayExcept,
  focusObject,
  setSelectedObjectName,

  treeDepth,
}){
  const [open, setOpen] = useState(true)

  const hasChildren = item.children && item.children.length > 0
  const displayName = formatObjectName(item.name)

  const handleSelect = () => {
    setSelectedObjectName(displayName)

    highlightObject(item.object)
    makeXrayExcept(item.object)
    focusObject(item.object)
  }

  return (
    <div>
      <div
        onClick={handleSelect}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 8px",
          marginBottom: 4,
          cursor: "pointer",
          borderRadius: 6,
          background:
            selectedObject === item.object ? "#2563eb" : "#374151",
          marginLeft: item.level * 14,
          fontSize: 13,
        }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setOpen(!open)
            }}
            style={{
              width: 20,
              height: 20,
              border: "none",
              borderRadius: 4,
              background: "#111827",
              color: "white",
              cursor: "pointer",
            }}
          >
            {open ? "−" : "+"}
          </button>
        ) : (
          <span style={{ width: 20 }} />
        )}

        <span>{displayName}</span>
      </div>

      {open &&
          hasChildren &&
          item.level < treeDepth - 1 &&
          item.children.map((child, index) => (
            <TreeItem
              key={index}
              item={child}
              selectedObject={selectedObject}
              highlightObject={highlightObject}
              makeXrayExcept={makeXrayExcept}
              focusObject={focusObject}
              setSelectedObjectName={setSelectedObjectName}
              treeDepth={treeDepth}
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
}) {
  return (
    <div
      style={{
        width: 320,
        height: "100vh",
        background: "#111827",
        color: "white",
        padding: 16,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          background: "#1f2937",
          borderRadius: 10,
          padding: 12,
          overflowY: "auto",
        }}
      >

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
            onChange={(e) =>
              setTreeDepth(Number(e.target.value))
            }
            style={{
              padding: 4,
              borderRadius: 6,
            }}
          >
           {Array.from(
              { length: maxTreeDepth || 1 },
              (_, i) => i + 1
            ).map((depth) => (
              <option key={depth} value={depth}>
                {depth}
              </option>
            ))}

            <option value={999}>All</option>
          </select>
        </div>  


        <h3 style={{ marginTop: 0 }}>Object Tree</h3>

        {objectList.map((item, index) => (
          <TreeItem
            key={index}
            item={item}
            selectedObject={selectedObject}
            highlightObject={highlightObject}
            makeXrayExcept={makeXrayExcept}
            focusObject={focusObject}
            setSelectedObjectName={setSelectedObjectName}
            treeDepth={treeDepth}
          />
        ))}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          background: "#1f2937",
          borderRadius: 10,
          padding: 12,
          overflowY: "auto",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Markers</h3>

        {markers.map((marker, index) => (
          <div
            key={index}
            style={{
              padding: 8,
              marginBottom: 6,
              borderRadius: 6,
              background: "#374151",
            }}
          >
            {marker.text}
          </div>
        ))}
      </div>
    </div>
  )
}