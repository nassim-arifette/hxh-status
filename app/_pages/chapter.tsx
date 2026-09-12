import {
  formatMessage,
  getOfficialReaders,
  type Locale,
  type Messages,
} from "@/lib/i18n";
import { chapterPath, localePath, localeUrl, updatePath } from "@/lib/routes";
import { ReleaseForecast } from "../release-forecast";
import { getChapterPosts, postExcerpt } from "../data/updates";
import { ContentShell } from "../content-shell";
import { getArcName } from "../data/arcs";
import { getVolumeLabel } from "../data/chapter-meta";
import { getAdjacentChapters, getChapterArcId } from "../data/chapter-pages";
import { getChapterOriginalTitle, getChapterTitle } from "../data/chapter-titles";
import type { ChapterRecord } from "../data/status";
import { formatDate, getStatusMeta } from "../status-presentation";
import { comicIssueLd } from "../structured-data";

function releaseDate(chapter: ChapterRecord) {
  return chapter.releaseAt?.slice(0, 10);
}

export function chapterMetadata(
  chapter: ChapterRecord,
  locale: Locale,
  messages: Messages,
) {
  const copy = messages.pages.chapter;
  const published = chapter.status === "published";
  const date = releaseDate(chapter);

  if (published && date) {
    const values = {
      chapter: chapter.chapter,
      date: formatDate(date, undefined, locale),
      issue: chapter.jumpIssue ?? "—",
    };
    return {
      title: formatMessage(copy.metaTitlePublished, values),
      description: formatMessage(copy.metaDescriptionPublished, values),
    };
  }

  const values = {
    chapter: chapter.chapter,
    status: getStatusMeta(messages.statuses)[chapter.status].label,
    date: formatDate(chapter.updatedAt, undefined, locale),
  };
  return {
    title: formatMessage(copy.metaTitlePending, values),
    description: formatMessage(copy.metaDescriptionPending, values),
  };
}

export function ChapterPage({
  chapter,
  locale,
  messages,
}: {
  chapter: ChapterRecord;
  locale: Locale;
  messages: Messages;
}) {
  const copy = messages.pages.chapter;
  const number = chapter.chapter;
  const path = chapterPath(number);
  const statusMeta = getStatusMeta(messages.statuses)[chapter.status];
  const published = chapter.status === "published";
  const date = releaseDate(chapter);
  const title = getChapterTitle(number, locale);
  const originalTitle = getChapterOriginalTitle(number);
  const arcName = getArcName(getChapterArcId(number), locale);
  const { previous, next } = getAdjacentChapters(number);
  const readers = getOfficialReaders(locale, number);
  const meta = chapterMetadata(chapter, locale, messages);
  const history = getChapterPosts(number, chapter.source);

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: copy.stage, value: statusMeta.label },
    {
      label: published ? copy.releaseDate : copy.confirmedOn,
      value:
        published && date
          ? formatDate(date, undefined, locale)
          : chapter.updatedAt
            ? formatDate(chapter.updatedAt, undefined, locale)
            : copy.noDate,
    },
  ];

  if (chapter.jumpIssue) {
    rows.push({
      label: copy.jumpIssue,
      value: formatMessage(messages.chapter.issue, { issue: chapter.jumpIssue }),
    });
  }
  if (title) {
    rows.push({
      label: copy.chapterTitle,
      value:
        originalTitle && originalTitle !== title ? (
          <>
            {title} <span lang="ja">（{originalTitle}）</span>
          </>
        ) : (
          title
        ),
    });
  }
  rows.push({ label: copy.volume, value: getVolumeLabel(number, locale) });
  if (arcName) rows.push({ label: copy.arc, value: arcName });
  rows.push({
    label: copy.source,
    value: chapter.source ? (
      <a href={chapter.source} rel="noreferrer" target="_blank">
        {chapter.sourceLabel ?? messages.chapter.viewSource}
      </a>
    ) : (
      copy.noSource
    ),
  });

  return (
    <ContentShell
      locale={locale}
      messages={messages}
      path={path}
      eyebrow={arcName ?? messages.production.eyebrow}
      title={formatMessage(copy.h1, { chapter: number })}
      lede={
        published && date
          ? formatMessage(copy.publishedLede, {
              chapter: number,
              date: formatDate(date, undefined, locale),
              issue: chapter.jumpIssue ?? "—",
            })
          : formatMessage(copy.pendingLede, {
              chapter: number,
              status: statusMeta.label,
              date: chapter.updatedAt
                ? formatDate(chapter.updatedAt, undefined, locale)
                : copy.noDate,
            })
      }
      jsonLd={[
        comicIssueLd({
          chapter: number,
          url: localeUrl(path, locale),
          locale,
          name: title,
          datePublished: published ? date : undefined,
          jumpIssue: chapter.jumpIssue,
          description: meta.description,
        }),
      ]}
    >
      <section aria-labelledby="chapter-facts-title" className="content-section">
        <div className="section-heading">
          <div>
            <h2 id="chapter-facts-title">{copy.trackerTitle}</h2>
          </div>
        </div>
        <dl className="fact-list">
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {published && readers.length > 0 ? (
        <section aria-labelledby="chapter-read-title" className="content-section">
          <div className="section-heading">
            <div>
              <h2 id="chapter-read-title">
                {formatMessage(copy.readTitle, { chapter: number })}
              </h2>
            </div>
          </div>
          <ul className="reader-list">
            {readers.map((reader) => (
              <li key={reader.href}>
                <a href={reader.href} rel="noreferrer" target="_blank">
                  {reader.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="content-section" aria-labelledby="chapter-history-title">
        <h2 id="chapter-history-title">{formatMessage(copy.chronologyTitle, { chapter: number })}</h2>
        <p className="prose">{copy.chronologyIntro}</p>
        {history.length ? <ol className="update-list">
          {history.map(post => <li className="update-card" key={post.id}>
            <time dateTime={post.createdAt}>{formatDate(post.createdAt.slice(0, 10), undefined, locale)}</time>
            <p className="update-excerpt">{postExcerpt(post, locale) || messages.pages.updates.imagePost}</p>
            <a href={localePath(updatePath(post.id), locale)}>{messages.pages.updates.readMore}</a>
          </li>)}
        </ol> : <p className="prose">{copy.chronologyEmpty}</p>}
        {!published ? <p className="section-note">{copy.chapterContext}</p> : null}
      </section>
      <ReleaseForecast chapter={chapter} locale={locale} messages={messages} />

      <nav aria-label={messages.nav.breadcrumb} className="chapter-pager">
        {previous ? (
          <a href={localePath(chapterPath(previous), locale)} rel="prev">
            <span>{copy.previous}</span>
            <strong>{previous}</strong>
          </a>
        ) : (
          <span />
        )}
        {next ? (
          <a href={localePath(chapterPath(next), locale)} rel="next">
            <span>{copy.next}</span>
            <strong>{next}</strong>
          </a>
        ) : (
          <span />
        )}
      </nav>
    </ContentShell>
  );
}
