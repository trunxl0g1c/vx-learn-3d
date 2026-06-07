export const createChapter = (chapterNumber = 1) => ({
  id: crypto.randomUUID(),
  title: `Bab ${chapterNumber}`,
  description: "",
  cameraPosition: [0, 2, 5],
  cameraTarget: [0, 0, 0],
  highlightObjects: [],
  callouts: [],
});

export const downloadMaterialJson = (material) => {
  const blob = new Blob([JSON.stringify(material, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `${material.title || "materi-3d"}.json`;
  a.click();

  URL.revokeObjectURL(url);
};