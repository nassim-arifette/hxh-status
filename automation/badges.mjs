import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { trackerSummary } from "./milestones.mjs";

const DEFAULT_ORIGIN = "https://hxhstatus.com";

function escapeXml(unsafe) {
  if (typeof unsafe !== "string") return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function measureText(text, fontSize = 11) {
  let width = 0;
  for (const char of text) {
    const code = char.codePointAt(0);
    // CJK and full-width characters
    if (
      (code >= 0x3000 && code <= 0x9fff) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xff01 && code <= 0xff60)
    ) {
      width += 12;
    } else if ("ijl|!:'.,; ".includes(char)) {
      width += 4;
    } else if ("frtI-()[]".includes(char)) {
      width += 5.5;
    } else if ("mwMW@#%&".includes(char)) {
      width += 9.5;
    } else if (code >= 65 && code <= 90) {
      width += 7.8;
    } else if (char === "·") {
      width += 6;
    } else {
      width += 6.8;
    }
  }
  return width * (fontSize / 11);
}

export function renderSvgBadge({
  label = "HxH",
  message = "",
  color = "#d97706",
  labelColor = "#252c27",
}) {
  const labelTextWidth = measureText(label, 11);
  const messageTextWidth = measureText(message, 11);

  const labelWidth = Math.max(28, Math.round(labelTextWidth + 14));
  const messageWidth = Math.max(32, Math.round(messageTextWidth + 16));
  const totalWidth = labelWidth + messageWidth;

  const labelX = Math.round(labelWidth / 2);
  const messageX = Math.round(labelWidth + messageWidth / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${escapeXml(label)}: ${escapeXml(message)}">
  <title>${escapeXml(label)}: ${escapeXml(message)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="${labelColor}"/>
    <rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text aria-hidden="true" x="${labelX}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(label)}</text>
    <text x="${labelX}" y="14" fill="#fff">${escapeXml(label)}</text>
    <text aria-hidden="true" x="${messageX}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(message)}</text>
    <text x="${messageX}" y="14" fill="#fff">${escapeXml(message)}</text>
  </g>
</svg>`;
}

const BADGE_TRANSLATIONS = {
  en: {
    publishing: "Publishing",
    hiatus: "On hiatus",
    ch: "ch.",
    manuscript: "manuscript",
    latest: "latest",
    progress: "progress",
    next: "next",
    stages: {
      delivered: "at Jump",
      background: "backgrounds",
      inking: "inking",
      scheduled: "scheduled",
      published: "published",
    },
  },
  fr: {
    publishing: "En parution",
    hiatus: "En pause",
    ch: "ch.",
    manuscript: "manuscrit",
    latest: "dernier",
    progress: "progrès",
    next: "suivant",
    stages: {
      delivered: "au Jump",
      background: "décors",
      inking: "encrage",
      scheduled: "prévu",
      published: "disponible",
    },
  },
  ja: {
    publishing: "連載中",
    hiatus: "休載中",
    ch: "",
    manuscript: "原稿",
    latest: "最新",
    progress: "進行状況",
    next: "次回",
    stages: {
      delivered: "送付済",
      background: "背景",
      inking: "ペン入れ",
      scheduled: "発売予定",
      published: "発売中",
    },
  },
  es: {
    publishing: "En publicación",
    hiatus: "En pausa",
    ch: "c.",
    manuscript: "manuscrito",
    latest: "último",
    progress: "progreso",
    next: "siguiente",
    stages: {
      delivered: "en Jump",
      background: "fondos",
      inking: "entintado",
      scheduled: "programado",
      published: "publicado",
    },
  },
  pt: {
    publishing: "Publicando",
    hiatus: "Em hiato",
    ch: "cap.",
    manuscript: "manuscrito",
    latest: "último",
    progress: "progresso",
    next: "próximo",
    stages: {
      delivered: "no Jump",
      background: "cenários",
      inking: "arte-final",
      scheduled: "agendado",
      published: "publicado",
    },
  },
  zh: {
    publishing: "连载中",
    hiatus: "休刊中",
    ch: "第",
    chSuffix: "话",
    manuscript: "原稿",
    latest: "最新",
    progress: "进展",
    next: "下一话",
    stages: {
      delivered: "已交付",
      background: "背景",
      inking: "描线",
      scheduled: "预定发表",
      published: "已刊登",
    },
  },
  ar: {
    publishing: "يُنشر حالياً",
    hiatus: "في فترة توقف",
    ch: "الفصل",
    manuscript: "المخطوطة",
    latest: "الأخير",
    progress: "التقدم",
    next: "التالي",
    stages: {
      delivered: "لدى جمب",
      background: "الخلفيات",
      inking: "التحبير",
      scheduled: "مجدول",
      published: "صدر",
    },
  },
};

function formatChapterNumber(num, locale, t) {
  if (locale === "ja") return `${num}話`;
  if (locale === "zh") return `第${num}话`;
  return `${t.ch} ${num}`;
}

export function generateBadges({ statusData, locale = "en" }) {
  const summary = trackerSummary(statusData);
  const t = BADGE_TRANSLATIONS[locale] ?? BADGE_TRANSLATIONS.en;

  const isPublishing = summary.publicationStatus === "publishing";
  const statusColor = isPublishing ? "#2e7d32" : "#d97706";

  const nextChapterRecord = statusData.chapters.find(
    (c) => c.chapter === summary.nextChapter,
  );
  const nextStage = nextChapterRecord?.status ?? "unknown";
  const nextStageText = t.stages[nextStage] ?? nextStage;

  const highestProgress = summary.manuscriptsComplete || summary.workConfirmed;
  const progressRecord = statusData.chapters.find(
    (c) => c.chapter === highestProgress,
  );
  const progressStage = progressRecord?.status ?? "delivered";
  const progressStageText = t.stages[progressStage] ?? progressStage;

  // 1. status.svg
  let statusMessage;
  const chLatest = formatChapterNumber(summary.latestPublished, locale, t);
  if (isPublishing) {
    statusMessage = `${t.publishing} · ${chLatest}`;
  } else {
    const chManuscript =
      summary.manuscriptsComplete > summary.latestPublished
        ? ` · ${t.manuscript}${locale === "ja" ? "" : " "}${summary.manuscriptsComplete}${locale === "ja" ? "話" : locale === "zh" ? "话" : ""}`
        : "";
    statusMessage = `${t.hiatus} · ${chLatest}${chManuscript}`;
  }

  const statusBadge = renderSvgBadge({
    label: "HxH",
    message: statusMessage,
    color: statusColor,
  });

  // 2. latest.svg
  const latestMessage = `${t.latest} · ${chLatest}`;
  const latestBadge = renderSvgBadge({
    label: "HxH",
    message: latestMessage,
    color: "#2e7d32",
  });

  // 3. progress.svg
  const chProgress = formatChapterNumber(highestProgress, locale, t);
  const progressMessage = `${t.progress} · ${chProgress} (${progressStageText})`;
  const progressBadge = renderSvgBadge({
    label: "HxH",
    message: progressMessage,
    color: "#2563eb",
  });

  // 4. next.svg
  const chNext = formatChapterNumber(summary.nextChapter, locale, t);
  const nextMessage = `${t.next} · ${chNext} (${nextStageText})`;
  const nextBadge = renderSvgBadge({
    label: "HxH",
    message: nextMessage,
    color: "#2563eb",
  });

  return {
    status: statusBadge,
    latest: latestBadge,
    progress: progressBadge,
    next: nextBadge,
  };
}

export async function buildBadges({
  outDir,
  publicDir,
  statusData,
  locales,
}) {
  const targets = [];
  if (outDir) targets.push(outDir);
  if (publicDir) targets.push(publicDir);

  for (const targetDir of targets) {
    const badgeRootDir = join(targetDir, "badge");
    await mkdir(badgeRootDir, { recursive: true });

    // English root badges in /badge/
    const enBadges = generateBadges({ statusData, locale: "en" });
    await writeFile(join(badgeRootDir, "status.svg"), enBadges.status, "utf8");
    await writeFile(join(badgeRootDir, "latest.svg"), enBadges.latest, "utf8");
    await writeFile(join(badgeRootDir, "progress.svg"), enBadges.progress, "utf8");
    await writeFile(join(badgeRootDir, "next.svg"), enBadges.next, "utf8");

    // Per-locale badges in /badge/{locale}/
    for (const locale of locales) {
      const localeBadgeDir = join(badgeRootDir, locale);
      await mkdir(localeBadgeDir, { recursive: true });

      const localeBadges =
        locale === "en" ? enBadges : generateBadges({ statusData, locale });

      await writeFile(join(localeBadgeDir, "status.svg"), localeBadges.status, "utf8");
      await writeFile(join(localeBadgeDir, "latest.svg"), localeBadges.latest, "utf8");
      await writeFile(join(localeBadgeDir, "progress.svg"), localeBadges.progress, "utf8");
      await writeFile(join(localeBadgeDir, "next.svg"), localeBadges.next, "utf8");
    }
  }
}
