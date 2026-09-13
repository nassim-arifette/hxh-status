import { formatMessage, publicLocales, type Locale, type Messages } from "@/lib/i18n";
import { localePath, updatePath } from "@/lib/routes";
import { ContentShell } from "../content-shell";
import { postText, togashiPosts } from "../data/updates";
import { formatDate } from "../status-presentation";

export const UPDATES_PATH = "/updates";

export function updatesMetadata(messages: Messages) {
  return {
    title: messages.pages.updates.metaTitle,
    description: formatMessage(messages.pages.updates.metaDescription, {
      count: publicLocales.length,
      posts: togashiPosts.length,
    }),
  };
}

export function UpdatesPage({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages;
}) {
  const copy = messages.pages.updates;

  return (
    <ContentShell
      locale={locale}
      messages={messages}
      path={UPDATES_PATH}
      eyebrow={messages.latestUpdate.eyebrow}
      title={copy.h1}
      lede={formatMessage(copy.metaDescription, { posts: togashiPosts.length, count: publicLocales.length })}
    >
      <section aria-labelledby="updates-list-title" className="content-section">
        <h2 className="sr-only" id="updates-list-title">
          {copy.h1}
        </h2>

        {togashiPosts.length === 0 ? (
          <p className="prose">{copy.empty}</p>
        ) : (
          <ol className="update-list">
            {togashiPosts.map((post) => {
              const { text, translated } = postText(post, locale);
              const change = post.tracker?.changes?.[0];
              return (
                <li className="update-card" key={post.id}>
                  <time dateTime={post.createdAt}>
                    {formatDate(post.createdAt.slice(0, 10), undefined, locale)}
                  </time>
                  <p className="update-excerpt" lang={translated ? locale : "ja"}>
                    {text || copy.imagePost}
                  </p>
                  <p className="section-note">{translated ? messages.latestUpdate.translated : locale === "ja" ? messages.latestUpdate.originalText : messages.latestUpdate.translationUnavailable}</p>
                  {post.mediaUrls.length > 0 && <ul className="update-media">{post.mediaUrls.map((url, index) => <li key={url}><a href={url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={formatMessage(messages.latestUpdate.imageAlt, { index: index + 1 })} loading="lazy" />
                  </a></li>)}</ul>}
                  {change ? (
                    <p className="update-change">
                      {formatMessage(messages.pages.update.changeRow, {
                        chapter: change.chapter,
                        from: messages.statuses[
                          change.from as keyof Messages["statuses"]
                        ].shortLabel,
                        to: messages.statuses[
                          change.to as keyof Messages["statuses"]
                        ].shortLabel,
                      })}
                    </p>
                  ) : null}
                  <a href={localePath(updatePath(post.id), locale)}>
                    {copy.readMore}
                  </a>{" · "}<a href={post.url} target="_blank" rel="noreferrer">{messages.latestUpdate.viewPost}</a>
                </li>
              );
            })}
          </ol>
        )}

        <p className="section-note">
          {togashiPosts.length > 0 ? formatMessage(copy.archiveNote, {
            count: togashiPosts.length,
            start: formatDate(togashiPosts.at(-1)!.createdAt.slice(0, 10), undefined, locale),
            end: formatDate(togashiPosts[0].createdAt.slice(0, 10), undefined, locale),
          }) : null}
        </p>
      </section>
    </ContentShell>
  );
}
