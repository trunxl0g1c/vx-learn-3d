export default function ChapterEmptyState() {
  return (
    <div className="p-3 mx-3 rounded-xl bg-dark-alpha text-contrast-grayout text-sm leading-6">
      No chapters yet. Select an object from the hierarchy, then click Create
      Chapter from Object.
      <span style={{ color: "white" }}>
        {" "}
        Create Chapter from Selected Object
      </span>
      .
    </div>
  );
}
