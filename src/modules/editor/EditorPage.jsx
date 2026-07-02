import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getProject } from "../project-hub/storage/projectStorage";
import { createDefaultMaterial } from "../material/defaultMaterial";
import { createChapter, downloadMaterialJson } from "../material/materialUtils";

export default function EditorPage() {
  const { projectId } = useParams();
  const project = getProject(projectId);

  const initialMaterial = useMemo(() => {
    const defaultMaterial = createDefaultMaterial();

    return {
      ...defaultMaterial,
      title: project?.name || defaultMaterial.title,
      modelUrl: project?.fileName || defaultMaterial.modelUrl,
      projectId: project?.id || null,
    };
  }, [project]);

  const [material, setMaterial] = useState(initialMaterial);

  if (!project) {
    return (
      <div style={{ color: "white", padding: 40 }}>
        <h1>Project tidak ditemukan</h1>
        <p>Kembali ke halaman VXplore lalu pilih project lagi.</p>
      </div>
    );
  }

  const updateTitle = (value) => {
    setMaterial((prev) => ({
      ...prev,
      title: value,
    }));
  };

  const updateModelUrl = (value) => {
    setMaterial((prev) => ({
      ...prev,
      modelUrl: value,
    }));
  };

  const addChapter = () => {
    setMaterial((prev) => ({
      ...prev,
      chapters: [...prev.chapters, createChapter(prev.chapters.length + 1)],
    }));
  };

  const updateChapter = (chapterId, field, value) => {
    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) =>
        chapter.id === chapterId
          ? {
              ...chapter,
              [field]: value,
            }
          : chapter
      ),
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">3D Material Editor</h1>
          <p className="text-slate-400">
            Project: {project.name} — File: {project.fileName}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-sm mb-2">Judul Materi</label>
            <input
              value={material.title}
              onChange={(e) => updateTitle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
              placeholder="Contoh: Materi Pesawat T-50"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Model URL / Path GLB</label>
            <input
              value={material.modelUrl}
              onChange={(e) => updateModelUrl(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
              placeholder="/models/t50.glb"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={addChapter}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
            >
              Tambah Bab
            </button>

            <button
              onClick={() => downloadMaterialJson(material)}
              className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg"
            >
              Save JSON
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {material.chapters.map((chapter, index) => (
            <div
              key={chapter.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3"
            >
              <h2 className="font-semibold">Bab {index + 1}</h2>

              <input
                value={chapter.title}
                onChange={(e) =>
                  updateChapter(chapter.id, "title", e.target.value)
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                placeholder="Judul Bab"
              />

              <textarea
                value={chapter.description}
                onChange={(e) =>
                  updateChapter(chapter.id, "description", e.target.value)
                }
                className="w-full min-h-28 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                placeholder="Deskripsi materi bab ini..."
              />
            </div>
          ))}
        </div>

        <pre className="bg-black text-green-400 text-xs p-4 rounded-xl overflow-auto">
          {JSON.stringify(material, null, 2)}
        </pre>
      </div>
    </div>
  );
}