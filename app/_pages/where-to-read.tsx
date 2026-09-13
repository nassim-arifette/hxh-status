import {
  formatMessage,
  getLocaleLabel,
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

// Reviewed against the linked publisher pages on 2026-09-12.
// Language refers to the linked edition, not the visitor's UI language.
const readingOptions: Record<Locale, { label: string; href: string; kind: "viz" | "plus" | "print" | "jump" | "catalog"; source?: string }[]> = {
  en: [
    { label: "VIZ Shonen Jump", href: "https://www.viz.com/shonenjump/chapters/hunter-x-hunter", kind: "viz", source: "https://www.viz.com/company-faq" },
    { label: "MANGA Plus", href: "https://mangaplus.shueisha.co.jp/titles/100015", kind: "plus", source: "https://mangaplus.shueisha.co.jp/faq/eng/" },
  ],
  fr: [{ label: "Kana", href: "https://www.kana.fr/series/hunter-x-hunter/", kind: "print" }],
  ja: [
    { label: "少年ジャンプ＋", href: "https://shonenjumpplus.com/search?q=HUNTER%C3%97HUNTER", kind: "jump", source: "https://shonenjumpplus.com/article/help" },
    { label: "ゼブラック", href: "https://zebrack-comic.shueisha.co.jp/main/manga", kind: "catalog" },
  ],
  pt: [
    { label: "MANGA MILLION", href: "https://mangamillion.shueisha.co.jp/pt-BR/title/121", kind: "catalog" },
    { label: "Editora JBC", href: "https://editorajbc.com.br/mangas/colecao/hunter-x-hunter/", kind: "print" },
  ],
  zh: [{ label: "MANGA MILLION", href: "https://mangamillion.shueisha.co.jp/zh-CN/title/121", kind: "catalog" }],
  es: [], ar: [],
};

function ReaderList({ language, locale, messages }: { language: Locale; locale: Locale; messages: Messages }) {
  const regions = new Intl.DisplayNames([locale], { type: "region" });
  const countries = new Intl.ListFormat(locale).format(["US", "CA", "GB", "IE", "NZ", "AU", "ZA", "PH", "SG", "IN"].map(code => regions.of(code)!));
  const copy = messages.pages.whereToRead.offers;
  return <div className="reader-options">{readingOptions[language].map(reader => <article className="reader-option" key={reader.href}>
    <h3><a href={reader.href} rel="noreferrer" target="_blank">{reader.label} ↗</a></h3>
    <p>{formatMessage(copy[reader.kind], { countries })}</p>
    {reader.source && <a href={reader.source} rel="noreferrer" target="_blank">{copy.conditions} ↗</a>}
  </article>)}</div>;
}

export function WhereToReadPage({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages;
}) {
  const copy = messages.pages.whereToRead;
  const own = readingOptions[locale];
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
          <ReaderList language={locale} locale={locale} messages={messages} />
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
                {readingOptions[candidate].length === 0 ? (
                  copy.noneForLanguage
                ) : (
                  <ReaderList language={candidate} locale={locale} messages={messages} />
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </ContentShell>
  );
}
