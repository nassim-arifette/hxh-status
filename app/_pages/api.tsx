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
