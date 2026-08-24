import { useEffect, useMemo, useRef, useState } from "react";
import {
  calculateQuizResult,
  createQuizObjectReference,
  evaluateQuizAnswer,
  normalizeQuizDefinition,
  normalizeQuizDefinitions,
} from "../../../engine/quiz";
import { findProceduralObject } from "../../../engine/procedural";
import { collectMeshes } from "../../../engine/selection";
import { isLazyMaterialRecord } from "../../../engine/project/LazyMaterialRecords";

function shuffle(items) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

export default function usePlayerQuiz({
  material,
  modelScene,
  playerProject,
  playerAnimation,
  playerProcedure,
  applySavedVisualState,
  applySavedCameraView,
  setActiveChapterId,
  setSelectedObject,
  setOutlineObjects,
  stopFlow,
  stopChapterFlows,
  resetAssessmentPresentation,
  setAssessmentFreePlay,
  stopSpeech,
}) {
  const quizzes = useMemo(
    () => normalizeQuizDefinitions(material?.quizzes),
    [material?.quizzes],
  );
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [activeQuizSnapshot, setActiveQuizSnapshot] = useState(null);
  const [questionOrder, setQuestionOrder] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(-1);
  const [answers, setAnswers] = useState({});
  const [currentValue, setCurrentValue] = useState(null);
  const [questionAttempts, setQuestionAttempts] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [quizAttempt, setQuizAttempt] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [questionElapsedSeconds, setQuestionElapsedSeconds] = useState(0);
  const startedAtRef = useRef(null);
  const questionStartedAtRef = useRef(null);

  useEffect(() => {
    setActiveQuizId(null);
    setActiveQuizSnapshot(null);
    setQuestionOrder([]);
    setQuestionIndex(-1);
    setAnswers({});
    setCurrentValue(null);
    setQuestionAttempts({});
    setFeedback(null);
    setStatus("idle");
    setResult(null);
    setQuizAttempt(0);
    setElapsedSeconds(0);
    setQuestionElapsedSeconds(0);
    startedAtRef.current = null;
    questionStartedAtRef.current = null;
  }, [material?.projectId]);

  const activeQuiz =
    activeQuizSnapshot ||
    quizzes.find((quiz) => quiz.id === activeQuizId) ||
    null;
  const activeQuestion =
    questionIndex >= 0 ? questionOrder[questionIndex] || null : null;
  const isAssessmentActive = status === "in-progress";

  useEffect(() => {
    if (!isAssessmentActive) return undefined;

    const timer = window.setInterval(() => {
      const startedAt = startedAtRef.current;
      if (!startedAt) return;

      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - startedAt) / 1000)));
      if (questionStartedAtRef.current) {
        setQuestionElapsedSeconds(
          Math.max(0, Math.floor((now - questionStartedAtRef.current) / 1000)),
        );
      }
    }, 500);

    return () => window.clearInterval(timer);
  }, [isAssessmentActive]);

  useEffect(() => {
    const timeLimit = Number(activeQuiz?.settings?.timeLimit) || 0;

    if (
      isAssessmentActive &&
      timeLimit > 0 &&
      elapsedSeconds >= timeLimit
    ) {
      const nextResult = {
        ...calculateQuizResult(activeQuiz, answers),
        durationSeconds: elapsedSeconds,
        timedOut: true,
      };
      setResult(nextResult);
      setStatus("completed");
      playerProcedure.stopProcedure?.();
      playerAnimation.stopCurrentAnimations?.();
    }
  }, [
    activeQuiz,
    answers,
    elapsedSeconds,
    questionElapsedSeconds,
    isAssessmentActive,
    playerAnimation,
    playerProcedure,
  ]);

  useEffect(() => {
    if (
      isAssessmentActive &&
      activeQuestion?.type === "procedure-challenge" &&
      playerProcedure.status === "completed"
    ) {
      setCurrentValue(true);
      setFeedback({
        correct: true,
        text: "Procedure completed. Submit this answer to continue.",
        pendingSubmit: true,
      });
    }
  }, [
    activeQuestion?.type,
    isAssessmentActive,
    playerProcedure.status,
  ]);

  const applyQuestionState = async (question) => {
    if (!question) return;

    setFeedback(null);
    setQuestionElapsedSeconds(0);
    questionStartedAtRef.current = Date.now();
    setCurrentValue(question.type === "multi-object" ? [] : null);
    stopFlow?.();
    stopChapterFlows?.();
    playerAnimation.stopCurrentAnimations?.();
    playerProcedure.stopProcedure?.();
    resetAssessmentPresentation?.();
    setSelectedObject(null);
    setOutlineObjects([]);
    setActiveChapterId(null);

    if (question.visualState) {
      applySavedVisualState?.(question.visualState);
    }
    if (question.cameraView) {
      applySavedCameraView?.(question.cameraView);
    }

    if (question.type === "animation-question" && question.animationId) {
      await playerAnimation.playAnimationAssignments?.([
        {
          source: question.animationSource || "authored",
          animationId: question.animationId,
          autoPlay: true,
          loop: false,
          speed: 1,
        },
      ]);
    }

    if (question.type === "procedure-challenge" && question.procedureId) {
      await playerProcedure.playProcedure?.(question.procedureId);
    }
  };

  const startQuiz = async (quizId) => {
    let quiz = quizzes.find((item) => item.id === quizId) || null;

    if (
      quiz &&
      isLazyMaterialRecord(quiz, "quizzes") &&
      playerProject?.loadQuizRecord
    ) {
      quiz = (await playerProject.loadQuizRecord(quizId)) || quiz;
    }

    if (!quiz) return false;

    quiz = normalizeQuizDefinition(quiz);
    const nextAttempt = activeQuizId === quiz.id ? quizAttempt + 1 : 1;
    if (
      nextAttempt > 1 &&
      (!quiz.settings.allowRetry || nextAttempt > quiz.settings.maxAttempts)
    ) {
      return false;
    }

    const orderedQuestions = quiz.settings.randomizeQuestions
      ? shuffle(quiz.questions)
      : [...quiz.questions];
    const nextQuestions = quiz.settings.randomizeOptions
      ? orderedQuestions.map((question) => ({
          ...question,
          options: shuffle(question.options || []),
        }))
      : orderedQuestions;

    setAssessmentFreePlay?.(false);
    stopSpeech?.();
    setActiveQuizId(quiz.id);
    setActiveQuizSnapshot(quiz);
    setQuestionOrder(nextQuestions);
    setQuestionIndex(nextQuestions.length > 0 ? 0 : -1);
    setAnswers({});
    setQuestionAttempts({});
    setFeedback(null);
    setResult(null);
    setQuizAttempt(nextAttempt);
    setStatus(nextQuestions.length > 0 ? "in-progress" : "completed");
    setElapsedSeconds(0);
    startedAtRef.current = Date.now();

    if (nextQuestions.length > 0) {
      await applyQuestionState(nextQuestions[0]);
    } else {
      setResult({
        ...calculateQuizResult(quiz, {}),
        durationSeconds: 0,
      });
    }

    return true;
  };

  const stopQuiz = () => {
    // Slide/Chapter navigation calls stopQuiz defensively. When no assessment
    // is active, resetting the whole presentation here also resets the camera
    // to the project overview and interrupts the saved-view transition. Only
    // restore the assessment baseline when a quiz session actually exists.
    const hadActiveAssessment =
      status !== "idle" || Boolean(activeQuizId) || Boolean(activeQuizSnapshot);

    playerProcedure.stopProcedure?.();
    playerAnimation.stopCurrentAnimations?.();
    stopSpeech?.();
    setStatus("idle");
    setActiveQuizId(null);
    setActiveQuizSnapshot(null);
    setQuestionOrder([]);
    setQuestionIndex(-1);
    setCurrentValue(null);
    setFeedback(null);
    setSelectedObject(null);
    setOutlineObjects([]);

    if (hadActiveAssessment) {
      resetAssessmentPresentation?.();
    }
  };

  const setAnswerValue = (value) => {
    if (!isAssessmentActive || !activeQuestion) return;
    setCurrentValue(value);
    setFeedback(null);
  };

  const handleObjectClick = (object) => {
    if (
      !isAssessmentActive ||
      !activeQuestion ||
      !["select-object", "multi-object"].includes(activeQuestion.type)
    ) {
      return null;
    }

    const reference = createQuizObjectReference(object, modelScene);
    if (!reference) return null;

    let nextValue = reference;

    if (activeQuestion.type === "multi-object") {
      const current = Array.isArray(currentValue) ? currentValue : [];
      const exists = current.some((entry) => {
        if (entry.uuid && reference.uuid && entry.uuid === reference.uuid) return true;
        if (entry.name && reference.name && entry.name === reference.name) return true;
        return (
          Array.isArray(entry.path) &&
          Array.isArray(reference.path) &&
          entry.path.length === reference.path.length &&
          entry.path.every((value, index) => value === reference.path[index])
        );
      });

      nextValue = exists
        ? current.filter((entry) => {
            if (entry.uuid && reference.uuid) return entry.uuid !== reference.uuid;
            if (entry.name && reference.name) return entry.name !== reference.name;
            return true;
          })
        : [...current, reference];
    }

    setCurrentValue(nextValue);
    setFeedback(null);

    const references = Array.isArray(nextValue) ? nextValue : [nextValue];
    const selectedObjects = references
      .map((entry) => findProceduralObject(modelScene, entry))
      .filter(Boolean);
    const meshes = selectedObjects.flatMap((entry) => collectMeshes(entry));

    setSelectedObject(selectedObjects[selectedObjects.length - 1] || null);
    setOutlineObjects(Array.from(new Set(meshes)));

    return {
      selectedObject: selectedObjects[selectedObjects.length - 1] || object,
      outlineObjects: Array.from(new Set(meshes)),
      quizSelection: true,
    };
  };

  const submitAnswer = (forceSubmit = false) => {
    if (!activeQuestion || !isAssessmentActive) return false;

    const attemptCount = (questionAttempts[activeQuestion.id] || 0) + 1;
    const correct = evaluateQuizAnswer(activeQuestion, currentValue);
    const nextAttempts = {
      ...questionAttempts,
      [activeQuestion.id]: attemptCount,
    };

    setQuestionAttempts(nextAttempts);

    if (
      !forceSubmit &&
      !correct &&
      attemptCount < (activeQuestion.settings?.maxAttempts || 1)
    ) {
      setFeedback({
        correct: false,
        text: activeQuestion.feedback?.incorrect || "Incorrect.",
        retryAvailable: true,
      });
      return false;
    }

    const nextAnswers = {
      ...answers,
      [activeQuestion.id]: {
        value: currentValue,
        correct,
        attempts: attemptCount,
        submittedAt: new Date().toISOString(),
      },
    };

    setAnswers(nextAnswers);
    setFeedback({
      correct,
      text: correct
        ? activeQuestion.feedback?.correct || "Correct."
        : activeQuestion.feedback?.incorrect || "Incorrect.",
      submitted: true,
    });
    return true;
  };

  useEffect(() => {
    const questionLimit = Number(activeQuestion?.settings?.timeLimit) || 0;

    if (
      isAssessmentActive &&
      activeQuestion &&
      questionLimit > 0 &&
      questionElapsedSeconds >= questionLimit &&
      !answers[activeQuestion.id]
    ) {
      submitAnswer(true);
      setFeedback({
        correct: false,
        text: "Time limit reached for this question.",
        submitted: true,
        timedOut: true,
      });
    }
  }, [
    activeQuestion,
    answers,
    isAssessmentActive,
    questionElapsedSeconds,
  ]);

  const nextQuestion = async () => {
    if (!activeQuiz || !activeQuestion) return false;
    if (!answers[activeQuestion.id]) return false;

    const nextIndex = questionIndex + 1;

    if (nextIndex >= questionOrder.length) {
      const nextResult = {
        ...calculateQuizResult(activeQuiz, answers),
        durationSeconds: elapsedSeconds,
        timedOut: false,
      };

      setResult(nextResult);
      setStatus("completed");
      playerProcedure.stopProcedure?.();
      playerAnimation.stopCurrentAnimations?.();
      setSelectedObject(null);
      setOutlineObjects([]);
      return true;
    }

    setQuestionIndex(nextIndex);
    await applyQuestionState(questionOrder[nextIndex]);
    return true;
  };

  const retryQuiz = () => {
    if (!activeQuizId) return false;
    return startQuiz(activeQuizId);
  };

  return {
    quizzes,
    activeQuiz,
    activeQuizId,
    activeQuestion,
    questionIndex,
    questionCount: questionOrder.length,
    answers,
    currentValue,
    feedback,
    status,
    result,
    quizAttempt,
    elapsedSeconds,
    questionElapsedSeconds,
    isAssessmentActive,
    canRetry:
      Boolean(activeQuiz?.settings?.allowRetry) &&
      quizAttempt < (activeQuiz?.settings?.maxAttempts || 1),
    acceptsObjectSelection:
      isAssessmentActive &&
      ["select-object", "multi-object"].includes(activeQuestion?.type),
    startQuiz,
    stopQuiz,
    retryQuiz,
    setAnswerValue,
    handleObjectClick,
    submitAnswer,
    nextQuestion,
  };
}
