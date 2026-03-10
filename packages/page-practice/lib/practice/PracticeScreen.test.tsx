import { test } from "node:test";
import { FakeIntlProvider } from "@keybr/intl";
import { lessonProps, LessonType } from "@keybr/lesson";
import { FakePhoneticModel } from "@keybr/phonetic-model";
import { PhoneticModelLoader } from "@keybr/phonetic-model-loader";
import { FakeResultContext, ResultFaker } from "@keybr/result";
import { FakeSettingsContext, Settings } from "@keybr/settings";
import { render } from "@testing-library/react";
import { includes, isNotNull } from "rich-assert";
import { PracticeScreen } from "./PracticeScreen.tsx";

const faker = new ResultFaker();

test("render", async () => {
  PhoneticModelLoader.loader = FakePhoneticModel.loader;

  const r = render(
    <FakeIntlProvider>
      <FakeSettingsContext
        initialSettings={new Settings()
          .set(lessonProps.type, LessonType.CUSTOM)
          .set(lessonProps.customText.content, "abcdefghij")}
      >
        <FakeResultContext initialResults={faker.nextResultList(100)}>
          <PracticeScreen />
        </FakeResultContext>
      </FakeSettingsContext>
    </FakeIntlProvider>,
  );

  isNotNull(await r.findByTitle("Change lesson settings", { exact: false }));
  includes(r.container.textContent!, "abcdefghij");

  r.unmount();
});

test("render music mode with bandoneon keyboard visual", async () => {
  const r = render(
    <FakeIntlProvider>
      <FakeSettingsContext initialSettings={new Settings()}>
        <FakeResultContext initialResults={faker.nextResultList(20)}>
          <PracticeScreen mode="music" />
        </FakeResultContext>
      </FakeSettingsContext>
    </FakeIntlProvider>,
  );

  isNotNull(await r.findByText("Right hand - Opening"));
  isNotNull(await r.findByAltText("Bandoneon right hand opening keyboard"));
  isNotNull(await r.findByTestId("bandoneon-target-key"));

  r.unmount();
});
