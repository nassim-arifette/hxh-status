import { Fragment, type ReactNode } from "react";

import {
  formatMessage,
  getOfficialReaders,
  type Locale,
  type Messages,
} from "@/lib/i18n";
import { LocalDate } from "./chapter-tracker";
import {
  latestPublished,
  nextChapter,
  publicationStatus,
  workConfirmed,
} from "./data/status";
import { formatDate, getStatusMeta } from "./status-presentation";
import styles from "./faq.module.css";

// Production order, matching the tracker legend. `unknown` is deliberately left
// out: "not confirmed yet" is the absence of a stage, not one to explain.
const EXPLAINED_STAGES = [
  "inking",
  "background",
  "delivered",
  "scheduled",
  "published",
] as const;

type FaqEntry = {
  id: string;
  question: string;
  answer: ReactNode;
  // Structured data has to be plain text, and the visible answer may carry a
  // client-rendered local date, so each entry keeps a flat copy for JSON-LD.
  plainAnswer: string;
};

// `formatMessage` collapses everything to a string, which would flatten the
// LocalDate element. This fills the same {placeholders} with nodes instead.
function fillTemplate(template: string, values: Record<string, ReactNode>) {
  return template.split(/(\{[a-zA-Z0-9_]+\})/g).map((part, index) => {
    const name = /^\{([a-zA-Z0-9_]+)\}$/.exec(part)?.[1];
    const value = name ? values[name] : undefined;
    return value === undefined ? part : <Fragment key={index}>{value}</Fragment>;
  });
}

function buildEntries(locale: Locale, messages: Messages): FaqEntry[] {
  const faq = messages.faq;
  const statusMeta = getStatusMeta(messages.statuses);
  const readers = getOfficialReaders(locale);
  const entries: FaqEntry[] = [];

  const publishing = publicationStatus === "publishing";
  const publishingValues = {
    chapter: latestPublished.chapter,
    status: publishing ? messages.snapshot.publishing : messages.snapshot.hiatus,
  };
  const publishingTemplate = publishing ? faq.publishingYes : faq.publishingNo;
  entries.push({
    id: "publishing",
    question: faq.publishingQuestion,
    answer: formatMessage(publishingTemplate, publishingValues),
    plainAnswer: formatMessage(publishingTemplate, publishingValues),
  });

  if (nextChapter.releaseAt) {
    const releaseAt = nextChapter.releaseAt;
    const values = { chapter: nextChapter.chapter };
    entries.push({
      id: "next-chapter",
      question: faq.nextQuestion,
      answer: fillTemplate(faq.nextScheduled, {
        ...values,
        date: <LocalDate dateTime={releaseAt} locale={locale} showTime />,
      }),
      // Crawlers get a timezone-independent date; readers get their own.
      plainAnswer: formatMessage(faq.nextScheduled, {
        ...values,
        date: formatDate(releaseAt.slice(0, 10), undefined, locale),
      }),
    });
  } else {
    const values = {
      chapter: nextChapter.chapter,
      status: statusMeta[nextChapter.status].label,
    };
    entries.push({
      id: "next-chapter",
      question: faq.nextQuestion,
      answer: formatMessage(faq.nextUnscheduled, values),
      plainAnswer: formatMessage(faq.nextUnscheduled, values),
    });
  }

  const togashiValues = {
    chapter: workConfirmed.chapter,
    status: statusMeta[workConfirmed.status].label,
  };
  entries.push({
    id: "togashi",
    question: faq.togashiQuestion,
    answer: formatMessage(faq.togashiAnswer, togashiValues),
    plainAnswer: formatMessage(faq.togashiAnswer, togashiValues),
  });

  entries.push({
    id: "stages",
    question: faq.stagesQuestion,
    answer: (
      <>
        <p className={styles.intro}>{faq.stagesIntro}</p>
        <dl className={styles.stages}>
          {EXPLAINED_STAGES.map((stage) => (
            <div className={styles.stage} key={stage}>
              <dt>{statusMeta[stage].label}</dt>
              <dd>{statusMeta[stage].description}</dd>
            </div>
          ))}
        </dl>
      </>
    ),
    plainAnswer: [
      faq.stagesIntro,
      ...EXPLAINED_STAGES.map(
        (stage) => `${statusMeta[stage].label} — ${statusMeta[stage].description}`,
      ),
    ].join(" "),
  });

  entries.push({
    id: "official-readers",
    question: faq.readQuestion,
    answer: (
      <>
        <p className={styles.intro}>{faq.readIntro}</p>
        <ul className={styles.readers}>
          {readers.map((reader) => (
            <li key={reader.href}>
              <a href={reader.href} rel="noreferrer" target="_blank">
                {reader.label}
              </a>
            </li>
          ))}
        </ul>
      </>
    ),
    plainAnswer: [
      faq.readIntro,
      readers.map((reader) => reader.label).join(", "),
    ].join(" "),
  });

  entries.push({
    id: "sources",
    question: faq.sourcesQuestion,
    // The footer already states the sourcing policy in every language; saying
    // it twice in two wordings is how the two drift apart.
    answer: messages.footer.sources,
    plainAnswer: messages.footer.sources,
  });

  return entries;
}

export default function Faq({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages;
}) {
  const entries = buildEntries(locale, messages);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.plainAnswer,
      },
    })),
  };

  return (
    <section className="content-section faq-section" aria-labelledby="faq-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{messages.faq.eyebrow}</p>
          <h2 id="faq-title">{messages.faq.title}</h2>
        </div>
      </div>

      <div className={styles.list}>
        {entries.map((entry) => (
          <details className={styles.item} key={entry.id}>
            <summary>
              <span className={styles.question}>{entry.question}</span>
            </summary>
            <div className={styles.answer}>
              {typeof entry.answer === "string" ? (
                <p>{entry.answer}</p>
              ) : (
                entry.answer
              )}
            </div>
          </details>
        ))}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </section>
  );
}
