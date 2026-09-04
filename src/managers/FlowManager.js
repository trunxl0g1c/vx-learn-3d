import {
  createFlowDefinition,
  createFlowPoint,
  createFlowPointFromControls,
  createFlowPointFromObject,
  normalizeFlowDefinitions,
} from "../engine/flow";

export function createFlowManagerAdapter(flowEngine = null) {
  return {
    normalizeDefinitions(flows) {
      return (
        flowEngine?.normalizeDefinitions?.(flows) ||
        normalizeFlowDefinitions(flows)
      );
    },

    createDefinition(flowNumber) {
      return (
        flowEngine?.createDefinition?.(flowNumber) ||
        createFlowDefinition(flowNumber)
      );
    },

    createPoint(position, index) {
      return (
        flowEngine?.createPoint?.(position, index) ||
        createFlowPoint(position, index)
      );
    },

    createPointFromObject(object, coordinateRoot) {
      return (
        flowEngine?.createPointFromObject?.(object, coordinateRoot) ||
        createFlowPointFromObject(object, coordinateRoot)
      );
    },

    createPointFromControls(controls, coordinateRoot) {
      return (
        flowEngine?.createPointFromControls?.(controls, coordinateRoot) ||
        createFlowPointFromControls(controls, coordinateRoot)
      );
    },
  };
}

export default createFlowManagerAdapter;
