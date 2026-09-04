import RichDescriptionEditor from "../../ui/rich-description-editor";

export default function ChapterDescriptionSection({
  chapter,
  updateChapterField,
}) {
  return (
    <section className="space-y-2 p-4">
      <label className="block text-sm font-normal text-contrast-grayout">
        Description
      </label>

      <RichDescriptionEditor
        key={chapter.id}
        value={chapter.description || ""}
        maxLength={850}
        placeholder="Isi deskripsi materi..."
        onChange={(html) =>
          updateChapterField(chapter.id, "description", html)
        }
      />

      <p className="text-[11px] leading-4 text-contrast-grayout">
        Tips: pilih teks lalu klik{" "}
        <code className="rounded bg-dark-alpha px-1 py-0.5 text-secondary-default">
          EN
        </code>{" "}
        agar tetap dibaca dalam Bahasa Inggris saat Play Voice.
      </p>
    </section>
  );
}
