import { useKeyboard } from "@keybr/keyboard";
import { type SummaryStats } from "@keybr/result";
import { Tab, TabList } from "@keybr/widget";
import React, { useState } from "react";
import { useIntl } from "react-intl";
import { AccuracyHistogramSection } from "./AccuracyHistogramSection.tsx";
import { SpeedHistogramSection } from "./SpeedHistogramSection.tsx";

export function HistogramsSection({ stats }: { stats: SummaryStats }) {
  const { formatMessage } = useIntl();
  const { layout } = useKeyboard();
  const isBandoneon = layout.family === "bandoneon";
  const speedTabLabel = isBandoneon
    ? formatMessage({
        id: "profile.chart.histogram.caption.music",
        defaultMessage: "Relative Note Speed",
      })
    : formatMessage({
        id: "profile.chart.histogram.caption",
        defaultMessage: "Relative Typing Speed",
      });
  const [index, setIndex] = useState(0);
  return (
    <TabList selectedIndex={index} onSelect={setIndex}>
      <Tab label={speedTabLabel}>
        <SpeedHistogramSection stats={stats} />
      </Tab>
      <Tab
        label={formatMessage({
          id: "profile.chart.histogram.accuracy.caption",
          defaultMessage: "Relative Accuracy",
        })}
      >
        <AccuracyHistogramSection stats={stats} />
      </Tab>
    </TabList>
  );
}
