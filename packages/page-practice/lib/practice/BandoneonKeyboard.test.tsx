import { test } from "node:test";
import { render } from "@testing-library/react";
import { equal, isNotNull, isNull } from "rich-assert";
import { BandoneonKeyboard } from "./BandoneonKeyboard.tsx";

test("render keyboard label and svg", () => {
  const r = render(
    <BandoneonKeyboard targetCodePoint={60} playedCodePoint={null} />,
  );

  isNotNull(r.getByText("Opening"));
  isNotNull(r.getByText("Closing"));
  isNotNull(r.getByText("Left hand - Opening"));
  isNotNull(r.getByText("Left hand - Closing"));
  isNotNull(r.getByText("Right hand - Opening"));
  isNotNull(r.getByText("Right hand - Closing"));
  isNotNull(r.getByAltText("Bandoneon left hand opening keyboard"));
  isNotNull(r.getByAltText("Bandoneon left hand closing keyboard"));
  isNotNull(r.getByAltText("Bandoneon right hand opening keyboard"));
  isNotNull(r.getByAltText("Bandoneon right hand closing keyboard"));
  isNotNull(r.getByTestId("bandoneon-target-key"));
  isNull(r.queryByTestId("bandoneon-played-key"));

  r.unmount();
});

test("render hit confirmation highlight", () => {
  const r = render(
    <BandoneonKeyboard targetCodePoint={61} playedCodePoint={61} />,
  );

  const target = r.getByTestId("bandoneon-target-key");
  const played = r.getByTestId("bandoneon-played-key");

  equal(target.getAttribute("cx"), "100.24");
  equal(played.getAttribute("cx"), "100.24");

  r.unmount();
});
