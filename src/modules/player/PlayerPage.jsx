import usePlayerController from "./hooks/usePlayerController";
import PlayerFlowListPanel from "../../components/player/PlayerFlowListPanel";
import PlayerProceduralListPanel from "../../components/player/PlayerProceduralListPanel";
import PlayerQuizPanel from "../../components/player/PlayerQuizPanel";
import PlayerMaterialObjectListPanel from "../../components/player/PlayerMaterialObjectListPanel";
import PlayerXRControls from "../../components/player/PlayerXRControls";
import { buildPlayerMaterialObjectTree } from "../../engine/chapter";
import {
  Box,
  Clipboard,
  Home,
  ListChecks,
  Scan,
  Scissors,
  SlidersVertical,
  Orbit,
  Sun,
  Move3d,
  GitBranch,
  GraduationCap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PlayerLayout from "./components/layouts/PlayerLayout";
import PlayerCutSlider from "../../components/player/PlayerCutSlider";
import Button from "../../components/ui/button";
import MaterialIcon from "../../components/ui/material-icon";
import { normalizePlayerSettings } from "../material/playerSettings";
import {
  focusEditorAndClosePlayer,
  isPlayerOpenedFromEditor,
} from "../../utils/playerWindowNavigation";
import {
  PlayerAnimationFloatingPanel,
  PlayerChapterReaderFloatingPanel,
  PlayerEnvironmentSettingsFloatingPanel,
  PlayerMediaViewer,
  PlayerProjectInfoFloatingPanel,
  PlayerViewSettingsFloatingPanel,
} from "./components/PlayerFloatingPanels";

export default function PlayerPage() {
  const player = usePlayerController();
  const { isLoadingProject, isSceneReady, loadError } = player.status;

  const [activePanel, setActivePanel] = useState(null);
  const [activeMedia, setActiveMedia] = useState(null);
  const [playerObjectSearch, setPlayerObjectSearch] = useState("");
  const [playerObjectListMode, setPlayerObjectListMode] = useState("info");
  const appliedPlayerSettingsKeyRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();

  // annotation info
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const chapterReturnPanelRef = useRef(null);

  const playerSettings = useMemo(
    () => normalizePlayerSettings(player.scene.material?.playerSettings),
    [player.scene.material?.playerSettings],
  );
  const playerMenuVisibility = playerSettings.menuVisibility;
  const visibleChapters = Array.isArray(
    player.chapterList.visibleChapters,
  )
    ? player.chapterList.visibleChapters
    : [];
  const materialObjectList = useMemo(
    () =>
      buildPlayerMaterialObjectTree(
        player.scene.objectList || [],
        visibleChapters,
        player.scene.modelScene || null,
      ),
    [player.scene.modelScene, player.scene.objectList, visibleChapters],
  );

  useEffect(() => {
    const material = player.scene.material;
    if (!material) return;

    const materialSessionKey = [
      material.projectId || "",
      material.id || "",
      material.modelFileName || material.model?.fileName || "",
      material.modelUrl || material.model?.uri || "",
    ].join("::");

    if (appliedPlayerSettingsKeyRef.current === materialSessionKey) return;

    appliedPlayerSettingsKeyRef.current = materialSessionKey;
    setActiveMedia(null);
    setSelectedAnnotation(null);
    setActivePanel(playerSettings.autoShowMaterial ? "project" : null);
  }, [player.scene.material, playerSettings.autoShowMaterial]);

  const showBackToEditor = useMemo(
    () => isPlayerOpenedFromEditor(location.search, location.state),
    [location.search, location.state],
  );

  const handleBackToEditor = () => {
    if (focusEditorAndClosePlayer()) return;

    if (location.state?.fromEditorPath) {
      navigate(location.state.fromEditorPath, { replace: true });
      return;
    }

    if (projectId) {
      navigate(`/viqubed/editor/${projectId}`, { replace: true });
      return;
    }

    navigate(-1);
  };

  const togglePanel = (panelName) => {
    setActivePanel((prev) => (prev === panelName ? null : panelName));
  };

  const restorePanelBeforeChapterDetail = () => {
    if (activePanel !== "chapter") return;

    const previousPanel = chapterReturnPanelRef.current;

    player.chapterList.clearActiveChapter?.();
    setActiveMedia(null);
    setActivePanel(previousPanel || null);
  };

  const handleAnnotationClick = (annotation) => {
    restorePanelBeforeChapterDetail();
    setSelectedAnnotation(annotation);
  };

  const handleObjectInteraction = () => {
    restorePanelBeforeChapterDetail();
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
    if ((player.scene.objectList || []).length === 0) return;

    setActiveMedia(null);
    setSelectedAnnotation(null);
    togglePanel("object");
  };

  const handleSelectObjectFromList = (object, { shouldFocus = false } = {}) => {
    const selection = player.scene.setObjectListSelectedObject?.(object);
    if (!selection) return null;

    if (shouldFocus) {
      player.scene.focusObject?.(selection.selectedObject || object);
    }

    return selection;
  };

  const handleSelectChapter = async (chapterId) => {
    if (activePanel !== "chapter") {
      chapterReturnPanelRef.current = activePanel;
    }

    const opened = await player.chapterList.handleSelectChapter?.(chapterId);
    if (!opened) return false;

    setActiveMedia(null);
    setSelectedAnnotation(null);
    setActivePanel("chapter");
    return true;
  };

  const handleSelectSlide = async (slideId) => {
    const opened = await player.slidePanel?.selectSlide?.(slideId);
    if (!opened) return;
    setActiveMedia(null);
    setSelectedAnnotation(null);
    setActivePanel("slide");
  };

  const handleOpenAnnotationDetail = (chapterId) => {
    if (!chapterId) return;

    handleSelectChapter(chapterId);
    setSelectedAnnotation(null);
  };

  const handleAnnotationHierarchyBack = () => {
    setSelectedAnnotation(null);

    // Returning to a parent annotation level must not keep the child object
    // selected or highlighted. Parent annotations are navigation targets only.
    player.scene.setSelectedObject?.(null);
    player.scene.setOutlineObjects?.([]);

    // Detail opened from an annotation may have activated a chapter and its
    // object highlight. Restore the panel that was visible before that detail.
    restorePanelBeforeChapterDetail();
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
        (activePanel === "chapter" && chapterReturnPanelRef.current !== "object"),
      onClick: handleOpenProjectPanel,
    },
  ];

  if (playerMenuVisibility.environmentSettings) {
    sidebarItems.push({
      key: "environment",
      label: "Environment Settings",
      icon: Sun,
      active: activePanel === "environment",
      onClick: () => {
        setActiveMedia(null);
        togglePanel("environment");
      },
    });
  }

  if (
    playerMenuVisibility.objectList &&
    (player.scene.objectList || []).length > 0
  ) {
    sidebarItems.push({
      key: "object",
      label: "Object List",
      icon: Box,
      active:
        activePanel === "object" ||
        (activePanel === "chapter" && chapterReturnPanelRef.current === "object"),
      onClick: handleOpenObjectPanel,
    });
  }

  sidebarItems.push({
    key: "animation",
    label: "Animation",
    icon: Orbit,
    active: activePanel === "animation",
    onClick: () => {
      setActiveMedia(null);
      togglePanel("animation");
    },
  });

  if ((player.flowPanel.flows || []).length > 0) {
    sidebarItems.push({
      key: "flow",
      label: "Flow Materials",
      icon: GitBranch,
      active: activePanel === "flow" || player.flowPanel.isPlaying,
      onClick: () => {
        setActiveMedia(null);
        togglePanel("flow");
      },
    });
  }

  if ((player.quizPanel?.quizzes || []).length > 0) {
    sidebarItems.push({
      key: "quiz",
      label: "Quiz & Assessment",
      icon: GraduationCap,
      active:
        activePanel === "quiz" || Boolean(player.quizPanel?.isAssessmentActive),
      onClick: () => {
        setActiveMedia(null);
        togglePanel("quiz");
      },
    });
  }

  if ((player.procedurePanel.procedures || []).length > 0) {
    sidebarItems.push({
      key: "procedural",
      label: "Procedures",
      icon: ListChecks,
      active:
        activePanel === "procedural" ||
        ["resetting", "waiting", "dragging", "animating", "completed"].includes(
          player.procedurePanel.status,
        ),
      onClick: () => {
        setActiveMedia(null);
        togglePanel("procedural");
      },
    });
  }

  const playerToolItems = [];

  if (playerMenuVisibility.freePlay) {
    playerToolItems.push({
      key: "free-play",
      label: "Free Play",
      icon: Move3d,
      active: Boolean(player.toolsMenu.freePlay),
      onClick: () => {
        const nextFreePlay = !player.toolsMenu.freePlay;

        setActiveMedia(null);
        setSelectedAnnotation(null);

        if (nextFreePlay) {
          // Free Play is a clean, standalone interaction mode. Close every
          // material panel and discard the previous Chapter return target.
          chapterReturnPanelRef.current = null;
          setActivePanel(null);
        }

        player.toolbar.setFreePlay?.(nextFreePlay);
      },
    });
  }

  if (playerMenuVisibility.pullApart) {
    playerToolItems.push({
      key: "pull-apart",
      label: "Pull Apart",
      icon: Scan,
      active: Boolean(player.toolsMenu.isPullApartActive),
      onClick: () => {
        setActiveMedia(null);
        player.toolsMenu.pullApart?.();
      },
    });
  }

  if (playerMenuVisibility.cut) {
    playerToolItems.push({
      key: "cut",
      label: "Cut",
      icon: Scissors,
      active: activePanel === "cut" || Boolean(player.toolsMenu.cutEnabled),
      onClick: () => {
        setActiveMedia(null);
        togglePanel("cut");
      },
    });
  }

  if (playerToolItems.length > 0) {
    sidebarItems.push({ type: "separator" }, ...playerToolItems);
  }

  sidebarItems.push(
    { type: "separator" },
    {
      key: "settings",
      label: "View Settings",
      icon: SlidersVertical,
      active: activePanel === "settings",
      onClick: () => {
        setActiveMedia(null);
        togglePanel("settings");
      },
    },
  );

  const visibleSidebarItems = player.quizPanel?.isAssessmentActive
    ? sidebarItems.filter((item) => item?.key === "quiz")
    : sidebarItems;

  if (isLoadingProject) {
    return <div style={{ padding: 24 }}>Loading project...</div>;
  }

  if (loadError) {
    return <div style={{ padding: 24 }}>{loadError}</div>;
  }

  return (
    <PlayerLayout
      player={player}
      sidebarItems={visibleSidebarItems}
      showSidebar={isSceneReady && !player.xrPanel?.activeMode}
      selectedAnnotationId={selectedAnnotation?.id || null}
      onAnnotationClick={handleAnnotationClick}
      onAnnotationClose={() => setSelectedAnnotation(null)}
      onAnnotationOpenDetail={handleOpenAnnotationDetail}
      onAnnotationHierarchyBack={handleAnnotationHierarchyBack}
      onObjectSelectInteraction={handleObjectInteraction}
      turntablePresentationActive={
        activePanel === null || activePanel === "project"
      }
    >
      {isSceneReady && (
        <>
      <PlayerXRControls xr={player.xrPanel} />
      {showBackToEditor && (
        <Button
          size="sm"
          type="button"
          variant="cyanOutline"
          onClick={handleBackToEditor}
          className="vx-player-back-button absolute right-16 top-5 z-50"
        >
          <MaterialIcon
            name="arrow_left_alt"
            fill
            size={20}
            className="text-secondary-default"
          />
          <span className="vx-player-back-label">Back to Editor</span>
        </Button>
      )}

      {activePanel === "project" && (
        <PlayerProjectInfoFloatingPanel
          material={player.scene.material}
          activeSlideId={player.slidePanel?.activeSlideId}
          onClose={() => setActivePanel(null)}
          onSelectSlide={handleSelectSlide}
          onOpenMedia={setActiveMedia}
          slides={player.slidePanel?.slides || []}
        />
      )}

      {activePanel === "environment" &&
        playerMenuVisibility.environmentSettings && (
        <PlayerEnvironmentSettingsFloatingPanel
          environment={player.environmentPanel}
          onClose={() => setActivePanel(null)}
        />
      )}

      {activePanel === "object" &&
        playerMenuVisibility.objectList &&
        (player.scene.objectList || []).length > 0 && (
          <PlayerMaterialObjectListPanel
            objectList={materialObjectList}
            fullObjectList={player.scene.objectList || []}
            mode={playerObjectListMode}
            onModeChange={setPlayerObjectListMode}
            activeChapterId={player.chapterList.activeChapterId}
            onSelectChapter={handleSelectChapter}
            onClose={() => setActivePanel(null)}
            searchObject={playerObjectSearch}
            setSearchObject={setPlayerObjectSearch}
            selectedObject={player.scene.selectedObject}
            onSelectObject={handleSelectObjectFromList}
            onClearSelection={player.scene.clearPlayerSelection}
            onFocusObject={player.scene.focusObject}
            onResetXray={player.scene.resetXray}
            onShowAllObjects={player.toolsMenu.showAllObjects}
            onHideAllObjects={player.toolsMenu.hideAllObjects}
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
          onOpenList={handleOpenObjectPanel}
          onSelectChapter={handleSelectChapter}
          onOpenMedia={setActiveMedia}
          onPlayVoice={player.chapterPanel.speakChapterDescription}
          onStopVoice={player.chapterPanel.stopSpeaking}
          onPlayAnimations={player.chapterPanel.playChapterAnimations}
          onStopAnimations={player.chapterPanel.stopChapterAnimations}
          chapterFlowAssignments={
            player.chapterPanel.chapterFlowAssignments
          }
          activeChapterFlowIds={player.chapterPanel.activeChapterFlowIds}
          cameraViews={player.chapterPanel.cameraViews}
          activeCameraViewIndex={player.chapterPanel.activeCameraViewIndex}
          onSelectCameraView={player.chapterPanel.selectCameraView}
          onPlayChapterFlow={player.chapterPanel.playChapterFlow}
          onStopChapterFlows={player.chapterPanel.stopChapterFlows}
          chapters={visibleChapters}
        />
      )}

      {activePanel === "slide" && player.slidePanel?.activeSlide && (
        <PlayerChapterReaderFloatingPanel
          material={player.scene.material}
          activeChapter={player.slidePanel.activeSlide}
          activeChapterId={player.slidePanel.activeSlideId}
          onClose={() => {
            setActivePanel(null);
            setActiveMedia(null);
          }}
          onOpenList={() => setActivePanel("project")}
          onSelectChapter={handleSelectSlide}
          onOpenMedia={setActiveMedia}
          onPlayVoice={player.slidePanel.speakDescription}
          onStopVoice={player.slidePanel.stopSpeaking}
          onPlayAnimations={player.slidePanel.playAnimations}
          onStopAnimations={player.slidePanel.stopAnimations}
          chapterFlowAssignments={player.slidePanel.flowAssignments}
          activeChapterFlowIds={player.slidePanel.activeFlowIds}
          cameraViews={player.slidePanel.cameraViews}
          activeCameraViewIndex={player.slidePanel.activeCameraViewIndex}
          onSelectCameraView={player.slidePanel.selectCameraView}
          onPlayChapterFlow={player.slidePanel.playFlow}
          onStopChapterFlows={player.slidePanel.stopFlows}
          chapters={player.slidePanel.slides}
        />
      )}

      <PlayerAnimationFloatingPanel
        hidden={activePanel !== "animation"}
        animations={player.animationPanel.animations}
        selectedAnimations={player.animationPanel.selectedAnimations}
        setSelectedAnimations={player.animationPanel.setSelectedAnimations}
        setAnimationCommand={player.animationPanel.setAnimationCommand}
        onClose={() => setActivePanel(null)}
      />

      {activePanel === "flow" && (
        <PlayerFlowListPanel
          flows={player.flowPanel.flows}
          activeFlowId={player.flowPanel.activeFlowId}
          isPlaying={player.flowPanel.isPlaying}
          onPlay={player.flowPanel.playFlow}
          onStop={player.flowPanel.stopFlow}
          onClose={() => setActivePanel(null)}
        />
      )}

      {activePanel === "procedural" && (
        <PlayerProceduralListPanel
          procedures={player.procedurePanel.procedures}
          activeProcedureId={player.procedurePanel.activeProcedureId}
          activeSteps={player.procedurePanel.activeSteps}
          status={player.procedurePanel.status}
          activeStepIndex={player.procedurePanel.activeStepIndex}
          completedStepIds={player.procedurePanel.completedStepIds}
          feedback={player.procedurePanel.feedback}
          onPlay={player.procedurePanel.playProcedure}
          onReplay={player.procedurePanel.replayProcedure}
          onStop={player.procedurePanel.stopProcedure}
          onPlayCompletionAnimation={
            player.procedurePanel.playCompletionAnimation
          }
          onClose={() => setActivePanel(null)}
        />
      )}

      {activePanel === "quiz" && (
        <PlayerQuizPanel
          quiz={player.quizPanel}
          onClose={() => setActivePanel(null)}
        />
      )}

      {activePanel === "cut" && playerMenuVisibility.cut && (
        <PlayerCutSlider
          cutValues={player.cutSlider.cutValues}
          cutRanges={player.cutSlider.cutRanges}
          updateCutValue={player.cutSlider.updateCutValue}
          resetCutValues={player.cutSlider.resetCutValues}
          cutAllObjects={player.cutSlider.cutAllObjects}
          setCutAllObjects={player.cutSlider.setCutAllObjects}
          cutTargetAvailable={player.cutSlider.cutTargetAvailable}
          onClose={() => setActivePanel(null)}
        />
      )}

      {activePanel === "settings" && (
        <PlayerViewSettingsFloatingPanel
          showAnnotations={player.settingsPanel.showAnnotations}
          setShowAnnotations={player.settingsPanel.setShowAnnotations}
          hasSelectedObject={Boolean(player.scene.selectedObject)}
          onResetView={() => {
            player.settingsPanel.resetView?.();
            setSelectedAnnotation(null);
          }}
          onResetAll={() => {
            player.settingsPanel.resetAll?.();
            setActiveMedia(null);
            setSelectedAnnotation(null);
          }}
          onHideSelected={() => {
            player.toolsMenu.hideSelectedObject?.();
            setSelectedAnnotation(null);
          }}
          onSoloSelected={() => {
            player.toolsMenu.soloSelectedObject?.();
            setSelectedAnnotation(null);
          }}
          onShowAll={() => {
            player.toolsMenu.showAllObjects?.();
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
        </>
      )}
    </PlayerLayout>
  );
}

