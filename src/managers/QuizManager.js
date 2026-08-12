import {
  createQuizDefinition,
  createQuizObjectReference,
  createQuizOption,
  createQuizQuestion,
  normalizeQuizDefinitions,
} from "../engine/quiz";

export function createQuizManagerAdapter(quizEngine = null) {
  return {
    normalizeDefinitions(quizzes) {
      return (
        quizEngine?.normalizeDefinitions?.(quizzes) ||
        normalizeQuizDefinitions(quizzes)
      );
    },

    createDefinition(index) {
      return (
        quizEngine?.createDefinition?.(index) ||
        createQuizDefinition(index)
      );
    },

    createQuestion(index, type) {
      return (
        quizEngine?.createQuestion?.(index, type) ||
        createQuizQuestion(index, type)
      );
    },

    createOption(index) {
      return quizEngine?.createOption?.(index) || createQuizOption(index);
    },

    createObjectReference(object, root) {
      return (
        quizEngine?.createObjectReference?.(object, root) ||
        createQuizObjectReference(object, root)
      );
    },
  };
}

export default createQuizManagerAdapter;
