import type { Locale } from "@/lib/i18n";
import feed from "./togashi-posts.json";

// The archive of Yoshihiro Togashi's own posts, newest first. Each one keeps
// the Japanese he wrote, the cached translations, and the transcription of the
// Weekly Shonen Jump submission sheet whenever he photographed one — which is
// the part of this site no one else has.

export type TogashiImageText = {
  imageIndex: number;
  originalText: string;
  translations: Record<Locale, string>;
};

export type TogashiTrackerChange = {
  chapter: number;
  from: string;
  to: string;
};

export type TogashiPost = {
  id: string;
  author: { id?: string; name: string; screenName: string };
  createdAt: string;
  url: string;
  originalText: string;
  mediaUrls: string[];
  imageTexts?: TogashiImageText[];
  translation: {
    status: string;
    provider: string | null;
    texts: Partial<Record<Locale, string>> | null;
  };
  tracker?: {
    decision: string;
    changes?: TogashiTrackerChange[];
  };
};

export const togashiPosts = feed.posts as unknown as TogashiPost[];

export function getPost(id: string) {
  return togashiPosts.find((post) => post.id === id);
}

// The translation is used when one exists and the reader is not reading the
// original; otherwise the Japanese stands on its own rather than being hidden.
export function postText(post: TogashiPost, locale: Locale) {
  const translated =
    post.translation.status === "available" && locale !== "ja"
      ? post.translation.texts?.[locale]
      : undefined;

  return {
    text: translated ?? post.originalText,
    translated: Boolean(translated),
  };
}

// X shortens every link to t.co, which is noise in a summary and meaningless
// to a search engine. Excerpts drop them.
export function postExcerpt(post: TogashiPost, locale: Locale, max = 160) {
  const { text } = postText(post, locale);
  const cleaned = text.replace(/https?:\/\/\S+/gu, "").replace(/\s+/gu, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}
