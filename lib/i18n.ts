import type englishMessages from "@/messages/en.json";

export type Locale = "en" | "ja";
export type Messages = typeof englishMessages;
export type MessageValues = Record<string, number | string>;

export function formatMessage(
  template: string,
  values: MessageValues = {},
) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (placeholder, key) => {
    return Object.prototype.hasOwnProperty.call(values, key)
      ? String(values[key])
      : placeholder;
  });
}
