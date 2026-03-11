import { KeySpeedChart, Marker } from "@keybr/chart";
import { useKeyboard } from "@keybr/keyboard";
import { LessonKey, Target } from "@keybr/lesson";
import { KeyDetails, KeySelector } from "@keybr/lesson-ui";
import { hasData } from "@keybr/math";
import { type KeyStatsMap } from "@keybr/result";
import { useSettings } from "@keybr/settings";
import { Explainer, Figure, Para } from "@keybr/widget";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { ChartWrapper } from "./ChartWrapper.tsx";
import { SmoothnessRange } from "./SmoothnessRange.tsx";

export function KeySpeedChartSection({
  keyStatsMap,
}: {
  keyStatsMap: KeyStatsMap;
}) {
  const { layout } = useKeyboard();
  const isBandoneon = layout.family === "bandoneon";
  const { settings } = useSettings();
  const { letters } = keyStatsMap;
  const [current, setCurrent] = useState(letters[0]);
  const [smoothness, setSmoothness] = useState(0.5);
  const target = new Target(settings);

  if (!letters.includes(current)) {
    setCurrent(letters[0]);
    return null;
  }

  const keyStats = keyStatsMap.get(current);
  const { samples } = keyStats;

  return (
    <Figure>
      <Figure.Caption>
        {isBandoneon ? (
          <FormattedMessage
            id="profile.chart.keySpeed.caption.music"
            defaultMessage="Per-note Speed"
          />
        ) : (
          <FormattedMessage
            id="profile.chart.keySpeed.caption"
            defaultMessage="Key Typing Speed"
          />
        )}
      </Figure.Caption>

      <Explainer>
        <Figure.Description>
          {isBandoneon ? (
            <FormattedMessage
              id="profile.chart.keySpeed.description.music"
              defaultMessage="This chart shows the speed change for each individual note."
            />
          ) : (
            <FormattedMessage
              id="profile.chart.keySpeed.description"
              defaultMessage="This chart shows the typing speed change for each individual key."
            />
          )}
        </Figure.Description>
      </Explainer>

      <Para align="center">
        <KeySelector
          keyStatsMap={keyStatsMap}
          current={current}
          onSelect={(current) => {
            setCurrent(current);
          }}
        />
      </Para>

      <Para align="center">
        <KeyDetails lessonKey={LessonKey.from(keyStats, target)} />
      </Para>

      <ChartWrapper>
        <KeySpeedChart
          samples={samples}
          smoothness={smoothness}
          width="100%"
          height="25rem"
        />
      </ChartWrapper>

      <SmoothnessRange
        disabled={!hasData(samples)}
        value={smoothness}
        onChange={setSmoothness}
      />

      <Figure.Legend>
        {isBandoneon ? (
          <FormattedMessage
            id="profile.chart.keySpeed.legend.music"
            defaultMessage="Horizontal axis: lesson number. Vertical axis: {label1} – speed for the selected note, {label2} – target speed."
            values={{
              label1: <Marker type="speed" />,
              label2: <Marker type="threshold" />,
            }}
          />
        ) : (
          <FormattedMessage
            id="profile.chart.keySpeed.legend"
            defaultMessage="Horizontal axis: lesson number. Vertical axis: {label1} – typing speed for the currently selected key, {label2} – target typing speed."
            values={{
              label1: <Marker type="speed" />,
              label2: <Marker type="threshold" />,
            }}
          />
        )}
      </Figure.Legend>
    </Figure>
  );
}
