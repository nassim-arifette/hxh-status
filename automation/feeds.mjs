import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const DEFAULT_ORIGIN = "https://hxhstatus.com";

function escapeXml(unsafe) {
  if (typeof unsafe !== "string") return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc3339(date) {
  return new Date(date).toISOString();
}

function toIcalDate(date) {
  return new Date(date)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export function generateAtomFeed({
  locale,
  messages,
  statusData,
  togashiPosts = [],
  origin = DEFAULT_ORIGIN,
}) {
  const isEn = locale === "en";
  const feedPath = isEn ? "/feed.xml" : `/${locale}/feed.xml`;
  const localePath = isEn ? "/" : `/${locale}`;

  const feedTitle = messages?.metadata?.title ?? "HxH Status";
  const feedSubtitle =
    messages?.metadata?.description ??
    "A sourced HUNTER×HUNTER chapter release and production tracker.";

  const entries = [];

  // Chapter status updates
  const validChapters = (statusData?.chapters ?? []).filter(
    (c) => c.status !== "unknown" && (c.updatedAt || c.releaseAt),
  );

  for (const chapter of validChapters) {
    const rawDate = chapter.updatedAt
      ? `${chapter.updatedAt}T00:00:00Z`
      : chapter.releaseAt;
    const date = toRfc3339(rawDate);

    const titleTemplate =
      messages?.push?.milestoneTitle?.[chapter.status] ??
      `Ch. {chapter}: ${chapter.status}`;
    const title = titleTemplate.replace("{chapter}", String(chapter.chapter));

    const bodyDesc =
      messages?.push?.milestoneBody?.[chapter.status] ??
      messages?.statuses?.[chapter.status]?.description ??
      "";

    const link =
      chapter.source ??
      (isEn
        ? `${origin}/#chapter-${chapter.chapter}`
        : `${origin}/${locale}#chapter-${chapter.chapter}`);

    const author =
      chapter.sourceType === "togashi-x"
        ? "Yoshihiro Togashi"
        : "Weekly Shonen Jump";

    const id = `tag:hxhstatus.com,2026:chapter-${chapter.chapter}-${chapter.status}`;

    let htmlContent = `<p>${escapeXml(bodyDesc)}</p>`;
    if (chapter.jumpIssue) {
      htmlContent += `<p>Weekly Shonen Jump Issue ${escapeXml(chapter.jumpIssue)}</p>`;
    }
    if (chapter.releaseAt) {
      htmlContent += `<p>Release: ${escapeXml(chapter.releaseAt)}</p>`;
    }
    htmlContent += `<p><a href="${escapeXml(link)}">Source / Details</a></p>`;

    entries.push({
      id,
      title,
      link,
      updated: date,
      published: date,
      author,
      summary: bodyDesc,
      contentHtml: htmlContent,
    });
  }

  // Togashi posts
  for (const post of togashiPosts) {
    const date = toRfc3339(post.createdAt);
    const available = post.translation?.status === "available";
    const text =
      available && post.translation?.texts?.[locale]
        ? post.translation.texts[locale]
        : post.originalText;

    const cleanText = (text ?? "").replace(/https:\/\/t\.co\/\S+/g, "").trim();
    const prefix = messages?.push?.onePost ?? "New Togashi post";
    const title = cleanText
      ? `${prefix}: ${cleanText.length > 80 ? cleanText.slice(0, 77) + "..." : cleanText}`
      : prefix;

    const id = `tag:hxhstatus.com,2026:post-${post.id}`;
    const author = post.author?.name ?? "Yoshihiro Togashi";

    let htmlContent = `<p>${escapeXml(text)}</p>`;
    if (available && post.originalText && post.originalText !== text) {
      htmlContent += `<p><em>Original Japanese:</em> ${escapeXml(post.originalText)}</p>`;
    }
    if (Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0) {
      for (const mediaUrl of post.mediaUrls) {
        htmlContent += `<p><img src="${escapeXml(mediaUrl)}" alt="Yoshihiro Togashi post image" /></p>`;
      }
    }
    htmlContent += `<p><a href="${escapeXml(post.url)}">View post on X</a></p>`;

    entries.push({
      id,
      title,
      link: post.url,
      updated: date,
      published: date,
      author,
      authorUri: `https://x.com/${post.author?.screenName ?? "Un4v5s8bgsVk9Xp"}`,
      summary: cleanText || text,
      contentHtml: htmlContent,
    });
  }

  // Sort newest first
  entries.sort(
    (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime(),
  );

  const feedUpdated = entries[0]?.updated ?? toRfc3339(statusData?.lastUpdated ?? new Date());

  const xmlEntries = entries.map((entry) => {
    return `  <entry>
    <id>${escapeXml(entry.id)}</id>
    <title type="text">${escapeXml(entry.title)}</title>
    <link rel="alternate" href="${escapeXml(entry.link)}" />
    <updated>${entry.updated}</updated>
    <published>${entry.published}</published>
    <author>
      <name>${escapeXml(entry.author)}</name>${entry.authorUri ? `\n      <uri>${escapeXml(entry.authorUri)}</uri>` : ""}
    </author>
    <summary type="text">${escapeXml(entry.summary)}</summary>
    <content type="html">${escapeXml(entry.contentHtml)}</content>
  </entry>`;
  });

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${escapeXml(locale)}">
  <id>${origin}${feedPath}</id>
  <title type="text">${escapeXml(feedTitle)}</title>
  <subtitle type="text">${escapeXml(feedSubtitle)}</subtitle>
  <updated>${feedUpdated}</updated>
  <link rel="self" href="${origin}${feedPath}" type="application/atom+xml" />
  <link rel="alternate" href="${origin}${localePath}" type="text/html" />
  <author>
    <name>HxH Status</name>
    <uri>${origin}</uri>
  </author>
  <icon>${origin}/favicon.svg</icon>
  <logo>${origin}/icon-192.png</logo>
${xmlEntries.join("\n")}
</feed>
`;
}

export function generateReleasesIcs({
  statusData,
  origin = DEFAULT_ORIGIN,
}) {
  const events = (statusData?.chapters ?? []).filter(
    (c) => (c.status === "scheduled" || c.status === "published") && c.releaseAt,
  );

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HxH Status//HUNTERxHUNTER Releases//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:HUNTER×HUNTER Chapter Releases",
    "X-WR-CALDESC:Official scheduled HUNTER×HUNTER chapter release dates",
    "X-WR-TIMEZONE:Asia/Tokyo",
  ];

  for (const chapter of events) {
    const startDate = new Date(chapter.releaseAt);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const dtstamp = toIcalDate(chapter.releaseAt);
    const dtstart = toIcalDate(startDate);
    const dtend = toIcalDate(endDate);

    const issueText = chapter.jumpIssue
      ? `Weekly Shonen Jump Issue ${chapter.jumpIssue}`
      : "Weekly Shonen Jump";
    const statusText =
      chapter.status === "scheduled" ? "Scheduled release" : "Official release";
    const summary = `HUNTER×HUNTER Chapter ${chapter.chapter}`;
    const description = `${statusText} in ${issueText}.\\n${origin}`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:chapter-${chapter.chapter}-release@hxhstatus.com`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `URL:${origin}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR", "");
  return lines.join("\r\n");
}

export async function buildFeedsAndCalendar({
  outDir,
  publicDir,
  statusData,
  togashiPosts,
  messagesByLocale,
  locales,
  origin = DEFAULT_ORIGIN,
}) {
  const targets = [];
  if (outDir) targets.push(outDir);
  if (publicDir) targets.push(publicDir);

  const icsContent = generateReleasesIcs({ statusData, origin });

  for (const targetDir of targets) {
    await mkdir(targetDir, { recursive: true });
    await writeFile(join(targetDir, "releases.ics"), icsContent, "utf8");

    // English root feed
    const enFeed = generateAtomFeed({
      locale: "en",
      messages: messagesByLocale.en,
      statusData,
      togashiPosts,
      origin,
    });
    await writeFile(join(targetDir, "feed.xml"), enFeed, "utf8");

    // Per-locale feeds
    for (const locale of locales) {
      const localeFeed =
        locale === "en"
          ? enFeed
          : generateAtomFeed({
              locale,
              messages: messagesByLocale[locale],
              statusData,
              togashiPosts,
              origin,
            });

      const localeDir = join(targetDir, locale);
      await mkdir(localeDir, { recursive: true });
      await writeFile(join(localeDir, "feed.xml"), localeFeed, "utf8");
    }
  }
}
