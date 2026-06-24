export const formatObjectName = (name) => {
  return (name || "Unnamed Object").replaceAll("_", " ").trim()
}

export const getNodeKey = (item) => {
  return item.object?.uuid || item.name
}

export const setObjectVisibility = (object, visible) => {
  if (!object) return

  object.visible = visible

  object.traverse?.((child) => {
    child.visible = visible
  })
}

export const isObjectVisible = (object) => {
  if (!object) return true

  let current = object

  while (current) {
    if (current.visible === false) return false
    current = current.parent
  }

  return true
}

export const filterTree = (nodes, search, treeDepth) => {
  const keyword = (search || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .trim()

  const walk = (items) => {
    return items
      .map((node) => {
        const isWithinDepth = node.level < treeDepth

        const children = isWithinDepth
          ? walk(node.children || [])
          : []

        if (!keyword) {
          return isWithinDepth
            ? {
                ...node,
                children,
              }
            : null
        }

        const selfMatch =
          isWithinDepth &&
          node.name
            ?.toLowerCase()
            .replaceAll("_", " ")
            .includes(keyword)

        if (selfMatch || children.length > 0) {
          return {
            ...node,
            children,
          }
        }

        return null
      })
      .filter(Boolean)
  }

  return walk(nodes)
}

export const collectOpenMap = (nodes, value = true) => {
  const result = {}

  const walk = (items) => {
    items.forEach((item) => {
      result[getNodeKey(item)] = value

      if (item.children?.length) {
        walk(item.children)
      }
    })
  }

  walk(nodes)

  return result
}
