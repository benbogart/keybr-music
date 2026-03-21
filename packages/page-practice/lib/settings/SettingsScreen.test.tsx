import { test } from "node:test";
import { FakeIntlProvider } from "@keybr/intl";
import { FakePhoneticModel } from "@keybr/phonetic-model";
import { PhoneticModelLoader } from "@keybr/phonetic-model-loader";
import { FakeResultContext, ResultFaker } from "@keybr/result";
import { FakeSettingsContext } from "@keybr/settings";
import { fireEvent, render } from "@testing-library/react";
import { isNotNull, isNull } from "rich-assert";
import { SettingsScreen } from "./SettingsScreen.tsx";

const faker = new ResultFaker();

test("render", async () => {
  PhoneticModelLoader.loader = FakePhoneticModel.loader;

  const r = render(
    <FakeIntlProvider>
      <FakeSettingsContext>
        <FakeResultContext initialResults={faker.nextResultList(100)}>
          <SettingsScreen />
        </FakeResultContext>
      </FakeSettingsContext>
    </FakeIntlProvider>,
  );

  isNotNull(await r.findByText("Lessons"));
  isNotNull(await r.findByText("Typing"));
  isNotNull(await r.findByText("Keyboard"));
  isNotNull(await r.findByText("Miscellaneous"));

  isNotNull(await r.findByText("Lesson options"));
  isNotNull(await r.findByText("Lesson preview"));

  isNotNull(await r.findByText("Typing options"));

  isNotNull(await r.findByText("Options"));
  isNotNull(await r.findByText("Preview"));

  isNotNull(await r.findByText("Interface options"));

  r.unmount();
});

test("render music settings with layout picker", async () => {
  const r = render(
    <FakeIntlProvider>
      <FakeSettingsContext>
        <FakeResultContext initialResults={faker.nextResultList(20)}>
          <SettingsScreen mode="music" />
        </FakeResultContext>
      </FakeSettingsContext>
    </FakeIntlProvider>,
  );

  isNotNull(await r.findByText("Instrument"));
  isNotNull(await r.findByText("Instrument options"));
  isNotNull(await r.findByText("Bandoneon layout"));
  isNotNull(await r.findByText("Right hand opening"));
  isNull(r.queryByText("Typing"));

  fireEvent.click(r.getByText("Right hand opening"));

  isNotNull(await r.findByText("Left hand opening"));
  isNotNull(await r.findByText("Right hand closing"));
  isNotNull(await r.findByText("Left hand closing"));

  r.unmount();
});
