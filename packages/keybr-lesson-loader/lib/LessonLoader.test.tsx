import { test } from "node:test";
import { KeyboardContext, Layout, loadKeyboard } from "@keybr/keyboard";
import { lessonProps,MusicLesson } from "@keybr/lesson";
import { FakePhoneticModel, type PhoneticModel } from "@keybr/phonetic-model";
import { PhoneticModelLoader } from "@keybr/phonetic-model-loader";
import { FakeSettingsContext, Settings } from "@keybr/settings";
import { render } from "@testing-library/react";
import { equal, includes } from "rich-assert";
import { LessonLoader } from "./LessonLoader.tsx";

test("load", async () => {
  PhoneticModelLoader.loader = FakePhoneticModel.loader;
  const keyboard = loadKeyboard(Layout.EN_US);

  const r = render(
    <FakeSettingsContext initialSettings={new Settings()}>
      <KeyboardContext.Provider value={keyboard}>
        <LessonLoader>
          {({ model }) => <TestChild model={model} />}
        </LessonLoader>
      </KeyboardContext.Provider>
    </FakeSettingsContext>,
  );

  includes((await r.findByTitle("letters")).textContent!, "ABCDEFGHIJ");

  r.unmount();
});

function TestChild({ model }: { model: PhoneticModel }) {
  return <span title="letters">{model.letters.map(String).join("")}</span>;
}

test("load music lesson", async () => {
  const r = render(
    <FakeSettingsContext initialSettings={new Settings()}>
      <LessonLoader mode="music">
        {(lesson) => (
          <span title="lesson">
            {lesson instanceof MusicLesson
              ? lesson.instrument.layout
              : "unknown"}
          </span>
        )}
      </LessonLoader>
    </FakeSettingsContext>,
  );

  equal((await r.findByTitle("lesson")).textContent, "right-opening");

  r.unmount();
});

test("load music lesson with selected layout", async () => {
  const settings = new Settings().set(lessonProps.music.layout, "left-closing");
  const r = render(
    <FakeSettingsContext initialSettings={settings}>
      <LessonLoader mode="music">
        {(lesson) => (
          <span title="lesson">
            {lesson instanceof MusicLesson
              ? lesson.instrument.layout
              : "unknown"}
          </span>
        )}
      </LessonLoader>
    </FakeSettingsContext>,
  );

  equal((await r.findByTitle("lesson")).textContent, "left-closing");

  r.unmount();
});
