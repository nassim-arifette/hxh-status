import type { MetadataRoute } from "next";

import { getLanguageAlternates, publicLocales } from "@/lib/i18n";
import {
  ARC_PAGES,
  arcPath,
  chapterPath,
  contentPagePath,
  CONTENT_PAGES,
  localeUrl,
  updatePath,
} from "@/lib/routes";
import { chapterPages } from "./data/chapter-pages";
import { togashiPosts } from "./data/updates";
import { lastUpdated } from "./data/status";

export const dynamic = "force-static";

function day(date: string) {
  return new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
}

// Every page, in every published language, each entry naming the whole hreflang
// cluster it belongs to. Built from the same route registry the pages are, so a
// new page cannot be added without appearing here.
export default function sitemap(): MetadataRoute.Sitemap {
  const updated = day(lastUpdated);

  const pages: { path: string; lastModified: Date }[] = [
    { path: "/", lastModified: updated },
    ...CONTENT_PAGES.map((page) => ({
      path: contentPagePath(page),
      lastModified: updated,
    })),
    ...ARC_PAGES.map((arc) => ({ path: arcPath(arc), lastModified: updated })),
    ...chapterPages.map((chapter) => ({
      path: chapterPath(chapter.chapter),
      lastModified: day(
        chapter.releaseAt ?? chapter.updatedAt ?? lastUpdated,
      ),
    })),
    ...togashiPosts.map((post) => ({
      path: updatePath(post.id),
      lastModified: day(post.createdAt),
    })),
  ];

  return pages.flatMap((page) =>
    publicLocales.map((locale) => ({
      url: localeUrl(page.path, locale),
      lastModified: page.lastModified,
      alternates: { languages: getLanguageAlternates(page.path) },
    })),
  );
}
