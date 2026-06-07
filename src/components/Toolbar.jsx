function Toolbar({
  availableModels,
  setModelUrl,
  resetXray,
  handleFile,
  saveMarkers,
  loadMarkers,
  pullApart,
  resetParts,
  cutEnabled,
  setCutEnabled,
  cutMin,
  cutMax,
  cutX,
  setCutX,
  markerMode,
  setMarkerMode,
  resetMovedObjects
}) {
  return (
  <div
    style={{
      background: 'white',
      padding: 12,
      borderRadius: 10,
      marginBottom: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }}
  >

    <h4>Default Models</h4>

    {availableModels.map((model) => (
      <button
        key={model.file}
        style={{
          width: '100%',
          marginBottom: 6
        }}
        onClick={() => {
          setModelUrl(model.file)
        }}
      >
        {model.name}
      </button>
    ))}

    
    <input
      type="file"
      accept=".glb"
      onChange={handleFile}
    />
    

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
      
        <input
          type="checkbox"
          checked={markerMode}
          onChange={(e) =>
            setMarkerMode(e.target.checked)
          }
        />
       <span style={{
          color: 'black'
        }}>
          Set Marker
        </span>
      </label>

   
    <button onClick={saveMarkers} 
    style={{
    width: '100%',
    padding: '10px'
    }}
    >
      Save Marker
    </button>
      <button
      onClick={resetMovedObjects}
      style={{
        width: '100%',
        padding: '10px'
      }}
    >
      Reset Moved Objects
    </button>
    

    <input
      type="file"
      accept=".json"
      onChange={loadMarkers}
    />

    <button onClick={pullApart}
    style={{
    width: '100%',
    padding: '10px'
    }}
    >
      Pull Apart
    </button>

    <button onClick={resetParts}
    style={{
    width: '100%',
    padding: '10px'
    }}
    >
      Reset
    </button>

    <button onClick={resetXray}
    style={{
    width: '100%',
    padding: '10px'
    }}
    >
      Reset Xray
    </button>

    <button
      onClick={() => {
        if (!cutEnabled) {
          setCutX(cutMax)
        }

        setCutEnabled(!cutEnabled)
      }}
    
    style={{
    width: '100%',
    padding: '10px'
    }}
    >
      {cutEnabled ? 'Cut Off' : 'Cut On'}
    </button>

    {cutEnabled && (
      <input
        type="range"
        min={cutMin}
        max={cutMax}
        step={(cutMax - cutMin) / 100}
        value={cutX}
        onChange={(e) => setCutX(Number(e.target.value))}
      />
    )}
  </div>
)
}

export default Toolbar