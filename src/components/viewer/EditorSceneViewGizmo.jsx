import { useEffect, useState } from "react";
import useResponsiveViewport from "../../hooks/useResponsiveViewport";
import {
  EDITOR_RIGHT_PANEL_WIDTH,
  EDITOR_TOP_BAR_HEIGHT,
  EDITOR_VIEW_CUBE_GAP,
  EDITOR_VIEW_CUBE_WIDTH,
} from "../../constants/editorLayout";

import {
  detectAlignedCameraView,
  isOrthographicStandardView,
} from "../../engine/camera";

const VIEW_LABELS = {
  perspective: "Free View",
  isometric: "Isometric",
  right: "Right",
  left: "Left",
  top: "Top",
  bottom: "Bottom",
  front: "Front",
  back: "Back",
};

function FaceButton({ viewId, activeView, title, points, children, onChangeView }) {
  const active = activeView === viewId;

  return (
    <g
      role="button"
      tabIndex="0"
      aria-label={title}
      aria-pressed={active}
      onClick={() => onChangeView(viewId)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onChangeView(viewId);
        }
      }}
      style={{ cursor: "pointer", outline: "none" }}
    >
      <polygon
        points={points}
        fill={active ? "rgba(103, 212, 235, 0.92)" : "rgba(28, 53, 57, 0.96)"}
        stroke={active ? "#d7f7ff" : "rgba(121, 219, 239, 0.65)"}
        strokeWidth={active ? 1.8 : 1.2}
        style={{ transition: "fill 140ms ease, stroke 140ms ease" }}
      />
      {children}
    </g>
  );
}

function SmallViewButton({ viewId, activeView, label, title, onChangeView }) {
  const active = activeView === viewId;

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={() => onChangeView(viewId)}
      style={{
        minWidth: 26,
        height: 22,
        padding: "0 6px",
        borderRadius: 6,
        border: active
          ? "1px solid #8ee9fb"
          : "1px solid rgba(111, 214, 236, 0.28)",
        background: active
          ? "rgba(58, 151, 177, 0.68)"
          : "rgba(9, 21, 23, 0.88)",
        color: active ? "#f4fdff" : "#9fdbe8",
        cursor: "pointer",
        fontSize: 9,
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {label}
    </button>
  );
}

function OrthographicViewButton({ viewId, activeView, label, onChangeView }) {
  const active = activeView === viewId;

  return (
    <button
      type="button"
      title={`${label} View`}
      aria-label={`${label} View`}
      aria-pressed={active}
      onClick={() => onChangeView(viewId)}
      style={{
        minWidth: 0,
        height: 34,
        padding: "0 6px",
        borderRadius: 7,
        border: active
          ? "1px solid #8ee9fb"
          : "1px solid rgba(111, 214, 236, 0.28)",
        background: active
          ? "rgba(58, 151, 177, 0.68)"
          : "rgba(9, 21, 23, 0.88)",
        color: active ? "#f4fdff" : "#9fdbe8",
        cursor: "pointer",
        fontSize: 9,
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {label.toUpperCase()}
    </button>
  );
}

function ProjectionModeButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        flex: "1 1 0",
        minWidth: 0,
        height: 24,
        padding: "0 3px",
        boxSizing: "border-box",
        borderRadius: 6,
        border: active
          ? "1px solid #8ee9fb"
          : "1px solid rgba(111, 214, 236, 0.24)",
        background: active
          ? "rgba(58, 151, 177, 0.68)"
          : "rgba(9, 21, 23, 0.78)",
        color: active ? "#f4fdff" : "#9fdbe8",
        cursor: "pointer",
        fontSize: 7,
        fontWeight: 300,
        letterSpacing: "-0.02em",
        lineHeight: 1,
        overflow: "hidden",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

export default function EditorSceneViewGizmo({
  cameraRef,
  controlsRef,
  onChangeView,
  projectionMode = "perspective",
  onChangeProjectionMode,
  rightPanelVisible = false,
}) {
  const [activeView, setActiveView] = useState("perspective");
  const { isMobile, isTablet, isCompact } = useResponsiveViewport();
  const orthographicMode = projectionMode === "orthographic";

  useEffect(() => {
    const syncView = () => {
      const nextView = detectAlignedCameraView(
        cameraRef?.current,
        controlsRef?.current,
        projectionMode,
      );
      setActiveView((currentView) =>
        currentView === nextView ? currentView : nextView,
      );
    };

    syncView();
    const intervalId = window.setInterval(syncView, 180);
    return () => window.clearInterval(intervalId);
  }, [cameraRef, controlsRef, projectionMode]);

  const changeView = (viewId) => {
    if (orthographicMode && !isOrthographicStandardView(viewId)) return;

    const didChange = onChangeView?.(viewId);
    if (didChange !== false) setActiveView(viewId);
  };

  const responsiveScale = isMobile ? 0.72 : isTablet ? 0.84 : isCompact ? 0.92 : 1;
  const responsiveTop = isMobile
    ? EDITOR_TOP_BAR_HEIGHT + 8
    : EDITOR_TOP_BAR_HEIGHT + EDITOR_VIEW_CUBE_GAP;
  const desktopPanelWidth = isCompact ? 420 : EDITOR_RIGHT_PANEL_WIDTH;
  const responsiveRight =
    isMobile || isTablet
      ? 8
      : rightPanelVisible
        ? `min(${desktopPanelWidth + EDITOR_VIEW_CUBE_GAP}px, calc(100vw - ${EDITOR_VIEW_CUBE_WIDTH + EDITOR_VIEW_CUBE_GAP}px))`
        : EDITOR_VIEW_CUBE_GAP;

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      style={{
        position: "absolute",
        top: responsiveTop,
        right: responsiveRight,
        zIndex: 135,
        width: EDITOR_VIEW_CUBE_WIDTH,
        boxSizing: "border-box",
        padding: "8px 8px 7px",
        border: "1px solid rgba(111, 214, 236, 0.24)",
        borderRadius: 12,
        background: "rgba(10, 23, 25, 0.78)",
        boxShadow: "0 12px 28px rgba(0, 0, 0, 0.28)",
        backdropFilter: "blur(10px)",
        pointerEvents: "auto",
        userSelect: "none",
        transform: `scale(${responsiveScale})`,
        transformOrigin: "top right",
        transition: "right 200ms ease, top 200ms ease, transform 200ms ease",
      }}
    >
      {orthographicMode ? (
        <div
          role="group"
          aria-label="Orthographic scene views"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 6,
            padding: "3px 1px 1px",
          }}
        >
          <OrthographicViewButton
            viewId="left"
            activeView={activeView}
            label="Left"
            onChangeView={changeView}
          />
          <OrthographicViewButton
            viewId="right"
            activeView={activeView}
            label="Right"
            onChangeView={changeView}
          />
          <OrthographicViewButton
            viewId="top"
            activeView={activeView}
            label="Top"
            onChangeView={changeView}
          />
          <OrthographicViewButton
            viewId="bottom"
            activeView={activeView}
            label="Bottom"
            onChangeView={changeView}
          />
          <OrthographicViewButton
            viewId="front"
            activeView={activeView}
            label="Front"
            onChangeView={changeView}
          />
          <OrthographicViewButton
            viewId="back"
            activeView={activeView}
            label="Back"
            onChangeView={changeView}
          />
        </div>
      ) : (
        <>
          <svg
            viewBox="0 0 108 82"
            width="108"
            height="82"
            role="img"
            aria-label="Scene view cube"
            style={{ display: "block", margin: "0 auto", overflow: "visible" }}
          >
            <FaceButton
              viewId="top"
              activeView={activeView}
              title="Top View"
              points="25,22 54,6 83,22 54,38"
              onChangeView={changeView}
            >
              <text x="54" y="23" textAnchor="middle" fill="#eafcff" fontSize="8" fontWeight="300">TOP</text>
            </FaceButton>

            <FaceButton
              viewId="front"
              activeView={activeView}
              title="Front View"
              points="25,22 54,38 54,70 25,53"
              onChangeView={changeView}
            >
              <text x="39" y="49" textAnchor="middle" fill="#eafcff" fontSize="7" fontWeight="300" transform="rotate(29 39 49)">FRONT</text>
            </FaceButton>

            <FaceButton
              viewId="right"
              activeView={activeView}
              title="Right View"
              points="54,38 83,22 83,53 54,70"
              onChangeView={changeView}
            >
              <text x="69" y="49" textAnchor="middle" fill="#eafcff" fontSize="7" fontWeight="300" transform="rotate(-29 69 49)">RIGHT</text>
            </FaceButton>

            <g
              role="button"
              tabIndex="0"
              aria-label="Isometric View"
              aria-pressed={activeView === "isometric"}
              onClick={() => changeView("isometric")}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  changeView("isometric");
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx="54"
                cy="38"
                r="7"
                fill={activeView === "isometric" ? "#8ee9fb" : "#18383d"}
                stroke="#b8f4ff"
                strokeWidth="1.2"
              />
              <path d="M51 38h6M54 35v6" stroke={activeView === "isometric" ? "#082126" : "#b8f4ff"} strokeWidth="1.2" />
            </g>
          </svg>

          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: -2 }}>
            <SmallViewButton viewId="left" activeView={activeView} label="L" title="Left View" onChangeView={changeView} />
            <SmallViewButton viewId="back" activeView={activeView} label="B" title="Back View" onChangeView={changeView} />
            <SmallViewButton viewId="bottom" activeView={activeView} label="BTM" title="Bottom View" onChangeView={changeView} />
          </div>
        </>
      )}

      <div
        style={{
          marginTop: orthographicMode ? 7 : 5,
          color: "#a9e4ef",
          fontSize: 9,
          fontWeight: 300,
          letterSpacing: "0.01em",
          textAlign: "center",
        }}
      >
        {VIEW_LABELS[activeView] || "Free View"}
      </div>


      <div
        role="group"
        aria-label="Camera projection"
        style={{ display: "flex", minWidth: 0, gap: 4, marginTop: 6 }}
      >
        <ProjectionModeButton
          active={!orthographicMode}
          label="PERSPECTIVE"
          onClick={() => onChangeProjectionMode?.("perspective")}
        />
        <ProjectionModeButton
          active={orthographicMode}
          label="ORTHOGRAPHIC"
          onClick={() => onChangeProjectionMode?.("orthographic")}
        />
      </div>
    </div>
  );
}
