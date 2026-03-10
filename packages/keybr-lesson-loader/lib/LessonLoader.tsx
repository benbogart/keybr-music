import { loadContent } from "@keybr/content-books";
import { loadWordList } from "@keybr/content-words";
import { catchError } from "@keybr/debug";
import { bandoneon, NoteSequenceModel } from "@keybr/instrument";
import { KeyboardOptions, useKeyboard } from "@keybr/keyboard";
import {
  BooksLesson,
  CodeLesson,
  CustomTextLesson,
  GuidedLesson,
  type Lesson,
  lessonProps,
  LessonType,
  MusicLesson,
  NumbersLesson,
  WordListLesson,
} from "@keybr/lesson";
import { LoadingProgress } from "@keybr/pages-shared";
import { type PhoneticModel } from "@keybr/phonetic-model";
import { PhoneticModelLoader } from "@keybr/phonetic-model-loader";
import { useSettings } from "@keybr/settings";
import { type ReactNode, useEffect, useState } from "react";

export type LessonLoaderMode = "typing" | "music";

export function LessonLoader({
  children,
  fallback = <LoadingProgress />,
  mode = "typing",
}: {
  readonly children: (result: Lesson) => ReactNode;
  readonly fallback?: ReactNode;
  readonly mode?: LessonLoaderMode;
}): ReactNode {
  const { settings } = useSettings();
  const lessonType = settings.get(lessonProps.type);
  if (mode === "music") {
    return (
      <MusicLoader key={`${mode}:${lessonType.id}`} fallback={fallback}>
        {children}
      </MusicLoader>
    );
  }

  const { language } = KeyboardOptions.from(settings);
  return (
    <PhoneticModelLoader language={language}>
      {(model) => (
        <TypingLoader key={lessonType.id} model={model} fallback={fallback}>
          {children}
        </TypingLoader>
      )}
    </PhoneticModelLoader>
  );
}

function TypingLoader({
  model,
  children,
  fallback,
}: {
  readonly model: PhoneticModel;
  readonly children: (result: Lesson) => ReactNode;
  readonly fallback?: ReactNode;
}): ReactNode {
  const result = useTypingLoader(model);
  if (result == null) {
    return fallback;
  } else {
    return children(result);
  }
}

function useTypingLoader(model: PhoneticModel): Lesson | null {
  const { settings } = useSettings();
  const keyboard = useKeyboard();
  const [result, setResult] = useState<Lesson | null>(null);

  useEffect(() => {
    let didCancel = false;

    const load = async (): Promise<void> => {
      switch (settings.get(lessonProps.type)) {
        case LessonType.GUIDED: {
          const { language } = KeyboardOptions.from(settings);
          const wordList = await loadWordList(language);
          if (!didCancel) {
            setResult(new GuidedLesson(settings, keyboard, model, wordList));
          }
          break;
        }
        case LessonType.WORDLIST: {
          const { language } = KeyboardOptions.from(settings);
          const wordList = await loadWordList(language);
          if (!didCancel) {
            setResult(new WordListLesson(settings, keyboard, model, wordList));
          }
          break;
        }
        case LessonType.BOOKS: {
          const book = settings.get(lessonProps.books.book);
          const content = await loadContent(book);
          if (!didCancel) {
            setResult(
              new BooksLesson(settings, keyboard, model, { book, content }),
            );
          }
          break;
        }
        case LessonType.CUSTOM: {
          if (!didCancel) {
            setResult(new CustomTextLesson(settings, keyboard, model));
          }
          break;
        }
        case LessonType.CODE: {
          if (!didCancel) {
            setResult(new CodeLesson(settings, keyboard, model));
          }
          break;
        }
        case LessonType.NUMBERS: {
          if (!didCancel) {
            setResult(new NumbersLesson(settings, keyboard, model));
          }
          break;
        }
        default:
          throw new Error();
      }
    };

    load().catch(catchError);

    return () => {
      didCancel = true;
    };
  }, [settings, keyboard, model]);

  return result;
}

function MusicLoader({
  children,
  fallback,
}: {
  readonly children: (result: Lesson) => ReactNode;
  readonly fallback?: ReactNode;
}): ReactNode {
  const result = useMusicLoader();
  if (result == null) {
    return fallback;
  } else {
    return children(result);
  }
}

function useMusicLoader(): Lesson | null {
  const { settings } = useSettings();
  const [result, setResult] = useState<Lesson | null>(null);

  useEffect(() => {
    let didCancel = false;
    const load = async (): Promise<void> => {
      const instrument = bandoneon();
      const model = new NoteSequenceModel(instrument.codePoints);
      if (!didCancel) {
        setResult(new MusicLesson(settings, instrument, model));
      }
    };
    load().catch(catchError);
    return () => {
      didCancel = true;
    };
  }, [settings]);

  return result;
}
