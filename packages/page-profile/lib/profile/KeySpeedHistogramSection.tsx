import { KeySpeedHistogram } from "@keybr/chart";
import { useKeyboard } from "@keybr/keyboard";
import { type KeyStatsMap } from "@keybr/result";
import { Explainer, Figure } from "@keybr/widget";
import { FormattedMessage } from "react-intl";
import { ChartWrapper } from "./ChartWrapper.tsx";

export function KeySpeedHistogramSection({
  keyStatsMap,
}: {
  keyStatsMap: KeyStatsMap;
}) {
  const { layout } = useKeyboard();
  const isBandoneon = layout.family === "bandoneon";
  return (
    <Figure>
      <Figure.Caption>
        {isBandoneon ? (
          <FormattedMessage
            id="profile.chart.keySpeedHistogram.caption.music"
            defaultMessage="Per-note Speed Histogram"
          />
        ) : (
          <FormattedMessage
            id="profile.chart.keySpeedHistogram.caption"
            defaultMessage="Key Typing Speed Histogram"
          />
        )}
      </Figure.Caption>

      <Explainer>
        <Figure.Description>
          {isBandoneon ? (
            <FormattedMessage
              id="profile.chart.keySpeedHistogram.description.music"
              defaultMessage="This chart shows the average speed for each individual note."
            />
          ) : (
            <FormattedMessage
              id="profile.chart.keySpeedHistogram.description"
              defaultMessage="This chart shows the average typing speed for each individual key."
            />
          )}
        </Figure.Description>
      </Explainer>

      <ChartWrapper>
        <KeySpeedHistogram
          keyStatsMap={keyStatsMap}
          width="100%"
          height="18rem"
        />
      </ChartWrapper>
    </Figure>
  );
}
