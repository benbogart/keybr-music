import { catchError } from "@keybr/debug";
import { KeyboardProvider } from "@keybr/keyboard";
import { schedule } from "@keybr/lang";
import { type Lesson } from "@keybr/lesson";
import { LessonLoader } from "@keybr/lesson-loader";
import { LoadingProgress } from "@keybr/pages-shared";
import { type Result, useResults } from "@keybr/result";
import { useSettings } from "@keybr/settings";
import { useEffect, useMemo, useState } from "react";
import { Controller } from "./Controller.tsx";
import { MusicController } from "./MusicController.tsx";
import { displayEvent, Progress } from "./state/index.ts";

export type PracticeMode = "typing" | "music";

export function PracticeScreen({
  mode = "typing",
}: {
  readonly mode?: PracticeMode;
}) {
  return (
    <KeyboardProvider>
      <LessonLoader mode={mode}>
        {(lesson) => <ProgressUpdater mode={mode} lesson={lesson} />}
      </LessonLoader>
    </KeyboardProvider>
  );
}

function ProgressUpdater({
  mode,
  lesson,
}: {
  readonly mode: PracticeMode;
  readonly lesson: Lesson;
}) {
  const { results, appendResults } = useResults();
  const [progress, { total, current }] = useProgress(lesson, results);
  if (progress == null) {
    return <LoadingProgress total={total} current={current} />;
  } else {
    const onResult = (result: Result) => {
      if (result.validate()) {
        progress.append(result, displayEvent);
        appendResults([result]);
      }
    };
    return mode === "music" ? (
      <MusicController progress={progress} onResult={onResult} />
    ) : (
      <Controller progress={progress} onResult={onResult} />
    );
  }
}

function useProgress(lesson: Lesson, results: readonly Result[]) {
  const { settings } = useSettings();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState({ total: 0, current: 0 });
  const progress = useMemo(
    () => new Progress(settings, lesson),
    [settings, lesson],
  );
  useEffect(() => {
    // Populating the progress object can take a long time, so we do this
    // asynchronously, interleaved with the browser event loop to avoid
    // freezing of the UI.
    const controller = new AbortController();
    const { signal } = controller;
    schedule(progress.seedAsync(lesson.filter(results), setLoading), { signal })
      .then(() => setDone(true))
      .catch(catchError);
    return () => {
      controller.abort();
    };
  }, [progress, lesson, results]);
  return [done ? progress : null, loading] as const;
}
