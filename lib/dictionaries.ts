import "server-only";

import englishMessages from "@/messages/en.json";
import japaneseMessages from "@/messages/ja.json";
import type { Locale, Messages } from "./i18n";

const dictionaries: Record<Locale, Messages> = {
  en: englishMessages,
  ja: japaneseMessages,
};

export function getMessages(locale: Locale) {
  return dictionaries[locale];
}
