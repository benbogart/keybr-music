import { bandoneonKeyPositions, SVG_VIEWBOX } from "@keybr/instrument";
import { memo, type ReactNode } from "react";
import bandoneonSvg from "../../assets/bandoneon-right-opening.svg";
import * as styles from "./Presenter.module.less";

const HIGHLIGHT_RADIUS = 16;

type Props = {
  readonly targetCodePoint: number | null;
  readonly playedCodePoint: number | null;
};

export const BandoneonKeyboard = memo(function BandoneonKeyboard({
  targetCodePoint,
  playedCodePoint,
}: Props): ReactNode {
  const target =
    targetCodePoint == null ? null : bandoneonKeyPositions.get(targetCodePoint);
  const played =
    playedCodePoint == null ? null : bandoneonKeyPositions.get(playedCodePoint);
  return (
    <section
      className={styles.bandoneon}
      aria-label="Bandoneon keyboard visual"
    >
      <div className={styles.bandoneon_layout}>
        <article className={styles.bandoneon_panel}>
          <header className={styles.bandoneon_heading}>
            Left hand - Opening
          </header>
          <div
            className={styles.bandoneon_placeholder}
            aria-label="Left hand keyboard coming soon"
          >
            <span className={styles.bandoneon_placeholderLabel}>
              Coming soon
            </span>
          </div>
        </article>
        <article className={styles.bandoneon_panel}>
          <header className={styles.bandoneon_heading}>
            Right hand - Opening
          </header>
          <div className={styles.bandoneon_canvas}>
            <img
              src={bandoneonSvg}
              className={styles.bandoneon_svg}
              alt="Bandoneon right hand opening keyboard"
            />
            <svg
              viewBox={SVG_VIEWBOX}
              className={styles.bandoneon_overlay}
              aria-hidden={true}
            >
              {target != null && (
                <circle
                  cx={target.x}
                  cy={target.y}
                  r={HIGHLIGHT_RADIUS}
                  className={styles.bandoneon_target}
                  data-testid="bandoneon-target-key"
                />
              )}
              {played != null && (
                <circle
                  cx={played.x}
                  cy={played.y}
                  r={HIGHLIGHT_RADIUS}
                  className={styles.bandoneon_played}
                  data-testid="bandoneon-played-key"
                />
              )}
            </svg>
          </div>
        </article>
      </div>
    </section>
  );
});
