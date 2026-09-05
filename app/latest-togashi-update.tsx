import Image from "next/image";
import { ChevronDown, ExternalLink } from "lucide-react";

import { formatMessage, type Locale, type Messages } from "@/lib/i18n";
import feedData from "./data/togashi-posts.json";
import { formatDate } from "./status-presentation";
import styles from "./latest-togashi-update.module.css";

type TogashiPost = {
  author: { name: string; screenName: string };
  createdAt: string;
  url: string;
  originalText: string;
  mediaUrls: string[];
  imageTexts?: {
    imageIndex: number;
    originalText: string;
    translations: Record<Locale, string>;
  }[];
  translation: {
    status: string;
    provider: string | null;
    texts: Partial<Record<Locale, string>> | null;
  };
};

function linkLabel(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function PostText({ text, compactLinks = false }: { text: string; compactLinks?: boolean }) {
  return text.split(/(https?:\/\/[^\s]+)/u).map((part, index) =>
    /^https?:\/\//u.test(part) ? (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noreferrer"
        className={compactLinks ? styles.inlineLink : undefined}
        title={compactLinks ? part : undefined}
        aria-label={compactLinks ? part : undefined}
      >
        {compactLinks ? linkLabel(part) : part}
        {compactLinks ? <ExternalLink size={12} aria-hidden="true" /> : null}
      </a>
    ) : (
      part
    ),
  );
}

export default function LatestTogashiUpdate({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages["latestUpdate"];
}) {
  // The validated public feed is newest first, including posts that do not
  // change a chapter's production status. Use its cached translations.
  const post: TogashiPost | undefined = feedData.posts[0];
  const translation =
    post?.translation.status === "available"
      ? post.translation.texts?.[locale]
      : undefined;
  const translated = locale !== "ja" && Boolean(translation);
  const text = translation || post?.originalText;
  const translationLabel = translated
    ? post?.translation.provider === "gemini"
      ? messages.translatedByGemini
      : messages.translated
    : locale === "ja"
      ? messages.originalText
      : messages.translationUnavailable;

  return (
    <section
      id="latest-togashi-update"
      className={styles.update}
      aria-labelledby="latest-update-title"
    >
      <div className={styles.header}>
        <h2 id="latest-update-title" className="eyebrow">
          {messages.eyebrow}
        </h2>
        {post ? (
          <a className={`source-link ${styles.source}`} href={post.url} target="_blank" rel="noreferrer">
            {messages.viewPost}
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        ) : null}
      </div>

      {post && text ? (
        <div className={styles.body} data-has-media={post.mediaUrls.length > 0}>
          <div className={styles.copy}>
            <div className={styles.byline}>
              <div className={styles.author}>
                <strong><bdi>{post.author.name}</bdi></strong>
                <span dir="ltr">@{post.author.screenName}</span>
              </div>
              <time className={styles.date} dateTime={post.createdAt}>
                {formatDate(post.createdAt.slice(0, 10), undefined, locale)}
              </time>
            </div>

            <blockquote className={styles.text} lang={translated ? locale : "ja"} dir={translated ? undefined : "ltr"}>
              <PostText text={text} compactLinks />
            </blockquote>

            {translated ? (
              <details className={styles.original}>
                <summary>
                  <span className={styles.translation}>{translationLabel}</span>
                  <span className={styles.originalToggle}>
                    {messages.showOriginal}
                    <ChevronDown size={14} aria-hidden="true" />
                  </span>
                </summary>
                <blockquote className={styles.originalText} lang="ja" dir="ltr">
                  <PostText text={post.originalText} />
                </blockquote>
              </details>
            ) : <p className={styles.translation}>{translationLabel}</p>}
          </div>

          {post.mediaUrls.length > 0 ? (
            <div className={styles.media} data-count={post.mediaUrls.length}>
              {post.mediaUrls.map((url, index) => (
                <a key={url} className={styles.imageLink} href={url} target="_blank" rel="noreferrer">
                  <Image
                    src={url}
                    alt={formatMessage(messages.imageAlt, { index: index + 1 })}
                    fill
                    unoptimized
                    sizes="(max-width: 540px) 112px, 168px"
                    className={styles.image}
                  />
                  <span className={styles.imageAction} aria-hidden="true">
                    <ExternalLink size={15} />
                  </span>
                </a>
              ))}
            </div>
          ) : null}
          {post.imageTexts?.length ? (
            <div className={styles.imageTexts}>
              {post.imageTexts.map((image) => (
                <details className={styles.original} key={image.imageIndex}>
                  <summary>
                    <span className={styles.originalToggle}>
                      {formatMessage(messages.imageText, { index: image.imageIndex })}
                      <ChevronDown size={14} aria-hidden="true" />
                    </span>
                    <span className={styles.translation}>{messages.imageTextByGemini}</span>
                  </summary>
                  <p className={styles.originalText} lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
                    {image.translations[locale]}
                  </p>
                  {locale !== "ja" ? (
                    <details className={styles.imageOriginal}>
                      <summary>{messages.showOriginal}</summary>
                      <p className={styles.originalText} lang="ja" dir="ltr">{image.originalText}</p>
                    </details>
                  ) : null}
                </details>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className={styles.empty}>{messages.noPost}</p>
      )}
    </section>
  );
}
