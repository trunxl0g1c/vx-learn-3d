export default function ChapterDeselectButton({ setActiveChapterId }) {
  return (
    <div className="sticky bottom-0 p-4 backdrop-blur-3xl z-10 border-t border-t-grayout-dark w-full bg-primary">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setActiveChapterId(null);
        }}
        className="w-full p-3 rounded-2xl bg-accent-contrast text-white uppercase cursor-pointer"
      >
        DESELECT
      </button>
    </div>
  );
}
