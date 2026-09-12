import type { Locale, Messages } from "@/lib/i18n";
import { ContentShell } from "../content-shell";
import { GITHUB_REPOSITORY } from "../structured-data";

export const ABOUT_PATH = "/about";

const HIATUS_CHART = "https://github.com/hiatus-hiatus/hiatus-hiatus.github.io";

export function aboutMetadata(messages: Messages) {
  return {
    title: messages.pages.about.metaTitle,
    description: messages.pages.about.metaDescription,
  };
}

export function AboutPage({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages;
}) {
  const copy = messages.pages.about;

  return (
    <ContentShell
      locale={locale}
      messages={messages}
      path={ABOUT_PATH}
      title={copy.h1}
      lede={copy.lede}
    >
      <section aria-labelledby="about-rules-title" className="content-section">
        <div className="section-heading">
          <div>
            <h2 id="about-rules-title">{copy.rulesTitle}</h2>
          </div>
        </div>
        <ol className="rule-list">
          <li>{copy.rule1}</li>
          <li>{copy.rule2}</li>
          <li>{copy.rule3}</li>
          <li>{copy.rule4}</li>
        </ol>
      </section>

      <section aria-labelledby="about-sources-title" className="content-section">
        <div className="section-heading">
          <div>
            <h2 id="about-sources-title">{copy.sourcesTitle}</h2>
          </div>
        </div>
        <p className="prose">{copy.sourcesBody}</p>
        <ul className="reader-list">
          <li>
            <a
              href="https://x.com/Un4v5s8bgsVk9Xp"
              rel="noreferrer"
              target="_blank"
            >
              Yoshihiro Togashi on X
            </a>
          </li>
          <li>
            <a
              href="https://www.viz.com/shonenjump/chapters/hunter-x-hunter"
              rel="noreferrer"
              target="_blank"
            >
              VIZ Shonen Jump
            </a>
          </li>
          <li>
            <a
              href="https://mangaplus.shueisha.co.jp/titles/100015"
              rel="noreferrer"
              target="_blank"
            >
              MANGA Plus
            </a>
          </li>
        </ul>
      </section>

      <section
        aria-labelledby="about-corrections-title"
        className="content-section"
      >
        <div className="section-heading">
          <div>
            <h2 id="about-corrections-title">{copy.correctionsTitle}</h2>
          </div>
        </div>
        <p className="prose">{copy.correctionsBody}</p>
        <p className="prose">
          <a
            href={`${GITHUB_REPOSITORY}/commits/main/app/data/status-data.json`}
            rel="noreferrer"
            target="_blank"
          >
            {copy.correctionsLink}
          </a>
        </p>
      </section>

      <section aria-labelledby="about-who-title" className="content-section">
        <div className="section-heading">
          <div>
            <h2 id="about-who-title">{copy.whoTitle}</h2>
          </div>
        </div>
        <p className="prose">{copy.whoBody}</p>
        <p className="prose">
          <a href={GITHUB_REPOSITORY} rel="noreferrer" target="_blank">
            {GITHUB_REPOSITORY.replace("https://", "")}
          </a>
        </p>
      </section>

      <section aria-labelledby="about-credits-title" className="content-section">
        <div className="section-heading">
          <div>
            <h2 id="about-credits-title">{copy.creditsTitle}</h2>
          </div>
        </div>
        <p className="prose">{copy.creditsBody}</p>
        <p className="prose">
          <a href={HIATUS_CHART} rel="noreferrer" target="_blank">
            HUNTER×HUNTER Hiatus Chart
          </a>
        </p>
      </section>
    </ContentShell>
  );
}
