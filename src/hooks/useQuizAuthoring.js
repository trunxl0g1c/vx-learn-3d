import { useCallback, useEffect, useMemo, useState } from "react";
import { createQuizManagerAdapter } from "../managers/QuizManager";
import { isLazyMaterialRecord } from "../engine/project/LazyMaterialRecords";

function mergeQuestion(question, patch) {
  const resolvedPatch =
    typeof patch === "function" ? patch(question) : patch || {};

  return {
    ...question,
    ...resolvedPatch,
    correctAnswer: {
      ...question.correctAnswer,
      ...(resolvedPatch.correctAnswer || {}),
    },
    feedback: {
      ...question.feedback,
      ...(resolvedPatch.feedback || {}),
    },
    settings: {
      ...question.settings,
      ...(resolvedPatch.settings || {}),
    },
  };
}

export function useQuizAuthoring({
  material,
  setMaterial,
  modelScene,
  selectedObject,
  quizEngine = null,
  hydrateQuizRecord = null,
}) {
  const manager = useMemo(
    () => createQuizManagerAdapter(quizEngine),
    [quizEngine],
  );
  const quizzes = useMemo(
    () => manager.normalizeDefinitions(material?.quizzes),
    [manager, material?.quizzes],
  );
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [isAuthoringActive, setIsAuthoringActive] = useState(false);

  useEffect(() => {
    if (quizzes.length === 0) {
      setActiveQuizId(null);
      setActiveQuestionId(null);
      return;
    }

    if (!quizzes.some((quiz) => quiz.id === activeQuizId)) {
      setActiveQuizId(quizzes[0].id);
    }
  }, [activeQuizId, quizzes]);

  const activeQuiz = useMemo(
    () => quizzes.find((quiz) => quiz.id === activeQuizId) || null,
    [activeQuizId, quizzes],
  );

  useEffect(() => {
    const questions = activeQuiz?.questions || [];

    if (questions.length === 0) {
      setActiveQuestionId(null);
      return;
    }

    if (!questions.some((question) => question.id === activeQuestionId)) {
      setActiveQuestionId(questions[0].id);
    }
  }, [activeQuestionId, activeQuiz]);

  const activeQuestion = useMemo(
    () =>
      activeQuiz?.questions?.find(
        (question) => question.id === activeQuestionId,
      ) || null,
    [activeQuestionId, activeQuiz],
  );

  const isLoadingActiveQuiz = isLazyMaterialRecord(activeQuiz, "quizzes");

  useEffect(() => {
    if (
      !isAuthoringActive ||
      !activeQuizId ||
      !hydrateQuizRecord ||
      !isLazyMaterialRecord(activeQuiz, "quizzes")
    ) {
      return;
    }

    hydrateQuizRecord(activeQuizId).catch((error) => {
      console.error("Failed to load Quiz detail:", error);
    });
  }, [
    activeQuiz,
    activeQuizId,
    hydrateQuizRecord,
    isAuthoringActive,
  ]);

  const commitQuizzes = useCallback(
    (updater) => {
      setMaterial((previousMaterial) => {
        const current = manager.normalizeDefinitions(previousMaterial?.quizzes);
        const next = typeof updater === "function" ? updater(current) : updater;

        return {
          ...previousMaterial,
          quizzes: manager.normalizeDefinitions(next),
        };
      });
    },
    [manager, setMaterial],
  );

  const createQuiz = useCallback(() => {
    const next = manager.createDefinition(quizzes.length);
    commitQuizzes((current) => [...current, next]);
    setActiveQuizId(next.id);
    setActiveQuestionId(next.questions?.[0]?.id || null);
    return next;
  }, [commitQuizzes, manager, quizzes.length]);

  const selectQuiz = useCallback((quizId) => {
    setActiveQuizId(quizId || null);
    setActiveQuestionId(null);
    if (quizId) setIsAuthoringActive(true);
  }, []);

  const updateQuiz = useCallback(
    (quizId, patch) => {
      if (!quizId) return;

      commitQuizzes((current) =>
        current.map((quiz) => {
          if (quiz.id !== quizId) return quiz;

          const resolvedPatch =
            typeof patch === "function" ? patch(quiz) : patch || {};

          return {
            ...quiz,
            ...resolvedPatch,
            settings: {
              ...quiz.settings,
              ...(resolvedPatch.settings || {}),
            },
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [commitQuizzes],
  );

  const deleteQuiz = useCallback(
    (quizId) => {
      if (!quizId) return;

      commitQuizzes((current) => current.filter((quiz) => quiz.id !== quizId));
      if (activeQuizId === quizId) {
        setActiveQuizId(null);
        setActiveQuestionId(null);
      }
    },
    [activeQuizId, commitQuizzes],
  );

  const duplicateQuiz = useCallback(
    (quizId) => {
      const source = quizzes.find((quiz) => quiz.id === quizId);
      if (!source || isLazyMaterialRecord(source, "quizzes")) return null;

      const duplicated = manager.createDefinition(quizzes.length);
      duplicated.name = `${source.name} Copy`;
      duplicated.description = source.description;
      duplicated.settings = structuredClone(source.settings);
      duplicated.questions = source.questions.map((question, index) => ({
        ...structuredClone(question),
        id: manager.createQuestion(index, question.type).id,
        options: (question.options || []).map((option, optionIndex) => ({
          ...structuredClone(option),
          id: manager.createOption(optionIndex).id,
        })),
      }));

      commitQuizzes((current) => [...current, duplicated]);
      setActiveQuizId(duplicated.id);
      setActiveQuestionId(duplicated.questions?.[0]?.id || null);
      return duplicated;
    },
    [commitQuizzes, manager, quizzes],
  );

  const addQuestion = useCallback(
    (type = "multiple-choice") => {
      if (!activeQuizId) return null;
      const next = manager.createQuestion(activeQuiz?.questions?.length || 0, type);

      updateQuiz(activeQuizId, (quiz) => ({
        questions: [...(quiz.questions || []), next],
      }));
      setActiveQuestionId(next.id);
      return next;
    },
    [activeQuiz?.questions?.length, activeQuizId, manager, updateQuiz],
  );

  const updateQuestion = useCallback(
    (questionId, patch) => {
      if (!activeQuizId || !questionId) return;

      updateQuiz(activeQuizId, (quiz) => ({
        questions: (quiz.questions || []).map((question) =>
          question.id === questionId ? mergeQuestion(question, patch) : question,
        ),
      }));
    },
    [activeQuizId, updateQuiz],
  );

  const deleteQuestion = useCallback(
    (questionId) => {
      if (!activeQuizId || !questionId) return;

      updateQuiz(activeQuizId, (quiz) => ({
        questions: (quiz.questions || []).filter(
          (question) => question.id !== questionId,
        ),
      }));

      if (activeQuestionId === questionId) setActiveQuestionId(null);
    },
    [activeQuestionId, activeQuizId, updateQuiz],
  );

  const addOption = useCallback(() => {
    if (!activeQuestion) return;

    updateQuestion(activeQuestion.id, {
      options: [
        ...(activeQuestion.options || []),
        manager.createOption(activeQuestion.options?.length || 0),
      ],
    });
  }, [activeQuestion, manager, updateQuestion]);

  const updateOption = useCallback(
    (optionId, patch) => {
      if (!activeQuestion || !optionId) return;

      updateQuestion(activeQuestion.id, {
        options: (activeQuestion.options || []).map((option) =>
          option.id === optionId ? { ...option, ...patch } : option,
        ),
      });
    },
    [activeQuestion, updateQuestion],
  );

  const setCorrectOption = useCallback(
    (optionId) => {
      if (!activeQuestion || !optionId) return;

      updateQuestion(activeQuestion.id, {
        options: (activeQuestion.options || []).map((option) => ({
          ...option,
          isCorrect: option.id === optionId,
        })),
      });
    },
    [activeQuestion, updateQuestion],
  );

  const removeOption = useCallback(
    (optionId) => {
      if (!activeQuestion) return;

      const nextOptions = (activeQuestion.options || []).filter(
        (option) => option.id !== optionId,
      );
      if (nextOptions.length < 2) return;

      if (!nextOptions.some((option) => option.isCorrect)) {
        nextOptions[0] = { ...nextOptions[0], isCorrect: true };
      }

      updateQuestion(activeQuestion.id, { options: nextOptions });
    },
    [activeQuestion, updateQuestion],
  );

  const assignSelectedObject = useCallback(
    ({ append = false } = {}) => {
      if (!activeQuestion || !selectedObject || !modelScene) return false;

      const reference = manager.createObjectReference(selectedObject, modelScene);
      if (!reference) return false;

      const current = activeQuestion.correctAnswer?.objects || [];
      const exists = current.some((item) => {
        if (item.uuid && reference.uuid && item.uuid === reference.uuid) return true;
        if (Array.isArray(item.path) && Array.isArray(reference.path)) {
          return (
            item.path.length === reference.path.length &&
            item.path.every((entry, index) => entry === reference.path[index])
          );
        }
        return item.name && item.name === reference.name;
      });
      const objects = append
        ? exists
          ? current
          : [...current, reference]
        : [reference];

      updateQuestion(activeQuestion.id, {
        correctAnswer: { objects },
      });
      return true;
    },
    [activeQuestion, manager, modelScene, selectedObject, updateQuestion],
  );

  const removeCorrectObject = useCallback(
    (referenceIndex) => {
      if (!activeQuestion) return;

      updateQuestion(activeQuestion.id, {
        correctAnswer: {
          objects: (activeQuestion.correctAnswer?.objects || []).filter(
            (_, index) => index !== referenceIndex,
          ),
        },
      });
    },
    [activeQuestion, updateQuestion],
  );

  const beginAuthoring = useCallback(() => {
    setIsAuthoringActive(true);
    if (!activeQuizId && quizzes.length > 0) setActiveQuizId(quizzes[0].id);
  }, [activeQuizId, quizzes]);

  const stopAuthoring = useCallback(() => {
    setIsAuthoringActive(false);
  }, []);

  return {
    quizzes,
    activeQuiz,
    activeQuizId,
    activeQuestion,
    activeQuestionId,
    isLoadingActiveQuiz,
    isAuthoringActive,
    selectedObject,
    createQuiz,
    selectQuiz,
    updateQuiz,
    deleteQuiz,
    duplicateQuiz,
    setActiveQuestionId,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    addOption,
    updateOption,
    setCorrectOption,
    removeOption,
    assignSelectedObject,
    removeCorrectObject,
    beginAuthoring,
    stopAuthoring,
  };
}

export default useQuizAuthoring;
