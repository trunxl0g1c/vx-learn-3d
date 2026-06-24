export const buildObjectTree = (object, level = 0) => {
  return {
    name: object.name || object.type || "Unnamed Object",
    object,
    level,
    children: object.children
      .filter((child) => child.type !== "Bone")
      .map((child) => buildObjectTree(child, level + 1)),
  }
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
