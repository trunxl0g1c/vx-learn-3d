import { createId } from "../../utils/createId";
import { createProceduralObjectReference } from "../procedural";

export const QUIZ_QUESTION_TYPES = Object.freeze([
  { id: "multiple-choice", label: "Multiple Choice", group: "lms" },
  { id: "true-false", label: "True / False", group: "lms" },
  { id: "text", label: "Text Answer", group: "lms" },
  { id: "numeric", label: "Numeric Answer", group: "lms" },
  { id: "select-object", label: "Select 3D Object", group: "3d" },
  { id: "multi-object", label: "Select Multiple 3D Objects", group: "3d" },
  { id: "procedure-challenge", label: "Procedure Challenge", group: "3d" },
  { id: "animation-question", label: "Observe Animation + Choice", group: "3d" },
]);

const DEFAULT_QUIZ_SETTINGS = Object.freeze({
  passingScore: 80,
  randomizeQuestions: false,
  randomizeOptions: false,
  showScore: true,
  showCorrectAnswer: true,
  allowRetry: true,
  maxAttempts: 2,
  timeLimit: 0,
});

const DEFAULT_QUESTION_SETTINGS = Object.freeze({
  required: true,
  maxAttempts: 1,
  timeLimit: 0,
});

const normalizeText = (value) => String(value ?? "").trim();

const normalizeFinite = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function normalizeQuizObjectReference(reference) {
  if (!reference || typeof reference !== "object") return null;

  return {
    uuid: reference.uuid || null,
    name: reference.name || null,
    path: Array.isArray(reference.path) ? [...reference.path] : null,
  };
}

export function createQuizObjectReference(object, root = null) {
  return createProceduralObjectReference(object, root);
}

export function areQuizObjectReferencesEqual(first, second) {
  const a = normalizeQuizObjectReference(first);
  const b = normalizeQuizObjectReference(second);

  if (!a || !b) return false;

  if (Array.isArray(a.path) && Array.isArray(b.path)) {
    if (
      a.path.length === b.path.length &&
      a.path.every((entry, index) => entry === b.path[index])
    ) {
      return true;
    }
  }

  if (a.uuid && b.uuid && a.uuid === b.uuid) return true;
  return Boolean(a.name && b.name && a.name === b.name);
}

export function createQuizOption(index = 0) {
  return {
    id: createId("quiz-option"),
    text: `Option ${index + 1}`,
    isCorrect: index === 0,
  };
}

function normalizeOptions(options, minimum = 2) {
  const source = Array.isArray(options) ? options : [];
  const normalized = source.map((option, index) => ({
    id: option?.id || createId("quiz-option"),
    text: normalizeText(option?.text || `Option ${index + 1}`),
    isCorrect: option?.isCorrect === true,
  }));

  while (normalized.length < minimum) {
    normalized.push(createQuizOption(normalized.length));
  }

  if (!normalized.some((option) => option.isCorrect) && normalized.length > 0) {
    normalized[0] = { ...normalized[0], isCorrect: true };
  }

  return normalized;
}

export function createQuizQuestion(index = 0, type = "multiple-choice") {
  const resolvedType = QUIZ_QUESTION_TYPES.some((item) => item.id === type)
    ? type
    : "multiple-choice";

  return normalizeQuizQuestion({
    id: createId("quiz-question"),
    type: resolvedType,
    title: `Question ${index + 1}`,
    prompt: "",
    points: 10,
    options: [createQuizOption(0), createQuizOption(1)],
    correctAnswer: {
      text: "",
      numeric: 0,
      tolerance: 0,
      boolean: true,
      objects: [],
    },
    feedback: {
      correct: "Correct.",
      incorrect: "Not quite. Review the material and try again.",
    },
    settings: DEFAULT_QUESTION_SETTINGS,
    cameraView: null,
    visualState: null,
    procedureId: null,
    animationId: null,
    animationSource: "authored",
  }, index);
}

export function normalizeQuizQuestion(question, index = 0) {
  const source = question && typeof question === "object" ? question : {};
  const type = QUIZ_QUESTION_TYPES.some((item) => item.id === source.type)
    ? source.type
    : "multiple-choice";
  const sourceAnswer =
    source.correctAnswer && typeof source.correctAnswer === "object"
      ? source.correctAnswer
      : {};
  const sourceFeedback =
    source.feedback && typeof source.feedback === "object"
      ? source.feedback
      : {};
  const sourceSettings =
    source.settings && typeof source.settings === "object"
      ? source.settings
      : {};

  return {
    ...source,
    id: source.id || createId("quiz-question"),
    type,
    title: normalizeText(source.title || `Question ${index + 1}`),
    prompt: String(source.prompt || source.instruction || ""),
    points: Math.max(0, normalizeFinite(source.points, 10)),
    options: normalizeOptions(source.options, type === "true-false" ? 2 : 2),
    correctAnswer: {
      ...sourceAnswer,
      text: String(sourceAnswer.text ?? ""),
      numeric: normalizeFinite(sourceAnswer.numeric, 0),
      tolerance: Math.max(0, normalizeFinite(sourceAnswer.tolerance, 0)),
      boolean: sourceAnswer.boolean !== false,
      objects: (Array.isArray(sourceAnswer.objects)
        ? sourceAnswer.objects
        : []
      )
        .map(normalizeQuizObjectReference)
        .filter(Boolean),
    },
    feedback: {
      correct: String(sourceFeedback.correct || "Correct."),
      incorrect: String(
        sourceFeedback.incorrect ||
          "Not quite. Review the material and try again.",
      ),
    },
    settings: {
      ...DEFAULT_QUESTION_SETTINGS,
      ...sourceSettings,
      required: sourceSettings.required !== false,
      maxAttempts: Math.max(
        1,
        Math.floor(normalizeFinite(sourceSettings.maxAttempts, 1)),
      ),
      timeLimit: Math.max(0, normalizeFinite(sourceSettings.timeLimit, 0)),
    },
    cameraView:
      source.cameraView && typeof source.cameraView === "object"
        ? source.cameraView
        : null,
    visualState:
      source.visualState && typeof source.visualState === "object"
        ? source.visualState
        : null,
    procedureId: source.procedureId || null,
    animationId: source.animationId || null,
    animationSource:
      source.animationSource === "embedded" ? "embedded" : "authored",
  };
}

export function createQuizDefinition(index = 0) {
  const now = new Date().toISOString();

  return normalizeQuizDefinition({
    id: createId("quiz"),
    name: `Quiz ${index + 1}`,
    description: "",
    enabled: true,
    settings: DEFAULT_QUIZ_SETTINGS,
    questions: [createQuizQuestion(0)],
    createdAt: now,
    updatedAt: now,
  });
}

export function normalizeQuizDefinition(quiz) {
  const source = quiz && typeof quiz === "object" ? quiz : {};
  const sourceSettings =
    source.settings && typeof source.settings === "object"
      ? source.settings
      : {};

  return {
    ...source,
    id: source.id || createId("quiz"),
    name: normalizeText(source.name || "Untitled Quiz"),
    description: String(source.description || ""),
    enabled: source.enabled !== false,
    settings: {
      ...DEFAULT_QUIZ_SETTINGS,
      ...sourceSettings,
      passingScore: clamp(normalizeFinite(sourceSettings.passingScore, 80), 0, 100),
      randomizeQuestions: sourceSettings.randomizeQuestions === true,
      randomizeOptions: sourceSettings.randomizeOptions === true,
      showScore: sourceSettings.showScore !== false,
      showCorrectAnswer: sourceSettings.showCorrectAnswer !== false,
      allowRetry: sourceSettings.allowRetry !== false,
      maxAttempts: Math.max(
        1,
        Math.floor(normalizeFinite(sourceSettings.maxAttempts, 2)),
      ),
      timeLimit: Math.max(0, normalizeFinite(sourceSettings.timeLimit, 0)),
    },
    questions: (Array.isArray(source.questions) ? source.questions : []).map(
      normalizeQuizQuestion,
    ),
    createdAt: source.createdAt || new Date().toISOString(),
    updatedAt: source.updatedAt || new Date().toISOString(),
  };
}

export function normalizeQuizDefinitions(quizzes) {
  return (Array.isArray(quizzes) ? quizzes : []).map(normalizeQuizDefinition);
}

function getCorrectOptionIds(question) {
  return (question?.options || [])
    .filter((option) => option?.isCorrect)
    .map((option) => option.id);
}

function arraysHaveSameValues(first, second) {
  const a = [...first].sort();
  const b = [...second].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function evaluateQuizAnswer(question, answer) {
  const normalized = normalizeQuizQuestion(question);
  const value = answer?.value ?? answer;

  switch (normalized.type) {
    case "multiple-choice":
    case "animation-question": {
      const selected = Array.isArray(value) ? value : [value].filter(Boolean);
      return arraysHaveSameValues(selected, getCorrectOptionIds(normalized));
    }
    case "true-false":
      return Boolean(value) === Boolean(normalized.correctAnswer.boolean);
    case "text":
      return (
        normalizeText(value).toLocaleLowerCase() ===
        normalizeText(normalized.correctAnswer.text).toLocaleLowerCase()
      );
    case "numeric":
      return (
        Math.abs(
          normalizeFinite(value, Number.NaN) -
            normalizeFinite(normalized.correctAnswer.numeric, 0),
        ) <= normalized.correctAnswer.tolerance
      );
    case "select-object": {
      const selected = Array.isArray(value) ? value[0] : value;
      return normalized.correctAnswer.objects.some((reference) =>
        areQuizObjectReferencesEqual(reference, selected),
      );
    }
    case "multi-object": {
      const selected = (Array.isArray(value) ? value : [])
        .map(normalizeQuizObjectReference)
        .filter(Boolean);
      const correct = normalized.correctAnswer.objects;

      return (
        selected.length === correct.length &&
        correct.every((reference) =>
          selected.some((entry) =>
            areQuizObjectReferencesEqual(reference, entry),
          ),
        )
      );
    }
    case "procedure-challenge":
      return value === true || value === "completed";
    default:
      return false;
  }
}

export function calculateQuizResult(quiz, answers = {}) {
  const normalized = normalizeQuizDefinition(quiz);
  const totalPoints = normalized.questions.reduce(
    (sum, question) => sum + Math.max(0, question.points),
    0,
  );
  let earnedPoints = 0;
  let correctCount = 0;

  const questionResults = normalized.questions.map((question) => {
    const answer = answers?.[question.id];
    const correct = evaluateQuizAnswer(question, answer);

    if (correct) {
      earnedPoints += question.points;
      correctCount += 1;
    }

    return {
      questionId: question.id,
      correct,
      points: correct ? question.points : 0,
      maxPoints: question.points,
      answer,
    };
  });

  const score =
    totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 10000) / 100 : 0;

  return {
    score,
    earnedPoints,
    totalPoints,
    correctCount,
    questionCount: normalized.questions.length,
    passed: score >= normalized.settings.passingScore,
    passingScore: normalized.settings.passingScore,
    questionResults,
  };
}

export function createQuizEngine() {
  return {
    normalizeDefinition: normalizeQuizDefinition,
    normalizeDefinitions: normalizeQuizDefinitions,
    createDefinition: createQuizDefinition,
    createQuestion: createQuizQuestion,
    createOption: createQuizOption,
    createObjectReference: createQuizObjectReference,
    referencesEqual: areQuizObjectReferencesEqual,
    evaluateAnswer: evaluateQuizAnswer,
    calculateResult: calculateQuizResult,
    getState() {
      return { ready: true };
    },
    reset() {},
    dispose() {},
  };
}

export default createQuizEngine;
