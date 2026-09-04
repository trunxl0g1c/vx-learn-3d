import { useState } from "react";

export function useViewerDialogs({
  addMarker,
  setActiveChapterId,
  setActiveSlideId,
  setMarkerMode,
  setRightTab,
}) {
  const [markerDialogOpen, setMarkerDialogOpen] = useState(false);
  const [pendingMarkerPoint, setPendingMarkerPoint] = useState(null);
  const [pendingMarkerName, setPendingMarkerName] = useState("");

  const requestAddMarker = (chapterId) => {
    setActiveSlideId?.(null);
    setActiveChapterId(chapterId);
    setMarkerMode(true);
    setRightTab("chapter");
  };

  const requestAddSlideMarker = (slideId) => {
    setActiveChapterId(null);
    setActiveSlideId?.(slideId);
    setMarkerMode(true);
    setRightTab("slide");
  };

  const handleMarkerPointPicked = (markerPayload) => {
    setPendingMarkerPoint(markerPayload);
    setPendingMarkerName(markerPayload.text || "");
    setMarkerDialogOpen(true);
  };

  const confirmMarkerDialog = () => {
    if (!pendingMarkerPoint) return;

    addMarker({
      ...pendingMarkerPoint,
      text: pendingMarkerName || "Marker",
    });

    setMarkerDialogOpen(false);
    setPendingMarkerPoint(null);
    setPendingMarkerName("");
    setMarkerMode(false);
  };

  const cancelAddMarker = () => {
    setMarkerMode(false);
    setMarkerDialogOpen(false);
    setPendingMarkerPoint(null);
    setPendingMarkerName("");
  };

  return {
    markerDialogOpen,
    pendingMarkerName,
    setPendingMarkerName,
    requestAddMarker,
    requestAddSlideMarker,
    handleMarkerPointPicked,
    confirmMarkerDialog,
    cancelAddMarker,
  };
}
