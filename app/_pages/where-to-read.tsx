import {
  formatMessage,
  getLocaleLabel,
  getOfficialReaders,
  publicLocales,
  type Locale,
  type Messages,
} from "@/lib/i18n";
import { ContentShell } from "../content-shell";
import { latestPublished } from "../data/status";

export const WHERE_TO_READ_PATH = "/where-to-read";

export function whereToReadMetadata(messages: Messages) {
  return {
    title: messages.pages.whereToRead.metaTitle,
    description: messages.pages.whereToRead.metaDescription,
  };
}

function ReaderList({ locale }: { locale: Locale }) {
  const readers = getOfficialReaders(locale);
  return (
    <ul className="reader-list">
      {readers.map((reader) => (
        <li key={`${locale}-${reader.href}`}>
          <a href={reader.href} rel="noreferrer" target="_blank">
            {reader.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function WhereToReadPage({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages;
}) {
  const copy = messages.pages.whereToRead;
  const own = getOfficialReaders(locale);
  const others = publicLocales.filter((candidate) => candidate !== locale);

  return (
    <ContentShell
      locale={locale}
      messages={messages}
      path={WHERE_TO_READ_PATH}
      title={copy.h1}
      lede={copy.lede}
    >
      <section aria-labelledby="read-own-title" className="content-section">
        <div className="section-heading">
          <div>
            <h2 id="read-own-title">
              {formatMessage(copy.yourLanguage, {
                language: getLocaleLabel(locale),
              })}
            </h2>
          </div>
        </div>
        {own.length === 0 ? (
          <p className="prose">{copy.noneForLanguage}</p>
        ) : (
          <ReaderList locale={locale} />
        )}
        <p className="section-note">
          {formatMessage(copy.latestNote, { chapter: latestPublished.chapter })}
        </p>
      </section>

      <section aria-labelledby="read-others-title" className="content-section">
        <div className="section-heading">
          <div>
            <h2 id="read-others-title">{copy.allLanguages}</h2>
          </div>
        </div>
        <dl className="fact-list">
          {others.map((candidate) => (
            <div key={candidate}>
              <dt lang={candidate}>{getLocaleLabel(candidate)}</dt>
              <dd>
                {getOfficialReaders(candidate).length === 0 ? (
                  copy.noneForLanguage
                ) : (
                  <ReaderList locale={candidate} />
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </ContentShell>
  );
}
