import { useMemo, useState } from "react";
import { X } from "lucide-react";
import HierarchyObjectTree from "../sidebar/left-panels/HierarchyObjectTree";
import { getMaxTreeDepth } from "../../utils/objectTreeUtils";

export default function PlayerMaterialObjectListPanel({
  objectList = [],
  chapters = [],
  modelScene = null,
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
  onOpenObjectDescription,
}) {
  const [treeDepth, setTreeDepth] = useState(999);
  const maxTreeDepth = useMemo(() => getMaxTreeDepth(objectList), [objectList]);

  return (
    <aside className="vx-player-panel vx-player-panel--full-mobile absolute bottom-7 left-23 top-7 z-40 flex w-100 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#182223]/75 text-white shadow-2xl backdrop-blur-xl">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-6 pt-1">
        <h3 className="min-w-0 flex-1 truncate text-base font-bold text-white">
          Object List
        </h3>

        <button
          type="button"
          onClick={onClose}
          className="grid size-8 cursor-pointer place-items-center rounded-lg text-white transition hover:bg-white/10"
          title="Close object list"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <HierarchyObjectTree
          objectList={objectList}
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
          chapters={chapters}
          modelScene={modelScene}
          onOpenObjectDescription={onOpenObjectDescription}
        />
      </div>
    </aside>
  );
}
