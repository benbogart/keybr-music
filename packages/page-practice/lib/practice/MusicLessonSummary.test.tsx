import { test } from "node:test";
import { FakeIntlProvider } from "@keybr/intl";
import { render } from "@testing-library/react";
import { equal, isNotNull } from "rich-assert";
import { MusicLessonSummaryPanel } from "./MusicLessonSummary.tsx";

test("render midi note labels in per-note chart", () => {
  const r = render(
    <FakeIntlProvider>
      <MusicLessonSummaryPanel
        targetSpeed={240}
        summary={{
          notesPlayed: 12,
          notesPerMinute: 230,
          accuracy: 0.92,
          slowestNote: "C4",
          notes: [
            {
              codePoint: 60,
              label: "C4",
              inLesson: true,
              speed: 220,
              accuracy: 0.9,
              atTargetSpeed: false,
              isSlowest: true,
            },
            {
              codePoint: 61,
              label: "C#4",
              inLesson: false,
              speed: null,
              accuracy: null,
              atTargetSpeed: false,
              isSlowest: false,
            },
          ],
        }}
      />
    </FakeIntlProvider>,
  );

  equal(r.getAllByText("C4").length, 2);
  isNotNull(r.getByText("C#4"));
  isNotNull(r.getByText("Locked"));

  r.unmount();
});
