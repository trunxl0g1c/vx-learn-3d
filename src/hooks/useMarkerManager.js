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

function updateContentMarkers(material, field, contentId, updater) {
  if (!contentId || typeof updater !== "function") return material;

  return {
    ...material,
    [field]: (material?.[field] || []).map((content) =>
      content.id === contentId
        ? {
            ...content,
            markers: updater(content.markers || []),
          }
        : content,
    ),
  };
}

export function useMarkerManager({
  activeChapterId,
  activeSlideId,
  setMaterial,
  markers,
  setMarkers,
}) {
  const activeField = activeSlideId ? "slides" : "chapters";
  const activeContentId = activeSlideId || activeChapterId;

  const addMarker = (marker) => {
    if (!activeContentId) {
      alert("Create or select a chapter/slide first to add markers.");
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

    setMaterial((prev) =>
      updateContentMarkers(prev, activeField, activeContentId, (items) => [
        ...items,
        fixedMarker,
      ]),
    );
  };

  const updateMarker = (markerId, patch) => {
    if (!activeContentId || !markerId) return false;

    let changed = false;
    setMaterial((prev) =>
      updateContentMarkers(prev, activeField, activeContentId, (items) =>
        items.map((marker) => {
          if (marker.id !== markerId) return marker;

          changed = true;
          const nextMarker = { ...marker, ...patch };
          const labelOffset = normalizeMarkerLabelOffset(nextMarker);
          return {
            ...nextMarker,
            labelOffset,
            connector: patch?.connector || createMarkerConnector(labelOffset),
          };
        }),
      ),
    );

    return changed;
  };

  const loadMarkers = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const json = JSON.parse(event.target.result);
      setMarkers(processLoadedMarkers(json));
    };
    reader.readAsText(file);
  };

  const saveMarkers = () => saveMarkersToFile(markers);

  return { addMarker, updateMarker, loadMarkers, saveMarkers };
}
