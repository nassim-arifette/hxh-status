import type { Locale, Messages } from "@/lib/i18n";
import { localePath } from "@/lib/routes";

export function SiteNavigation({ locale, messages, path = "/" }: { locale: Locale; messages: Messages; path?: string }) {
  const items = [["/", messages.nav.home], ["/updates", messages.nav.updates], ["/history", messages.nav.history], ["/predictions", messages.nav.predictions], ["/where-to-read", messages.pages.whereToRead.name]];
  return <nav className="primary-navigation" aria-label={messages.nav.primary}>
    {items.map(([href, label]) => <a key={href} href={localePath(href, locale)} aria-current={path === href ? "page" : undefined}>{label}</a>)}
  </nav>;
}
