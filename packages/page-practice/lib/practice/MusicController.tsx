import { PitchEvents } from "@keybr/pitch-input";
import { type Result } from "@keybr/result";
import { type LineList } from "@keybr/textinput";
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
      forceBare={true}
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
  const timeout = useTimeout();
  const [key, setKey] = useState(0); // Creates new LessonState instances.
  const [, setLines] = useState<LineList>({ text: "", lines: [] }); // Forces UI update.
  const lastLessonRef = useRef<LastLesson | null>(null);

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  return useMemo(() => {
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
      timeout.cancel();
    };
    const handleSkipLesson = () => {
      state.skipLesson();
      setLines(state.lines);
      timeout.cancel();
    };
    const playSounds = makeSoundPlayer(state.settings);
    const handleInput = (event: Parameters<LessonState["onInput"]>[0]) => {
      state.lastLesson = null;
      const feedback = state.onInput(event);
      setLines(state.lines);
      playSounds(feedback);
      timeout.schedule(handleResetLesson, 10000);
    };
    return {
      state,
      handleResetLesson,
      handleSkipLesson,
      handleKeyDown: noopKeyHandler,
      handleKeyUp: noopKeyHandler,
      handleInput,
    };
  }, [progress, timeout, key]);
}

function noopKeyHandler(_: IKeyboardEvent) {}
