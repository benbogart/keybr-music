import { isPremiumUser, Pages, usePageData } from "@keybr/pages-shared";
import { AdBanner } from "@keybr/thirdparties";
import { Link as StaticLink, PortalContainer, Toaster } from "@keybr/widget";
import { type ReactNode } from "react";
import { useIntl } from "react-intl";
import { NavMenu } from "./NavMenu.tsx";
import * as styles from "./Template.module.less";

export function Template({
  path,
  children,
}: {
  readonly path: string;
  readonly children: ReactNode;
}) {
  const { publicUser } = usePageData();
  const showAds = path !== Pages.practice.path;
  return isPremiumUser(publicUser) ? (
    <div className={styles.bodyAlt}>
      <main className={styles.mainAlt}>
        {children}
        <PortalContainer />
        <Toaster />
      </main>
      <nav className={styles.navAlt}>
        <NavMenu currentPath={path} />
      </nav>
      <AttributionFooter className={styles.footerAlt} />
      <EnvName />
    </div>
  ) : (
    <div className={styles.body}>
      <main className={styles.main}>
        {children}
        <PortalContainer />
        <Toaster />
      </main>
      <nav className={styles.nav}>
        <NavMenu currentPath={path} />
      </nav>
      <AttributionFooter className={styles.footer} />
      {showAds && (
        <>
          <div className={styles.topbar}>
            <AdBanner name="BANNER_970X90_1" />
          </div>
          <div className={styles.sidebar}>
            <AdBanner name="BANNER_160X600_1" />
          </div>
        </>
      )}
      <EnvName />
    </div>
  );
}

function AttributionFooter({ className }: { readonly className: string }) {
  const { formatMessage } = useIntl();
  return (
    <footer className={className}>
      <span>
        {formatMessage({
          id: "footer.attribution.prefix",
          defaultMessage: "Built on",
        })}{" "}
        <StaticLink
          href="https://keybr.com"
          target="keybr"
          title={formatMessage({
            id: "footer.attribution.keybr.description",
            defaultMessage: "Visit keybr.com.",
          })}
        >
          keybr
        </StaticLink>{" "}
        {formatMessage({
          id: "footer.attribution.suffix",
          defaultMessage: "- an open source typing practice tool",
        })}
      </span>
      <StaticLink
        href="https://github.com/aradzie/keybr.com"
        target="github"
        title={formatMessage({
          id: "footer.attribution.source.description",
          defaultMessage: "Browse the source repository.",
        })}
      >
        {formatMessage({
          id: "footer.attribution.source.label",
          defaultMessage: "Source repo",
        })}
      </StaticLink>
    </footer>
  );
}

function EnvName() {
  return process.env.NODE_ENV === "production" ? null : (
    <div
      style={{
        position: "fixed",
        zIndex: "1",
        insetInlineEnd: "0px",
        insetBlockEnd: "0px",
        padding: "5px",
        margin: "5px",
        border: "1px solid red",
        color: "red",
      }}
    >
      {`process.env.NODE_ENV=${process.env.NODE_ENV}`}
    </div>
  );
}
