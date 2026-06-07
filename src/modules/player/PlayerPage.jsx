import { useState } from "react";

export default function PlayerPage() {
  const [material, setMaterial] = useState(null);
  const [activeChapterId, setActiveChapterId] = useState(null);

  const activeChapter = material?.chapters?.find(
    (chapter) => chapter.id === activeChapterId
  );

  const loadJsonFile = async (file) => {
    if (!file) return;

    const text = await file.text();
    const json = JSON.parse(text);

    setMaterial(json);
    setActiveChapterId(json.chapters?.[0]?.id || null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">3D Material Player</h1>
          <p className="text-slate-400">
            Load file JSON dari editor untuk membaca materi.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <input
            type="file"
            accept="application/json"
            onChange={(e) => loadJsonFile(e.target.files?.[0])}
          />
        </div>

        {material && (
          <div className="grid grid-cols-12 gap-5">
            <aside className="col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h2 className="font-semibold mb-3">{material.title}</h2>

              <div className="space-y-2">
                {material.chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    onClick={() => setActiveChapterId(chapter.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg ${
                      activeChapterId === chapter.id
                        ? "bg-blue-600"
                        : "bg-slate-800 hover:bg-slate-700"
                    }`}
                  >
                    {chapter.title}
                  </button>
                ))}
              </div>
            </aside>

            <main className="col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5">
              {activeChapter ? (
                <div>
                  <p className="text-sm text-slate-400 mb-2">
                    Model: {material.modelUrl || "Belum ada model"}
                  </p>

                  <h2 className="text-xl font-bold mb-3">
                    {activeChapter.title}
                  </h2>

                  <p className="text-slate-300 leading-relaxed">
                    {activeChapter.description || "Belum ada deskripsi."}
                  </p>
                </div>
              ) : (
                <p className="text-slate-400">Pilih bab terlebih dahulu.</p>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}