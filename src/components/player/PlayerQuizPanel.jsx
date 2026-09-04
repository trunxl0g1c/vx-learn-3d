import {
  CheckCircle2,
  CircleX,
  GraduationCap,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import Button from "../../components/ui/button";
import MaterialIcon from "../../components/ui/material-icon";
import { isLazyMaterialRecord } from "../../engine/project/LazyMaterialRecords";

function formatSeconds(value) {
  const seconds = Math.max(0, Number(value) || 0);
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

// Same tokens as the Pro Tools quiz authoring editor
// (QuizQuestionEditor.jsx's inputClass) so answering a quiz looks like the
// same design system as creating one.
const answerInputClass =
  "h-9 w-full rounded-lg border border-divider-main bg-primary/70 px-3 text-xs text-white outline-none transition focus:border-secondary-default [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function SelectionDot({ selected }) {
  return (
    <span
      className={[
        "grid size-5 shrink-0 place-items-center rounded-full border transition",
        selected
          ? "border-accent-main bg-accent-main"
          : "border-secondary-default bg-transparent",
      ].join(" ")}
    >
      <span
        className={[
          "size-2 rounded-full bg-white transition",
          selected ? "scale-100 opacity-100" : "scale-0 opacity-0",
        ].join(" ")}
      />
    </span>
  );
}

function OptionRow({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "cursor-pointer flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left text-xs font-normal transition",
        selected
          ? "border-secondary-default bg-secondary-default/10 text-white"
          : "border-divider-main bg-primary/45 text-white/80 hover:border-secondary-default/50",
      ].join(" ")}
    >
      <SelectionDot selected={selected} />
      <span className="min-w-0 flex-1 pt-px">{children}</span>
    </button>
  );
}

function AnswerEditor({ quiz }) {
  const question = quiz.activeQuestion;
  if (!question) return null;

  if (
    question.type === "multiple-choice" ||
    question.type === "animation-question"
  ) {
    return (
      <div className="space-y-2">
        {(question.options || []).map((option) => (
          <OptionRow
            key={option.id}
            selected={quiz.currentValue === option.id}
            onClick={() => quiz.setAnswerValue(option.id)}
          >
            {option.text}
          </OptionRow>
        ))}
      </div>
    );
  }

  if (question.type === "true-false") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[true, false].map((value) => (
          <OptionRow
            key={String(value)}
            selected={quiz.currentValue === value}
            onClick={() => quiz.setAnswerValue(value)}
          >
            {value ? "True" : "False"}
          </OptionRow>
        ))}
      </div>
    );
  }

  if (question.type === "text") {
    return (
      <input
        value={quiz.currentValue || ""}
        onChange={(event) => quiz.setAnswerValue(event.target.value)}
        className={answerInputClass}
        placeholder="Type your answer..."
      />
    );
  }

  if (question.type === "numeric") {
    return (
      <input
        type="number"
        value={quiz.currentValue ?? ""}
        onChange={(event) => quiz.setAnswerValue(event.target.value)}
        className={answerInputClass}
        placeholder="Enter a number..."
      />
    );
  }

  if (question.type === "select-object") {
    return (
      <div className="rounded-xl border border-secondary-default/30 bg-secondary-default/5 p-3">
        <div className="flex items-center gap-2 text-xs text-white/80">
          <MaterialIcon
            name="ads_click"
            size={18}
            className="text-secondary-default"
          />
          Click the correct object directly in the 3D viewport.
        </div>
        <p className="mt-2 text-[11px] text-contrast-grayout">
          {quiz.currentValue?.name
            ? `Selected: ${quiz.currentValue.name}`
            : "No object selected yet."}
        </p>
      </div>
    );
  }

  if (question.type === "multi-object") {
    const selected = Array.isArray(quiz.currentValue) ? quiz.currentValue : [];

    return (
      <div className="rounded-xl border border-secondary-default/30 bg-secondary-default/5 p-3">
        <div className="flex items-center gap-2 text-xs text-white/80">
          <MaterialIcon
            name="ads_click"
            size={18}
            className="text-secondary-default"
          />
          Click every object that belongs to the answer. Click again to remove
          it.
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.length === 0 ? (
            <span className="text-[11px] text-contrast-grayout">
              No objects selected.
            </span>
          ) : (
            selected.map((item, index) => (
              <span
                key={`${item.uuid || item.name}-${index}`}
                className="rounded-lg border border-secondary-default/40 bg-primary/70 px-2.5 py-1.5 text-xs text-white"
              >
                {item.name || `Object ${index + 1}`}
              </span>
            ))
          )}
        </div>
      </div>
    );
  }

  if (question.type === "procedure-challenge") {
    return (
      <div className="rounded-xl border border-secondary-default/30 bg-secondary-default/5 p-3">
        <div className="flex items-center gap-2 text-xs text-white">
          <MaterialIcon
            name="assignment"
            size={18}
            className="text-secondary-default"
          />
          Complete the procedure in the 3D viewport.
        </div>
        <p className="mt-2 text-[11px] text-contrast-grayout">
          The guided hints are intentionally limited by the assessment. When the
          procedure is complete, submit the question.
        </p>
      </div>
    );
  }

  return null;
}

export default function PlayerQuizPanel({ quiz, onClose }) {
  const active = quiz.status === "in-progress";
  const completed = quiz.status === "completed";

  return (
    <aside className="vx-player-panel vx-player-panel--full-mobile absolute left-[86px] top-6 z-50 flex max-h-[calc(100vh-48px)] w-[430px] flex-col overflow-hidden rounded-2xl border border-grayout-extra-dark bg-dark-alpha shadow-2xl backdrop-blur-2xl">
      <div className="flex items-center justify-between border-b border-grayout-dark px-5 py-4">
        <div className="flex items-center gap-3">
          {/* <span className="grid size-10 place-items-center rounded-xl bg-secondary-default/15 text-secondary-default">
            <GraduationCap className="size-5" />
          </span> */}
          <div>
            <h2 className="text-lg font-normal text-white">
              Quiz & Assessment
            </h2>
            <p className="mt-1 text-xs text-contrast-grayout">
              LMS questions and interactive 3D challenges
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            quiz.stopQuiz?.();
            onClose?.();
          }}
          className="cursor-pointer grid size-9 place-items-center rounded-lg text-white/75 hover:bg-white/10"
          title="Close"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!active && !completed && (
          <div className="space-y-3">
            {quiz.quizzes.length === 0 ? (
              <div className="rounded-xl border border-white/10 p-5 text-center text-sm text-white/50">
                No quiz has been created for this project.
              </div>
            ) : (
              quiz.quizzes.map((item, index) => {
                const lazy = isLazyMaterialRecord(item, "quizzes");
                const questionCount =
                  Number(item.questionCount) ||
                  (Array.isArray(item.questions) ? item.questions.length : 0);

                return (
                  <article
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-main text-sm font-nomal">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-normal text-white">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-white/55">
                          {item.description || "Interactive assessment"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-white/45">
                          <span>
                            {lazy && !questionCount
                              ? "Questions load on start"
                              : `${questionCount} questions`}
                          </span>
                          <span>Pass {item.settings?.passingScore ?? 80}%</span>
                          <span>
                            Max {item.settings?.maxAttempts ?? 2} attempts
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => quiz.startQuiz?.(item.id)}
                      className="w-full mt-4"
                    >
                      <Play className="size-4" />
                      Start Quiz
                    </Button>
                  </article>
                );
              })
            )}
          </div>
        )}

        {active && quiz.activeQuestion && (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-secondary-default">
                  Question {quiz.questionIndex + 1} / {quiz.questionCount}
                </p>
                <h3 className="mt-1 text-base font-normal text-white">
                  {quiz.activeQuestion.title}
                </h3>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-right">
                <p className="text-[9px] uppercase text-white/45">Time</p>
                <p className="text-xs text-white">
                  {formatSeconds(quiz.elapsedSeconds)}
                </p>
              </div>
            </div>

            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-secondary-default transition-all"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      100,
                      ((quiz.questionIndex + 1) /
                        Math.max(1, quiz.questionCount)) *
                        100,
                    ),
                  )}%`,
                }}
              />
            </div>

            <p className="mb-4 whitespace-pre-line text-sm leading-6 text-white/80">
              {quiz.activeQuestion.prompt || "Complete this question."}
            </p>

            <AnswerEditor quiz={quiz} />

            {quiz.feedback && (
              <div
                className={[
                  "mt-4 rounded-xl border p-3 text-sm",
                  quiz.feedback.correct
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                    : "border-amber-400/30 bg-amber-500/10 text-amber-100",
                ].join(" ")}
              >
                {quiz.feedback.text}
              </div>
            )}

            <div className="mt-5 flex gap-2">
              {!quiz.answers?.[quiz.activeQuestion.id] ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={quiz.submitAnswer}
                  className="flex-1"
                >
                  Submit Answer
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={quiz.nextQuestion}
                  className="flex-1"
                >
                  {quiz.questionIndex + 1 >= quiz.questionCount
                    ? "Finish Quiz"
                    : "Next Question"}
                </Button>
              )}
            </div>
          </>
        )}

        {completed && quiz.result && (
          <div className="py-4 text-center">
            {quiz.result.passed ? (
              <CheckCircle2 className="mx-auto size-14 text-emerald-300" />
            ) : (
              <CircleX className="mx-auto size-14 text-red-300" />
            )}
            <h3 className="mt-4 text-xl font-normal text-white">
              {quiz.result.passed
                ? "Assessment Passed"
                : "Assessment Not Passed"}
            </h3>
            <p className="mt-2 text-sm text-white/90">
              Passing score: {quiz.result.passingScore}%
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[9px] uppercase text-white/45">Score</p>
                <p className="mt-1 text-lg font-normal text-secondary-default">
                  {quiz.result.score}%
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[9px] uppercase text-white/45">Correct</p>
                <p className="mt-1 text-lg font-normal text-white">
                  {quiz.result.correctCount}/{quiz.result.questionCount}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[9px] uppercase text-white/45">Time</p>
                <p className="mt-1 text-lg font-normal text-white">
                  {formatSeconds(quiz.result.durationSeconds)}
                </p>
              </div>
            </div>

            {quiz.canRetry && (
              <Button
                type="button"
                size="sm"
                className="w-full mt-4"
                onClick={quiz.retryQuiz}
              >
                <RotateCcw className="size-4" />
                Retry Quiz
              </Button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
