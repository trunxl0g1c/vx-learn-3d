export default function ChapterDeselectButton({ setActiveChapterId }) {
  return (
    <div className="sticky bottom-0 px-4 pb-4 pt-5 backdrop-blur-3xl z-10 border-t border-t-divider-main w-full bg-primary">
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
