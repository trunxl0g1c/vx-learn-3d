import MaterialIcon from "../ui/material-icon";
import Button from "../ui/button";
import Checkbox from "../ui/checkbox";
import RadioButton from "../ui/radio";
import { QUIZ_QUESTION_TYPES } from "../../engine/quiz";
import { sanitizeText } from "../../utils/validation";

const TITLE_MAX_LENGTH = 120;
const PROMPT_MAX_LENGTH = 1000;
const OPTION_TEXT_MAX_LENGTH = 200;
const CORRECT_TEXT_MAX_LENGTH = 200;
const FEEDBACK_MAX_LENGTH = 500;

function SectionLabel({ children }) {
  return (
    <div className="text-xs font-normal text-contrast-grayout">
      {children}
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputClass =
  "h-9 w-full rounded-lg border border-divider-main bg-primary/70 px-3 text-xs text-white outline-none transition focus:border-secondary-default outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
const textareaClass =
  "min-h-20 w-full resize-none rounded-lg border border-divider-main bg-primary/70 px-3 py-2 text-xs leading-5 text-white outline-none transition focus:border-secondary-default";

function OptionEditor({ question, quizAuthoring }) {
  return (
    <div className="space-y-2">
      {(question.options || []).map((option, index) => (
        <div
          key={option.id}
          className="flex items-center gap-2 rounded-lg border border-divider-main bg-primary/45 p-2"
        >
          <RadioButton
            checked={option.isCorrect === true}
            onCheckedChange={() => quizAuthoring.setCorrectOption(option.id)}
            title="Correct answer"
          />
          <input
            value={option.text}
            maxLength={OPTION_TEXT_MAX_LENGTH}
            onChange={(event) =>
              quizAuthoring.updateOption(option.id, {
                text: sanitizeText(event.target.value, {
                  maxLength: OPTION_TEXT_MAX_LENGTH,
                  collapseWhitespace: false,
                }),
              })
            }
            className="h-8 min-w-0 flex-1 bg-transparent text-xs text-white outline-none"
            placeholder={`Option ${index + 1}`}
          />
          <button
            type="button"
            onClick={() => quizAuthoring.removeOption(option.id)}
            disabled={(question.options || []).length <= 2}
            className="cursor-pointer grid size-8 place-items-center rounded-lg transition bg-red-500/10 text-red-300 disabled:opacity-25"
            title="Delete option"
          >
            <MaterialIcon name="delete" size={20} />
          </button>
        </div>
      ))}
      <Button
        type="button"
        size="xs"
        onClick={quizAuthoring.addOption}
      >
        Add Option
        <MaterialIcon name="add" size={20} />
      </Button>
    </div>
  );
}

function ObjectAnswerEditor({
  question,
  quizAuthoring,
  selectedObjectName,
  multiple = false,
}) {
  const objects = question.correctAnswer?.objects || [];

  return (
    <div className="rounded-xl border border-secondary-default/30 bg-secondary-default/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <SectionLabel>Correct 3D Object{multiple ? "s" : ""}</SectionLabel>
          <p className="mt-1 text-[11px] text-contrast-grayout">
            Select a logical object in the viewport, then assign it.
          </p>
        </div>
        <Button
          type="button"
          size="xs"
          disabled={!selectedObjectName}
          onClick={() =>
            quizAuthoring.assignSelectedObject({ append: multiple })
          }
        >
          <MaterialIcon name="ads_click" className="size-4" />
          {multiple ? "Add Selected" : "Use Selected"}
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {objects.length === 0 ? (
          <span className="text-xs text-contrast-grayout">
            No correct object assigned.
          </span>
        ) : (
          objects.map((reference, index) => (
            <span
              key={`${reference.uuid || reference.name || "object"}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-secondary-default/40 bg-primary/70 px-2.5 py-1.5 text-xs text-white"
            >
              <MaterialIcon name="view_in_ar" className="size-4 text-secondary-default" />
              {reference.name || "Object"}
              <button
                type="button"
                onClick={() => quizAuthoring.removeCorrectObject(index)}
                className="text-contrast-grayout hover:text-red-300"
              >
                <MaterialIcon name="close" className="size-3.5" />
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}

export default function QuizQuestionEditor({
  quizAuthoring,
  selectedObjectName,
  procedures = [],
  authoredAnimations = [],
}) {
  const question = quizAuthoring.activeQuestion;
  if (!question) {
    return (
      <div className="grid h-full place-items-center text-sm text-contrast-grayout">
        Add or select a question to start authoring.
      </div>
    );
  }

  const update = (patch) => quizAuthoring.updateQuestion(question.id, patch);
  const isChoice =
    question.type === "multiple-choice" ||
    question.type === "animation-question";

  return (
    <div className="h-full min-h-0 overflow-y-auto p-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_120px]">
        <Field label="Question title">
          <input
            value={question.title}
            maxLength={TITLE_MAX_LENGTH}
            onChange={(event) =>
              update({
                title: sanitizeText(event.target.value, {
                  maxLength: TITLE_MAX_LENGTH,
                  collapseWhitespace: false,
                }),
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Question type">
          <select
            value={question.type}
            onChange={(event) => update({ type: event.target.value })}
            className={inputClass}
          >
            <optgroup label="LMS">
              {QUIZ_QUESTION_TYPES.filter((item) => item.group === "lms").map(
                (type) => (
                  <option key={type.id} value={type.id} className="bg-primary">
                    {type.label}
                  </option>
                ),
              )}
            </optgroup>
            <optgroup label="3D Assessment">
              {QUIZ_QUESTION_TYPES.filter((item) => item.group === "3d").map(
                (type) => (
                  <option key={type.id} value={type.id} className="bg-primary">
                    {type.label}
                  </option>
                ),
              )}
            </optgroup>
          </select>
        </Field>

        <Field label="Points">
          <input
            type="number"
            min="0"
            step="1"
            value={question.points}
            onChange={(event) =>
              update({ points: Number(event.target.value) || 0 })
            }
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Question / instruction" className="mt-3">
        <textarea
          value={question.prompt}
          maxLength={PROMPT_MAX_LENGTH}
          onChange={(event) =>
            update({
              prompt: sanitizeText(event.target.value, {
                maxLength: PROMPT_MAX_LENGTH,
                collapseWhitespace: false,
                allowNewlines: true,
              }),
            })
          }
          className={textareaClass}
          placeholder="Write the question or 3D task instruction..."
        />
      </Field>

      <div className="mt-4">
        {isChoice && <OptionEditor question={question} quizAuthoring={quizAuthoring} />}

        {question.type === "true-false" && (
          <Field label="Correct answer">
            <select
              value={question.correctAnswer?.boolean ? "true" : "false"}
              onChange={(event) =>
                update({
                  correctAnswer: { boolean: event.target.value === "true" },
                })
              }
              className={`${inputClass} max-w-48`}
            >
              <option value="true" className="bg-primary">True</option>
              <option value="false" className="bg-primary">False</option>
            </select>
          </Field>
        )}

        {question.type === "text" && (
          <Field label="Correct text answer">
            <input
              value={question.correctAnswer?.text || ""}
              maxLength={CORRECT_TEXT_MAX_LENGTH}
              onChange={(event) =>
                update({
                  correctAnswer: {
                    text: sanitizeText(event.target.value, {
                      maxLength: CORRECT_TEXT_MAX_LENGTH,
                      collapseWhitespace: false,
                    }),
                  },
                })
              }
              className={inputClass}
              placeholder="Expected answer"
            />
          </Field>
        )}

        {question.type === "numeric" && (
          <div className="grid max-w-xl grid-cols-2 gap-3">
            <Field label="Correct number">
              <input
                type="number"
                value={question.correctAnswer?.numeric ?? 0}
                onChange={(event) =>
                  update({
                    correctAnswer: {
                      numeric: Number(event.target.value) || 0,
                    },
                  })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Tolerance ±">
              <input
                type="number"
                min="0"
                value={question.correctAnswer?.tolerance ?? 0}
                onChange={(event) =>
                  update({
                    correctAnswer: {
                      tolerance: Math.max(0, Number(event.target.value) || 0),
                    },
                  })
                }
                className={inputClass}
              />
            </Field>
          </div>
        )}

        {question.type === "select-object" && (
          <ObjectAnswerEditor
            question={question}
            quizAuthoring={quizAuthoring}
            selectedObjectName={selectedObjectName}
          />
        )}

        {question.type === "multi-object" && (
          <ObjectAnswerEditor
            question={question}
            quizAuthoring={quizAuthoring}
            selectedObjectName={selectedObjectName}
            multiple
          />
        )}

        {question.type === "procedure-challenge" && (
          <Field label="Procedure used as assessment">
            <select
              value={question.procedureId || ""}
              onChange={(event) => update({ procedureId: event.target.value || null })}
              className={`${inputClass} max-w-xl`}
            >
              <option value="" className="bg-primary">Select Procedure</option>
              {procedures.map((procedure) => (
                <option
                  key={procedure.id}
                  value={procedure.id}
                  className="bg-primary"
                >
                  {procedure.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        {question.type === "animation-question" && (
          <Field label="Animation to observe">
            <select
              value={question.animationId || ""}
              onChange={(event) => update({ animationId: event.target.value || null })}
              className={`${inputClass} max-w-xl`}
            >
              <option value="" className="bg-primary">Select Authored Animation</option>
              {authoredAnimations.map((animation) => (
                <option
                  key={animation.id}
                  value={animation.id}
                  className="bg-primary"
                >
                  {animation.name}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-divider-main bg-primary/35 p-3">
        <label className="flex items-center gap-2 text-[11px] text-white">
          <Checkbox
            checked={question.settings?.required !== false}
            onCheckedChange={(checked) =>
              update({ settings: { required: checked } })
            }
          />
          Required
        </label>
        <Field label="Question attempts" className="w-36">
          <input
            type="number"
            min="1"
            value={question.settings?.maxAttempts ?? 1}
            onChange={(event) =>
              update({
                settings: {
                  maxAttempts: Math.max(1, Number(event.target.value) || 1),
                },
              })
            }
            className={inputClass}
          />
        </Field>
        <Field label="Question time limit" className="w-40">
          <input
            type="number"
            min="0"
            value={question.settings?.timeLimit ?? 0}
            onChange={(event) =>
              update({
                settings: {
                  timeLimit: Math.max(0, Number(event.target.value) || 0),
                },
              })
            }
            className={inputClass}
          />
        </Field>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        <Field label="Correct feedback">
          <textarea
            value={question.feedback?.correct || ""}
            maxLength={FEEDBACK_MAX_LENGTH}
            onChange={(event) =>
              update({
                feedback: {
                  correct: sanitizeText(event.target.value, {
                    maxLength: FEEDBACK_MAX_LENGTH,
                    collapseWhitespace: false,
                    allowNewlines: true,
                  }),
                },
              })
            }
            className={textareaClass}
          />
        </Field>
        <Field label="Incorrect feedback">
          <textarea
            value={question.feedback?.incorrect || ""}
            maxLength={FEEDBACK_MAX_LENGTH}
            onChange={(event) =>
              update({
                feedback: {
                  incorrect: sanitizeText(event.target.value, {
                    maxLength: FEEDBACK_MAX_LENGTH,
                    collapseWhitespace: false,
                    allowNewlines: true,
                  }),
                },
              })
            }
            className={textareaClass}
          />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-divider-main bg-primary/40 p-3">
        <SectionLabel>3D Question State</SectionLabel>
        <Button
          type="button"
          size="xs"
          variant="default"
          onClick={quizAuthoring.saveActiveQuestionCamera}
        >
          <MaterialIcon name="photo_camera" size={20} />
          Save Camera
        </Button>
        <Button
          type="button"
          size="xs"
          variant="default"
          onClick={quizAuthoring.saveActiveQuestionVisualState}
        >
          <MaterialIcon name="visibility" size={20} />
          Save Visual State
        </Button>
        <Button
          type="button"
          size="xs"
          variant="default"
          onClick={quizAuthoring.saveActiveQuestionViewState}
        >
          <MaterialIcon name="bookmark_added" size={20} />
          Save Camera + State
        </Button>
        <span className="ml-auto text-xs text-contrast-grayout">
          {question.cameraView ? "Camera saved" : "No camera"} ·{" "}
          {question.visualState ? "Visual state saved" : "No visual state"}
        </span>
      </div>
    </div>
  );
}
