export function saveMarkersToFile(markers) {

  const data = JSON.stringify(markers, null, 2)

  const blob = new Blob([data], {
    type: 'application/json'
  })

  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')

  a.href = url
  a.download = 'markers.json'

  a.click()

  URL.revokeObjectURL(url)
}

export function processLoadedMarkers(json) {

  return json.map((marker) => {

    let pos = marker.position

    if (!Array.isArray(pos)) {

      pos = [
        pos.x,
        pos.y,
        pos.z
      ]
    }

    return {
      ...marker,
      position: pos
    }
  })
}