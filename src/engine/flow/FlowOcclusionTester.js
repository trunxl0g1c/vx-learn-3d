import * as THREE from "three";

const DEFAULT_REFRESH_INTERVAL = 1.5;
const MIN_HIT_EPSILON = 1e-3;
const MAX_NARROW_PHASE_CANDIDATES = 48;
const OCCLUDER_TREE_LEAF_SIZE = 8;


function unionEntryBoxes(entries) {
  const box = new THREE.Box3();
  box.makeEmpty();
  entries.forEach((entry) => box.union(entry.box));
  return box;
}

function buildOccluderTree(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return null;

  const box = unionEntryBoxes(entries);
  if (entries.length <= OCCLUDER_TREE_LEAF_SIZE) {
    return { box, entries, left: null, right: null };
  }

  const size = box.getSize(new THREE.Vector3());
  const axis = size.x >= size.y && size.x >= size.z
    ? "x"
    : size.y >= size.z
      ? "y"
      : "z";

  entries.sort((a, b) => {
    const aCenter = a.box.min[axis] + a.box.max[axis];
    const bCenter = b.box.min[axis] + b.box.max[axis];
    return aCenter - bCenter;
  });

  const midpoint = Math.floor(entries.length / 2);
  return {
    box,
    entries: null,
    left: buildOccluderTree(entries.slice(0, midpoint)),
    right: buildOccluderTree(entries.slice(midpoint)),
  };
}

function collectTreeCandidates(
  node,
  ray,
  targetDistance,
  output,
  intersectionPoint,
) {
  if (!node || output.length >= MAX_NARROW_PHASE_CANDIDATES) return;

  const hitPoint = ray.intersectBox(node.box, intersectionPoint);
  if (!hitPoint) return;
  if (hitPoint.distanceTo(ray.origin) > targetDistance) return;

  if (node.entries) {
    for (const entry of node.entries) {
      if (output.length >= MAX_NARROW_PHASE_CANDIDATES) break;
      if (ray.intersectsBox(entry.box)) output.push(entry.object);
    }
    return;
  }

  collectTreeCandidates(
    node.left,
    ray,
    targetDistance,
    output,
    intersectionPoint,
  );
  collectTreeCandidates(
    node.right,
    ray,
    targetDistance,
    output,
    intersectionPoint,
  );
}

// Occluder traversal and world bounds are shared by every active Flow in the
// same scene. Without this cache, each Flow traverses the whole GLB and builds
// the same bounds independently, which becomes very expensive on large models.
const sceneOccluderCache = new WeakMap();

function hasInternalAncestor(object, stopObject = null) {
  let current = object;

  while (current && current !== stopObject) {
    if (
      current.userData?.__vxInternal ||
      current.userData?.__vxFlowHelper ||
      current.userData?.__vxIgnoreFlowOcclusion
    ) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function hasRenderableMaterial(object) {
  const materials = Array.isArray(object?.material)
    ? object.material
    : [object?.material];

  return materials.some((material) => {
    if (!material || material.visible === false) return false;
    if (material.transparent && Number(material.opacity) <= 0.01) return false;
    return true;
  });
}

function getMeshWorldBox(mesh) {
  const geometry = mesh?.geometry;
  if (!geometry) return null;

  if (!geometry.boundingBox) geometry.computeBoundingBox?.();
  if (!geometry.boundingBox || geometry.boundingBox.isEmpty()) return null;

  mesh.updateWorldMatrix?.(true, false);
  return geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
}

function buildSceneOccluders(scene) {
  const entries = [];

  scene?.traverse?.((object) => {
    if (!object?.isMesh || object.visible === false) return;
    if (hasInternalAncestor(object, scene)) return;
    if (!hasRenderableMaterial(object)) return;

    const box = getMeshWorldBox(object);
    if (!box) return;

    entries.push({ object, box });
  });

  return entries;
}

function getSharedOccluders(scene, elapsedTime) {
  if (!scene) return { entries: [], tree: null };

  const cached = sceneOccluderCache.get(scene);
  if (
    cached &&
    elapsedTime - cached.refreshedAt < DEFAULT_REFRESH_INTERVAL
  ) {
    return cached;
  }

  const entries = buildSceneOccluders(scene);
  const tree = buildOccluderTree(entries.slice());
  const cacheEntry = {
    entries,
    tree,
    refreshedAt: elapsedTime,
  };
  sceneOccluderCache.set(scene, cacheEntry);
  return cacheEntry;
}

export function invalidateFlowOcclusionCache(scene) {
  if (scene) sceneOccluderCache.delete(scene);
}

export function createFlowOcclusionTester(flowGroup) {
  const raycaster = new THREE.Raycaster();
  // Used automatically when three-mesh-bvh augments Mesh.raycast. Harmless
  // with standard Three.js and much faster when BVH is available.
  raycaster.firstHitOnly = true;

  const worldPoint = new THREE.Vector3();
  const projectedPoint = new THREE.Vector3();
  const cameraToPoint = new THREE.Vector3();
  const treeIntersectionPoint = new THREE.Vector3();
  const candidates = [];

  let camera = null;
  let scene = null;
  let occluderCache = { entries: [], tree: null };

  return {
    beginFrame(nextCamera, nextScene, elapsedTime = 0) {
      camera = nextCamera || null;
      scene = nextScene || null;
      flowGroup?.updateWorldMatrix?.(true, false);
      camera?.updateMatrixWorld?.();
      occluderCache = getSharedOccluders(scene, elapsedTime);
    },

    isOccluded(localPosition) {
      if (!camera || !scene || !localPosition?.isVector3) return false;
      if (occluderCache.entries.length === 0 || !occluderCache.tree) {
        return false;
      }

      worldPoint.copy(localPosition);
      flowGroup.localToWorld(worldPoint);

      projectedPoint.copy(worldPoint).project(camera);
      if (
        !Number.isFinite(projectedPoint.x) ||
        !Number.isFinite(projectedPoint.y) ||
        projectedPoint.z < -1 ||
        projectedPoint.z > 1
      ) {
        return false;
      }

      raycaster.setFromCamera(
        { x: projectedPoint.x, y: projectedPoint.y },
        camera,
      );

      cameraToPoint.copy(worldPoint).sub(raycaster.ray.origin);
      const targetDistance = cameraToPoint.dot(raycaster.ray.direction);
      if (!Number.isFinite(targetDistance) || targetDistance <= 0) return false;

      const hitEpsilon = Math.max(
        MIN_HIT_EPSILON,
        targetDistance * 0.0015,
      );
      raycaster.near = 0;
      raycaster.far = Math.max(0, targetDistance - hitEpsilon);

      // Broad phase: query a shared AABB tree instead of scanning every mesh
      // for every Flow sample. Only a small candidate set reaches expensive
      // triangle raycasting.
      candidates.length = 0;
      collectTreeCandidates(
        occluderCache.tree,
        raycaster.ray,
        targetDistance,
        candidates,
        treeIntersectionPoint,
      );

      if (candidates.length === 0) return false;

      const intersections = raycaster.intersectObjects(candidates, false);

      return intersections.some((intersection) => {
        const hitObject = intersection?.object;
        if (!hitObject || hasInternalAncestor(hitObject, scene)) return false;
        return intersection.distance < targetDistance - hitEpsilon;
      });
    },
  };
}
