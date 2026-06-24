import { processLoadedMarkers, saveMarkersToFile } from '../utils/markerUtils'

export function useMarkerManager({ activeChapterId, setMaterial, markers, setMarkers }) {
  const addMarker = (marker) => {
    if (!activeChapterId) {
      alert('Pilih atau buat Bab dulu sebelum menambahkan marker')
      return
    }

    const fixedMarker = {
      id: crypto.randomUUID(),
      position: Array.isArray(marker.position)
        ? marker.position
        : [marker.position.x, marker.position.y, marker.position.z],
      text: marker.text,
    }

    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) =>
        chapter.id === activeChapterId
          ? {
              ...chapter,
              markers: [...(chapter.markers || []), fixedMarker],
            }
          : chapter
      ),
    }))
  }

  const loadMarkers = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = (event) => {
      const json = JSON.parse(event.target.result)
      const fixedMarkers = processLoadedMarkers(json)
      setMarkers(fixedMarkers)
    }

    reader.readAsText(file)
  }

  const saveMarkers = () => {
    saveMarkersToFile(markers)
  }

  return { addMarker, loadMarkers, saveMarkers }
}
