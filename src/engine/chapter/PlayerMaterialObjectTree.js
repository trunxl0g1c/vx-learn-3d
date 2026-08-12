import { findExactChapterForObject } from "../selection";

function normalizeChapterTitle(chapter, fallbackName = "") {
  return String(
    chapter?.title || chapter?.aliasName || chapter?.objectName || fallbackName || "Material",
  ).trim();
}

function walkMaterialNodes(nodes, chapters, sceneRoot, level = 0) {
  const result = [];

  for (const node of Array.isArray(nodes) ? nodes : []) {
    const chapter = findExactChapterForObject(node?.object, chapters, sceneRoot);
    const nextLevel = chapter ? level + 1 : level;
    const materialChildren = walkMaterialNodes(
      node?.children || [],
      chapters,
      sceneRoot,
      nextLevel,
    );

    if (chapter) {
      result.push({
        ...node,
        level,
        chapterId: chapter.id,
        chapterTitle: normalizeChapterTitle(chapter, node?.name),
        chapter,
        children: materialChildren,
      });
      continue;
    }

    // Player navigation intentionally omits scene/group nodes that do not have
    // authored material. Their material-bearing descendants are promoted to
    // the closest visible material level instead of showing empty containers.
    result.push(...materialChildren);
  }

  return result;
}

/**
 * Build the Player-only material navigation tree.
 *
 * Editor keeps the complete GLB hierarchy. Player deliberately shows only
 * logical objects that own authored Chapter/Material content. The returned
 * nodes retain their Three.js object reference for labels/navigation while
 * exposing the matching chapter id used to open the content directly.
 */
export function buildPlayerMaterialObjectTree(
  objectList = [],
  chapters = [],
  sceneRoot = null,
) {
  if (!Array.isArray(chapters) || chapters.length === 0) return [];

  return walkMaterialNodes(objectList, chapters, sceneRoot, 0);
}

export function flattenPlayerMaterialObjectTree(nodes = []) {
  const result = [];

  const walk = (items) => {
    for (const item of Array.isArray(items) ? items : []) {
      result.push(item);
      walk(item.children || []);
    }
  };

  walk(nodes);
  return result;
}
