import "server-only";

import arabicMessages from "@/messages/ar.json";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import frenchMessages from "@/messages/fr.json";
import japaneseMessages from "@/messages/ja.json";
import portugueseMessages from "@/messages/pt.json";
import chineseMessages from "@/messages/zh.json";
import type { Locale, Messages } from "./i18n";

const dictionaries: Record<Locale, Messages> = {
  en: englishMessages,
  fr: frenchMessages,
  ja: japaneseMessages,
  es: spanishMessages,
  pt: portugueseMessages,
  zh: chineseMessages,
  ar: arabicMessages,
};

export function getMessages(locale: Locale) {
  return dictionaries[locale];
}
