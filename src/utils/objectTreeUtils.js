const IGNORED_OBJECT_TREE_TYPES = new Set(["Bone"])

export const isObjectTreeNode = (object) => {
  return Boolean(
    object &&
    !object.userData?.__vxInternal &&
    !IGNORED_OBJECT_TREE_TYPES.has(object.type),
  )
}

export const resolveObjectTreeRoot = (scene) => {
  if (!scene) return null

  const meaningfulChildren = (scene.children || []).filter(isObjectTreeNode)
  const sceneName = String(scene.name || "").trim()

  // Editor renders the GLTF inside an anonymous R3F wrapper group, while the
  // Player receives the GLTF scene directly. Unwrap only that anonymous
  // single-child container so both surfaces build the exact same hierarchy.
  if (!sceneName && !scene.isMesh && meaningfulChildren.length === 1) {
    return meaningfulChildren[0]
  }

  return scene
}

export const buildObjectTree = (object, level = 0) => {
  return {
    name: object.name || object.type || "Unnamed Object",
    object,
    level,
    children: (object.children || [])
      .filter(isObjectTreeNode)
      .map((child) => buildObjectTree(child, level + 1)),
  }
}

export const buildObjectTreeList = (scene) => {
  const root = resolveObjectTreeRoot(scene)

  return root ? [buildObjectTree(root, 0)] : []
}

export const flattenObjectTree = (items) => {
  const result = []

  const walk = (nodes) => {
    nodes.forEach((node) => {
      result.push({
        name: node.name,
        object: node.object,
      })

      if (node.children?.length) {
        walk(node.children)
      }
    })
  }

  walk(items)

  return result
}

export const isChildOf = (child, parent) => {
  let current = child

  while (current) {
    if (current === parent) return true
    current = current.parent
  }

  return false
}

export const getMaxTreeDepth = (nodes) => {
  let maxDepth = 0

  const walk = (items, depth) => {
    maxDepth = Math.max(maxDepth, depth)

    items.forEach((item) => {
      if (item.children?.length) {
        walk(item.children, depth + 1)
      }
    })
  }

  walk(nodes, 1)

  return maxDepth
}
