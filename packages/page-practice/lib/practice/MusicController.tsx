import { bandoneonRightOpening } from "@keybr/instrument";
import { MusicLesson, Target } from "@keybr/lesson";
import { PitchEvents, type PitchInputHandlerOptions } from "@keybr/pitch-input";
import { type Result } from "@keybr/result";
import { type LineList, type Step } from "@keybr/textinput";
import { type IKeyboardEvent } from "@keybr/textinput-events";
import { makeSoundPlayer } from "@keybr/textinput-sounds";
import { type TextAreaEventsComponent } from "@keybr/textinput-ui";
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
  makeMusicLessonSummary,
  type MusicLessonSummary,
  type Progress,
} from "./state/index.ts";

const LESSON_SUMMARY_MIN_DURATION = 1000;

export const MusicController = memo(function MusicController({
  progress,
  onResult,
}: {
  readonly progress: Progress;
  readonly onResult: (result: Result) => void;
}): ReactNode {
  const musicInstrument =
    progress.lesson instanceof MusicLesson
      ? progress.lesson.instrument
      : bandoneonRightOpening();
  const {
    state,
    pitchResetSignal,
    lastCorrectCodePoint,
    lessonSummary,
    musicTargetSpeed,
    handleResetLesson,
    handleSkipLesson,
    handleKeyDown,
    handleKeyUp,
    handleInput,
  } = useLessonState(progress, onResult);
  const pitchInputHandlerOptions = useMemo<PitchInputHandlerOptions>(() => {
    const validMidiNotes = new Set(musicInstrument.keymap.keys());
    return {
      // Defense-in-depth: gate both in detector and in adapter.
      validMidiNotes,
      detectorOptions: { validMidiNotes },
    };
  }, [musicInstrument.keymap]);
  // Read the latest reset signal from a ref so the events-component closure
  // forwards a fresh `resetSignal` on every render without rebuilding the
  // closure itself. Rebuilding would unmount/remount `<PitchEvents>` and tear
  // down the audio context — exactly what we want to avoid here.
  const pitchResetSignalRef = useRef(pitchResetSignal);
  pitchResetSignalRef.current = pitchResetSignal;
  const pitchEventsComponent = useMemo<TextAreaEventsComponent>(() => {
    return function InstrumentPitchEvents(props) {
      return (
        <PitchEvents
          {...props}
          options={pitchInputHandlerOptions}
          resetSignal={pitchResetSignalRef.current}
        />
      );
    };
  }, [pitchInputHandlerOptions]);
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
      musicInstrument={musicInstrument}
      musicLastCorrectCodePoint={lastCorrectCodePoint}
      musicLessonSummary={lessonSummary}
      musicTargetSpeed={musicTargetSpeed}
      eventsComponent={pitchEventsComponent}
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
  // Bumped on every "the next note is the start of a new attempt" boundary
  // (lesson transition, manual reset, skip). MusicController forwards this as
  // `resetSignal` to PitchEvents so the pitch pipeline discards any in-flight
  // suppression state — see BEN-53.
  const [pitchResetSignal, setPitchResetSignal] = useState(0);
  const [, setLines] = useState<LineList>({ text: "", lines: [] }); // Forces UI update.
  const [lastCorrectCodePoint, setLastCorrectCodePoint] = useState<
    number | null
  >(null);
  const [lessonSummary, setLessonSummary] = useState<MusicLessonSummary | null>(
    null,
  );
  const lastLessonRef = useRef<LastLesson | null>(null);
  const nextLessonTimeout = useTimeout();

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const handlers = useMemo(() => {
    // Force a new LessonState instance when `key` is incremented.
    void key;
    let state!: LessonState;
    state = new LessonState(progress, (result, textInput) => {
      lastLessonRef.current = makeLastLesson(result, textInput.steps);
      const targetSpeed = new Target(state.settings).targetSpeed;
      setLessonSummary(
        makeMusicLessonSummary(result, state.lessonKeys, targetSpeed),
      );
      onResultRef.current(result);
      nextLessonTimeout.schedule(() => {
        setLessonSummary(null);
        setKey((value) => value + 1);
        setPitchResetSignal((value) => value + 1);
      }, LESSON_SUMMARY_MIN_DURATION);
    });
    state.lastLesson = lastLessonRef.current;
    setLines(state.lines);
    const handleResetLesson = () => {
      state.resetLesson();
      setLines(state.lines);
      resetTimeout.cancel();
      confirmationTimeout.cancel();
      nextLessonTimeout.cancel();
      setLessonSummary(null);
      setLastCorrectCodePoint(null);
      setPitchResetSignal((value) => value + 1);
    };
    const handleSkipLesson = () => {
      state.skipLesson();
      setLines(state.lines);
      resetTimeout.cancel();
      confirmationTimeout.cancel();
      nextLessonTimeout.cancel();
      setLessonSummary(null);
      setLastCorrectCodePoint(null);
      setPitchResetSignal((value) => value + 1);
    };
    const playSounds = makeSoundPlayer(state.settings);
    const handleInput = (event: Parameters<LessonState["onInput"]>[0]) => {
      if (state.textInput.completed || nextLessonTimeout.pending) {
        return;
      }
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
  }, [progress, resetTimeout, confirmationTimeout, nextLessonTimeout, key]);
  const musicTargetSpeed = new Target(handlers.state.settings).targetSpeed;
  return {
    ...handlers,
    pitchResetSignal,
    lessonSummary,
    musicTargetSpeed,
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
