import usePlayerController from "./hooks/usePlayerController";
import PlayerChapterListPanel from "../../components/player/PlayerChapterListPanel";
import {
  Box,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Download,
  Eye,
  FileText,
  Home,
  ImageIcon,
  List,
  Scan,
  Scissors,
  SlidersVertical,
  RotateCcw,
  Video,
  Volume2,
  X,
  Copy,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PlayerLayout from "./components/layouts/PlayerLayout";
import HierarchyObjectTree from "../../components/sidebar/left-panels/HierarchyObjectTree";
import PlayerCutSlider from "../../components/player/PlayerCutSlider";
import { getMaxTreeDepth } from "../../utils/objectTreeUtils";
import Button from "../../components/ui/button";
import MaterialIcon from "../../components/ui/material-icon";
import Switch from "../../components/ui/switch";

// export default function PlayerPage() {
//   const player = usePlayerController()
//   const { isLoadingProject, loadError } = player.status

//   if (isLoadingProject) {
//     return <div style={{ padding: 24 }}>Loading project...</div>
//   }

//   if (loadError) {
//     return <div style={{ padding: 24 }}>{loadError}</div>
//   }

//   return (
//     <div
//       style={{
//         width: "100vw",
//         height: "100vh",
//         position: "relative",
//         ...getViewerBackgroundStyle(player.scene.viewerSettings),
//         color: "white",
//         overflow: "hidden",
//       }}
//     >
//       <main
//         style={{
//           position: "absolute",
//           inset: 0,
//           height: "100vh",
//           ...getViewerBackgroundStyle(player.scene.viewerSettings),
//         }}
//       >
//         <PlayerSceneCanvas {...player.scene} />

//         {!player.chapterPanel.freePlay &&
//           player.chapterPanel.showInfoPanel &&
//           player.chapterPanel.activeChapter && (
//             <PlayerChapterInfoPanel
//               activeChapter={player.chapterPanel.activeChapter}
//               speakChapterDescription={player.chapterPanel.speakChapterDescription}
//               stopSpeaking={player.chapterPanel.stopSpeaking}
//               playChapterAnimations={player.chapterPanel.playChapterAnimations}
//               stopChapterAnimations={player.chapterPanel.stopChapterAnimations}
//             />
//           )}

//         {player.toolsMenu.freePlay && player.toolsMenu.freePlayMenu && (
//           <PlayerToolsMenu
//             cutEnabled={player.toolsMenu.cutEnabled}
//             toggleCutSection={player.toolsMenu.toggleCutSection}
//             hideSelectedObject={player.toolsMenu.hideSelectedObject}
//             pullApart={player.toolsMenu.pullApart}
//             resetAllTransforms={player.toolsMenu.resetAllTransforms}
//             soloSelectedObject={player.toolsMenu.soloSelectedObject}
//             showAllObjects={player.toolsMenu.showAllObjects}
//           />
//         )}

//         {player.cutSlider.freePlay && player.cutSlider.cutEnabled && (
//           <PlayerCutSlider
//             cutAxis={player.cutSlider.cutAxis}
//             setCutAxis={player.cutSlider.setCutAxis}
//             cutValue={player.cutSlider.cutValue}
//             cutMin={player.cutSlider.cutMin}
//             cutMax={player.cutSlider.cutMax}
//             setCutValue={player.cutSlider.setCutValue}
//           />
//         )}

//         {!player.chapterList.freePlay &&
//           player.chapterList.activeMenu === "chapters" &&
//           player.chapterList.material && (
//             <PlayerChapterListPanel
//               material={player.chapterList.material}
//               activeChapterId={player.chapterList.activeChapterId}
//               handleSelectChapter={handleSelectChapter}
//             />
//           )}

//         <PlayerBottomToolbar {...player.toolbar} />
//       </main>
//     </div>
//   )
// }

export default function PlayerPage() {
  const player = usePlayerController();
  const { isLoadingProject, loadError } = player.status;

  const [activePanel, setActivePanel] = useState(null);
  const [activeMedia, setActiveMedia] = useState(null);
  const [playerObjectSearch, setPlayerObjectSearch] = useState("");
  const [playerObjectTreeDepth, setPlayerObjectTreeDepth] = useState(2);
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();

  // annotation info
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);

  const showBackToEditor = useMemo(() => {
    const params = new URLSearchParams(location.search);

    return (
      params.get("preview") === "true" ||
      location.state?.preview === true ||
      location.state?.fromEditor === true
    );
  }, [location.search, location.state]);

  const handleBackToEditor = () => {
    if (location.state?.fromEditorPath) {
      navigate(location.state.fromEditorPath);
      return;
    }

    if (projectId) {
      navigate(`/vxplore/editor/${projectId}`);
      return;
    }

    navigate(-1);
  };

  const togglePanel = (panelName) => {
    setActivePanel((prev) => (prev === panelName ? null : panelName));
  };

  const handleOpenProjectPanel = () => {
    const shouldClose = activePanel === "project";

    setActiveMedia(null);
    setSelectedAnnotation(null);

    if (shouldClose) {
      setActivePanel(null);
      return;
    }

    // The Chapter/Project button is also the entry point back to the default
    // Player overview. Clear every temporary interaction before showing the
    // project panel so the model returns to the same state as the initial load.
    player.settingsPanel.resetAll?.();
    setActivePanel("project");
  };

  const handleOpenObjectPanel = () => {
    setActiveMedia(null);
    togglePanel("object");
  };

  const handleOpenChapterList = () => {
    const chapters = player.chapterList.material?.chapters || [];

    if (chapters.length === 0) return;

    setActiveMedia(null);
    setActivePanel("chapters");
  };

  const handleSelectChapter = (chapterId) => {
    player.chapterList.handleSelectChapter?.(chapterId);
    setActiveMedia(null);
    setActivePanel("chapter");
  };

  const handleOpenAnnotationDetail = (chapterId) => {
    if (!chapterId) return;

    handleSelectChapter(chapterId);
    setSelectedAnnotation(null);
  };

  const sidebarItems = [
    {
      key: "home",
      label: "Home",
      icon: Home,
      href: "/",
    },
    {
      key: "project",
      label: "Project Information",
      icon: Clipboard,
      active:
        activePanel === "project" ||
        activePanel === "chapters" ||
        activePanel === "chapter",
      onClick: handleOpenProjectPanel,
    },
    {
      key: "object",
      label: "Object",
      icon: Box,
      active: activePanel === "object",
      onClick: handleOpenObjectPanel,
    },

    { type: "separator" },

    {
      key: "pull-apart",
      label: "Pull Apart",
      icon: Scan,
      active: Boolean(player.toolsMenu.isPullApartActive),
      onClick: () => {
        setActiveMedia(null);
        player.toolsMenu.pullApart?.();
      },
    },
    {
      key: "cut",
      label: "Cut",
      icon: Scissors,
      active: activePanel === "cut" || Boolean(player.toolsMenu.cutEnabled),
      onClick: () => {
        setActiveMedia(null);
        togglePanel("cut");
      },
    },

    { type: "separator" },

    {
      key: "settings",
      label: "Settings",
      icon: SlidersVertical,
      active: activePanel === "settings",
      onClick: () => {
        setActiveMedia(null);
        togglePanel("settings");
      },
    },
  ];

  if (isLoadingProject) {
    return <div style={{ padding: 24 }}>Loading project...</div>;
  }

  if (loadError) {
    return <div style={{ padding: 24 }}>{loadError}</div>;
  }

  return (
    <PlayerLayout
      player={player}
      sidebarItems={sidebarItems}
      selectedAnnotationId={selectedAnnotation?.id || null}
      onAnnotationClick={setSelectedAnnotation}
      onAnnotationClose={() => setSelectedAnnotation(null)}
      onAnnotationOpenDetail={handleOpenAnnotationDetail}
    >
      {showBackToEditor && (
        <Button
          size="sm"
          type="button"
          variant="cyanOutline"
          onClick={handleBackToEditor}
          className="absolute right-16 top-5 z-50"
        >
          <MaterialIcon
            name="arrow_left_alt"
            fill
            size={20}
            className="text-secondary-default"
          />
          Back to Editor
        </Button>
      )}

      {activePanel === "project" && (
        <PlayerProjectInfoFloatingPanel
          material={player.scene.material}
          activeChapterId={player.chapterList.activeChapterId}
          onClose={() => setActivePanel(null)}
          onOpenList={handleOpenChapterList}
          onSelectChapter={handleSelectChapter}
          onOpenMedia={setActiveMedia}
        />
      )}

      {activePanel === "object" && (
        <PlayerObjectListFloatingPanel
          objectList={player.scene.objectList || []}
          selectedObject={player.scene.selectedObject}
          setSelectedObject={player.scene.setObjectListSelectedObject}
          onClose={() => setActivePanel(null)}
          searchObject={playerObjectSearch}
          setSearchObject={setPlayerObjectSearch}
          treeDepth={playerObjectTreeDepth}
          setTreeDepth={setPlayerObjectTreeDepth}
          highlightObject={player.scene.handleSelectObjectFromPlayer}
          makeXrayExcept={player.scene.makeXrayExcept}
          focusObject={player.scene.focusObject}
          showAllObjects={player.toolsMenu.showAllObjects}
          hideAllObjects={player.toolsMenu.hideAllObjects}
        />
      )}

      {activePanel === "chapters" &&
        player.chapterList.material?.chapters?.length > 0 && (
          <PlayerChapterListPanel
            material={player.chapterList.material}
            activeChapterId={player.chapterList.activeChapterId}
            handleSelectChapter={handleSelectChapter}
            onClose={() => setActivePanel(null)}
          />
        )}

      {activePanel === "chapter" && player.chapterPanel.activeChapter && (
        <PlayerChapterReaderFloatingPanel
          material={player.scene.material}
          activeChapter={player.chapterPanel.activeChapter}
          activeChapterId={player.chapterList.activeChapterId}
          onClose={() => {
            setActivePanel(null);
            setActiveMedia(null);
          }}
          onOpenList={handleOpenChapterList}
          onSelectChapter={handleSelectChapter}
          onOpenMedia={setActiveMedia}
          onPlayVoice={player.chapterPanel.speakChapterDescription}
          onStopVoice={player.chapterPanel.stopSpeaking}
        />
      )}

      {activePanel === "cut" && (
        <PlayerCutSlider
          cutValues={player.cutSlider.cutValues}
          cutRanges={player.cutSlider.cutRanges}
          updateCutValue={player.cutSlider.updateCutValue}
          resetCutValues={player.cutSlider.resetCutValues}
          onClose={() => setActivePanel(null)}
        />
      )}

      {activePanel === "settings" && (
        <PlayerCameraSettingsFloatingPanel
          showAnnotations={player.settingsPanel.showAnnotations}
          setShowAnnotations={player.settingsPanel.setShowAnnotations}
          onResetAll={() => {
            player.settingsPanel.resetAll?.();
            setActiveMedia(null);
          }}
          onClose={() => setActivePanel(null)}
        />
      )}


      {activeMedia && (
        <PlayerMediaViewer
          media={activeMedia}
          onClose={() => setActiveMedia(null)}
        />
      )}
    </PlayerLayout>
  );
}

function getProjectInfoTitle(material) {
  return (
    material?.projectName ||
    material?.project?.name ||
    material?.title ||
    "Untitled Project"
  );
}

function getProjectInfoDescription(material) {
  return (
    material?.projectDescription ||
    material?.project?.description ||
    material?.description ||
    "Belum ada deskripsi project."
  );
}

function getIntegratedAssets(material) {
  const candidates = [
    material?.media,
    material?.integratedAssets,
    material?.assets,
    material?.projectAssets,
    material?.projectSettings?.integratedAssets,
    material?.settings?.integratedAssets,
  ];

  const assets = candidates.find((item) => Array.isArray(item));

  return assets || [];
}

function getChapterMediaAssets(activeChapter) {
  // Chapter reader must only show media explicitly assigned from the
  // Editor's Chapter Media panel. Project-level media belongs to the
  // Project Info panel and must not appear as a fallback here.
  return Array.isArray(activeChapter?.media) ? activeChapter.media : [];
}

function getMediaKind(asset) {
  const rawType = String(
    asset?.type || asset?.mediaType || asset?.mimeType || "",
  ).toUpperCase();

  if (rawType.includes("IMAGE")) return "IMAGE";
  if (rawType.includes("VIDEO")) return "VIDEO";
  if (
    rawType.includes("DOCUMENT") ||
    rawType.includes("PDF") ||
    rawType.includes("WORD") ||
    rawType.includes("TEXT") ||
    rawType.includes("PRESENTATION") ||
    rawType.includes("SPREADSHEET")
  ) {
    return "DOCUMENT";
  }

  const source = String(
    asset?.url || asset?.dataUrl || asset?.name || asset?.title || "",
  ).toLowerCase();

  if (/\.(png|jpe?g|webp|gif|bmp|svg)(\?|#|$)/.test(source)) return "IMAGE";
  if (/\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/.test(source)) return "VIDEO";

  return "DOCUMENT";
}

function getMediaSource(asset) {
  return (
    asset?.url ||
    asset?.dataUrl ||
    asset?.data ||
    asset?.src ||
    asset?.href ||
    ""
  );
}

function getMediaMimeType(asset) {
  return asset?.mimeType || asset?.type || "";
}

function getMediaIcon(kind, className = "size-4") {
  if (kind === "IMAGE") return <ImageIcon className={className} />;
  if (kind === "VIDEO") return <Video className={className} />;
  return <FileText className={className} />;
}

function getAssetLabel(asset, index) {
  if (typeof asset === "string") return asset;

  return (
    asset?.title ||
    asset?.name ||
    asset?.label ||
    asset?.fileName ||
    asset?.type ||
    `Asset ${index + 1}`
  );
}

function PlayerProjectInfoFloatingPanel({
  material,
  activeChapterId,
  onClose,
  onOpenList,
  onSelectChapter,
  onOpenMedia,
}) {
  const title = getProjectInfoTitle(material);
  const description = getProjectInfoDescription(material);
  const integratedAssets = getIntegratedAssets(material);
  const chapters = material?.chapters || [];
  const hasChapters = chapters.length > 0;
  const activeChapterIndex = chapters.findIndex(
    (chapter) => chapter.id === activeChapterId,
  );
  const canGoPrevious = activeChapterIndex > 0;
  const canGoNext =
    activeChapterIndex >= 0 && activeChapterIndex < chapters.length - 1;

  const handlePrevious = () => {
    if (!canGoPrevious) return;

    onSelectChapter?.(chapters[activeChapterIndex - 1].id);
  };

  const handleNext = () => {
    if (!canGoNext) return;

    onSelectChapter?.(chapters[activeChapterIndex + 1].id);
  };

  return (
    <PlayerFloatingPanel onClose={onClose}>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <h3 className="mb-3 pr-8 text-base font-bold">{title}</h3>

        <p className="text-xs leading-relaxed text-white/80 whitespace-pre-line">
          {description}
        </p>

        {integratedAssets.length > 0 && (
          <section className="mt-5 border-t border-white/10 pt-4">
            <div className="mb-3 text-xs font-bold text-white/60">
              Media ({integratedAssets.length})
            </div>

            <div className="max-h-[32vh] space-y-2 overflow-y-auto pr-1">
              {integratedAssets.map((asset, index) => (
                <PanelAssetItem
                  key={asset?.id || asset?.name || asset?.title || index}
                  asset={asset}
                  label={getAssetLabel(asset, index)}
                  onOpen={onOpenMedia}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="mt-5 flex justify-between items-center border-t border-white/10 pt-4">
        <PanelFooterButton
          onClick={onOpenList}
          icon={List}
          // label="List"
          disabled={!hasChapters}
        />
        <div className="flex gap-2">
          <PanelFooterButton
            onClick={handlePrevious}
            icon={ChevronLeft}
            // label="Prev"
            disabled={!canGoPrevious}
          />
          <PanelFooterButton
            onClick={handleNext}
            icon={ChevronRight}
            // label="Next"
            disabled={!canGoNext}
          />
        </div>
      </div>
    </PlayerFloatingPanel>
  );
}

function PlayerChapterReaderFloatingPanel({
  material,
  activeChapter,
  activeChapterId,
  onClose,
  onOpenList,
  onSelectChapter,
  onOpenMedia,
  onPlayVoice,
  onStopVoice,
}) {
  const title = activeChapter?.title || "Untitled Chapter";
  const description =
    activeChapter?.description || "Belum ada deskripsi chapter.";
  const mediaAssets = getChapterMediaAssets(activeChapter);
  const chapters = material?.chapters || [];
  const hasChapters = chapters.length > 0;
  const activeChapterIndex = chapters.findIndex(
    (chapter) => chapter.id === activeChapterId,
  );
  const canGoPrevious = activeChapterIndex > 0;
  const canGoNext =
    activeChapterIndex >= 0 && activeChapterIndex < chapters.length - 1;

  const handlePrevious = () => {
    if (!canGoPrevious) return;
    onSelectChapter?.(chapters[activeChapterIndex - 1].id);
  };

  const handleNext = () => {
    if (!canGoNext) return;
    onSelectChapter?.(chapters[activeChapterIndex + 1].id);
  };

  return (
    <PlayerFloatingPanel onClose={onClose} className="w-105">
      <div className="mb-5 flex shrink-0 items-start justify-between gap-3 pr-8">
        <div className="min-w-0">
          <h3 className="truncate text-base font-normal leading-tight text-white">
            {title}
          </h3>
          {activeChapter?.objectName && (
            <div className="mt-1 truncate text-xs font-normal text-contrast-grayout">
              {activeChapter.objectName}
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={onPlayVoice}
          disabled={!activeChapter?.description}
          title="Play Voice"
          className="mb-3 w-full"
        >
          <MaterialIcon name="brand_awareness" size={20} />
          Play Voice
        </Button>

        <section>
          <div className="mb-2 text-xs font-normal text-white/60">
            Description
          </div>

          <p className="text-sm leading-7 text-white/85 whitespace-pre-line">
            {description}
          </p>
        </section>

        {activeChapter?.parameters?.length > 0 && (
          <section className="mt-5 border-t border-white/10 pt-4">
            <div className="mb-3 text-xs font-normal text-white/60">
              Parameters
            </div>

            <div className="space-y-2">
              {activeChapter.parameters.map((parameter, index) => {
                const label =
                  parameter.name || parameter.label || `Parameter ${index + 1}`;
                const value = parameter.value || "-";
                const unit = parameter.unit || "";

                return (
                  <div
                    key={parameter.id || `${label}-${index}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs"
                  >
                    <span className="min-w-0 truncate text-white/60">
                      {label}
                    </span>
                    <span className="text-right text-white">
                      {value}
                      {unit ? ` ${unit}` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {mediaAssets.length > 0 && (
          <section className="mt-5 border-t border-white/10 pt-4">
            <div className="mb-3 text-xs font-normal text-white/60">
              Media ({mediaAssets.length})
            </div>

            <div className="max-h-[32vh] space-y-2 overflow-y-auto pr-1">
              {mediaAssets.map((asset, index) => (
                <PanelAssetItem
                  key={asset?.id || asset?.name || asset?.title || index}
                  asset={asset}
                  label={getAssetLabel(asset, index)}
                  onOpen={onOpenMedia}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="mt-5 flex justify-between items-center border-t border-white/10 pt-4">
        <PanelFooterButton
          onClick={onOpenList}
          icon={List}
          // label="List"
          disabled={!hasChapters}
        />
        <div className="flex gap-2">
          <PanelFooterButton
            onClick={handlePrevious}
            icon={ChevronLeft}
            // label="Prev"
            disabled={!canGoPrevious}
          />
          <PanelFooterButton
            onClick={handleNext}
            icon={ChevronRight}
            // label="Next"
            disabled={!canGoNext}
          />
        </div>
      </div>
    </PlayerFloatingPanel>
  );
}

function PlayerObjectListFloatingPanel({
  objectList,
  selectedObject,
  setSelectedObject,
  onClose,
  searchObject,
  setSearchObject,
  treeDepth,
  setTreeDepth,
  highlightObject,
  makeXrayExcept,
  focusObject,
  showAllObjects,
  hideAllObjects,
}) {
  const maxTreeDepth = Math.max(getMaxTreeDepth(objectList || []), 1);

  return (
    <aside className="absolute bottom-7 left-23 top-7 z-40 flex w-100 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#182223]/75 text-white shadow-2xl backdrop-blur-xl">
      <div className="flex h-14 shrink-0 items-center gap-3 px-6 pt-1">
        <h3 className="min-w-0 flex-1 text-base font-bold text-white">
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

      <div className="min-h-0 flex-1 overflow-hidden px-6 pb-5">
        <HierarchyObjectTree
          objectList={objectList || []}
          selectedObject={selectedObject}
          setSelectedObject={setSelectedObject}
          highlightObject={highlightObject || (() => {})}
          makeXrayExcept={makeXrayExcept || (() => {})}
          focusObject={focusObject || (() => {})}
          setSelectedObjectName={() => {}}
          treeDepth={treeDepth}
          setTreeDepth={setTreeDepth}
          maxTreeDepth={maxTreeDepth}
          searchObject={searchObject}
          setSearchObject={setSearchObject}
          showAllObjects={showAllObjects}
          hideAllObjects={hideAllObjects}
          setRightTab={() => {}}
        />
      </div>
    </aside>
  );
}

function PlayerCameraSettingsFloatingPanel({
  showAnnotations,
  setShowAnnotations,
  onResetAll,
  onClose,
}) {
  return (
    <div className="absolute left-23 top-7 z-40 w-85 rounded-2xl border border-grayout-extra-dark bg-[#182223B8] p-5 text-white shadow-2xl backdrop-blur-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-white">Camera Setting</h3>

        <button
          type="button"
          onClick={onClose}
          className="grid size-8 cursor-pointer place-items-center rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white"
          title="Close camera setting"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-white/90">Show Annotations</span>

          <Switch
            checked={showAnnotations}
            onCheckedChange={(checked) => setShowAnnotations?.(checked)}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-white/90">Dark Theme</span>

          <Switch checked={false} onCheckedChange={() => {}} />
        </div>

        {/* <div className="border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={onResetAll}
            className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-secondary-default/50 px-4 text-sm font-bold text-secondary-default transition hover:border-secondary-default hover:bg-secondary-default hover:text-primary"
          >
            <RotateCcw className="size-4" />
            Reset All
          </button>
        </div> */}
      </div>
    </div>
  );
}

function PlayerMediaViewer({ media, onClose }) {
  if (!media) return null;

  const kind = getMediaKind(media);
  const source = getMediaSource(media);
  const title = getAssetLabel(media, 0);
  const mimeType = getMediaMimeType(media);

  return (
    <aside
      onClick={(event) => event.stopPropagation()}
      className="absolute bottom-7 left-[470px] right-7 top-7 z-50 flex min-w-0 flex-col overflow-hidden rounded-xl border border-grayout-extra-dark bg-dark-alpha backdrop-blur-sm"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <div className="flex min-w-0 items-center gap-2 text-xs font-normal text-white">
          {getMediaIcon(kind, "size-4 text-secondary-default")}
          <span className="min-w-0 truncate">{title}</span>
        </div>

        <div className="flex items-center gap-2">
          {source && (
            <a
              href={source}
              download={media?.name || media?.title || title}
              className="grid size-8 place-items-center rounded-lg border border-secondary-default/40 text-secondary-default hover:border-secondary-default hover:bg-secondary-default hover:text-primary"
              title="Download media"
            >
              <Download className="size-4" />
            </a>
          )}

          <button
            type="button"
            onClick={onClose}
            className="grid size-8 cursor-pointer place-items-center rounded-lg border border-secondary-default/40 text-secondary-default hover:border-secondary-default hover:bg-secondary-default hover:text-primary"
            title="Close media viewer"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center bg-black/35 p-4">
        {!source && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/70">
            Media source tidak tersedia.
          </div>
        )}

        {source && kind === "IMAGE" && (
          <img
            src={source}
            alt={title}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        )}

        {source && kind === "VIDEO" && (
          <video
            src={source}
            controls
            className="max-h-full max-w-full rounded-lg bg-black"
          />
        )}

        {source &&
          kind === "DOCUMENT" &&
          (mimeType.includes("pdf") ||
          String(source).startsWith("data:application/pdf") ? (
            <iframe
              src={source}
              title={title}
              className="h-full w-full rounded-lg border border-white/10 bg-white"
            />
          ) : (
            <div className="max-w-md rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center">
              <div className="mx-auto mb-3 grid size-14 place-items-center rounded-xl border border-secondary-default/40 text-secondary-default">
                <FileText className="size-7" />
              </div>
              <div className="mb-2 text-sm font-bold text-white">{title}</div>
              <p className="mb-4 text-xs leading-5 text-white/60">
                Preview dokumen ini belum tersedia di browser. Gunakan tombol
                download untuk membuka file.
              </p>
              <a
                href={source}
                download={media?.name || media?.title || title}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-secondary-default/50 px-4 text-xs font-bold text-secondary-default transition hover:border-secondary-default hover:bg-secondary-default hover:text-primary"
              >
                <Download className="size-4" />
                Download Document
              </a>
            </div>
          ))}
      </div>
    </aside>
  );
}

function PlayerFloatingPanel({ children, onClose, className = "" }) {
  return (
    <div
      className={`absolute left-[92px] top-7 z-40 flex max-h-[80vh] w-[360px] flex-col rounded-2xl border border-grayout-extra-dark bg-dark-alpha p-5 backdrop-blur-sm ${className}`}
    >
      <button
        type="button"
        onClick={onClose}
        className="grid absolute right-4 top-4 size-8 cursor-pointer place-items-center rounded-lg text-white hover:bg-white/10"
        title="Close"
      >
        <X className="size-5" />
      </button>

      {children}
    </div>
  );
}

function PanelAssetItem({ asset, label, onOpen }) {
  const kind = getMediaKind(asset);
  const source = getMediaSource(asset);
  const meta =
    kind === "IMAGE" ? "Image" : kind === "VIDEO" ? "Video" : "Document";

  return (
    <button
      type="button"
      onClick={() => onOpen?.(asset)}
      className="group grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-white/75 transition hover:border-secondary-default/60 hover:bg-secondary-default/10 hover:text-white"
    >
      {kind === "IMAGE" && source ? (
        <img
          src={source}
          alt={label}
          className="h-12 w-16 shrink-0 rounded-md object-cover"
        />
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-secondary-default/40 text-secondary-default">
          {getMediaIcon(kind, "size-5")}
        </span>
      )}

      <span className="min-w-0">
        <span className="block truncate font-normal text-white/90">
          {label}
        </span>
        <span className="mt-1 block text-xs text-white/45">{meta}</span>
      </span>

      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 text-white/65">
        <Eye className="size-4 group-hover:text-white" />
      </span>
    </button>
  );
}

function PanelFooterButton({ icon: Icon, label, disabled = false, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex rounded-full h-9 p-2 items-center justify-center gap-2 border text-xs font-normal transition",
        disabled
          ? "cursor-not-allowed border-white/10 text-white/30"
          : "cursor-pointer border-grayout-dark text-white hover:border-grayout-dark/80 hover:bg-dark-alpha/80",
      ].join(" ")}
    >
      {Icon && <Icon className="size-4" />}
      {/* <span>{label}</span> */}
    </button>
  );
}

function PlayerAnnotationInfoPanel({ title = "Muffler", number, onClose }) {
  const properties = [
    { label: "Part Type", value: "Baud 65" },
    { label: "Width", value: "320", unit: "cm" },
    { label: "Height", value: "480", unit: "cm" },
    { label: "Average of Lorem Ipsum", value: "6400", unit: "m²" },
    { label: "Long Value", value: "Lorem ipsum dolor sit amet..." },
  ];

  return (
    <div className="absolute right-10 bottom-10 z-40 w-90 rounded-2xl border border-grayout-extra-dark bg-[#182223B8] p-5 text-white shadow-2xl backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <h3 className="text-sm font-bold text-white">
          {title || `Annotation ${number}`}
        </h3>

        <button
          type="button"
          onClick={onClose}
          className="grid size-8 cursor-pointer place-items-center rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white"
          title="Close annotation info"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="space-y-1">
        {properties.map((item) => (
          <PlayerAnnotationInfoRow key={item.label} {...item} />
        ))}
      </div>

      <button
        type="button"
        className="mt-5 inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-lg border border-accent-contrast px-3 text-sm font-normal text-white transition hover:border-secondary-default hover:bg-secondary-default/10"
      >
        <Clipboard className="size-5 text-secondary-default" />
        Detail
      </button>
    </div>
  );
}

function PlayerAnnotationInfoRow({ label, value, unit }) {
  return (
    <div className="grid min-h-7.5 grid-cols-[130px_1fr_28px] overflow-hidden rounded-md border border-white/10 bg-white/[0.03] text-xs">
      <div className="flex items-center border-r border-white/10 bg-white/[0.03] px-3 text-secondary-default">
        {label}
      </div>

      <div className="flex min-w-0 items-center justify-between gap-2 px-3 text-white">
        <span className="line-clamp-2 leading-4">{value}</span>
        {unit && <span className="shrink-0 text-white/80">{unit}</span>}
      </div>

      <button
        type="button"
        onClick={() =>
          navigator.clipboard?.writeText(`${value}${unit ? ` ${unit}` : ""}`)
        }
        className="grid cursor-pointer place-items-center text-white/80 transition hover:bg-white/5 hover:text-white"
        title="Copy value"
      >
        <Copy className="size-3.5" />
      </button>
    </div>
  );
}
