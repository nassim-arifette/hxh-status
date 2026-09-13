import { formatMessage, type Locale, type Messages } from "@/lib/i18n";
import { localeUrl, updatePath } from "@/lib/routes";
import { ContentShell } from "../content-shell";
import { postExcerpt, postText, type TogashiPost } from "../data/updates";
import { formatDate } from "../status-presentation";
import { newsArticleLd } from "../structured-data";
import { UPDATES_PATH } from "./updates";

function changeStatus(messages: Messages, status: string) {
  const known = messages.statuses[status as keyof Messages["statuses"]];
  return known ? known.shortLabel : status;
}

export function updateMetadata(
  post: TogashiPost,
  locale: Locale,
  messages: Messages,
) {
  const copy = messages.pages.update;
  const date = formatDate(post.createdAt.slice(0, 10), undefined, locale);
  const change = post.tracker?.changes?.[0];

  return {
    title: change
      ? formatMessage(copy.metaTitle, {
          date,
          chapter: change.chapter,
          status: changeStatus(messages, change.to),
        })
      : formatMessage(copy.metaTitleGeneric, { date }),
    description: postExcerpt(post, locale) || formatMessage(copy.metaDescription, { date }),
  };
}

export function UpdatePage({
  locale,
  messages,
  post,
}: {
  locale: Locale;
  messages: Messages;
  post: TogashiPost;
}) {
  const copy = messages.pages.update;
  const path = updatePath(post.id);
  const date = formatDate(post.createdAt.slice(0, 10), undefined, locale);
  const { text, translated } = postText(post, locale);
  const meta = updateMetadata(post, locale, messages);
  const changes = post.tracker?.changes ?? [];

  return (
    <ContentShell
      locale={locale}
      messages={messages}
      path={path}
      crumbs={[{ name: messages.pages.updates.name, path: UPDATES_PATH }]}
      eyebrow={messages.latestUpdate.eyebrow}
      title={formatMessage(copy.h1, { date })}
      jsonLd={[
        newsArticleLd({
          url: localeUrl(path, locale),
          headline: meta.title,
          description: meta.description,
          datePublished: post.createdAt,
          locale,
          siteName: messages.metadata.siteName,
          images: post.mediaUrls,
          citation: post.url,
        }),
      ]}
    >
      <section aria-labelledby="update-text-title" className="content-section">
        <h2 className="sr-only" id="update-text-title">
          {copy.originalTitle}
        </h2>
        <blockquote
          className="update-quote"
          cite={post.url}
          dir={translated ? undefined : "ltr"}
          lang={translated ? locale : "ja"}
        >
          {text}
        </blockquote>
        <p className="update-meta">
          <span>
            <bdi>{post.author.name}</bdi> <span dir="ltr">@{post.author.screenName}</span>
          </span>
          <time dateTime={post.createdAt}>{date}</time>
          <a href={post.url} rel="noreferrer" target="_blank">
            {messages.latestUpdate.viewPost}
          </a>
        </p>

        <p className="section-note">
          {translated
            ? post.translation.provider === "gemini" ? messages.latestUpdate.translatedByGemini : messages.latestUpdate.translated
            : locale === "ja" ? messages.latestUpdate.originalText : messages.latestUpdate.translationUnavailable}
        </p>

        {translated ? (
          <details className="update-original">
            <summary>{copy.originalTitle}</summary>
            <blockquote dir="ltr" lang="ja">
              {post.originalText}
            </blockquote>
          </details>
        ) : null}

        {post.mediaUrls.length > 0 ? (
          <ul className="update-media">
            {post.mediaUrls.map((url, index) => (
              <li key={url}>
                <a href={url} rel="noreferrer" target="_blank">
                  {/* Twitter's CDN is the only remote image origin the CSP
                      allows, and these are served unoptimised in the export. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={formatMessage(messages.latestUpdate.imageAlt, {
                      index: index + 1,
                    })}
                    loading="lazy"
                    src={url}
                  />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-labelledby="update-change-title" className="content-section">
        <div className="section-heading">
          <div>
            <h2 id="update-change-title">{copy.changeTitle}</h2>
          </div>
        </div>
        {changes.length === 0 ? (
          <p className="prose">{copy.noChange}</p>
        ) : (
          <ul className="update-changes">
            {changes.map((change) => (
              <li key={`${change.chapter}-${change.to}`}>
                {formatMessage(copy.changeRow, {
                  chapter: change.chapter,
                  from: changeStatus(messages, change.from),
                  to: changeStatus(messages, change.to),
                })}
              </li>
            ))}
          </ul>
        )}
      </section>

      {post.imageTexts?.length ? (
        <section aria-labelledby="update-sheet-title" className="content-section">
          <div className="section-heading">
            <div>
              <h2 id="update-sheet-title">{copy.sheetTitle}</h2>
            </div>
          </div>
          {post.imageTexts.map((image) => (
            <details className="update-sheet" key={image.imageIndex}>
              <summary>{formatMessage(messages.latestUpdate.imageText, { index: image.imageIndex })}</summary>
              <p className="section-note">
                {formatMessage(messages.latestUpdate.imageText, {
                  index: image.imageIndex,
                })}
                {" · "}
                {messages.latestUpdate.imageTextByGemini}
              </p>
              <pre className="update-sheet-text" lang={locale}>
                {image.translations[locale] ?? image.originalText}
              </pre>
              {locale !== "ja" ? (
                <details className="update-original">
                  <summary>{copy.originalTitle}</summary>
                  <pre className="update-sheet-text" dir="ltr" lang="ja">
                    {image.originalText}
                  </pre>
                </details>
              ) : null}
            </details>
          ))}
        </section>
      ) : null}
    </ContentShell>
  );
}
