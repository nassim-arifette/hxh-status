import type { Locale, Messages } from "@/lib/i18n";
import { siteUrl } from "@/lib/routes";
import { ContentShell } from "../content-shell";
import { lastUpdated } from "../data/status";
import { datasetLd } from "../structured-data";

function EndpointTable({
  columns,
  rows,
}: {
  columns: { endpoint: string; what: string };
  rows: [string, string][];
}) {
  return (
    <div className="data-table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">{columns.endpoint}</th>
            <th scope="col">{columns.what}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([path, description]) => (
            <tr key={path}>
              <th scope="row">
                {path.includes("{") ? (
                  <code dir="ltr">{path}</code>
                ) : (
                  <a href={`${siteUrl}${path}`}>
                    <code dir="ltr">{path}</code>
                  </a>
                )}
              </th>
              <td>{description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const API_PATH = "/api";

const chapterApiCopy: Record<Locale, [string, string, string]> = {
  en: ["Tracked chapter index.", "Chapter details, titles and sources.", "Available transitions and status observations; incomplete history."],
  fr: ["Index des chapitres suivis.", "Détails, titres et sources d’un chapitre.", "Transitions et états documentés ; historique incomplet."],
  es: ["Índice de capítulos seguidos.", "Detalles, títulos y fuentes de un capítulo.", "Transiciones y estados documentados; historial incompleto."],
  pt: ["Índice dos capítulos acompanhados.", "Detalhes, títulos e fontes de um capítulo.", "Transições e estados documentados; histórico incompleto."],
  ja: ["追跡中の話の一覧。", "各話の詳細、タイトル、出典。", "記録された状態と遷移。完全な履歴ではありません。"],
  zh: ["跟踪章节索引。", "章节详情、标题和来源。", "已记录的状态及变化；并非完整历史。"],
  ar: ["فهرس الفصول المتابَعة.", "تفاصيل الفصل وعناوينه ومصادره.", "التغييرات والحالات الموثقة؛ سجل غير مكتمل."],
};

export function apiMetadata(messages: Messages) {
  return {
    title: messages.pages.api.metaTitle,
    description: messages.pages.api.metaDescription,
  };
}

export function ApiPage({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages;
}) {
  const copy = messages.pages.api;
  const meta = apiMetadata(messages);
  const columns = { endpoint: copy.columnEndpoint, what: copy.columnWhat };

  const json: [string, string][] = [
    ["/api/v1/index.json", copy.endpoints.index],
    ["/api/v1/status.json", copy.endpoints.status],
    ["/api/v1/stats.json", copy.endpoints.stats],
    ["/api/v1/chapters.json", chapterApiCopy[locale][0]],
    ["/api/v1/chapters/{chapter}.json", chapterApiCopy[locale][1]],
    ["/api/v1/events.json", chapterApiCopy[locale][2]],
    ["/api/v1/togashi/latest.json", copy.endpoints.latest],
    ["/api/v1/togashi/posts.json", copy.endpoints.posts],
    ["/api/v1/togashi/latest/{locale}.json", copy.endpoints.localized],
    ["/api/v1/openapi.json", copy.endpoints.openApi],
  ];

  const syndication: [string, string][] = [
    ["/feed.xml", copy.endpoints.feed],
    ["/{locale}/feed.xml", copy.endpoints.localizedFeed],
    ["/releases.ics", copy.endpoints.calendar],
    ["/badge/status.svg", copy.endpoints.badge],
    ["/share/{locale}/production.png", copy.endpoints.chart],
  ];

  return (
    <ContentShell
      locale={locale}
      messages={messages}
      path={API_PATH}
      title={copy.h1}
      lede={copy.lede}
      jsonLd={[
        datasetLd({
          name: meta.title,
          description: meta.description,
          locale,
          modified: lastUpdated,
          temporalCoverage: "1998-03/..",
        }),
      ]}
    >
      <section aria-labelledby="api-endpoints-title" className="content-section">
        <div className="section-heading">
          <div>
            <h2 id="api-endpoints-title">{copy.endpointsTitle}</h2>
          </div>
        </div>
        <EndpointTable columns={columns} rows={json} />
      </section>

      <section aria-labelledby="api-feeds-title" className="content-section">
        <div className="section-heading">
          <div>
            <h2 id="api-feeds-title">{copy.feedsTitle}</h2>
          </div>
        </div>
        <EndpointTable columns={columns} rows={syndication} />
      </section>

      <section aria-labelledby="api-badge-title" className="content-section">
        <div className="section-heading">
          <div>
            <h2 id="api-badge-title">{copy.badgeTitle}</h2>
          </div>
        </div>
        <p className="prose">{copy.badgeBody}</p>
        <pre className="code-block" dir="ltr">
          {`[![HxH Status](${siteUrl}/badge/status.svg)](${siteUrl})`}
        </pre>
      </section>

      <section aria-labelledby="api-openapi-title" className="content-section">
        <div className="section-heading">
          <div>
            <h2 id="api-openapi-title">{copy.openApiTitle}</h2>
          </div>
        </div>
        <p className="prose">
          {copy.openApiBody}{" "}
          <a href={`${siteUrl}/api/v1/openapi.json`}>
            <code dir="ltr">/api/v1/openapi.json</code>
          </a>
        </p>
      </section>

      <section aria-labelledby="api-caching-title" className="content-section">
        <div className="section-heading">
          <div>
            <h2 id="api-caching-title">{copy.cachingTitle}</h2>
          </div>
        </div>
        <p className="prose">{copy.cachingBody}</p>
        <h3 className="subsection-title">{copy.attributionTitle}</h3>
        <p className="prose">{copy.attributionBody}</p>
      </section>
    </ContentShell>
  );
}
