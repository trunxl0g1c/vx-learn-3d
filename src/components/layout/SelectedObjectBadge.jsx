export default function SelectedObjectBadge({ selectedObjectName }) {
  if (!selectedObjectName) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        background: 'rgba(17, 24, 39, 0.9)',
        color: 'white',
        padding: '10px 18px',
        borderRadius: 999,
        fontWeight: 'bold',
        fontSize: 14,
      }}
    >
      {selectedObjectName}
    </div>
  )
}
