import type { Locale } from "@/lib/i18n";

export type ArcId =
  | "hunter-exam"
  | "zoldyck"
  | "heavens-arena"
  | "yorknew"
  | "greed-island"
  | "chimera-ant"
  | "election"
  | "dc"
  | "succ-war"
  | "oneshot";

export type ArcDefinition = {
  id: ArcId;
  name: Record<Locale, string>;
  color: string;
  badgeBg: string;
  years: string;
};

export const ARCS: readonly ArcDefinition[] = [
  {
    id: "succ-war",
    name: {
      en: "Succession War",
      fr: "Guerre de succession",
      ja: "王位継承編",
      es: "Guerra de Sucesión",
      pt: "Guerra de Sucessão",
      zh: "王位继承篇",
      ar: "حرب الخلافة",
    },
    color: "#fb923c",
    badgeBg: "rgba(251, 146, 60, 0.12)",
    years: "2014–Présent",
  },
  {
    id: "dc",
    name: {
      en: "Dark Continent",
      fr: "Continent Sombre",
      ja: "暗黒大陸編",
      es: "Continente Oscuro",
      pt: "Continente Sombrio",
      zh: "暗黑大陆篇",
      ar: "القارة المظلمة",
    },
    color: "#818cf8",
    badgeBg: "rgba(129, 140, 248, 0.12)",
    years: "2012–2014",
  },
  {
    id: "oneshot",
    name: {
      en: "Special One-shot",
      fr: "One-shot spécial",
      ja: "特別読切",
      es: "One-shot especial",
      pt: "One-shot especial",
      zh: "特别短篇",
      ar: "فصل خاص",
    },
    color: "#f472b6",
    badgeBg: "rgba(244, 114, 182, 0.12)",
    years: "2012–2013",
  },
  {
    id: "election",
    name: {
      en: "Chairman Election",
      fr: "Élection du président",
      ja: "会長選挙編",
      es: "Elección del Presidente",
      pt: "Eleição do Presidente",
      zh: "会长选举篇",
      ar: "انتخابات رئيس الصيادين",
    },
    color: "#a78bfa",
    badgeBg: "rgba(167, 139, 250, 0.12)",
    years: "2011–2012",
  },
  {
    id: "chimera-ant",
    name: {
      en: "Chimera Ant",
      fr: "Chimera Ants",
      ja: "キメラ＝アント編",
      es: "Hormigas Quimera",
      pt: "Formigas Quimera",
      zh: "嵌合蚁篇",
      ar: "نمل الكيميرا",
    },
    color: "#f87171",
    badgeBg: "rgba(248, 113, 113, 0.12)",
    years: "2003–2011",
  },
  {
    id: "greed-island",
    name: {
      en: "Greed Island",
      fr: "Greed Island",
      ja: "グリードアイランド編",
      es: "Greed Island",
      pt: "Greed Island",
      zh: "贪婪之岛篇",
      ar: "جريد آيلاند",
    },
    color: "#34d399",
    badgeBg: "rgba(52, 211, 153, 0.12)",
    years: "2001–2003",
  },
  {
    id: "yorknew",
    name: {
      en: "Yorknew City",
      fr: "York Shin City",
      ja: "ヨークシン編",
      es: "Ciudad Yorkshin",
      pt: "Cidade de Yorknew",
      zh: "友客鑫市篇",
      ar: "مدينة يوركنيو",
    },
    color: "#fbbf24",
    badgeBg: "rgba(251, 191, 36, 0.12)",
    years: "2000–2001",
  },
  {
    id: "heavens-arena",
    name: {
      en: "Heavens Arena",
      fr: "Tour Céleste",
      ja: "天空闘技場編",
      es: "Torre Celestial",
      pt: "Arena Celestial",
      zh: "天空竞技场篇",
      ar: "حلبة السماء",
    },
    color: "#38bdf8",
    badgeBg: "rgba(56, 189, 248, 0.12)",
    years: "1999–2000",
  },
  {
    id: "zoldyck",
    name: {
      en: "Zoldyck Family",
      fr: "Famille Zoldik",
      ja: "ゾルディック家編",
      es: "Familia Zoldyck",
      pt: "Família Zoldyck",
      zh: "揍敌客家族篇",
      ar: "عائلة زولديك",
    },
    color: "#c084fc",
    badgeBg: "rgba(192, 132, 252, 0.12)",
    years: "1999",
  },
  {
    id: "hunter-exam",
    name: {
      en: "Hunter Exam",
      fr: "Examen Hunter",
      ja: "ハンター試験編",
      es: "Examen de Cazador",
      pt: "Exame Hunter",
      zh: "猎人考试篇",
      ar: "اختبار الصيادين",
    },
    color: "#4ade80",
    badgeBg: "rgba(74, 222, 128, 0.12)",
    years: "1998–1999",
  },
];

export const ALL_ARCS_LABEL: Record<Locale, string> = {
  en: "All arcs",
  fr: "Tous les arcs",
  ja: "全エピソード",
  es: "Todos los arcos",
  pt: "Todos os arcos",
  zh: "全部篇章",
  ar: "جميع الفصول",
};

export const ARC_FILTER_LABEL: Record<Locale, string> = {
  en: "Filter by arc",
  fr: "Filtrer par arc",
  ja: "エピソードで絞り込み",
  es: "Filtrar por arco",
  pt: "Filtrar por arco",
  zh: "按篇章筛选",
  ar: "تصفية حسب الفصل",
};

export const RESET_LABEL: Record<Locale, string> = {
  en: "Reset",
  fr: "Réinitialiser",
  ja: "リセット",
  es: "Restablecer",
  pt: "Redefinir",
  zh: "重置",
  ar: "إعادة ضبط",
};

export const CHAPTERS_LABEL: Record<Locale, string> = {
  en: "chapters",
  fr: "chapitres",
  ja: "話",
  es: "capítulos",
  pt: "capítulos",
  zh: "话",
  ar: "فصل",
};

const ARC_MAP = new Map<string, ArcDefinition>(
  ARCS.map((arc) => [arc.id, arc]),
);

export function getArcDefinition(arcId: string | undefined): ArcDefinition | undefined {
  if (!arcId) return undefined;
  return ARC_MAP.get(arcId);
}

export function getArcName(arcId: string | undefined, locale: Locale): string | undefined {
  const def = getArcDefinition(arcId);
  return def?.name[locale] ?? def?.name.en;
}

export const PRESENT_LABEL: Record<Locale, string> = {
  en: "Present",
  fr: "Présent",
  ja: "現在",
  es: "Presente",
  pt: "Presente",
  zh: "至今",
  ar: "الآن",
};

export type PublicationIssueInput = {
  year: number;
  number: number;
  released?: boolean;
  chapter?: number | string;
  date?: string;
  arc?: string;
};

export type ArcStats = {
  id: ArcId;
  name: Record<Locale, string>;
  color: string;
  badgeBg: string;
  years: string;
  startYear: number;
  startIssue: number;
  endYear: number;
  endIssue: number;
  chapterCount: number;
  startChapter?: number;
  endChapter?: number;
  spanIssues: number;
  spanYears: number;
  isCurrent: boolean;
  chapterRank: number;
  durationRank: number;
};

export type ArcComparisonSummary = {
  arcs: ArcStats[];
  currentArc: ArcStats;
  totalArcs: number;
  maxChapters: number;
  maxSpanIssues: number;
};

export function formatArcYears(arc: ArcStats, locale: Locale = "en"): string {
  if (arc.isCurrent) {
    return `${arc.startYear}–${PRESENT_LABEL[locale] ?? PRESENT_LABEL.en}`;
  }
  if (arc.startYear === arc.endYear) {
    return String(arc.startYear);
  }
  return `${arc.startYear}–${arc.endYear}`;
}

export function deriveArcStats(
  issues: readonly PublicationIssueInput[],
): ArcComparisonSummary {
  const chronological = [...issues].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.number - b.number,
  );

  const arcStatsMap = new Map<
    string,
    {
      firstIdx: number;
      lastIdx: number;
      firstIssue: PublicationIssueInput;
      lastIssue: PublicationIssueInput;
      matchingIssues: PublicationIssueInput[];
    }
  >();

  chronological.forEach((issue, idx) => {
    if (issue.released && issue.arc) {
      if (!arcStatsMap.has(issue.arc)) {
        arcStatsMap.set(issue.arc, {
          firstIdx: idx,
          lastIdx: idx,
          firstIssue: issue,
          lastIssue: issue,
          matchingIssues: [],
        });
      }
      const entry = arcStatsMap.get(issue.arc)!;
      entry.lastIdx = idx;
      entry.lastIssue = issue;
      entry.matchingIssues.push(issue);
    }
  });

  const rawStats: ArcStats[] = ARCS.map((arcDef) => {
    const data = arcStatsMap.get(arcDef.id);
    if (!data) {
      return {
        id: arcDef.id,
        name: arcDef.name,
        color: arcDef.color,
        badgeBg: arcDef.badgeBg,
        years: arcDef.years,
        startYear: 0,
        startIssue: 0,
        endYear: 0,
        endIssue: 0,
        chapterCount: 0,
        spanIssues: 0,
        spanYears: 0,
        isCurrent: arcDef.id === "succ-war",
        chapterRank: 0,
        durationRank: 0,
      };
    }

    const spanIssues = data.lastIdx - data.firstIdx + 1;
    const chapterCount = data.matchingIssues.length;
    const numChapters = data.matchingIssues
      .map((i) =>
        typeof i.chapter === "number"
          ? i.chapter
          : parseInt(String(i.chapter), 10),
      )
      .filter((c) => !isNaN(c) && c > 0);
    const startChapter =
      numChapters.length ? Math.min(...numChapters) : undefined;
    const endChapter =
      numChapters.length ? Math.max(...numChapters) : undefined;

    return {
      id: arcDef.id,
      name: arcDef.name,
      color: arcDef.color,
      badgeBg: arcDef.badgeBg,
      years: arcDef.years,
      startYear: data.firstIssue.year,
      startIssue: data.firstIssue.number,
      endYear: data.lastIssue.year,
      endIssue: data.lastIssue.number,
      chapterCount,
      startChapter,
      endChapter,
      spanIssues,
      spanYears: Number((spanIssues / 48).toFixed(1)),
      isCurrent: arcDef.id === "succ-war",
      chapterRank: 0,
      durationRank: 0,
    };
  });

  // Calculate chapter ranks (1 is longest)
  const byChapters = [...rawStats].sort(
    (a, b) => b.chapterCount - a.chapterCount,
  );
  byChapters.forEach((s, idx) => {
    s.chapterRank = idx + 1;
  });

  // Calculate duration ranks (1 is longest running)
  const byDuration = [...rawStats].sort((a, b) => b.spanIssues - a.spanIssues);
  byDuration.forEach((s, idx) => {
    s.durationRank = idx + 1;
  });

  const currentArc = rawStats.find((s) => s.isCurrent) ?? rawStats[0];
  const maxChapters = Math.max(...rawStats.map((s) => s.chapterCount), 1);
  const maxSpanIssues = Math.max(...rawStats.map((s) => s.spanIssues), 1);

  return {
    arcs: rawStats,
    currentArc,
    totalArcs: rawStats.length,
    maxChapters,
    maxSpanIssues,
  };
}

export function formatArcDuration(
  arc: ArcStats,
  messages: {
    durationYears: string;
    durationMonths: string;
  },
): string {
  if (arc.spanYears >= 1) {
    return messages.durationYears.replace("{years}", String(arc.spanYears));
  }
  const months = Math.max(1, Math.round(arc.spanIssues / 4.3));
  return messages.durationMonths.replace("{months}", String(months));
}


