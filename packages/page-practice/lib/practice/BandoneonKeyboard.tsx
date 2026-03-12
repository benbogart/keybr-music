import {
  bandoneonLeftClosingKeyPositions,
  bandoneonLeftOpeningKeyPositions,
  bandoneonRightClosingKeyPositions,
  bandoneonRightOpeningKeyPositions,
  type Instrument,
  type KeyMap,
  LEFT_HAND_VIEWBOX,
  RIGHT_HAND_VIEWBOX,
} from "@keybr/instrument";
import { memo, type ReactNode } from "react";
import bandoneonLeftClosing from "../../assets/bandoneon-left-closing.svg";
import bandoneonLeftOpening from "../../assets/bandoneon-left-opening.svg";
import bandoneonRightClosing from "../../assets/bandoneon-right-closing.svg";
import bandoneonRightOpening from "../../assets/bandoneon-right-opening.svg";
import * as styles from "./Presenter.module.less";

const HIGHLIGHT_RADIUS = 14;
const LEFT_HAND_SVG_WIDTH = 452.0;

type Props = {
  readonly instrument: Instrument;
  readonly targetCodePoint: number | null;
  readonly playedCodePoint: number | null;
};

export const BandoneonKeyboard = memo(function BandoneonKeyboard({
  instrument,
  targetCodePoint,
  playedCodePoint,
}: Props): ReactNode {
  const spec = getLayoutSpec(instrument.layout);
  const target =
    targetCodePoint == null
      ? null
      : normalizeOverlayPosition(
          spec.activeHand,
          spec.activeKeymap.get(targetCodePoint),
        );
  const played =
    playedCodePoint == null
      ? null
      : normalizeOverlayPosition(
          spec.activeHand,
          spec.activeKeymap.get(playedCodePoint),
        );
  return (
    <section
      className={styles.bandoneon}
      aria-label="Bandoneon keyboard visual"
    >
      <div className={styles.bandoneon_direction}>
        <header className={styles.bandoneon_directionHeading}>
          {spec.direction}
        </header>
        <div className={styles.bandoneon_layout}>
          <BandoneonPanel
            title={`Left hand - ${spec.direction}`}
            image={spec.leftImage}
            alt={`Bandoneon left hand ${spec.direction.toLowerCase()} keyboard`}
            active={spec.activeHand === "left"}
            viewBox={spec.overlayViewBox}
            highlightRadius={spec.highlightRadius}
            target={target}
            played={played}
          />
          <BandoneonPanel
            title={`Right hand - ${spec.direction}`}
            image={spec.rightImage}
            alt={`Bandoneon right hand ${spec.direction.toLowerCase()} keyboard`}
            active={spec.activeHand === "right"}
            viewBox={spec.overlayViewBox}
            highlightRadius={spec.highlightRadius}
            target={target}
            played={played}
          />
        </div>
      </div>
    </section>
  );
});

function BandoneonPanel({
  title,
  image,
  alt,
  active,
  viewBox,
  highlightRadius,
  target,
  played,
}: {
  readonly title: string;
  readonly image: string;
  readonly alt: string;
  readonly active: boolean;
  readonly viewBox: string;
  readonly highlightRadius: number;
  readonly target: { readonly x: number; readonly y: number } | null;
  readonly played: { readonly x: number; readonly y: number } | null;
}): ReactNode {
  return (
    <article className={styles.bandoneon_panel}>
      <header className={styles.bandoneon_heading}>{title}</header>
      {active ? (
        <div className={styles.bandoneon_canvas}>
          <img src={image} className={styles.bandoneon_svg} alt={alt} />
          <svg
            viewBox={viewBox}
            className={styles.bandoneon_overlay}
            aria-hidden={true}
          >
            {target != null && (
              <circle
                cx={target.x}
                cy={target.y}
                r={highlightRadius}
                className={styles.bandoneon_target}
                data-testid="bandoneon-target-key"
              />
            )}
            {played != null && (
              <circle
                cx={played.x}
                cy={played.y}
                r={highlightRadius}
                className={styles.bandoneon_played}
                data-testid="bandoneon-played-key"
              />
            )}
          </svg>
        </div>
      ) : (
        <img src={image} className={styles.bandoneon_static} alt={alt} />
      )}
    </article>
  );
}

function normalizeOverlayPosition(
  activeHand: "left" | "right",
  position: { readonly x: number; readonly y: number } | undefined,
): { readonly x: number; readonly y: number } | null {
  if (position == null) {
    return null;
  }
  if (activeHand === "right") {
    return {
      x: position.x,
      y: position.y,
    };
  }
  // Left-hand maps are stored in a transposed coordinate system.
  return {
    x: LEFT_HAND_SVG_WIDTH - position.y,
    y: position.x,
  };
}

function getLayoutSpec(layout: string): {
  readonly direction: "Opening" | "Closing";
  readonly activeHand: "left" | "right";
  readonly activeKeymap: KeyMap;
  readonly overlayViewBox: string;
  readonly highlightRadius: number;
  readonly leftImage: string;
  readonly rightImage: string;
} {
  switch (layout) {
    case "left-opening":
      return {
        direction: "Opening",
        activeHand: "left",
        activeKeymap: bandoneonLeftOpeningKeyPositions,
        overlayViewBox: LEFT_HAND_VIEWBOX,
        highlightRadius: HIGHLIGHT_RADIUS,
        leftImage: bandoneonLeftOpening,
        rightImage: bandoneonRightOpening,
      };
    case "right-closing":
      return {
        direction: "Closing",
        activeHand: "right",
        activeKeymap: bandoneonRightClosingKeyPositions,
        overlayViewBox: RIGHT_HAND_VIEWBOX,
        highlightRadius: HIGHLIGHT_RADIUS,
        leftImage: bandoneonLeftClosing,
        rightImage: bandoneonRightClosing,
      };
    case "left-closing":
      return {
        direction: "Closing",
        activeHand: "left",
        activeKeymap: bandoneonLeftClosingKeyPositions,
        overlayViewBox: LEFT_HAND_VIEWBOX,
        highlightRadius: HIGHLIGHT_RADIUS,
        leftImage: bandoneonLeftClosing,
        rightImage: bandoneonRightClosing,
      };
    case "right-opening":
    default:
      return {
        direction: "Opening",
        activeHand: "right",
        activeKeymap: bandoneonRightOpeningKeyPositions,
        overlayViewBox: RIGHT_HAND_VIEWBOX,
        highlightRadius: HIGHLIGHT_RADIUS,
        leftImage: bandoneonLeftOpening,
        rightImage: bandoneonRightOpening,
      };
  }
}
