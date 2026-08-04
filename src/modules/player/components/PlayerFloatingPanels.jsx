import { useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  Focus,
  Home,
  ImageIcon,
  List,
  RotateCcw,
  Video,
  X,
} from "lucide-react";

import HierarchyObjectTree from "../../../components/sidebar/left-panels/HierarchyObjectTree";
import { getMaxTreeDepth } from "../../../utils/objectTreeUtils";
import Button from "../../../components/ui/button";
import MaterialIcon from "../../../components/ui/material-icon";
import Switch from "../../../components/ui/switch";
import AnimationTab from "../../../components/panels/right-tabs/AnimationTab";
import VisualTab from "../../../components/panels/right-tabs/VisualTab";
import PlayerChapterPlaybackSection from "../../../components/player/PlayerChapterPlaybackSection";

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

export function PlayerProjectInfoFloatingPanel({
  material,
  activeChapterId,
  onClose,
  onOpenList,
  onSelectChapter,
  onOpenMedia,
  showMaterialList = true,
  chapters = [],
}) {
  const title = getProjectInfoTitle(material);
  const description = getProjectInfoDescription(material);
  const integratedAssets = getIntegratedAssets(material);
  const chapterList = Array.isArray(chapters) ? chapters : [];
  const hasChapters = chapterList.length > 0;
  const activeChapterIndex = chapterList.findIndex(
    (chapter) => chapter.id === activeChapterId,
  );
  const canGoPrevious = activeChapterIndex > 0;
  const canGoNext =
    activeChapterIndex >= 0 && activeChapterIndex < chapterList.length - 1;

  const handlePrevious = () => {
    if (!canGoPrevious) return;

    onSelectChapter?.(chapterList[activeChapterIndex - 1].id);
  };

  const handleNext = () => {
    if (!canGoNext) return;

    onSelectChapter?.(chapterList[activeChapterIndex + 1].id);
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

            <div className="space-y-2 pr-1">
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

        {!showMaterialList && hasChapters && (
          <InlineMaterialChapterList
            chapters={chapterList}
            activeChapterId={activeChapterId}
            onSelectChapter={onSelectChapter}
          />
        )}
      </div>

      <div className="mt-5 flex justify-between items-center border-t border-white/10 pt-4">
        {showMaterialList ? (
          <PanelFooterButton
            onClick={onOpenList}
            icon={List}
            disabled={!hasChapters}
          />
        ) : (
          <span />
        )}
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

function InlineMaterialChapterList({
  chapters,
  activeChapterId,
  onSelectChapter,
}) {
  return (
    <section className="mt-5 border-t border-white/10 pt-4">
      <div className="mb-3 text-xs font-bold text-white/60">
        List Materi ({chapters.length})
      </div>

      <div className="space-y-3">
        {chapters.map((chapter, index) => {
          const active = activeChapterId === chapter.id;

          return (
            <button
              key={chapter.id || `${chapter.title}-${index}`}
              type="button"
              onClick={() => onSelectChapter?.(chapter.id)}
              className={[
                "grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border px-4 py-4 text-left transition-all",
                active
                  ? "border-secondary-default/70 bg-white/[0.08] text-white"
                  : "border-white/10 bg-white/[0.03] text-white/75 hover:border-secondary-default/60 hover:bg-secondary-default/10 hover:text-white",
              ].join(" ")}
            >
              <span className="text-xs tabular-nums text-white/55">
                {index + 1}.
              </span>

              <span className="min-w-0 truncate text-sm font-normal">
                {chapter.title || `Chapter ${index + 1}`}
              </span>

              <MaterialIcon
                name="arrow_right_alt"
                fill
                size={20}
                className="text-secondary-default"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function PlayerChapterReaderFloatingPanel({
  material,
  activeChapter,
  activeChapterId,
  onClose,
  onOpenList,
  onSelectChapter,
  onOpenMedia,
  onPlayVoice,
  onStopVoice,
  onPlayAnimations,
  onStopAnimations,
  chapterFlowAssignments = [],
  activeChapterFlowIds = [],
  cameraViews = [],
  activeCameraViewIndex = 0,
  onSelectCameraView,
  onPlayChapterFlow,
  onStopChapterFlows,
  chapters = [],
}) {
  const title = activeChapter?.title || "Untitled Chapter";
  const description =
    activeChapter?.description || "Belum ada deskripsi chapter.";
  const mediaAssets = getChapterMediaAssets(activeChapter);
  const chapterList = Array.isArray(chapters) ? chapters : [];
  const hasChapters = chapterList.length > 0;
  const activeChapterIndex = chapterList.findIndex(
    (chapter) => chapter.id === activeChapterId,
  );
  const canGoPrevious = activeChapterIndex > 0;
  const canGoNext =
    activeChapterIndex >= 0 && activeChapterIndex < chapterList.length - 1;

  const cameraViewCount = Array.isArray(cameraViews) ? cameraViews.length : 0;
  const normalizedCameraViewIndex = Math.max(
    0,
    Math.min(Number(activeCameraViewIndex) || 0, cameraViewCount - 1),
  );
  const activeCameraView = cameraViews[normalizedCameraViewIndex] || null;
  const canGoPreviousCamera = normalizedCameraViewIndex > 0;
  const canGoNextCamera =
    normalizedCameraViewIndex >= 0 &&
    normalizedCameraViewIndex < cameraViewCount - 1;

  const handlePrevious = () => {
    if (!canGoPrevious) return;
    onSelectChapter?.(chapterList[activeChapterIndex - 1].id);
  };

  const handleNext = () => {
    if (!canGoNext) return;
    onSelectChapter?.(chapterList[activeChapterIndex + 1].id);
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

        {cameraViewCount > 0 && (
          <section className="mt-5 border-t border-white/10 pt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-xs font-normal text-white/60">
                Camera View
              </div>
              <div className="rounded-full border border-secondary-default/70 px-2 py-0.5 text-[11px] text-secondary-default">
                Camera {normalizedCameraViewIndex + 1}/{cameraViewCount}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-sm font-medium text-white">
                {activeCameraView?.caption ||
                  `Camera ${normalizedCameraViewIndex + 1}`}
              </div>
              <div className="mt-1 text-[11px] text-white/50">
                {activeCameraView?.cameraType === "orthographic"
                  ? "Orthographic"
                  : "Perspective"}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  disabled={!canGoPreviousCamera}
                  onClick={() =>
                    onSelectCameraView?.(normalizedCameraViewIndex - 1)
                  }
                  className="gap-2"
                >
                  <ChevronLeft className="size-4" />
                  Back
                </Button>
                <Button
                  size="sm"
                  variant="cyanOutline"
                  type="button"
                  disabled={!canGoNextCamera}
                  onClick={() =>
                    onSelectCameraView?.(normalizedCameraViewIndex + 1)
                  }
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </section>
        )}

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

        <PlayerChapterPlaybackSection
          activeChapter={activeChapter}
          material={material}
          onPlayAnimations={onPlayAnimations}
          onStopAnimations={onStopAnimations}
          chapterFlowAssignments={chapterFlowAssignments}
          activeChapterFlowIds={activeChapterFlowIds}
          onPlayChapterFlow={onPlayChapterFlow}
          onStopChapterFlows={onStopChapterFlows}
        />

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

export function PlayerObjectListFloatingPanel({
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
  resetXray,
  focusObject,
  showAllObjects,
  hideAllObjects,
}) {
  const maxTreeDepth = Math.max(getMaxTreeDepth(objectList || []), 1);

  return (
    <aside className="vx-player-panel vx-player-panel--full-mobile absolute bottom-7 left-23 top-7 z-40 flex w-100 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#182223]/75 text-white shadow-2xl backdrop-blur-xl">
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
          resetXray={resetXray}
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

export function PlayerViewSettingsFloatingPanel({
  showAnnotations,
  setShowAnnotations,
  hasSelectedObject,
  onResetView,
  onResetAll,
  onHideSelected,
  onSoloSelected,
  onShowAll,
  onClose,
}) {
  const viewActions = [
    {
      key: "reset-view",
      label: "Reset View",
      icon: Home,
      onClick: onResetView,
    },
    {
      key: "reset-all",
      label: "Reset All",
      icon: RotateCcw,
      onClick: onResetAll,
    },
    {
      key: "hide-selected",
      label: "Hide Selected",
      icon: EyeOff,
      onClick: onHideSelected,
      disabled: !hasSelectedObject,
    },
    {
      key: "solo",
      label: "Solo Selected",
      icon: Focus,
      onClick: onSoloSelected,
      disabled: !hasSelectedObject,
    },
    {
      key: "show-all",
      label: "Show All",
      icon: Eye,
      onClick: onShowAll,
    },
  ];

  return (
    <div className="vx-player-panel absolute left-23 top-7 z-40 w-85 rounded-2xl border border-grayout-extra-dark bg-[#182223B8] p-5 text-white shadow-2xl backdrop-blur-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-white">View Settings</h3>

        <button
          type="button"
          onClick={onClose}
          className="grid size-8 cursor-pointer place-items-center rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white"
          title="Close view settings"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {viewActions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.key}
              type="button"
              disabled={action.disabled}
              onClick={action.onClick}
              className={[
                "flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-secondary-default/35 bg-black/10 px-3 py-4 text-center text-xs font-bold text-secondary-default transition",
                action.disabled
                  ? "cursor-not-allowed opacity-35"
                  : "cursor-pointer hover:border-secondary-default hover:bg-secondary-default hover:text-primary",
              ].join(" ")}
              title={action.label}
            >
              <Icon className="size-5" />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
        <span className="text-sm text-white/90">Show Annotations</span>

        <Switch
          checked={showAnnotations}
          onCheckedChange={(checked) => setShowAnnotations?.(checked)}
        />
      </div>
    </div>
  );
}

export function PlayerMediaViewer({ media, onClose }) {
  if (!media) return null;

  const kind = getMediaKind(media);
  const source = getMediaSource(media);
  const title = getAssetLabel(media, 0);
  const mimeType = getMediaMimeType(media);

  return (
    <aside
      onClick={(event) => event.stopPropagation()}
      className="vx-player-media-viewer absolute bottom-7 left-[470px] right-7 top-7 z-50 flex min-w-0 flex-col overflow-hidden rounded-xl border border-grayout-extra-dark bg-dark-alpha backdrop-blur-sm"
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

export function PlayerEnvironmentSettingsFloatingPanel({
  environment,
  onClose,
}) {
  if (!environment) return null;

  return (
    <PlayerFloatingPanel
      onClose={onClose}
      className="h-[min(760px,86vh)] w-[400px] overflow-hidden p-0!"
    >
      <div className="flex h-16 shrink-0 items-center border-b border-divider-main px-5 pr-14 text-lg font-normal">
        Environment Settings
      </div>

      <VisualTab
        applyShaderMode={environment.applyShaderMode}
        shaderMode={environment.shaderMode}
        metalness={environment.metalness}
        setMetalness={environment.setMetalness}
        roughness={environment.roughness}
        setRoughness={environment.setRoughness}
        viewerSettings={environment.viewerSettings}
        setViewerSettings={environment.setViewerSettings}
        updateEnvIntensity={environment.updateEnvIntensity}
        showHeader={false}
        rendererGlobal="__PLAYER_RENDERER__"
        contentClassName="p-4"
        className="min-h-0 flex-1"
      />
    </PlayerFloatingPanel>
  );
}

export function PlayerAnimationFloatingPanel({
  hidden = false,
  animations = [],
  selectedAnimations = {},
  setSelectedAnimations,
  setAnimationCommand,
  onClose,
}) {
  return (
    <PlayerFloatingPanel
      onClose={onClose}
      className={[
        "h-[min(680px,80vh)] w-[380px] overflow-hidden p-0!",
        hidden ? "hidden!" : "",
      ].join(" ")}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-divider-main px-5 pr-14 text-lg font-normal">
        Animation
      </div>

      <AnimationTab
        animations={animations}
        selectedAnimations={selectedAnimations}
        setSelectedAnimations={setSelectedAnimations}
        setAnimationCommand={setAnimationCommand}
        showHeader={false}
        contentClassName="p-4"
        className="min-h-0 flex-1"
      />
    </PlayerFloatingPanel>
  );
}

function PlayerFloatingPanel({ children, onClose, className = "" }) {
  return (
    <div
      className={`vx-player-panel absolute left-[92px] top-7 z-40 flex max-h-[80vh] w-[360px] flex-col rounded-2xl border border-grayout-extra-dark bg-dark-alpha p-5 backdrop-blur-sm ${className}`}
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
    <div className="vx-player-annotation-panel absolute right-10 bottom-10 z-40 w-90 rounded-2xl border border-grayout-extra-dark bg-[#182223B8] p-5 text-white shadow-2xl backdrop-blur-sm">
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
