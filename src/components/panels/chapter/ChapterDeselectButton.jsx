export default function ChapterDeselectButton({
  selectedObjectName,
  setActiveChapterId,
  setRightTab,
  deselectObject,
}) {
  return (
    <div className="shrink-0 border-t border-t-grayout-dark bg-primary p-4 backdrop-blur-3xl">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();

          if (deselectObject) {
            deselectObject();
            return;
          }

          // Fallback for isolated usages that do not receive the central
          // deselect handler.
          setActiveChapterId?.(null);
          setRightTab?.(selectedObjectName ? "info" : null);
        }}
        className="w-full cursor-pointer rounded-2xl bg-accent-contrast p-3 uppercase text-white"
      >
        DESELECT
      </button>
    </div>
  );
}
