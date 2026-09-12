import { siteUrl } from "@/lib/routes";

// One module for every JSON-LD graph the site emits, so the vocabulary and the
// @id values stay consistent across pages. Nothing here is written by hand at a
// call site: each builder takes the same data the visible page renders.
//
// FAQPage markup is deliberately not extended: Google restricted those rich
// results to government and health sites in 2023, so the FAQ earns its keep as
// readable text rather than as markup.

export const SERIES_ID = `${siteUrl}/#series`;
export const SITE_ID = `${siteUrl}/#website`;
export const PUBLISHER_ID = `${siteUrl}/#publisher`;
export const DATASET_ID = `${siteUrl}/#dataset`;

export const GITHUB_REPOSITORY = "https://github.com/nassim-arifette/hxh-status";

type JsonLdValue = Record<string, unknown>;

export function JsonLd({ data }: { data: JsonLdValue | JsonLdValue[] }) {
  return (
    <script
      type="application/ld+json"
      // A closing tag inside the payload would end the script element early,
      // so the one character that can do that is escaped.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function publisherLd(siteName: string): JsonLdValue {
  return {
    "@type": "Organization",
    "@id": PUBLISHER_ID,
    name: siteName,
    url: siteUrl,
    sameAs: [GITHUB_REPOSITORY],
  };
}

export function webSiteLd({
  siteName,
  description,
  locale,
}: {
  siteName: string;
  description: string;
  locale: string;
}): JsonLdValue {
  return {
    "@type": "WebSite",
    "@id": SITE_ID,
    url: siteUrl,
    name: siteName,
    description,
    inLanguage: locale,
    publisher: { "@id": PUBLISHER_ID },
    sameAs: [GITHUB_REPOSITORY],
  };
}

export function comicSeriesLd({
  locale,
  description,
  numberOfItems,
  startDate,
}: {
  locale: string;
  description: string;
  numberOfItems: number;
  startDate: string;
}): JsonLdValue {
  return {
    "@type": "ComicSeries",
    "@id": SERIES_ID,
    name: "HUNTER×HUNTER",
    alternateName: ["Hunter x Hunter", "ハンター×ハンター"],
    url: siteUrl,
    description,
    inLanguage: locale,
    author: {
      "@type": "Person",
      name: "Yoshihiro Togashi",
      alternateName: "冨樫義博",
    },
    publisher: { "@type": "Organization", name: "Shueisha" },
    startDate,
    numberOfItems,
    genre: ["Shonen", "Adventure", "Fantasy"],
    // Only publisher-run destinations, so the claim stays checkable.
    sameAs: [
      "https://www.viz.com/shonenjump/chapters/hunter-x-hunter",
      "https://mangaplus.shueisha.co.jp/titles/100015",
    ],
  };
}

// The tracker is a dataset before it is a page: saying so is what makes the
// public API discoverable to dataset search and to the assistants that use it.
export function datasetLd({
  name,
  description,
  locale,
  modified,
  temporalCoverage,
}: {
  name: string;
  description: string;
  locale: string;
  modified: string;
  temporalCoverage: string;
}): JsonLdValue {
  const distribution = [
    ["/api/v1/status.json", "application/json", "Current tracker state"],
    ["/api/v1/stats.json", "application/json", "Derived publication statistics"],
    [
      "/api/v1/togashi/posts.json",
      "application/json",
      "Archive of Yoshihiro Togashi's posts with translations",
    ],
    ["/feed.xml", "application/atom+xml", "Atom feed of tracker changes"],
    ["/releases.ics", "text/calendar", "Calendar of confirmed release dates"],
  ] as const;

  return {
    "@type": "Dataset",
    "@id": DATASET_ID,
    name,
    description,
    url: `${siteUrl}/api`,
    inLanguage: locale,
    license: "https://opensource.org/licenses/MIT",
    isAccessibleForFree: true,
    creator: { "@id": PUBLISHER_ID },
    dateModified: modified,
    temporalCoverage,
    keywords: [
      "HUNTER×HUNTER",
      "manga publication schedule",
      "hiatus",
      "Weekly Shonen Jump",
      "Yoshihiro Togashi",
    ],
    about: { "@id": SERIES_ID },
    distribution: distribution.map(([path, format, label]) => ({
      "@type": "DataDownload",
      name: label,
      encodingFormat: format,
      contentUrl: `${siteUrl}${path}`,
    })),
  };
}

export function comicIssueLd({
  chapter,
  url,
  locale,
  name,
  datePublished,
  jumpIssue,
  description,
}: {
  chapter: number;
  url: string;
  locale: string;
  name?: string;
  datePublished?: string;
  jumpIssue?: string;
  description: string;
}): JsonLdValue {
  return {
    "@type": "ComicIssue",
    "@id": `${url}#issue`,
    url,
    issueNumber: chapter,
    name: name ? `${chapter}. ${name}` : `HUNTER×HUNTER ${chapter}`,
    description,
    inLanguage: locale,
    isPartOf: { "@id": SERIES_ID },
    author: {
      "@type": "Person",
      name: "Yoshihiro Togashi",
      alternateName: "冨樫義博",
    },
    ...(datePublished ? { datePublished } : {}),
    // The chapter reached readers inside one numbered Weekly Shonen Jump, which
    // is a publication event rather than a property of the chapter itself.
    ...(jumpIssue && datePublished
      ? {
          publication: {
            "@type": "PublicationEvent",
            name: `Weekly Shonen Jump ${jumpIssue}`,
            startDate: datePublished,
            publishedBy: { "@type": "Organization", name: "Shueisha" },
          },
        }
      : {}),
  };
}

export function newsArticleLd({
  url,
  headline,
  description,
  datePublished,
  locale,
  siteName,
  images,
  citation,
}: {
  url: string;
  headline: string;
  description: string;
  datePublished: string;
  locale: string;
  siteName: string;
  images: readonly string[];
  citation: string;
}): JsonLdValue {
  return {
    "@type": "NewsArticle",
    "@id": `${url}#article`,
    url,
    headline,
    description,
    datePublished,
    dateModified: datePublished,
    inLanguage: locale,
    // The post is Togashi's; the page reporting and translating it is the
    // site's. Saying so keeps the authorship claim honest.
    author: { "@type": "Organization", name: siteName, url: siteUrl },
    publisher: { "@id": PUBLISHER_ID },
    about: { "@id": SERIES_ID },
    citation,
    isBasedOn: citation,
    ...(images.length > 0 ? { image: [...images] } : {}),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
}

export function breadcrumbLd(
  trail: readonly { name: string; url: string }[],
): JsonLdValue {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function graph(...nodes: (JsonLdValue | undefined)[]): JsonLdValue {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter(Boolean) as JsonLdValue[],
  };
}
