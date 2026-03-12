import { test } from "node:test";
import { bandoneonLeftClosing, bandoneonRightOpening } from "@keybr/instrument";
import { render } from "@testing-library/react";
import { equal, isNotNull, isNull } from "rich-assert";
import { BandoneonKeyboard } from "./BandoneonKeyboard.tsx";

test("renders opening pair with right-hand overlay", () => {
  const r = render(
    <BandoneonKeyboard
      instrument={bandoneonRightOpening()}
      targetCodePoint={60}
      playedCodePoint={null}
    />,
  );

  isNotNull(r.getByText("Opening"));
  isNotNull(r.getByText("Left hand - Opening"));
  isNotNull(r.getByText("Right hand - Opening"));
  isNull(r.queryByText("Closing"));
  isNull(r.queryByText("Left hand - Closing"));
  isNull(r.queryByText("Right hand - Closing"));
  isNotNull(r.getByAltText("Bandoneon left hand opening keyboard"));
  isNotNull(r.getByAltText("Bandoneon right hand opening keyboard"));
  isNull(r.queryByAltText("Bandoneon left hand closing keyboard"));
  isNull(r.queryByAltText("Bandoneon right hand closing keyboard"));
  isNotNull(r.getByTestId("bandoneon-target-key"));
  isNull(r.queryByTestId("bandoneon-played-key"));
  equal(r.container.querySelectorAll("svg").length, 1);
  equal(r.getByTestId("bandoneon-target-key").getAttribute("cx"), "75.69");

  r.unmount();
});

test("renders closing pair with left-hand overlay", () => {
  const r = render(
    <BandoneonKeyboard
      instrument={bandoneonLeftClosing()}
      targetCodePoint={61}
      playedCodePoint={61}
    />,
  );

  isNotNull(r.getByText("Closing"));
  isNull(r.queryByText("Opening"));
  isNotNull(r.getByAltText("Bandoneon left hand closing keyboard"));
  isNotNull(r.getByAltText("Bandoneon right hand closing keyboard"));
  const target = r.getByTestId("bandoneon-target-key");
  const played = r.getByTestId("bandoneon-played-key");

  equal(target.getAttribute("cx"), "120.45");
  equal(played.getAttribute("cx"), "120.45");
  equal(r.container.querySelectorAll("svg").length, 1);

  r.unmount();
});
