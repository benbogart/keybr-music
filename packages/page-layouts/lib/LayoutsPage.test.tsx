import { test } from "node:test";
import { FakeIntlProvider } from "@keybr/intl";
import { render } from "@testing-library/react";
import { isNotNull } from "rich-assert";
import { LayoutsPage } from "./LayoutsPage.tsx";

test("render bandoneon layouts", async () => {
  const r = render(
    <FakeIntlProvider>
      <LayoutsPage />
    </FakeIntlProvider>,
  );

  isNotNull(await r.findByText("Right hand opening"));
  isNotNull(await r.findByText("Right hand closing"));
  isNotNull(await r.findByText("Left hand opening"));
  isNotNull(await r.findByText("Left hand closing"));

  r.unmount();
});
