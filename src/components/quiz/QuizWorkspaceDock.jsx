import MaterialIcon from "../ui/material-icon";
import Button from "../ui/button";
import QuizQuestionEditor from "./QuizQuestionEditor";

const smallInput =
  "h-8 rounded-lg border border-divider-main bg-primary/70 px-2.5 text-[11px] text-white outline-none focus:border-secondary-default";

export default function QuizWorkspaceDock({
  quizAuthoring,
  selectedObjectName,
  procedures = [],
  authoredAnimations = [],
}) {
  if (!quizAuthoring?.isAuthoringActive) return null;

  const quiz = quizAuthoring.activeQuiz;
  const questions = quiz?.questions || [];

  return (
    <section className="absolute bottom-0 left-[60px] right-0 z-[150] flex h-[420px] min-h-0 flex-col border-t border-secondary-default/40 bg-[#101717]/98 text-white shadow-[0_-18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex h-12 shrink-0 items-center gap-2 overflow-x-auto border-b border-divider-main px-3">
        <button
          type="button"
          onClick={quizAuthoring.stopAuthoring}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-secondary-default transition hover:bg-white/5"
          title="Back to Pro Tools"
        >
          <MaterialIcon name="arrow_back" className="size-5" />
        </button>

        <div className="mr-2">
          <div className="text-xs font-semibold">Quiz Authoring</div>
          <div className="text-[9px] text-contrast-grayout">
            LMS + interactive 3D assessment
          </div>
        </div>

        <select
          value={quizAuthoring.activeQuizId || ""}
          onChange={(event) => quizAuthoring.selectQuiz(event.target.value || null)}
          className={`${smallInput} w-48 shrink-0`}
        >
          <option value="" className="bg-primary">Select Quiz</option>
          {quizAuthoring.quizzes.map((item) => (
            <option key={item.id} value={item.id} className="bg-primary">
              {item.name}
            </option>
          ))}
        </select>

        <Button type="button" size="xs" onClick={quizAuthoring.createQuiz}>
          <MaterialIcon name="add" className="size-4" />
          New Quiz
        </Button>

        <Button
          type="button"
          size="xs"
          variant="cyanOutline"
          disabled={!quiz}
          onClick={() => quizAuthoring.duplicateQuiz(quiz.id)}
        >
          <MaterialIcon name="content_copy" className="size-4" />
          Duplicate
        </Button>

        <button
          type="button"
          disabled={!quiz}
          onClick={() => quizAuthoring.deleteQuiz(quiz.id)}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-contrast-grayout transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-25"
          title="Delete quiz"
        >
          <MaterialIcon name="delete" className="size-4" />
        </button>

        {quiz && (
          <>
            <div className="h-6 w-px shrink-0 bg-divider-main" />
            <input
              value={quiz.name}
              onChange={(event) =>
                quizAuthoring.updateQuiz(quiz.id, { name: event.target.value })
              }
              className={`${smallInput} w-44 shrink-0`}
              title="Quiz name"
            />
            <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2">
              <span className="text-[9px] uppercase text-contrast-grayout">Pass</span>
              <input
                type="number"
                min="0"
                max="100"
                value={quiz.settings?.passingScore ?? 80}
                onChange={(event) =>
                  quizAuthoring.updateQuiz(quiz.id, {
                    settings: {
                      passingScore: Number(event.target.value) || 0,
                    },
                  })
                }
                className="w-10 bg-transparent text-right text-[10px] text-white outline-none"
              />
              <span className="text-[9px]">%</span>
            </label>
            <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2">
              <span className="text-[9px] uppercase text-contrast-grayout">Attempts</span>
              <input
                type="number"
                min="1"
                value={quiz.settings?.maxAttempts ?? 2}
                onChange={(event) =>
                  quizAuthoring.updateQuiz(quiz.id, {
                    settings: {
                      maxAttempts: Math.max(1, Number(event.target.value) || 1),
                    },
                  })
                }
                className="w-8 bg-transparent text-right text-[10px] text-white outline-none"
              />
            </label>
            <label className="flex h-8 shrink-0 items-center gap-2 rounded-lg border border-divider-main bg-primary/70 px-2 text-[10px]">
              <input
                type="checkbox"
                checked={quiz.settings?.randomizeQuestions === true}
                onChange={(event) =>
                  quizAuthoring.updateQuiz(quiz.id, {
                    settings: { randomizeQuestions: event.target.checked },
                  })
                }
                className="size-3.5 accent-accent-main"
              />
              Random
            </label>
            <label className="flex h-8 shrink-0 items-center gap-2 rounded-lg border border-divider-main bg-primary/70 px-2 text-[10px]">
              <input
                type="checkbox"
                checked={quiz.settings?.randomizeOptions === true}
                onChange={(event) =>
                  quizAuthoring.updateQuiz(quiz.id, {
                    settings: { randomizeOptions: event.target.checked },
                  })
                }
                className="size-3.5 accent-accent-main"
              />
              Shuffle Options
            </label>
            <label className="flex h-8 shrink-0 items-center gap-2 rounded-lg border border-divider-main bg-primary/70 px-2 text-[10px]">
              <input
                type="checkbox"
                checked={quiz.settings?.allowRetry !== false}
                onChange={(event) =>
                  quizAuthoring.updateQuiz(quiz.id, {
                    settings: { allowRetry: event.target.checked },
                  })
                }
                className="size-3.5 accent-accent-main"
              />
              Retry
            </label>
            <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2">
              <span className="text-[9px] uppercase text-contrast-grayout">Limit</span>
              <input
                type="number"
                min="0"
                value={quiz.settings?.timeLimit ?? 0}
                onChange={(event) =>
                  quizAuthoring.updateQuiz(quiz.id, {
                    settings: {
                      timeLimit: Math.max(0, Number(event.target.value) || 0),
                    },
                  })
                }
                className="w-10 bg-transparent text-right text-[10px] text-white outline-none"
              />
              <span className="text-[9px]">s</span>
            </label>
            <label className="flex h-8 shrink-0 items-center gap-2 rounded-lg border border-divider-main bg-primary/70 px-2 text-[10px]">
              <input
                type="checkbox"
                checked={quiz.settings?.showScore !== false}
                onChange={(event) =>
                  quizAuthoring.updateQuiz(quiz.id, {
                    settings: { showScore: event.target.checked },
                  })
                }
                className="size-3.5 accent-accent-main"
              />
              Show Score
            </label>
          </>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-64 shrink-0 flex-col border-r border-divider-main bg-[#121919]">
          <div className="flex items-center justify-between border-b border-divider-main px-3 py-2">
            <div>
              <p className="text-xs font-semibold">Questions</p>
              <p className="text-[9px] text-contrast-grayout">
                {questions.length} items
              </p>
            </div>
            <Button
              type="button"
              size="xs"
              disabled={!quiz}
              onClick={() => quizAuthoring.addQuestion("multiple-choice")}
            >
              <MaterialIcon name="add" className="size-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {questions.map((question, index) => {
              const active = question.id === quizAuthoring.activeQuestionId;
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => quizAuthoring.setActiveQuestionId(question.id)}
                  className={[
                    "group flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition",
                    active
                      ? "border-accent-main bg-accent-main/10"
                      : "border-transparent hover:border-divider-main hover:bg-white/5",
                  ].join(" ")}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary text-[10px] text-secondary-default">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] text-white">
                      {question.title}
                    </span>
                    <span className="block truncate text-[9px] text-contrast-grayout">
                      {question.type} · {question.points} pts
                    </span>
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      quizAuthoring.deleteQuestion(question.id);
                    }}
                    className="grid size-6 place-items-center rounded-md text-contrast-grayout opacity-0 transition hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100"
                  >
                    <MaterialIcon name="delete" className="size-3.5" />
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <QuizQuestionEditor
            quizAuthoring={quizAuthoring}
            selectedObjectName={selectedObjectName}
            procedures={procedures}
            authoredAnimations={authoredAnimations}
          />
        </main>
      </div>
    </section>
  );
}
