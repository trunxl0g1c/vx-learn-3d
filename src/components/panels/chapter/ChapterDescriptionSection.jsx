export default function ChapterDescriptionSection({
  chapter,
  updateChapterField,
  showRichTextHint = false,
}) {
  const descriptionLength = chapter.description?.length || 0;

  return (
    <section className="space-y-2 p-4">
      <label className="block text-sm font-normal text-contrast-grayout">
        Description
      </label>

      <div className="relative">
        <textarea
          value={chapter.description || ""}
          maxLength={850}
          placeholder="Isi deskripsi materi..."
          onClick={(e) => e.stopPropagation()}
          onChange={(e) =>
            updateChapterField(chapter.id, "description", e.target.value)
          }
          className="min-h-[112px] w-full resize-none rounded-lg border border-secondary-default bg-transparent px-3 py-3 pr-12 text-xs font-medium leading-5 text-white outline-none placeholder:text-contrast-grayout focus:ring-1 focus:ring-secondary-default"
        />

        <span className="absolute bottom-3 right-3 text-[9px] font-normal text-contrast-grayout">
          {descriptionLength}/850
        </span>
      </div>

      {showRichTextHint && (
        <p className="text-[11px] leading-4 text-contrast-grayout">
          Tips: bungkus kata dengan{" "}
          <code className="rounded bg-dark-alpha px-1 py-0.5 text-secondary-default">
            {"//kata//"}
          </code>{" "}
          agar tetap dibaca dalam Bahasa Inggris saat Play Voice, contoh{" "}
          <code className="rounded bg-dark-alpha px-1 py-0.5 text-secondary-default">
            {"//main//"}
          </code>
          .
        </p>
      )}
    </section>
  );
}
