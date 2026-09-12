import { formatMessage, publicLocales, type Locale, type Messages } from "@/lib/i18n";
import { localePath, updatePath } from "@/lib/routes";
import { ContentShell } from "../content-shell";
import { postExcerpt, togashiPosts } from "../data/updates";
import { formatDate } from "../status-presentation";

export const UPDATES_PATH = "/updates";

export function updatesMetadata(messages: Messages) {
  return {
    title: messages.pages.updates.metaTitle,
    description: formatMessage(messages.pages.updates.metaDescription, {
      count: publicLocales.length,
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
      lede={copy.lede}
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
              const change = post.tracker?.changes?.[0];
              return (
                <li className="update-card" key={post.id}>
                  <time dateTime={post.createdAt}>
                    {formatDate(post.createdAt.slice(0, 10), undefined, locale)}
                  </time>
                  <p className="update-excerpt">
                    {postExcerpt(post, locale)}
                  </p>
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
                  </a>
                </li>
              );
            })}
          </ol>
        )}

        <p className="section-note">
          {formatMessage(copy.archiveNote, { count: 50 })}
        </p>
      </section>
    </ContentShell>
  );
}
