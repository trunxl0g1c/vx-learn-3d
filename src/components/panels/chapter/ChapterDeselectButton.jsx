export default function ChapterDeselectButton({ setActiveChapterId }) {
  return (
    <div className="sticky bottom-3 py-2 backdrop-blur-sm z-10 border-t border-t-divider-main">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setActiveChapterId(null);
        }}
        className="w-full p-3 rounded-2xl bg-[#AC9857] text-white uppercase cursor-pointer"
      >
        DESELECT
      </button>
    </div>
  );
}
