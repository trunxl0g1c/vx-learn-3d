const IGNORED_OBJECT_TREE_TYPES = new Set(["Bone"])

const GENERATED_PRIMITIVE_SUFFIX =
  /(?:[\s_.-]+(?:primitive|prim|part)?[\s_.-]*\d+)$/i

const normalizeLogicalObjectName = (name) => {
  return String(name || "")
    .trim()
    .replace(GENERATED_PRIMITIVE_SUFFIX, "")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
}

const getLogicalSourceName = (object) => {
  return object?.userData?.vxOriginalObjectName || object?.name || ""
}

const isRenderablePrimitive = (object) => {
  return Boolean(
    object &&
      (object.isMesh ||
        object.isSkinnedMesh ||
        object.isLine ||
        object.isLineSegments ||
        object.isPoints),
  )
}

export const isObjectTreeNode = (object) => {
  return Boolean(
    object &&
      !object.userData?.__vxInternal &&
      !object.userData?.__vxFlowHelper &&
      !IGNORED_OBJECT_TREE_TYPES.has(object.type),
  )
}

const getMeaningfulChildren = (object) => {
  return (object?.children || []).filter(isObjectTreeNode)
}

const getGltfAssociation = (parser, object) => {
  return parser?.associations?.get?.(object) || null
}

const isValidGltfIndex = (value) => {
  return Number.isInteger(value) && value >= 0
}

const annotateGltfAssociation = (object, parser) => {
  const association = getGltfAssociation(parser, object)

  if (!association || !object) return

  const nodeIndex = association.nodes
  const associatedMeshIndex = association.meshes
  const primitiveIndex = association.primitives
  const nodeDefinition = isValidGltfIndex(nodeIndex)
    ? parser?.json?.nodes?.[nodeIndex]
    : null
  const nodeMeshIndex = nodeDefinition?.mesh
  const meshIndex = isValidGltfIndex(associatedMeshIndex)
    ? associatedMeshIndex
    : nodeMeshIndex

  if (isValidGltfIndex(nodeIndex)) {
    object.userData.__vxGltfNodeIndex = nodeIndex

    const nodeName = nodeDefinition?.name
    if (nodeName) object.userData.__vxGltfNodeName = nodeName
  }

  if (isValidGltfIndex(meshIndex)) {
    object.userData.__vxGltfMeshIndex = meshIndex

    const meshName = parser?.json?.meshes?.[meshIndex]?.name
    const primitiveCount = parser?.json?.meshes?.[meshIndex]?.primitives?.length

    if (meshName) object.userData.__vxGltfMeshName = meshName
    if (Number.isInteger(primitiveCount)) {
      object.userData.__vxGltfPrimitiveCount = primitiveCount
    }
  }

  if (isValidGltfIndex(primitiveIndex)) {
    object.userData.__vxGltfPrimitiveIndex = primitiveIndex
  }
}

const getMetadataPrimitiveChildren = (object) => {
  if (!object || isRenderablePrimitive(object)) return []

  const meshIndex = object.userData?.__vxGltfMeshIndex
  const primitiveCount = object.userData?.__vxGltfPrimitiveCount

  if (!isValidGltfIndex(meshIndex) || primitiveCount < 2) return []

  const primitiveByIndex = new Map()

  getMeaningfulChildren(object).forEach((child) => {
    const childMeshIndex = child.userData?.__vxGltfMeshIndex
    const primitiveIndex = child.userData?.__vxGltfPrimitiveIndex

    if (
      !isRenderablePrimitive(child) ||
      getMeaningfulChildren(child).length > 0 ||
      childMeshIndex !== meshIndex ||
      !isValidGltfIndex(primitiveIndex) ||
      primitiveIndex >= primitiveCount
    ) {
      return
    }

    primitiveByIndex.set(primitiveIndex, child)
  })

  if (primitiveByIndex.size !== primitiveCount) return []

  return Array.from(primitiveByIndex.values())
}

const getFallbackPrimitiveChildren = (object) => {
  if (!object || isRenderablePrimitive(object)) return []

  const parentName = normalizeLogicalObjectName(getLogicalSourceName(object))

  if (!parentName) return []

  const children = getMeaningfulChildren(object)
  const candidates = children.filter((child) => {
    if (!isRenderablePrimitive(child)) return false
    if (getMeaningfulChildren(child).length > 0) return false

    return normalizeLogicalObjectName(getLogicalSourceName(child)) === parentName
  })

  // Keep the historical name-based fallback conservative. Nested authored
  // children are supported through glTF association metadata, while old scenes
  // without metadata are collapsed only when every visible child is clearly a
  // generated primitive of the same parent object.
  return candidates.length >= 2 && candidates.length === children.length
    ? candidates
    : []
}

const getGeneratedPrimitiveChildren = (object) => {
  const metadataChildren = getMetadataPrimitiveChildren(object)

  if (metadataChildren.length > 0) return metadataChildren

  return getFallbackPrimitiveChildren(object)
}

const isGeneratedPrimitiveChild = (object, parent = object?.parent) => {
  if (!object || !parent) return false

  if (
    object.userData?.__vxGeneratedGltfPrimitive === true &&
    object.userData?.__vxLogicalParentUuid === parent.uuid
  ) {
    return true
  }

  return getGeneratedPrimitiveChildren(parent).includes(object)
}

/**
 * Copies GLTFLoader parser associations into stable userData flags used by
 * Viqubed's logical object system. A glTF node can have a different name from
 * its referenced mesh, so logical grouping must use mesh/primitive indices
 * instead of relying only on generated Three.js object names.
 */
export const annotateGltfLogicalObjects = (scene, parser) => {
  if (!scene || !parser?.associations?.get) return scene

  scene.traverse?.((object) => {
    if (!object?.userData) return

    delete object.userData.__vxLogicalMultiPrimitive
    delete object.userData.__vxGeneratedGltfPrimitive
    delete object.userData.__vxLogicalParentUuid
    annotateGltfAssociation(object, parser)
  })

  scene.traverse?.((object) => {
    const primitiveChildren = getMetadataPrimitiveChildren(object)

    if (primitiveChildren.length < 2) return

    object.userData.__vxLogicalMultiPrimitive = true

    primitiveChildren.forEach((child) => {
      child.userData.__vxGeneratedGltfPrimitive = true
      child.userData.__vxLogicalParentUuid = object.uuid
    })
  })

  return scene
}

/**
 * GLTFLoader represents one glTF mesh that contains several primitives as a
 * THREE.Group with one direct renderable child per primitive/material. Those
 * generated children commonly use names such as Cylinder_1, Cylinder_2, and
 * Cylinder_3. Viqubed treats that container as one logical authoring object.
 *
 * The name check prevents ordinary authored groups (Engine -> Cover, Bolt,
 * Housing) from being collapsed just because all of their children are meshes.
 */
export const isLogicalMultiPrimitiveObject = (object) => {
  if (!object || isRenderablePrimitive(object)) return false

  if (object.userData?.__vxLogicalMultiPrimitive === true) {
    return true
  }

  return getGeneratedPrimitiveChildren(object).length >= 2
}

/**
 * Promotes a generated glTF primitive mesh to its logical parent object.
 * Objects that are not part of a generated multi-primitive group are returned
 * unchanged.
 */
export const resolveLogicalObject = (object) => {
  if (!object) return null

  let current = object

  while (current?.parent) {
    if (isGeneratedPrimitiveChild(current, current.parent)) {
      return current.parent
    }

    current = current.parent
  }

  return object
}

/**
 * Returns the direct user-facing children of an object using the exact same
 * logical grouping rules as Object List. Generated primitive meshes that only
 * exist because one glTF mesh uses several materials are collapsed into their
 * logical parent and never exposed as separate hierarchy entries.
 */
export const getLogicalObjectChildren = (object) => {
  const logicalObject = resolveLogicalObject(object)

  if (!logicalObject) return []

  const primitiveChildren = new Set(
    getGeneratedPrimitiveChildren(logicalObject),
  )
  const children = getMeaningfulChildren(logicalObject)
    .filter((child) => !primitiveChildren.has(child))
    .map(resolveLogicalObject)
    .filter((child) => child && child !== logicalObject)

  return Array.from(new Set(children))
}

/**
 * Returns the user-facing parent of a logical object. Generated glTF primitive
 * meshes are skipped so the result matches the hierarchy shown in Object List.
 * When a root is supplied, navigation never escapes above that model root.
 */
export const getLogicalObjectParent = (object, root = null) => {
  const logicalObject = resolveLogicalObject(object)
  const logicalRoot = root ? resolveObjectTreeRoot(root) : null

  if (!logicalObject || logicalObject === logicalRoot) return null

  let current = logicalObject.parent

  while (current) {
    const candidate = resolveLogicalObject(current)

    if (candidate && candidate !== logicalObject) {
      if (logicalRoot) {
        let cursor = candidate
        let belongsToRoot = false

        while (cursor) {
          if (cursor === logicalRoot) {
            belongsToRoot = true
            break
          }
          cursor = cursor.parent
        }

        if (!belongsToRoot) return null
      }

      if (isObjectTreeNode(candidate)) return candidate
    }

    current = current.parent
  }

  return null
}

/**
 * Builds a compact logical breadcrumb from the model root to the object. This
 * is used by authoring pickers that need parent/child navigation without
 * rendering the full Object List panel.
 */
export const getLogicalObjectPath = (object, root = null) => {
  const path = []
  const logicalRoot = root ? resolveObjectTreeRoot(root) : null
  let current = resolveLogicalObject(object)
  const visited = new Set()

  while (current && !visited.has(current)) {
    visited.add(current)
    path.unshift(current)

    if (current === logicalRoot) break
    current = getLogicalObjectParent(current, logicalRoot)
  }

  return path
}

export const resolveObjectTreeRoot = (scene) => {
  if (!scene) return null

  const meaningfulChildren = getMeaningfulChildren(scene)
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
  const logicalMultiPrimitive = isLogicalMultiPrimitiveObject(object)
  const primitiveChildren = getGeneratedPrimitiveChildren(object)
  const logicalChildren = getLogicalObjectChildren(object)

  return {
    name: object.name || object.type || "Unnamed Object",
    object,
    level,
    isLogicalObject: logicalMultiPrimitive,
    primitiveCount: logicalMultiPrimitive ? primitiveChildren.length : 0,
    // Primitive meshes remain in the Three.js scene and are still traversed by
    // selection, hide, solo, X-Ray, cut, material, and annotation logic. They
    // are omitted only from user-facing hierarchy navigation.
    children: logicalChildren.map((child) => buildObjectTree(child, level + 1)),
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
