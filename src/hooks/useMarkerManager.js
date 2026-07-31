import { processLoadedMarkers, saveMarkersToFile } from "../utils/markerUtils";
import { createId } from "../utils/createId";
import {
  createMarkerConnector,
  normalizeMarkerLabelOffset,
} from "../engine/marker";

function normalizeMarkerPosition(position) {
  if (Array.isArray(position)) {
    return position.slice(0, 3).map((value) => Number(value) || 0);
  }

  return [
    Number(position?.x) || 0,
    Number(position?.y) || 0,
    Number(position?.z) || 0,
  ];
}

export function useMarkerManager({
  activeChapterId,
  setMaterial,
  markers,
  setMarkers,
}) {
  const addMarker = (marker) => {
    if (!activeChapterId) {
      alert("Create or select a chapter first to add markers.");
      return;
    }

    const labelOffset = normalizeMarkerLabelOffset(marker);
    const fixedMarker = {
      ...marker,
      id: createId(),
      position: normalizeMarkerPosition(marker?.position),
      text: marker?.text || "Marker",
      attachment: marker?.attachment || null,
      labelOffset,
      connector: marker?.connector || createMarkerConnector(labelOffset),
    };

    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) =>
        chapter.id === activeChapterId
          ? {
              ...chapter,
              markers: [...(chapter.markers || []), fixedMarker],
            }
          : chapter,
      ),
    }));
  };

  const updateMarker = (markerId, patch) => {
    if (!activeChapterId || !markerId) return false;

    let changed = false;

    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) => {
        if (chapter.id !== activeChapterId) return chapter;

        const nextMarkers = (chapter.markers || []).map((marker) => {
          if (marker.id !== markerId) return marker;

          changed = true;
          const nextMarker = {
            ...marker,
            ...patch,
          };
          const labelOffset = normalizeMarkerLabelOffset(nextMarker);

          return {
            ...nextMarker,
            labelOffset,
            connector:
              patch?.connector || createMarkerConnector(labelOffset),
          };
        });

        return changed
          ? {
              ...chapter,
              markers: nextMarkers,
            }
          : chapter;
      }),
    }));

    return changed;
  };

  const loadMarkers = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const json = JSON.parse(event.target.result);
      const fixedMarkers = processLoadedMarkers(json);
      setMarkers(fixedMarkers);
    };

    reader.readAsText(file);
  };

  const saveMarkers = () => {
    saveMarkersToFile(markers);
  };

  return { addMarker, updateMarker, loadMarkers, saveMarkers };
}
