export default function MaterialIcon({
  name,
  fill = false,
  size = 24,
  className = "",
  ...props
}) {
  return (
    <span
      className={`material-symbols-rounded ${className}`}
      style={{
        fontSize: `${size}px`,
        fontVariationSettings: `
          'FILL' ${fill ? 1 : 0},
          'wght' 400,
          'GRAD' 0,
          'opsz' 24
        `,
      }}
      {...props}
    >
      {name}
    </span>
  );
}
