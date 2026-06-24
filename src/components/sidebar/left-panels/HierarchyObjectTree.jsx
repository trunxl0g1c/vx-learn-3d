import { useEffect, useState } from "react";
import HierarchyTreeItem from "./HierarchyTreeItem";
import {
  collectOpenMap,
  filterTree,
  getNodeKey,
  setObjectVisibility,
} from "../../../utils/hierarchyTreeUtils";
import Input from "../../ui/input";
import { Search } from "lucide-react";
import Button from "../../ui/button";

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
  const filteredObjectList = filterTree(objectList, searchObject, treeDepth);

  const [openMap, setOpenMap] = useState({});
  const [treeViewMode, setTreeViewMode] = useState("expand");
  const [, setVisibilityVersion] = useState(0);

  const refreshVisibility = () => {
    setVisibilityVersion((prev) => prev + 1);
  };

  useEffect(() => {
    setOpenMap(collectOpenMap(objectList, true));
  }, [objectList]);

  const handleShowAll = () => {
    if (showAllObjects) {
      showAllObjects();
    } else {
      objectList.forEach((item) => setObjectVisibility(item.object, true));
    }

    refreshVisibility();
  };

  const handleHideAll = () => {
    if (hideAllObjects) {
      hideAllObjects();
    } else {
      objectList.forEach((item) => setObjectVisibility(item.object, false));
    }

    refreshVisibility();
  };

  return (
    <div className="flex flex-col gap-3 px-4 py-2 overflow-auto sidebar-scroll">
      <Input
        type="text"
        placeholder="search object"
        value={searchObject}
        onChange={(event) => setSearchObject(event.target.value)}
        leftIcon={<Search className="size-5" />}
        className="h-8.5! px-2!"
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
        <div className="flex gap-3 items-center justify-center mb-2">
          <Button
            size="sm"
            onClick={() => {
              setOpenMap(collectOpenMap(filteredObjectList, true));
              setTreeViewMode("expand");
            }}
            variant={treeViewMode === "expand" ? "default" : "cyan"}
            className="w-1/2"
          >
            Expand All
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setOpenMap(collectOpenMap(filteredObjectList, false));
              setTreeViewMode("collapse");
            }}
            variant={treeViewMode === "collapse" ? "default" : "cyan"}
            className="w-1/2"
          >
            Collapse All
          </Button>
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
  );
}
