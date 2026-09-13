"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatMessage, type Locale } from "@/lib/i18n";
import { localePath, localeUrl } from "@/lib/routes";
import GameDatePicker from "./game-date-picker";
import { gameCopy } from "./game-copy";

type Pick = { id: string; predicted_date: string; nickname: string };
type Round = { chapter: number; state: "open" | "closed" | "settled"; max_date: string; actual_date: string | null };
type State = { preview?: boolean; round: Round; pick: Pick | null; guessesSoFar: number; ownGroup: string | null; today: string; turnstileSiteKey: string | null; emailAvailable: boolean; emailStatus: string | null };
type Stats = { winners: { nickname: string; predicted_date: string; rank: number; distance: number }[]; count: number; median: string | null; mean: string | null; modes: string[]; lower: string | null; upper: string | null; exact: number; days: { predicted_date: string; votes: number }[] };
type Group = { id: string; chapter: number; members: (Pick & { rank: number | null; distance: number | null })[] };
type Turnstile = { render: (element: HTMLElement, options: object) => string; remove: (id: string) => void; reset: (id: string) => void };
declare global { interface Window { turnstile?: Turnstile } }

async function api<T>(route: string, data?: object): Promise<T> {
  const response = await fetch(`/api/game/${route}`, { method: data ? "POST" : "GET", credentials: "same-origin", signal: AbortSignal.timeout(15000), headers: data ? { "Content-Type": "application/json" } : undefined, body: data ? JSON.stringify(data) : undefined });
  const result = await response.json().catch(() => ({ error: "unavailable" }));
  if (!response.ok) throw new Error(result.error ?? "error");
  return result;
}

export default function PredictionGame({ locale }: { locale: Locale }) {
  const t = gameCopy(locale);
  const [state, setState] = useState<State | null>(null);
  const localPreview = process.env.NODE_ENV === "development" && state?.preview === true && typeof location !== "undefined" && ["localhost", "127.0.0.1"].includes(location.hostname);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsBusy, setStatsBusy] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const [group, setGroup] = useState<Group | null>(null);
  const [date, setDate] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [emailAction, setEmailAction] = useState<{kind: "confirm-email" | "unsubscribe-email"; token: string} | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [privateLink, setPrivateLink] = useState("");
  const [publicLink, setPublicLink] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [token, setToken] = useState("");
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const started = useRef(false);
  const challenge = useRef<string | null>(null);
  const justSaved = useRef(false);
  const savedHeading = useRef<HTMLHeadingElement>(null);
  const explain = useCallback((e: unknown) => setError(t[e instanceof Error ? e.message as keyof typeof t : "error"] ?? t.error), [t]);
  const fmt = (value: string | null) => value ? new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(value)) : "—";
  const loadStats = useCallback(async (chapter: number, fresh = false, silent = false) => {
    if (!silent) setStatsBusy(true);
    setStatsError(false);
    try { setStats(await api<Stats>(`stats?chapter=${chapter}${fresh ? "&fresh=1" : ""}`)); }
    catch { if (!silent) setStatsError(true); }
    finally { if (!silent) setStatsBusy(false); }
  }, []);

  useEffect(() => {
    if (!state?.pick) return;
    const chapter = state.round.chapter;
    const refresh = () => {
      if (document.visibilityState === "visible") void loadStats(chapter, false, true);
    };
    const interval = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [state?.pick, state?.round.chapter, loadStats]);

  useEffect(() => {
    if (justSaved.current && state?.pick) {
      savedHeading.current?.focus();
      justSaved.current = false;
    }
  }, [state?.pick]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      const params = new URLSearchParams(location.search);
      const fragment = new URLSearchParams(location.hash.slice(1));
      const recovery = fragment.get("recover");
      const confirm = fragment.get("confirm"), unsubscribe = fragment.get("unsubscribe");
      if(confirm || unsubscribe) {
        history.replaceState(null, "", location.pathname + location.search);
        setEmailAction({kind:confirm ? "confirm-email" : "unsubscribe-email",token:(confirm || unsubscribe)!});
      }
      if (recovery) {
        history.replaceState(null, "", location.pathname + location.search);
        try { await api("recover", { token: recovery }); setNotice(t.recovered); } catch (e) { explain(e); }
      }
      challenge.current = params.get("challenge");
      let chapter = params.get("chapter");
      if (challenge.current) {
        const g = await api<Group>(`group/${encodeURIComponent(challenge.current)}`);
        chapter = String(g.chapter); setGroup(g);
      }
      const s = await api<State>(`state${chapter ? `?chapter=${encodeURIComponent(chapter)}` : ""}`);
      setState(s);
      if(fragment.get("invite") === "1" && s.pick) {
        const g=await api<Group>("group",{chapter:s.round.chapter}); setGroup(g);
        setPublicLink(`${location.origin}${localePath("/predictions",locale)}?chapter=${s.round.chapter}&challenge=${g.id}`);
      }
      if (s.pick) {
        await loadStats(s.round.chapter, true);
        if (!challenge.current && s.ownGroup) setGroup(await api<Group>(`group/${s.ownGroup}`));
      }
    })().catch(explain);
  }, [explain, loadStats, t, locale]);

  useEffect(() => {
    if (localPreview || !state || state.pick || state.round.state !== "open" || !state.turnstileSiteKey || !widget.current) return;
    let disposed = false;
    const render = () => {
      if (disposed || !widget.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(widget.current, { sitekey: state.turnstileSiteKey, action: "prediction", theme: "dark", size: "flexible", callback: (value: string) => setToken(value), "expired-callback": () => setToken(""), "error-callback": () => { setToken(""); setError(t.verification_required); } });
    };
    let script = document.querySelector<HTMLScriptElement>("script[data-game-turnstile]");
    if (!script) { script = document.createElement("script"); script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; script.dataset.gameTurnstile = "true"; script.async = true; document.head.appendChild(script); }
    const failed = () => setError(t.verificationHelp);
    script.addEventListener("error", failed);
    script.addEventListener("load", render); render();
    return () => { disposed = true; script?.removeEventListener("load", render); script?.removeEventListener("error", failed); if (widgetId.current) window.turnstile?.remove(widgetId.current); widgetId.current = null; };
  }, [state, t, localPreview]);

  async function action(work: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await work(); } catch (e) { explain(e); } finally { setBusy(false); }
  }
  const link = (id?: string) => `${localPreview ? location.origin + localePath("/predictions", locale) : localeUrl("/predictions", locale)}?chapter=${state!.round.chapter}${id ? `&challenge=${id}` : ""}`;
  async function copy(value: string) {
    await navigator.clipboard.writeText(value); setNotice(t.copied);
  }
  async function card(): Promise<File> {
    const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 630;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#0d1511"; c.fillRect(0, 0, 1200, 630);
    c.fillStyle = "#b9f65d"; c.fillRect(48, 52, 7, 526);
    c.font = "bold 25px sans-serif"; c.fillText("HUNTER × HUNTER · HXHSTATUS", 88, 104);
    c.fillStyle = "#b4c3b9"; c.font = "30px sans-serif"; c.fillText(`${t.shareText} · ${t.chapter} ${state!.round.chapter}`, 88, 192, 1020);
    c.fillStyle = "#f2f7ee"; c.font = "bold 68px sans-serif"; c.fillText(fmt(state!.pick!.predicted_date), 88, 310, 1020);
    c.font = "30px sans-serif"; c.fillText(state!.pick!.nickname || t.anonymous, 88, 376, 1020);
    c.fillStyle = "#b9f65d"; c.font = "32px sans-serif"; c.fillText(t.invitation, 88, 493, 1020);
    c.fillStyle = "#b4c3b9"; c.font = "22px sans-serif"; c.fillText("hxhstatus.com", 88, 553);
    return new File([await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(Error()), "image/png"))], `hxh-${state!.round.chapter}-${state!.pick!.predicted_date}.png`, { type: "image/png" });
  }
  async function download() {
    const file = await card(); const url = URL.createObjectURL(file); const a = document.createElement("a"); a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function share(id?: string) {
    const url = link(id); setShareLink(url);
    const text = `${t.shareText} · ${t.chapter} ${state!.round.chapter} : ${fmt(state!.pick!.predicted_date)}. ${t.invitation}`;
    const file = await card();
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text, url });
      else if (navigator.share) await navigator.share({ text, url });
      else await copy(url);
    } catch (e) { if (!(e instanceof Error && e.name === "AbortError")) throw e; }
  }
  const earliest = state ? new Date(Date.parse(state.today) + 86400000).toISOString().slice(0, 10) : "";
  const distributionStart = state ? [earliest, state.pick?.predicted_date, stats?.days[0]?.predicted_date].filter((day): day is string => Boolean(day)).sort()[0] : "";
  const later = stats && state?.pick && stats.count > 1 ? Math.round(100 * stats.days.filter(d => d.predicted_date > state.pick!.predicted_date).reduce((sum, d) => sum + d.votes, 0) / stats.count) : null;

  return <div className="prediction-game" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
    {localPreview && <div className="game-preview-bar"><span>{t.previewLabel}</span>{group && <button className="game-secondary" onClick={() => void action(async () => { await api("preview-new-player", {}); location.assign(link(group.id)); })}>{t.previewFriend}</button>}</div>}
    {error && <div className="game-feedback game-error" role="alert"><p>{error}</p>{!state && <button onClick={() => location.reload()}>{t.retry}</button>}</div>}
    {notice && <p className="game-feedback" role="status">{notice}</p>}
    {!state && !error && <p role="status">{t.loading}</p>}
    {emailAction && <section className="game-panel"><h2>{emailAction.kind === "confirm-email" ? t.emailConfirmTitle : t.emailUnsubscribeTitle}</h2><button disabled={busy || !state} onClick={() => void action(async () => {
      const kind=emailAction.kind;
      await api(kind,{token:emailAction.token}); setEmailAction(null);
      setNotice(kind === "confirm-email" ? t.emailConfirmed : t.emailUnsubscribed);
      if(state) {
        const fresh = await api<State>(`state?chapter=${state.round.chapter}`);
        setState(fresh); setStats(null); setGroup(null); setPublicLink("");
        if (fresh.pick) {
          await loadStats(fresh.round.chapter, true);
          const groupId = challenge.current || fresh.ownGroup;
          if (groupId) setGroup(await api<Group>(`group/${encodeURIComponent(groupId)}`));
        }
      }
    })}>{emailAction.kind === "confirm-email" ? t.emailConfirm : t.emailUnsubscribe}</button></section>}
    {state && !emailAction && <>
      <p className="game-participation"><strong>{(stats?.count ?? state.guessesSoFar).toLocaleString(locale)}</strong> {t.guessesSoFar}</p>
      <section className={state.pick ? "game-entry game-entry-saved" : "game-entry"} aria-labelledby="game-entry-title">
        {state.pick ? <>
          <h2 id="game-entry-title" ref={savedHeading} tabIndex={-1}>{state.pick.nickname ? formatMessage(t.verdictNamed, { name: state.pick.nickname }) : t.verdictUnnamed}</h2>
          <time className="game-date" dateTime={state.pick.predicted_date}>{fmt(state.pick.predicted_date)}</time>
          <p className="game-verdict-confirmed">{t.saved} · {t.chapter} {state.round.chapter}</p>
        </> : state.round.state === "open" ? <form onSubmit={e => { e.preventDefault(); void action(async () => {
          try {
            const result = await api<{ pick: Pick; email: string; alreadyVoted?: boolean }>("vote", { chapter: state.round.chapter, date, nickname, locale, turnstile: token });
            justSaved.current = true;
            setState({ ...state, pick: result.pick, guessesSoFar: state.guessesSoFar + (result.alreadyVoted ? 0 : 1), emailStatus: ["pending","confirmed"].includes(result.email) ? result.email : null });
            await loadStats(state.round.chapter, true);
          } finally { setToken(""); if (widgetId.current) window.turnstile?.reset(widgetId.current); }
        }); }}>
          <h2 id="game-entry-title" className="sr-only">{t.pickDate}</h2>
          <GameDatePicker locale={locale} label={t.pickDate} min={earliest} max={state.round.max_date} value={date} onChange={setDate} />
          <div className="game-fields">
            <p className="game-pick-readout" aria-live="polite">{date ? fmt(date) : t.chooseDate}</p>
            <label className="game-nickname"><span id="game-nickname-label">{t.nicknameLabel}</span><input aria-labelledby="game-nickname-label" aria-describedby="game-public-hint" autoComplete="off" required minLength={1} maxLength={24} value={nickname} onChange={e => setNickname(e.target.value)} /><span id="game-public-hint" className="game-hint">{t.publicHint}</span></label>
          </div>
          <div ref={widget} />
          {!localPreview && !state.turnstileSiteKey && <p className="game-error" role="alert">{t.verificationHelp} <button type="button" onClick={() => location.reload()}>{t.retry}</button></p>}
          <p className="game-hint" id="game-final">{t.finalShort}</p>
          <button className="game-vote" type="submit" aria-describedby="game-final game-unlock" disabled={busy || !date || !nickname.trim() || (!token && !localPreview)}>{busy ? t.busy : t.voteReveal}</button>
          <p className="game-hint" id="game-unlock">{t.unlockHint}</p>

        </form> : <><h2 id="game-entry-title">{t.closed}</h2><p>{t.closedHelp}</p></>}
        {state.round.actual_date && <p className="game-settled">{t.actual} <strong>{fmt(state.round.actual_date)}</strong>{state.pick && <> · {t.difference} : {Math.abs(Math.round((Date.parse(state.pick.predicted_date) - Date.parse(state.round.actual_date)) / 86400000))}</>}</p>}
        {state.pick && state.round.state === "closed" && <p>{t.closedHelp}</p>}
        {state.pick && <>
        <div className="game-recovery-note">
          <h3>{t.recovery}</h3>

          {!privateLink && <button className="game-recovery-button" disabled={busy} onClick={() => void action(async () => { const result = await api<{ token: string }>("recovery", {}); setPrivateLink(`${location.origin}${localePath("/predictions", locale)}?chapter=${state.round.chapter}#recover=${result.token}`); })}>{t.createRecovery}</button>}
          {privateLink && <div className="game-link"><label>{t.private}<input dir="ltr" readOnly value={privateLink} onFocus={e => e.target.select()} /></label><button disabled={busy} onClick={() => void action(() => copy(privateLink))}>{t.copy}</button></div>}
          {privateLink && <p className="game-hint">{t.restore}</p>}
        </div>
        </>}

      </section>

      {state.pick && <section className="game-panel game-community" aria-labelledby="game-stats-title" aria-busy={statsBusy}>
        <div className="game-section-heading"><h2 id="game-stats-title">{t.community}</h2>{stats && <span>{t.count}: {stats.count.toLocaleString(locale)}</span>}</div>
        {statsError && <p className="game-feedback game-error" role="alert">{t.resultsError}</p>}
        {statsBusy && !stats && <p role="status">{t.resultsLoading}</p>}
        {stats && (stats.count === 0 ? <p>{t.firstPick}</p> : <>
          <div className="game-community-summary">
            <div><span>{t.median}</span><strong>{fmt(stats.median)}</strong></div>
            {later !== null && <p>{formatMessage(t.comparison, { percent: new Intl.NumberFormat(locale, {style:"percent"}).format(later / 100) })}</p>}
          </div>
          <div className="game-month-overview" aria-label={t.monthOverview}>{Object.entries(stats.days.reduce<Record<string, number>>((months, day) => { const month = day.predicted_date.slice(0, 7); months[month] = (months[month] ?? 0) + day.votes; return months; }, {})).map(([month, count]) => <div className="game-month-row" key={month}><span>{new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(month + "-01"))}</span><meter min={0} max={stats.count} value={count} aria-label={month} /><strong>{new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(count / stats.count)}</strong></div>)}</div>
          <details className="game-stat-details"><summary>{t.statsDetails}</summary>
        {stats && <GameDatePicker locale={locale} label={t.distributionTitle} min={distributionStart} max={state.round.max_date} value={state.pick.predicted_date} distribution={stats.days} />}

            <p>{t.mean}: <strong>{fmt(stats.mean)}</strong></p>
            <p>{t.middle} <strong>{fmt(stats.lower)}</strong> {t.and} <strong>{fmt(stats.upper)}</strong>.</p>
            <p>{t.mode}: {stats.modes.slice(0, 3).map(d => fmt(d)).join(" · ")}{stats.modes.length > 3 && ` (+${stats.modes.length - 3} ${t.more})`}</p>
          </details>
        </>)}
        {stats && <>
          {state.round.actual_date && <p>{stats.exact} {t.exact}</p>}
          {stats.winners?.length > 0 && <><h3>{t.winners}</h3><div className="game-table-wrap"><table><thead><tr><th>{t.rank}</th><th>{t.nickname}</th><th>{t.difference}</th></tr></thead><tbody>{stats.winners.map((w,i)=><tr key={i}><td>{w.rank}</td><td>{w.nickname || t.anonymous}</td><td>{w.distance}</td></tr>)}</tbody></table></div></>}
        </>}
        <button className="game-secondary" disabled={busy || statsBusy} onClick={() => void action(async () => { await loadStats(state.round.chapter, true); if (group) setGroup(await api<Group>(`group/${group.id}`)); const fresh = await api<State>(`state?chapter=${state.round.chapter}`); setState(fresh); })}>{stats ? t.refresh : t.results}</button>
      </section>}
      {state.pick && <section className="game-next-steps" aria-labelledby="game-next-title">
        <h2 id="game-next-title" className="sr-only">{t.share}</h2>
        <div className="game-email-inline">
          <div className="game-option-body">
          {state.emailStatus ? <p role="status">{state.emailStatus === "confirmed" ? t.emailConfirmed : state.emailStatus === "unsubscribed" ? t.emailUnsubscribed : t.emailPending}</p> : state.emailAvailable ? <>
            <form className="game-email-form" onSubmit={e => {e.preventDefault(); void action(async () => {
              const result = await api<{email:string}>("email", {chapter:state.round.chapter,email,locale});
              if (["pending","confirmed"].includes(result.email)) setState({...state,emailStatus:result.email});
              else setError(result.email === "invalid_email" ? t.invalid_email : t.emailFailed);
            });}}><label>{t.email}<input type="email" dir="ltr" required maxLength={254} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /><span className="game-hint">{t.emailAnnouncement}</span></label><button disabled={busy}>{t.emailAdd}</button></form>
          </> : <label>{t.email}<input type="email" dir="ltr" disabled placeholder="name@example.com" /><span className="game-hint">{t.emailAnnouncement}</span></label>}
          </div>
        </div>

        <div className="game-option">

          <div className="game-option-body">
            <div className="game-actions"><button disabled={busy} onClick={() => void action(() => share())}>{t.share}</button><button className="game-secondary" disabled={busy} onClick={() => void action(download)}>{t.download}</button></div>
            {shareLink && <div className="game-link"><input dir="ltr" aria-label={t.copy} readOnly value={shareLink} onFocus={e => e.target.select()} /><button disabled={busy} onClick={() => void action(() => copy(shareLink))}>{t.copy}</button></div>}
          </div>
        </div>
        <div className="game-friend-actions">
        <div className="game-option">

          <div className="game-option-body">
          {!group ? <button disabled={busy} onClick={() => void action(async () => { const g = await api<Group>("group", { chapter: state.round.chapter }); setGroup(g); setPublicLink(link(g.id)); })}>{t.createChallenge}</button> : <>
            <div className="game-section-heading"><h3>{t.group}</h3><span>{group.members.length} / 100 {t.members}</span></div>
            {!group.members.some(p => p.id === state.pick!.id) && <button disabled={busy} onClick={() => void action(async () => setGroup(await api<Group>("join", { chapter: state.round.chapter, group: group.id })))}>{t.join}</button>}
            <div className="game-table-wrap"><table><thead><tr>{state.round.actual_date && <th>{t.rank}</th>}<th>{t.nickname}</th><th>{t.groupDate}</th>{state.round.actual_date && <th>{t.difference}</th>}</tr></thead><tbody>{group.members.map(p => <tr key={p.id} className={p.id === state.pick?.id ? "game-me" : ""}>{state.round.actual_date && <td>{p.rank}</td>}<td>{p.nickname || t.anonymous}</td><td>{fmt(p.predicted_date)}</td>{state.round.actual_date && <td>{p.distance}</td>}</tr>)}</tbody></table></div>
            <div className="game-link"><input dir="ltr" aria-label={t.copyChallenge} readOnly value={publicLink || link(group.id)} onFocus={e => e.target.select()} /><button disabled={busy} onClick={() => void action(() => copy(link(group.id)))}>{t.copyChallenge}</button></div>
          </>}
          </div>
        </div>
        </div>
      </section>}

    </>}
  </div>;
}
