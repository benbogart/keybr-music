import { type Instrument, type NoteSequenceModel } from "@keybr/instrument";
import { type Keyboard, Layout, Ngram1, Ngram2 } from "@keybr/keyboard";
import { Filter, Letter, PhoneticModel } from "@keybr/phonetic-model";
import { type RNGStream } from "@keybr/rand";
import { type KeyStatsMap } from "@keybr/result";
import { type Settings } from "@keybr/settings";
import { LessonKey, LessonKeys } from "./key.ts";
import { Lesson } from "./lesson.ts";
import { lessonProps } from "./settings.ts";
import { Target } from "./target.ts";

export class MusicLesson extends Lesson {
  readonly instrument: Instrument;
  readonly noteSequenceModel: NoteSequenceModel;

  constructor(
    settings: Settings,
    instrument: Instrument,
    noteSequenceModel: NoteSequenceModel,
  ) {
    super(
      settings,
      createInstrumentKeyboard(instrument),
      createInstrumentModel(instrument, noteSequenceModel),
    );
    this.instrument = instrument;
    this.noteSequenceModel = noteSequenceModel;
  }

  override resultLayout() {
    return Layout.BANDONEON;
  }

  override get letters() {
    return this.instrument.letters;
  }

  override update(keyStatsMap: KeyStatsMap) {
    const alphabetSize = this.settings.get(lessonProps.guided.alphabetSize);
    const recoverKeys = this.settings.get(lessonProps.guided.recoverKeys);

    const letters = this.#getLetters();

    const minSize = 6;
    const maxSize =
      minSize + Math.round((letters.length - minSize) * alphabetSize);

    const target = new Target(this.settings);

    const lessonKeys = new LessonKeys(
      letters.map((letter) => LessonKey.from(keyStatsMap.get(letter), target)),
    );

    for (const lessonKey of lessonKeys) {
      const includedKeys = lessonKeys.findIncludedKeys();

      if (includedKeys.length < minSize) {
        lessonKeys.include(lessonKey.letter);
        continue;
      }

      if (includedKeys.length < maxSize) {
        lessonKeys.force(lessonKey.letter);
        continue;
      }

      if ((lessonKey.bestConfidence ?? 0) >= 1) {
        lessonKeys.include(lessonKey.letter);
        continue;
      }

      if (recoverKeys) {
        if (includedKeys.every((key) => (key.confidence ?? 0) >= 1)) {
          lessonKeys.include(lessonKey.letter);
          continue;
        }
      } else {
        if (includedKeys.every((key) => (key.bestConfidence ?? 0) >= 1)) {
          lessonKeys.include(lessonKey.letter);
          continue;
        }
      }
    }

    const includedKeys = lessonKeys.findIncludedKeys();
    const slowest = includedKeys
      .filter((key) => key.timeToType != null)
      .sort((a, b) => (b.timeToType ?? 0) - (a.timeToType ?? 0))
      .at(0);
    if (slowest != null) {
      lessonKeys.focus(slowest.letter);
    } else {
      const confidenceOf = (key: LessonKey): number => {
        return recoverKeys ? (key.confidence ?? 0) : (key.bestConfidence ?? 0);
      };
      const weakestKeys = includedKeys
        .filter((key) => confidenceOf(key) < 1)
        .sort((a, b) => confidenceOf(a) - confidenceOf(b));
      if (weakestKeys.length > 0) {
        lessonKeys.focus(weakestKeys[0].letter);
      }
    }

    return lessonKeys;
  }

  override generate(lessonKeys: LessonKeys, rng: RNGStream) {
    const filter = new Filter(
      lessonKeys.findIncludedKeys(),
      lessonKeys.findFocusedKey(),
    );
    const words: string[] = [];
    let length = 0;
    while (length < 50) {
      const word = this.noteSequenceModel.nextWord(filter, rng);
      if (word.length === 0) {
        break;
      }
      words.push(word);
      length += word.length + 1;
    }
    return words.join(" ");
  }

  #getLetters() {
    const { codePoints } = this;
    if (this.settings.get(lessonProps.guided.keyboardOrder)) {
      return Letter.weightedFrequencyOrder(this.letters, ({ codePoint }) =>
        codePoints.weight(codePoint),
      );
    } else {
      return Letter.frequencyOrder(this.letters);
    }
  }
}

function createInstrumentKeyboard(instrument: Instrument): Keyboard {
  return {
    getCodePoints: () => instrument.codePoints,
  } as unknown as Keyboard;
}

function createInstrumentModel(
  instrument: Instrument,
  noteSequenceModel: NoteSequenceModel,
): PhoneticModel {
  const alphabet = instrument.letters.map(({ codePoint }) => codePoint);
  return new (class extends PhoneticModel {
    constructor() {
      super(Layout.BANDONEON.language, instrument.letters);
    }

    override nextWord(filter: Filter, random?: () => number): string {
      return noteSequenceModel.nextWord(filter, random);
    }

    override ngram1() {
      return this.#ngram1;
    }

    override ngram2() {
      return this.#ngram2;
    }

    readonly #ngram1 = (() => {
      const ngram = new Ngram1(alphabet);
      for (const { codePoint, f } of instrument.letters) {
        ngram.set(codePoint, f);
      }
      ngram.normalize();
      return ngram;
    })();

    readonly #ngram2 = (() => {
      const ngram = new Ngram2(alphabet);
      for (const a of alphabet) {
        for (const b of alphabet) {
          if (a !== b) {
            ngram.add(a, b, 1);
          }
        }
      }
      ngram.normalize();
      return ngram;
    })();
  })();
}
