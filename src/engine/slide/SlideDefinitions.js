import { createId } from "../../utils/createId";
import {
  getChapterCameraViews,
  normalizeChapterAnimationAssignments,
  normalizeChapterFlowAssignments,
  syncChapterCameraViews,
} from "../chapter";

export function createSlideDefinition(index = 0) {
  return {
    id: createId("slide"),
    title: `Slide ${index + 1}`,
    description: "",
    enabled: true,
    parameters: [],
    markers: [],
    media: [],
    animations: [],
    flows: [],
    visualState: null,
    cameraViewSaved: false,
    cameraView: null,
    cameraViews: [],
    cameraPosition: null,
    cameraTarget: null,
    cameraQuaternion: null,
    cameraUp: null,
    cameraZoom: null,
    cameraType: null,
    cameraFov: null,
    modelRotation: null,
    callouts: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeSlideDefinition(slide, index = 0) {
  const source = slide && typeof slide === "object" ? slide : {};
  const normalized = {
    ...createSlideDefinition(index),
    ...source,
    id: String(source.id || source.uuid || createId("slide")),
    title: String(source.title || `Slide ${index + 1}`),
    description: String(source.description || ""),
    enabled: source.enabled !== false,
    parameters: Array.isArray(source.parameters) ? source.parameters : [],
    markers: Array.isArray(source.markers) ? source.markers : [],
    media: Array.isArray(source.media) ? source.media : [],
    animations: normalizeChapterAnimationAssignments(source.animations),
    flows: normalizeChapterFlowAssignments(source.flows),
    callouts: Array.isArray(source.callouts) ? source.callouts : [],
  };

  const cameraViews = getChapterCameraViews(normalized);
  return cameraViews.length > 0
    ? syncChapterCameraViews(normalized, cameraViews)
    : normalized;
}

export function normalizeSlideDefinitions(slides) {
  return (Array.isArray(slides) ? slides : []).map((slide, index) =>
    normalizeSlideDefinition(slide, index),
  );
}

function updateSlide(material, slideId, updater) {
  if (!material || !slideId || typeof updater !== "function") return material;

  return {
    ...material,
    slides: (material.slides || []).map((slide) =>
      slide.id === slideId ? updater(slide) : slide,
    ),
  };
}

export function updateSlideFieldInMaterial(material, slideId, field, value) {
  return updateSlide(material, slideId, (slide) => ({
    ...slide,
    [field]: value,
    updatedAt: new Date().toISOString(),
  }));
}

export function addSlideAnimationAssignment(material, slideId) {
  return updateSlide(material, slideId, (slide) => ({
    ...slide,
    animations: [
      ...normalizeChapterAnimationAssignments(slide.animations),
      {
        assignmentId: createId("slide-animation"),
        name: "",
        source: "embedded",
        animationId: "",
        autoPlay: false,
        loop: false,
        speed: 1,
      },
    ],
    updatedAt: new Date().toISOString(),
  }));
}

export function updateSlideAnimationAssignment(
  material,
  slideId,
  assignmentId,
  patch,
) {
  return updateSlide(material, slideId, (slide) => ({
    ...slide,
    animations: normalizeChapterAnimationAssignments(slide.animations).map(
      (assignment) =>
        assignment.assignmentId === assignmentId
          ? { ...assignment, ...patch }
          : assignment,
    ),
    updatedAt: new Date().toISOString(),
  }));
}

export function removeSlideAnimationAssignment(
  material,
  slideId,
  assignmentId,
) {
  return updateSlide(material, slideId, (slide) => ({
    ...slide,
    animations: normalizeChapterAnimationAssignments(slide.animations).filter(
      (assignment) => assignment.assignmentId !== assignmentId,
    ),
    updatedAt: new Date().toISOString(),
  }));
}

export function addSlideFlowAssignment(material, slideId) {
  return updateSlide(material, slideId, (slide) => ({
    ...slide,
    flows: [
      ...normalizeChapterFlowAssignments(slide.flows),
      {
        assignmentId: createId("slide-flow"),
        flowId: "",
        name: "",
        autoPlay: false,
      },
    ],
    updatedAt: new Date().toISOString(),
  }));
}

export function updateSlideFlowAssignment(
  material,
  slideId,
  assignmentId,
  patch,
) {
  return updateSlide(material, slideId, (slide) => ({
    ...slide,
    flows: normalizeChapterFlowAssignments(slide.flows).map((assignment) =>
      assignment.assignmentId === assignmentId
        ? { ...assignment, ...patch }
        : assignment,
    ),
    updatedAt: new Date().toISOString(),
  }));
}

export function removeSlideFlowAssignment(material, slideId, assignmentId) {
  return updateSlide(material, slideId, (slide) => ({
    ...slide,
    flows: normalizeChapterFlowAssignments(slide.flows).filter(
      (assignment) => assignment.assignmentId !== assignmentId,
    ),
    updatedAt: new Date().toISOString(),
  }));
}

export function moveSlideInMaterial(material, slideId, direction) {
  if (!material || !slideId) return material;
  const slides = Array.isArray(material.slides) ? material.slides : [];
  const currentIndex = slides.findIndex((slide) => slide.id === slideId);
  const offset = direction === "up" || direction === -1 ? -1 : 1;
  const targetIndex = currentIndex + offset;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= slides.length) {
    return material;
  }

  const nextSlides = [...slides];
  const [moved] = nextSlides.splice(currentIndex, 1);
  nextSlides.splice(targetIndex, 0, moved);
  return { ...material, slides: nextSlides };
}
