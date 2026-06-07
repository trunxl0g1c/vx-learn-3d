function Sidebar({ markers, setMarkers }) {

  return (
    <div style={{
      background: 'white',
      color: 'black',
      padding: 12,
      borderRadius: 10,
      marginBottom: 12
    }}>

      <h3 style={{ marginTop: 0 }}>
        Daftar Marker
      </h3>

      {markers.map((marker, index) => (

        <div
          key={index}
          style={{ marginBottom: 10 }}
        >

          <input
            value={marker.text}
            onChange={(e) => {

              const newMarkers = [...markers]

              newMarkers[index].text =
                e.target.value

              setMarkers(newMarkers)
            }}

            style={{
              width: '100%',
              marginBottom: 4
            }}
          />

          <button
            onClick={() => {

              const newMarkers =
                markers.filter(
                  (_, i) => i !== index
                )

              setMarkers(newMarkers)
            }}
          >
            Hapus
          </button>

        </div>
      ))}

    </div>
  )
}

export default Sidebar