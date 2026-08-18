import { useCallback, useEffect, useMemo, useState } from "react";

function getProjectName(material) {
  return material?.projectName || material?.name || "VIQUBED";
}

function getContentTitle(item) {
  return item?.title || item?.name || "Untitled Material";
}

function getContentDescription(item) {
  return item?.description || "Open this learning material inside XR.";
}

export default function usePlayerXRInteraction({
  player,
  visibleChapters = [],
  onSelectChapter,
  onSelectSlide,
  onClearTransientUI,
}) {
  const [panelTab, setPanelTab] = useState("materials");
  const [procedureCursor, setProcedureCursor] = useState(0);
  const [presentationRevision, setPresentationRevision] = useState(0);
  const [actionStatus, setActionStatus] = useState("");

  const procedures = useMemo(
    () =>
      Array.isArray(player?.procedurePanel?.procedures)
        ? player.procedurePanel.procedures
        : [],
    [player?.procedurePanel?.procedures],
  );

  const slides = useMemo(
    () =>
      Array.isArray(player?.slidePanel?.slides)
        ? player.slidePanel.slides.filter((slide) => slide?.enabled !== false)
        : [],
    [player?.slidePanel?.slides],
  );

  // XR must expose every authored learning item. Slides and Chapters are
  // separate authoring surfaces in Player; choosing one collection whenever
  // the other exists used to hide valid Chapter material as soon as a project
  // also contained Slides.
  const materialItems = useMemo(() => {
    const slideItems = slides.map((slide) => ({
      id: slide.id,
      key: `slide:${slide.id}`,
      type: "slide",
      source: slide,
    }));
    const chapterItems = visibleChapters.map((chapter) => ({
      id: chapter.id,
      key: `chapter:${chapter.id}`,
      type: "chapter",
      source: chapter,
    }));

    return [...slideItems, ...chapterItems];
  }, [slides, visibleChapters]);

  const activeMaterial = useMemo(() => {
    const activeSlideId = player?.slidePanel?.activeSlideId || null;
    if (activeSlideId) {
      return (
        materialItems.find(
          (item) => item.type === "slide" && item.id === activeSlideId,
        ) || null
      );
    }

    const activeChapterId = player?.chapterList?.activeChapterId || null;
    if (activeChapterId) {
      return (
        materialItems.find(
          (item) => item.type === "chapter" && item.id === activeChapterId,
        ) || null
      );
    }

    return null;
  }, [
    materialItems,
    player?.chapterList?.activeChapterId,
    player?.slidePanel?.activeSlideId,
  ]);

  const activeMaterialIndex = activeMaterial
    ? materialItems.findIndex((item) => item.key === activeMaterial.key)
    : -1;
  const activeMaterialId = activeMaterial?.id || null;

  // Use the hydrated runtime record whenever possible. Lazy catalogue summaries
  // intentionally omit most authored content and are only suitable for lists.
  const activeMaterialContent =
    activeMaterial?.type === "slide"
      ? player?.slidePanel?.activeSlide || activeMaterial?.source || null
      : activeMaterial?.type === "chapter"
        ? player?.chapterPanel?.activeChapter || activeMaterial?.source || null
        : null;

  useEffect(() => {
    if (!player?.xrPanel?.activeMode) {
      setPanelTab("materials");
      setActionStatus("");
      return;
    }

    const activeProcedureIndex = procedures.findIndex(
      (procedure) => procedure.id === player?.procedurePanel?.activeProcedureId,
    );
    if (activeProcedureIndex >= 0) {
      setProcedureCursor(activeProcedureIndex);
    } else if (procedureCursor >= procedures.length) {
      setProcedureCursor(Math.max(0, procedures.length - 1));
    }
  }, [
    player?.procedurePanel?.activeProcedureId,
    player?.xrPanel?.activeMode,
    procedureCursor,
    procedures,
  ]);

  const openMaterialItem = useCallback(
    async (item) => {
      if (!item?.id) return false;

      let opened = false;
      if (item.type === "slide") {
        opened = Boolean(await onSelectSlide?.(item.id));
      } else {
        opened = Boolean(await onSelectChapter?.(item.id));
      }

      if (!opened) {
        setActionStatus("Material could not be opened.");
        return false;
      }

      setActionStatus(`Opened: ${getContentTitle(item.source)}`);
      setPresentationRevision((value) => value + 1);
      return true;
    },
    [onSelectChapter, onSelectSlide],
  );

  const handleAction = useCallback(
    async (action) => {
      if (!action) return;

      if (action === "xr_exit") {
        await player?.xrPanel?.exit?.();
        return;
      }

      if (action === "xr_tab_materials") {
        setPanelTab("materials");
        setActionStatus("");
        return;
      }

      if (action === "xr_tab_tools") {
        setPanelTab("tools");
        setActionStatus("");
        return;
      }

      if (action === "xr_toggle_freeplay") {
        const nextFreePlay = !player?.toolsMenu?.freePlay;
        onClearTransientUI?.({ clearChapterReturn: nextFreePlay });
        player?.toolbar?.setFreePlay?.(nextFreePlay);
        setActionStatus(nextFreePlay ? "Free Play enabled." : "Free Play disabled.");
        return;
      }

      if (action === "xr_pull_apart") {
        const changed = player?.toolsMenu?.pullApartXR?.({
          targetObject: player?.scene?.selectedObject || null,
        });
        setActionStatus(
          changed
            ? "Pull Apart applied to the XR presentation."
            : player?.toolsMenu?.isPullApartActive
              ? "Pull Apart reset."
              : "Pull Apart did not find a movable target.",
        );
        return;
      }

      if (action === "xr_reset") {
        player?.settingsPanel?.resetAll?.();
        onClearTransientUI?.();
        setActionStatus("XR presentation reset.");
        setPresentationRevision((value) => value + 1);
        return;
      }

      if (action === "xr_tab_procedures") {
        if (procedures.length === 0) return;
        const activeIndex = procedures.findIndex(
          (procedure) => procedure.id === player?.procedurePanel?.activeProcedureId,
        );
        if (activeIndex >= 0) setProcedureCursor(activeIndex);
        setPanelTab("procedures");
        setActionStatus("");
        return;
      }

      if (panelTab === "procedures") {
        const activeProcedureId = player?.procedurePanel?.activeProcedureId;
        const hasActiveProcedure = Boolean(activeProcedureId);

        if (action === "xr_prev" && !hasActiveProcedure && procedures.length > 0) {
          setProcedureCursor((current) =>
            Math.max(0, Math.min(procedures.length - 1, current - 1)),
          );
          return;
        }

        if (action === "xr_next" && !hasActiveProcedure && procedures.length > 0) {
          setProcedureCursor((current) =>
            Math.max(0, Math.min(procedures.length - 1, current + 1)),
          );
          return;
        }

        if (action === "xr_primary") {
          if (hasActiveProcedure) {
            if (player?.procedurePanel?.status === "completed") {
              await player?.procedurePanel?.replayProcedure?.(activeProcedureId);
              setActionStatus("Procedure replayed.");
            } else {
              player?.procedurePanel?.stopProcedure?.();
              setActionStatus("Procedure stopped.");
            }
            return;
          }

          const selectedProcedure =
            procedures[procedureCursor] || procedures[0] || null;
          if (selectedProcedure?.id) {
            const started = await player?.procedurePanel?.playProcedure?.(
              selectedProcedure.id,
            );
            setActionStatus(
              started === false ? "Procedure could not start." : "Procedure started.",
            );
          }
        }
        return;
      }

      if (action === "xr_overview") {
        player?.settingsPanel?.resetAll?.();
        player?.chapterList?.clearActiveChapter?.();
        player?.slidePanel?.clearSlide?.();
        onClearTransientUI?.();
        setActionStatus("Project overview restored.");
        setPresentationRevision((value) => value + 1);
        return;
      }

      if (materialItems.length === 0) {
        setActionStatus("No XR material is available in this project.");
        return;
      }

      if (action === "xr_prev") {
        const nextIndex =
          activeMaterialIndex < 0
            ? materialItems.length - 1
            : Math.max(0, activeMaterialIndex - 1);
        await openMaterialItem(materialItems[nextIndex]);
        return;
      }

      if (action === "xr_next") {
        const nextIndex =
          activeMaterialIndex < 0
            ? 0
            : Math.min(materialItems.length - 1, activeMaterialIndex + 1);
        await openMaterialItem(materialItems[nextIndex]);
      }
    },
    [
      activeMaterialIndex,
      materialItems,
      onClearTransientUI,
      openMaterialItem,
      panelTab,
      player,
      procedureCursor,
      procedures,
    ],
  );

  const viewModel = useMemo(() => {
    if (!player?.xrPanel?.activeMode) return null;

    const projectName = getProjectName(player?.scene?.material);
    const touchXR =
      player?.xrPanel?.activeMode === "ios-tracked-ar" ||
      (player?.xrPanel?.activeMode === "ar" &&
        player?.xrPanel?.platform?.isAndroid);
    const inputHint = touchXR
      ? "Tap the learning controls on screen."
      : "Point at a button and press the controller trigger.";
    const activeContent = activeMaterialContent;
    const activeProcedureIndex = procedures.findIndex(
      (procedure) => procedure.id === player?.procedurePanel?.activeProcedureId,
    );
    const selectedProcedure =
      activeProcedureIndex >= 0
        ? procedures[activeProcedureIndex]
        : procedures[procedureCursor] || procedures[0] || null;
    const procedureRunning = activeProcedureIndex >= 0;
    const procedureCompleted = player?.procedurePanel?.status === "completed";
    const activeStep = procedureRunning
      ? player?.procedurePanel?.activeSteps?.[
          player?.procedurePanel?.activeStepIndex
        ] || null
      : null;

    if (panelTab === "procedures") {
      return {
        eyebrow: `${projectName} · PROCEDURE`,
        title: selectedProcedure?.name || selectedProcedure?.title || "No Procedure",
        body:
          activeStep?.instruction ||
          selectedProcedure?.description ||
          (procedures.length > 0
            ? "Use Previous / Next to choose a procedure, then Start."
            : "No procedure is available in this project."),
        progress: procedureRunning
          ? `Step ${Math.min(
              (player?.procedurePanel?.activeStepIndex ?? 0) + 1,
              player?.procedurePanel?.activeSteps?.length || 1,
            )} / ${player?.procedurePanel?.activeSteps?.length || 1}`
          : procedures.length > 0
            ? `Procedure ${Math.min(procedureCursor + 1, procedures.length)} / ${procedures.length}`
            : "Procedure 0 / 0",
        status:
          actionStatus ||
          (procedureRunning
            ? player?.procedurePanel?.feedback ||
              player?.procedurePanel?.status ||
              "Running"
            : inputHint),
        buttons: [
          { label: "MATERIAL", action: "xr_tab_materials" },
          { label: "PROCEDURE", action: "xr_tab_procedures", active: true },
          { label: "TOOLS", action: "xr_tab_tools" },
          {
            label: "PREV",
            action:
              !procedureRunning && procedureCursor > 0 ? "xr_prev" : null,
            disabled: procedureRunning || procedureCursor <= 0,
          },
          {
            label: procedureRunning
              ? procedureCompleted
                ? "REPLAY"
                : "STOP"
              : "START",
            action: selectedProcedure ? "xr_primary" : null,
            active: true,
            disabled: !selectedProcedure,
          },
          {
            label: "NEXT",
            action:
              !procedureRunning && procedureCursor < procedures.length - 1
                ? "xr_next"
                : null,
            disabled:
              procedureRunning || procedureCursor >= procedures.length - 1,
          },
          { label: "EXIT", action: "xr_exit" },
        ],
      };
    }

    if (panelTab === "tools") {
      return {
        eyebrow: `${projectName} · XR TOOLS`,
        title: "Interaction Tools",
        body:
          "Free Play enables direct object selection. Pull Apart uses the Player model engine and Reset restores the initial presentation.",
        progress: `Free Play ${player?.toolsMenu?.freePlay ? "ON" : "OFF"} · Pull Apart ${player?.toolsMenu?.isPullApartActive ? "ON" : "OFF"}`,
        status:
          actionStatus ||
          (player?.procedurePanel?.activeProcedureId
            ? "Reset or Free Play will leave the current procedure state."
            : touchXR
              ? "Tap a tool on screen."
              : "Point the controller ray at a tool and press trigger."),
        buttons: [
          { label: "MATERIAL", action: "xr_tab_materials" },
          {
            label: "PROCEDURE",
            action: procedures.length > 0 ? "xr_tab_procedures" : null,
            disabled: procedures.length === 0,
          },
          { label: "TOOLS", action: "xr_tab_tools", active: true },
          {
            label: "FREE",
            action: "xr_toggle_freeplay",
            active: Boolean(player?.toolsMenu?.freePlay),
          },
          {
            label: "PULL",
            action: "xr_pull_apart",
            active: Boolean(player?.toolsMenu?.isPullApartActive),
          },
          { label: "RESET", action: "xr_reset" },
          { label: "EXIT", action: "xr_exit" },
        ],
      };
    }

    return {
      eyebrow: `${projectName} · ${activeMaterial?.type === "chapter" ? "CHAPTER" : activeMaterial?.type === "slide" ? "SLIDE" : "MATERIAL"}`,
      title: activeContent ? getContentTitle(activeContent) : "Project Overview",
      body: activeContent
        ? getContentDescription(activeContent)
        : materialItems.length > 0
          ? "Use Previous / Next to open learning materials while staying inside VR/AR."
          : "No Slide/Material was found. Legacy Chapter content is used automatically when available.",
      progress:
        activeMaterialIndex >= 0
          ? `Material ${activeMaterialIndex + 1} / ${materialItems.length}`
          : `Material 0 / ${materialItems.length}`,
      status:
        actionStatus ||
        (player?.procedurePanel?.activeProcedureId
          ? "A procedure is active. Opening a material will stop the procedure."
          : activeContent
            ? `Camera ${(Array.isArray(activeContent.cameraViews) ? activeContent.cameraViews.length : activeContent.cameraView ? 1 : 0)} · Media ${(Array.isArray(activeContent.media) ? activeContent.media.length : Number(activeContent.mediaCount) || 0)} · Parameters ${(Array.isArray(activeContent.parameters) ? activeContent.parameters.length : Number(activeContent.parameterCount) || 0)}`
            : materialItems.length > 0
              ? "NEXT/PREV opens the same Player material used on desktop."
              : "No material is currently available for XR navigation."),
      buttons: [
        { label: "MATERIAL", action: "xr_tab_materials", active: true },
        {
          label: "PROCEDURE",
          action: procedures.length > 0 ? "xr_tab_procedures" : null,
          disabled: procedures.length === 0,
        },
        { label: "TOOLS", action: "xr_tab_tools" },
        {
          label: "PREV",
          action:
            materialItems.length > 0 && activeMaterialIndex !== 0
              ? "xr_prev"
              : null,
          disabled: materialItems.length === 0 || activeMaterialIndex === 0,
        },
        { label: "OVERVIEW", action: "xr_overview" },
        {
          label: "NEXT",
          action:
            materialItems.length > 0 &&
            activeMaterialIndex < materialItems.length - 1
              ? "xr_next"
              : null,
          disabled:
            materialItems.length === 0 ||
            activeMaterialIndex >= materialItems.length - 1,
        },
        { label: "EXIT", action: "xr_exit" },
      ],
    };
  }, [
    actionStatus,
    activeMaterial,
    activeMaterialContent,
    activeMaterialIndex,
    materialItems.length,
    panelTab,
    player,
    procedureCursor,
    procedures,
  ]);

  const activeCameraView =
    activeMaterial?.type === "slide"
      ? player?.slidePanel?.cameraViews?.[
          player?.slidePanel?.activeCameraViewIndex || 0
        ] || null
      : activeMaterial?.type === "chapter"
        ? player?.chapterPanel?.cameraViews?.[
            player?.chapterPanel?.activeCameraViewIndex || 0
          ] || null
        : null;

  const presentation = useMemo(
    () => ({
      key: `${activeMaterial?.type || "overview"}:${activeMaterial?.id || "overview"}:${player?.scene?.selectedObject?.uuid || player?.scene?.modelScene?.uuid || "scene"}:${presentationRevision}`,
      targetObject:
        activeMaterialId && player?.scene?.selectedObject
          ? player.scene.selectedObject
          : player?.scene?.modelScene || null,
      cameraView: activeMaterialId ? activeCameraView : null,
    }),
    [
      activeCameraView,
      activeMaterial?.id,
      activeMaterial?.type,
      activeMaterialId,
      player?.scene?.modelScene,
      player?.scene?.selectedObject,
      presentationRevision,
    ],
  );

  return player?.xrPanel?.activeMode
    ? {
        onAction: handleAction,
        viewModel,
        presentation,
      }
    : null;
}
