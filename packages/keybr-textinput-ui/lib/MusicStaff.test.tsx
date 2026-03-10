import { test } from "node:test";
import {
  Attr,
  type Char,
  type LineList,
  textDisplaySettings,
} from "@keybr/textinput";
import { render } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { deepEqual, equal } from "rich-assert";
import { TextArea } from "./TextArea.tsx";

test("staff renders one notehead per MIDI note", () => {
  const r = renderTextAreaWithStaff(
    toSingleLine([
      { codePoint: 60, attrs: Attr.Normal, cls: null },
      { codePoint: 61, attrs: Attr.Normal, cls: null },
      { codePoint: 62, attrs: Attr.Normal, cls: null },
    ]),
  );

  equal(r.container.querySelectorAll("g.vf-stavenote").length, 3);

  r.unmount();
});

test("active note index gets active highlight class", () => {
  const r = renderTextAreaWithStaff(
    toSingleLine([
      { codePoint: 60, attrs: Attr.Hit, cls: null },
      { codePoint: 61, attrs: Attr.Cursor, cls: null },
      { codePoint: 62, attrs: Attr.Normal, cls: null },
    ]),
  );

  equal(r.container.querySelectorAll(".music-note-active").length, 1);
  equal(r.container.querySelectorAll(".music-note-completed").length, 1);
  equal(r.container.querySelectorAll(".music-note-pending").length, 1);

  r.unmount();
});

test("staff updates when lesson sequence changes", () => {
  const r = renderTextAreaWithStaff(
    toSingleLine([
      { codePoint: 60, attrs: Attr.Normal, cls: null },
      { codePoint: 61, attrs: Attr.Normal, cls: null },
      { codePoint: 62, attrs: Attr.Normal, cls: null },
    ]),
  );

  equal(r.container.querySelectorAll("g.vf-stavenote").length, 3);

  r.rerender(
    <IntlProvider locale="en">
      <TextArea
        settings={textDisplaySettings}
        lines={toSingleLine([
          { codePoint: 55, attrs: Attr.Cursor, cls: null },
          { codePoint: 57, attrs: Attr.Normal, cls: null },
        ])}
        displayMode="staff"
        demo={true}
      />
    </IntlProvider>,
  );

  equal(r.container.querySelectorAll("g.vf-stavenote").length, 2);

  r.unmount();
});

test("snapshot-like structural render for known sequence", () => {
  const r = renderTextAreaWithStaff(
    toSingleLine([
      { codePoint: 48, attrs: Attr.Hit, cls: null },
      { codePoint: 50, attrs: Attr.Cursor, cls: null },
      { codePoint: 52, attrs: Attr.Normal, cls: null },
      { codePoint: 53, attrs: Attr.Normal, cls: null },
    ]),
  );

  const staff = r.container.querySelector<HTMLElement>(
    "[data-testid='music-staff']",
  );
  const svg = r.container.querySelector("svg");
  if (staff == null || svg == null) {
    throw new Error("Expected rendered staff SVG");
  }

  deepEqual(
    {
      clef: staff.dataset.clef,
      noteGroups: r.container.querySelectorAll("g.vf-stavenote").length,
      active: r.container.querySelectorAll(".music-note-active").length,
      completed: r.container.querySelectorAll(".music-note-completed").length,
      pending: r.container.querySelectorAll(".music-note-pending").length,
      hasAccidentalGlyph: svg.querySelectorAll("g.vf-accidental").length > 0,
    },
    {
      clef: "bass",
      noteGroups: 4,
      active: 1,
      completed: 1,
      pending: 2,
      hasAccidentalGlyph: false,
    },
  );

  r.unmount();
});

function renderTextAreaWithStaff(lines: LineList) {
  return render(
    <IntlProvider locale="en">
      <TextArea
        settings={textDisplaySettings}
        lines={lines}
        displayMode="staff"
        demo={true}
      />
    </IntlProvider>,
  );
}

function toSingleLine(chars: readonly Char[]): LineList {
  const text = String.fromCodePoint(...chars.map(({ codePoint }) => codePoint));
  return {
    text,
    lines: [{ text, chars }],
  };
}
