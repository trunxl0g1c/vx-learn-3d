export default function ObjectItem({
  item,
  index,
  selectedObject,
  highlightObject,
  makeXrayExcept,
  focusObject,
}) {
  return (
    <div
      onClick={() => {
        highlightObject(item.object)
        makeXrayExcept(item.object)
        focusObject(item.object)
      }}
      style={{
        padding: '6px 8px',
        borderBottom: '1px solid #eee',
        fontSize: 13,
        cursor: 'pointer',
        background: selectedObject === item.object ? '#ffe082' : 'white',
      }}
    >
      {item.name || `Object ${index + 1}`}
    </div>
  )
}
