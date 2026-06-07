export default function RightPanel({
  objectList,
  selectedObject,
  highlightObject,
  makeXrayExcept,
  focusObject,
  markers,
  setSelectedObjectName
}) {
  return (
    <div style={{
      width: 320,
      height: '100vh',
      background: '#111827',
      color: 'white',
      padding: 16,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}>

      <div style={{
        flex: 1,
        minHeight: 0,
        background: '#1f2937',
        borderRadius: 10,
        padding: 12,
        overflowY: 'auto'
      }}>
        <h3 style={{ marginTop: 0 }}>Object List</h3>

        {objectList.map((item, index) => (
          <div
            key={index}
            onClick={() => {

              setSelectedObjectName(item.name)

              highlightObject(item.object)
              makeXrayExcept(item.object)
              focusObject(item.object)
            }}
            style={{
              padding: 8,
              marginBottom: 6,
              cursor: 'pointer',
              borderRadius: 6,
              background:
                selectedObject === item.object
                  ? '#2563eb'
                  : '#374151'
            }}
          >
            {item.name}
          </div>
        ))}
      </div>

      <div style={{
        flex: 1,
        minHeight: 0,
        background: '#1f2937',
        borderRadius: 10,
        padding: 12,
        overflowY: 'auto'
      }}>
        <h3 style={{ marginTop: 0 }}>Markers</h3>

        {markers.map((marker, index) => (
          <div
            key={index}
            style={{
              padding: 8,
              marginBottom: 6,
              borderRadius: 6,
              background: '#374151'
            }}
          >
            {marker.text}
          </div>
        ))}
      </div>

    </div>
  )
}