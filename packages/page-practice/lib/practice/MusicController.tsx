import { PitchEvents } from "@keybr/pitch-input";
import { type Result } from "@keybr/result";
import { type LineList, type Step } from "@keybr/textinput";
import { type IKeyboardEvent } from "@keybr/textinput-events";
import { makeSoundPlayer } from "@keybr/textinput-sounds";
import {
  useDocumentEvent,
  useHotkeys,
  useTimeout,
  useWindowEvent,
} from "@keybr/widget";
import { memo, type ReactNode, useMemo, useRef, useState } from "react";
import { Presenter } from "./Presenter.tsx";
import {
  type LastLesson,
  LessonState,
  makeLastLesson,
  type Progress,
} from "./state/index.ts";

export const MusicController = memo(function MusicController({
  progress,
  onResult,
}: {
  readonly progress: Progress;
  readonly onResult: (result: Result) => void;
}): ReactNode {
  const {
    state,
    lastCorrectCodePoint,
    handleResetLesson,
    handleSkipLesson,
    handleKeyDown,
    handleKeyUp,
    handleInput,
  } = useLessonState(progress, onResult);
  useHotkeys({
    ["Ctrl+ArrowLeft"]: handleResetLesson,
    ["Ctrl+ArrowRight"]: handleSkipLesson,
    ["Escape"]: handleResetLesson,
  });
  useWindowEvent("focus", handleResetLesson);
  useWindowEvent("blur", handleResetLesson);
  useDocumentEvent("visibilitychange", handleResetLesson);
  return (
    <Presenter
      state={state}
      lines={state.lines}
      depressedKeys={state.depressedKeys}
      musicMode={true}
      musicLastCorrectCodePoint={lastCorrectCodePoint}
      eventsComponent={PitchEvents}
      onResetLesson={handleResetLesson}
      onSkipLesson={handleSkipLesson}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onInput={handleInput}
    />
  );
});

function useLessonState(
  progress: Progress,
  onResult: (result: Result) => void,
) {
  const resetTimeout = useTimeout();
  const confirmationTimeout = useTimeout();
  const [key, setKey] = useState(0); // Creates new LessonState instances.
  const [, setLines] = useState<LineList>({ text: "", lines: [] }); // Forces UI update.
  const [lastCorrectCodePoint, setLastCorrectCodePoint] = useState<
    number | null
  >(null);
  const lastLessonRef = useRef<LastLesson | null>(null);

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const handlers = useMemo(() => {
    const state = new LessonState(progress, (result, textInput) => {
      setKey(key + 1);
      lastLessonRef.current = makeLastLesson(result, textInput.steps);
      onResultRef.current(result);
    });
    state.lastLesson = lastLessonRef.current;
    setLines(state.lines);
    const handleResetLesson = () => {
      state.resetLesson();
      setLines(state.lines);
      resetTimeout.cancel();
      confirmationTimeout.cancel();
      setLastCorrectCodePoint(null);
    };
    const handleSkipLesson = () => {
      state.skipLesson();
      setLines(state.lines);
      resetTimeout.cancel();
      confirmationTimeout.cancel();
      setLastCorrectCodePoint(null);
    };
    const playSounds = makeSoundPlayer(state.settings);
    const handleInput = (event: Parameters<LessonState["onInput"]>[0]) => {
      state.lastLesson = null;
      const stepCount = state.textInput.steps.length;
      const feedback = state.onInput(event);
      const nextSteps = state.textInput.steps.slice(stepCount);
      const correctCodePoint = findLatestCorrectCodePoint(nextSteps);
      if (correctCodePoint != null) {
        setLastCorrectCodePoint(correctCodePoint);
        confirmationTimeout.schedule(() => {
          setLastCorrectCodePoint(null);
        }, 450);
      }
      setLines(state.lines);
      playSounds(feedback);
      resetTimeout.schedule(handleResetLesson, 10000);
    };
    return {
      state,
      handleResetLesson,
      handleSkipLesson,
      handleKeyDown: noopKeyHandler,
      handleKeyUp: noopKeyHandler,
      handleInput,
    };
  }, [progress, resetTimeout, confirmationTimeout, key]);
  return {
    ...handlers,
    lastCorrectCodePoint,
  };
}

function noopKeyHandler(_: IKeyboardEvent) {}

function findLatestCorrectCodePoint(steps: readonly Step[]): number | null {
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    if (!step.typo && step.codePoint !== 0x0020) {
      return step.codePoint;
    }
  }
  return null;
}
