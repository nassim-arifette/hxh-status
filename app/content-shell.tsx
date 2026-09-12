import type { ReactNode } from "react";

import {
  formatMessage,
  getLocaleDirection,
  type Locale,
  type Messages,
} from "@/lib/i18n";
import {
  ARC_PAGES,
  arcPath,
  contentPagePath,
  CONTENT_PAGES,
  localePath,
  localeUrl,
} from "@/lib/routes";
import { lastUpdated } from "./data/status";
import LanguageSwitcher from "./language-switcher";
import { formatDate } from "./status-presentation";
import {
  breadcrumbLd,
  graph,
  GITHUB_REPOSITORY,
  JsonLd,
  publisherLd,
  webSiteLd,
} from "./structured-data";

export type Crumb = { name: string; path: string };

// Every content page is built from this shell: one header, one breadcrumb, one
// footer, and the same cross-links at the bottom. The pages themselves hold no
// interactive component, which is what lets the build strip their JavaScript
// entirely — see scripts/strip-page-scripts.mjs.

function pageName(messages: Messages, page: string) {
  const names: Record<string, string> = {
    hiatus: messages.pages.hiatus.name,
    statistics: messages.pages.statistics.name,
    updates: messages.pages.updates.name,
    "where-to-read": messages.pages.whereToRead.name,
    about: messages.pages.about.name,
    api: messages.pages.api.name,
  };
  return names[page] ?? page;
}

function SiteFooter({ messages }: { messages: Messages }) {
  return (
    <footer className="site-footer">
      <p>{messages.footer.disclaimer}</p>
      <div className="footer-details">
        <p>{messages.footer.sources}</p>
        <a
          className="footer-github"
          href={GITHUB_REPOSITORY}
          rel="noreferrer"
          target="_blank"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}

export function ContentShell({
  locale,
  messages,
  path,
  eyebrow,
  title,
  lede,
  crumbs = [],
  jsonLd,
  children,
}: {
  locale: Locale;
  messages: Messages;
  path: string;
  eyebrow?: ReactNode;
  title: string;
  lede?: ReactNode;
  crumbs?: readonly Crumb[];
  jsonLd?: Record<string, unknown>[];
  children: ReactNode;
}) {
  const home = { name: messages.nav.home, path: "/" };
  const trail = [home, ...crumbs, { name: title, path }];

  return (
    <main
      className="site-shell content-shell"
      dir={getLocaleDirection(locale)}
      id="top"
      lang={locale}
    >
      <div className="page-frame">
        <header className="site-header">
          <a
            className="wordmark"
            href={localePath("/", locale)}
            aria-label={messages.header.wordmarkAria}
          >
            <span className="wordmark-hxh">
              H<span className="wordmark-times">&times;</span>H
            </span>
            <span className="wordmark-status">Status</span>
          </a>
          <div className="header-meta">
            <div className="updated-label">
              <span className="live-dot" aria-hidden="true" />
              {formatMessage(messages.header.updated, {
                date: formatDate(
                  lastUpdated,
                  { month: "short", day: "numeric" },
                  locale,
                ),
              })}
            </div>
            <LanguageSwitcher
              label={messages.language.label}
              locale={locale}
              path={path}
            />
          </div>
        </header>

        <nav aria-label={messages.nav.breadcrumb} className="breadcrumb">
          <ol>
            {trail.map((crumb, index) => (
              <li key={crumb.path}>
                {index === trail.length - 1 ? (
                  <span aria-current="page">{crumb.name}</span>
                ) : (
                  <a href={localePath(crumb.path, locale)}>{crumb.name}</a>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <article className="content-page">
          <header className="content-page-head">
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h1>{title}</h1>
            {lede ? <p className="page-lede">{lede}</p> : null}
          </header>
          {children}
        </article>

        <nav aria-label={messages.nav.explore} className="page-links">
          <p className="eyebrow">{messages.nav.explore}</p>
          <ul>
            <li>
              <a href={localePath("/", locale)}>{messages.nav.backToTracker}</a>
            </li>
            {CONTENT_PAGES.filter(
              (page) => contentPagePath(page) !== path,
            ).map((page) => (
              <li key={page}>
                <a href={localePath(contentPagePath(page), locale)}>
                  {pageName(messages, page)}
                </a>
              </li>
            ))}
            {ARC_PAGES.filter((arc) => arcPath(arc) !== path).map((arc) => (
              <li key={arc}>
                <a href={localePath(arcPath(arc), locale)}>
                  {messages.pages.arc.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <SiteFooter messages={messages} />
      </div>

      <JsonLd
        data={graph(
          publisherLd(messages.metadata.siteName),
          webSiteLd({
            siteName: messages.metadata.siteName,
            description: messages.metadata.description,
            locale,
          }),
          breadcrumbLd(
            trail.map((crumb) => ({
              name: crumb.name,
              url: localeUrl(crumb.path, locale),
            })),
          ),
          ...(jsonLd ?? []),
        )}
      />
    </main>
  );
}

export { SiteFooter };
