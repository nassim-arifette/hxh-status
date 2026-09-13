"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Locale } from "@/lib/i18n";

type DayVotes = { predicted_date: string; votes: number };

const calendarCopy = {
  en: { previous: "Previous month", next: "Next month", month: "Month", year: "Year", choose: "Choose a publication day", distribution: "Guesses by day", guesses: "Guesses", scale: "Fewer to more guesses", yours: "Your pick" },
  fr: { previous: "Mois précédent", next: "Mois suivant", month: "Mois", year: "Année", choose: "Choisir un jour de publication", distribution: "Pronostics par jour", guesses: "Pronostics", scale: "Du moins au plus de pronostics", yours: "Votre choix" },
  es: { previous: "Mes anterior", next: "Mes siguiente", month: "Mes", year: "Año", choose: "Elige un día de publicación", distribution: "Pronósticos por día", guesses: "Pronósticos", scale: "De menos a más pronósticos", yours: "Tu elección" },
  pt: { previous: "Mês anterior", next: "Próximo mês", month: "Mês", year: "Ano", choose: "Escolha um dia de publicação", distribution: "Palpites por dia", guesses: "Palpites", scale: "De menos a mais palpites", yours: "Seu palpite" },
  ja: { previous: "前の月", next: "次の月", month: "月", year: "年", choose: "掲載日を選ぶ", distribution: "日別の予想数", guesses: "予想数", scale: "予想が少ない日から多い日", yours: "あなたの予想" },
  zh: { previous: "上个月", next: "下个月", month: "月份", year: "年份", choose: "选择刊载日期", distribution: "每日预测数", guesses: "预测数", scale: "预测数由少到多", yours: "你的选择" },
  ar: { previous: "الشهر السابق", next: "الشهر التالي", month: "الشهر", year: "السنة", choose: "اختر يوم النشر", distribution: "التوقعات حسب اليوم", guesses: "التوقعات", scale: "من توقعات أقل إلى أكثر", yours: "اختيارك" },
} satisfies Record<Locale, Record<string, string>>;

const iso = (date: Date) => date.toISOString().slice(0, 10);
const monthOf = (date: string) => date.slice(0, 7);

function heatLevel(votes: number, peak: number) {
  if (!votes) return 0;
  const share = votes / peak;
  return share > 0.7 ? 4 : share > 0.45 ? 3 : share > 0.2 ? 2 : 1;
}

export default function GameDatePicker({ locale, label, min, max, value, onChange, distribution }: {
  locale: Locale;
  label: string;
  min: string;
  max: string;
  value: string;
  onChange?: (value: string) => void;
  distribution?: DayVotes[];
}) {
  const t = calendarCopy[locale];
  const readOnly = distribution !== undefined;
  const rtl = locale === "ar";
  const dayNumber = new Intl.NumberFormat(locale, { useGrouping: false });
  const countNumber = new Intl.NumberFormat(locale);
  const [month, setMonth] = useState(monthOf(value || min));
  const [focused, setFocused] = useState(value || min);
  const moveFocus = useRef(false);
  const grid = useRef<HTMLUListElement>(null);
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const days = Array.from({ length }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
  const tabDate = days.includes(focused) ? focused : days.find(day => day >= min && day <= max);
  const previous = monthOf(new Date(Date.UTC(year, monthNumber - 2, 1)).toISOString());
  const next = monthOf(new Date(Date.UTC(year, monthNumber, 1)).toISOString());
  const monthName = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
  const fullDate = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const dayVotes = new Map(distribution?.map(day => [day.predicted_date, day.votes]));
  const peak = Math.max(1, ...(distribution ?? []).filter(day => monthOf(day.predicted_date) === month).map(day => day.votes));

  useEffect(() => {
    if (!moveFocus.current) return;
    grid.current?.querySelector<HTMLButtonElement>(`[data-day="${focused}"]`)?.focus();
    moveFocus.current = false;
  }, [focused, month]);

  function navigate(target: string) {
    setMonth(target < monthOf(min) ? monthOf(min) : target > monthOf(max) ? monthOf(max) : target);
  }

  function moveDay(event: React.KeyboardEvent<HTMLButtonElement>, day: string) {
    const step = ({ ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const target = iso(new Date(Date.parse(day) + step * 86400000));
    if (target < min || target > max) return;
    moveFocus.current = true;
    setFocused(target);
    setMonth(monthOf(target));
  }

  return <div className="game-date-field">
    <div className="game-calendar-head">
      <h3>{label}</h3>
      <div className="game-calendar-toolbar">
        <button type="button" aria-label={t.previous} disabled={previous < monthOf(min)} onClick={() => navigate(previous)}>{rtl ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</button>
        <div className="game-calendar-selects">
          <select aria-label={t.month} value={monthNumber} onChange={event => navigate(`${year}-${event.target.value.padStart(2, "0")}`)}>
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1} disabled={`${year}-${String(i + 1).padStart(2, "0")}` < monthOf(min) || `${year}-${String(i + 1).padStart(2, "0")}` > monthOf(max)}>{monthName.format(new Date(Date.UTC(2026, i, 1)))}</option>)}
          </select>
          <select aria-label={t.year} value={year} onChange={event => navigate(`${event.target.value}-${String(monthNumber).padStart(2, "0")}`)}>
            {Array.from({ length: Number(max.slice(0, 4)) - Number(min.slice(0, 4)) + 1 }, (_, i) => Number(min.slice(0, 4)) + i).map(y => <option key={y} value={y}>{dayNumber.format(y)}</option>)}
          </select>
        </div>
        <button type="button" aria-label={t.next} disabled={next > monthOf(max)} onClick={() => navigate(next)}>{rtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}</button>
      </div>
    </div>
    <span className="sr-only" aria-live="polite">{monthName.format(first)} {dayNumber.format(year)}</span>
    <div className="game-calendar-week" aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => <span key={i}>{new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 8, 7 + i)))}</span>)}
    </div>
    <ul className="game-calendar-days" ref={grid} aria-label={readOnly ? t.distribution : t.choose}>
      {Array.from({ length: offset }, (_, i) => <li className="game-calendar-empty" aria-hidden="true" key={`empty-${i}`} />)}
      {days.map((day, index) => {
        const votes = dayVotes.get(day) ?? 0;
        const selected = day === value;
        const content = <><span className="game-day-number">{dayNumber.format(index + 1)}</span>{readOnly && votes > 0 && <span className="game-day-count">{countNumber.format(votes)}</span>}</>;
        return <li key={day}>{readOnly ?
          <time className="game-day" dateTime={day} data-heat={heatLevel(votes, peak)} data-picked={selected || undefined} aria-label={`${fullDate.format(new Date(day))} — ${t.guesses}: ${countNumber.format(votes)}${selected ? `, ${t.yours}` : ""}`}>{content}</time> :
          <button type="button" className="game-day" data-day={day} data-picked={selected || undefined} tabIndex={day === tabDate ? 0 : -1} disabled={day < min || day > max} aria-label={fullDate.format(new Date(day))} aria-pressed={selected} onClick={() => { onChange?.(day); setFocused(day); }} onKeyDown={event => moveDay(event, day)}>{content}</button>}
        </li>;
      })}
    </ul>
    {readOnly && <div className="game-calendar-legend">
      <span><span className="game-heat-scale" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <i key={i} data-heat={i} />)}</span>{t.scale}</span>
      <span><i className="game-pick-swatch" aria-hidden="true" />{t.yours}</span>
    </div>}
    {!readOnly && <input type="hidden" name="predictedDate" value={value} />}
  </div>;
}
