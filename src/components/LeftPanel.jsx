import Toolbar from './Toolbar'

export default function LeftPanel({
  objectList,
  selectedObject,
  highlightObject,
  makeXrayExcept,
  focusObject,
  markers,
  setMarkers,
  toolbarProps
}) {

  return (
    <div
      style={{
        width: 320,
        height: '100vh',
        background: '#111827',
        color: 'white',
        overflowY: 'auto',
        padding: 16,
        boxSizing: 'border-box'
      }}
    >
      <h2 style={{ marginTop: 0 }}>
        VX Learn 3D
      </h2>
      <Toolbar {...toolbarProps} />
      <hr />

      

     
    </div>
  )
}