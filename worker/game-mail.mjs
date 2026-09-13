import { mailLocale, mailText } from "./game-mail-copy.mjs";
import { summarizeVotes } from './game-stats.mjs';

const encoder = new TextEncoder();
const hex = bytes => [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');
export const emailHash = async value => hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nowISO = () => new Date().toISOString();
export function emailAvailable(env) {
  return env.GAME_EMAIL_ENABLED==='true' && typeof env.GAME_EMAIL_KEY==='string' && env.GAME_EMAIL_KEY.length>=32 && (env.GAME_EMAIL_PREVIEW==='true' || Boolean(env.RESEND_API_KEY && env.GAME_EMAIL_FROM));
}
function origin(env) {
  const url = new URL(env.GAME_PUBLIC_ORIGIN ?? 'https://hxhstatus.com');
  if(url.protocol!=='https:' && !(env.GAME_EMAIL_PREVIEW==='true' && ['localhost','127.0.0.1'].includes(url.hostname))) throw Error('invalid_mail_origin');
  return url.origin;
}
export function normalizeEmail(value) {
  if(typeof value!=='string') return null;
  const email=value.trim().toLowerCase();
  return email.length<=254 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(email) ? email : null;
}
async function encryptionKey(env) {
  return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',encoder.encode(env.GAME_EMAIL_KEY)),{name:'AES-GCM'},false,['encrypt','decrypt']);
}
async function encrypt(env,payload) {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},await encryptionKey(env),encoder.encode(JSON.stringify(payload)));
  return `${hex(iv)}:${hex(cipher)}`;
}
export async function decryptMail(env,value) {
  const bytes = s => Uint8Array.from(s.match(/../g).map(v=>parseInt(v,16)));
  const [iv,cipher]=value.split(':');
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv)},await encryptionKey(env),bytes(cipher))));
}
async function secret() { return hex(crypto.getRandomValues(new Uint8Array(32))); }
const dateText = (date,locale) => new Intl.DateTimeFormat(locale,{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date));
function layout(title, paragraphs, buttons, locale='en') {
  const html=`<!doctype html><html lang="${locale}" dir="${locale==='ar'?'rtl':'ltr'}"><body style="margin:0;background:#0b100d;color:#f1f6ed;font-family:Arial,sans-serif"><main style="max-width:580px;margin:32px auto;padding:32px"><p style="color:#b9f65d;letter-spacing:2px">HXH STATUS</p><h1 style="font-size:28px">${escape(title)}</h1>${paragraphs.map(p=>`<p style="line-height:1.6">${escape(p)}</p>`).join('')}${buttons.map(([label,url],index)=>`<p><a href="${escape(url)}" style="display:inline-block;${index===0?'background:#b9f65d;color:#0b100d;padding:14px 18px;border-radius:8px;text-decoration:none':index===buttons.length-1?'color:#9eaf9f;font-size:13px':'color:#b9f65d'}">${escape(label)}</a></p>`).join('')}</main></body></html>`;
  return {html,text:[title,...paragraphs,...buttons.map(([label,url])=>`${label}: ${url}`)].join('\n\n')};
}
export async function registerEmail(env,pick,chapter,value,locale='en') {
  if(!value) return {status:'none'};
  if(!emailAvailable(env)) return {status:'unavailable'};
  const email=normalizeEmail(value); if(!email) return {status:'invalid_email'};
  const db=env.GAME_DB;
  const existing=await db.prepare('SELECT confirmed_at,unsubscribed_at FROM game_emails WHERE pick_id=?').bind(pick.id).first();
  if(existing) return {status:existing.unsubscribed_at?'unsubscribed':existing.confirmed_at?'confirmed':'pending'};
  locale=mailLocale(locale);
  const t=(key,values)=>mailText(locale,key,values);
  const confirm=await secret(), recover=await secret(), unsubscribe=await secret(), now=nowISO();
  const path=`${origin(env)}${locale==='en'?'':'/'+locale}/predictions?chapter=${chapter}`;
  const name=pick.nickname || 'Hunter';
  const subject=t('saved',{name});
  const message=layout(subject,[t('choice',{date:dateText(pick.predicted_date,locale),chapter}),t('confirmHint')],[[t('confirm'),`${path}#confirm=${confirm}`],[t('prediction'),`${path}#recover=${recover}`],[t('challenge'),`${path}#recover=${recover}&invite=1`],[t('unsubscribe'),`${path}#unsubscribe=${unsubscribe}`]],locale);
  const payload=await encrypt(env,{from:env.GAME_EMAIL_FROM || 'HxH Status <game@example.test>',to:[email],subject,...message});
  const result=await db.batch([
    db.prepare(`INSERT OR IGNORE INTO game_emails(pick_id,chapter,email,email_hash,locale,confirm_hash,recovery_hash,unsubscribe_hash,confirm_expires,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`)
      .bind(pick.id,chapter,email,await emailHash(email),locale,await emailHash(confirm),await emailHash(recover),await emailHash(unsubscribe),new Date(Date.now()+7*86400000).toISOString(),now),
    db.prepare(`INSERT OR IGNORE INTO game_mail_jobs(id,pick_id,kind,payload,available_at) SELECT ?,pick_id,'confirmation',?,? FROM game_emails WHERE pick_id=? AND confirm_hash=?`)
      .bind(`${pick.id}:confirmation`,payload,now,pick.id,await emailHash(confirm)),
  ]);
  return {status:result[0].meta?.changes ? 'pending' : 'not_sent', jobId:`${pick.id}:confirmation`};
}
export async function emailState(env,pickId) {
  if(!pickId) return null;
  const row=await env.GAME_DB.prepare('SELECT confirmed_at,unsubscribed_at FROM game_emails WHERE pick_id=?').bind(pickId).first();
  return row ? row.unsubscribed_at?'unsubscribed':row.confirmed_at?'confirmed':'pending' : null;
}
export async function confirmEmail(env,token) {
  if(!/^[a-f0-9]{64}$/.test(token ?? '')) return false;
  const result=await env.GAME_DB.prepare(`UPDATE game_emails SET confirmed_at=COALESCE(confirmed_at,?) WHERE confirm_hash=? AND confirm_expires>? AND unsubscribed_at IS NULL RETURNING pick_id`)
    .bind(nowISO(),await emailHash(token),nowISO()).first();
  return result;
}
export async function unsubscribeEmail(env,token) {
  if(!/^[a-f0-9]{64}$/.test(token ?? '')) return false;
  const result=await env.GAME_DB.prepare('UPDATE game_emails SET unsubscribed_at=COALESCE(unsubscribed_at,?) WHERE unsubscribe_hash=? RETURNING pick_id').bind(nowISO(),await emailHash(token)).first();
  return Boolean(result);
}
export async function emailRecovery(env,token) {
  return env.GAME_DB.prepare('SELECT p.player_id AS id FROM game_emails e JOIN game_picks p ON p.id=e.pick_id WHERE e.recovery_hash=?').bind(await emailHash(token)).first();
}
async function queueResults(env) {
  const db=env.GAME_DB;
  const rows=await db.prepare(`SELECT e.*,p.predicted_date,p.nickname,p.player_id,r.actual_date FROM game_emails e JOIN game_picks p ON p.id=e.pick_id JOIN game_rounds r ON r.chapter=e.chapter WHERE e.confirmed_at IS NOT NULL AND e.unsubscribed_at IS NULL AND e.result_queued_at IS NULL AND r.state='settled' AND r.actual_date IS NOT NULL LIMIT 20`).all();
  for(const row of rows.results) {
    const histogram=await db.prepare('SELECT predicted_date,votes FROM game_days WHERE chapter=?').bind(row.chapter).all();
    const stats=summarizeVotes(histogram.results);
    const distance=Math.abs(Math.round((Date.parse(row.predicted_date)-Date.parse(row.actual_date))/86400000));
    const rank=1+histogram.results.filter(r=>Math.abs((Date.parse(r.predicted_date)-Date.parse(row.actual_date))/86400000)<distance).reduce((s,r)=>s+r.votes,0);
    const locale=mailLocale(row.locale), t=(key,values)=>mailText(locale,key,values);
    const groups=await db.prepare(`SELECT m.group_id,1+(SELECT count(*) FROM game_members others JOIN game_picks p ON p.player_id=others.player_id AND p.chapter=? WHERE others.group_id=m.group_id AND ABS(julianday(p.predicted_date)-julianday(?))<?) AS rank,(SELECT count(*) FROM game_members WHERE group_id=m.group_id) AS members FROM game_members m JOIN game_groups g ON g.id=m.group_id WHERE m.player_id=? AND g.chapter=?`).bind(row.chapter,row.actual_date,distance,row.player_id,row.chapter).all();
    const subject=t('results',{name:row.nickname||'Hunter',chapter:row.chapter});
    const paragraphs=[t('outcome',{chapter:row.chapter,actual:dateText(row.actual_date,locale),date:dateText(row.predicted_date,locale),distance}),t('rank',{rank,count:stats.count,median:dateText(stats.median,locale)}),...groups.results.map((g,i)=>t('group',{number:i+1,rank:g.rank,count:g.members}))];
    // Reuse the encrypted first email's private URLs; never rotate credentials
    // when sending results or reconstruct secrets from a public identifier.
    const first=await db.prepare("SELECT payload FROM game_mail_jobs WHERE pick_id=? AND kind='confirmation'").bind(row.pick_id).first();
    const original=await decryptMail(env,first.payload);
    const recoveryURL=original.text.match(/https?:\/\/[^\s]+#recover=[a-f0-9]{64}/)?.[0];
    const unsubscribeURL=original.text.match(/https?:\/\/[^\s]+#unsubscribe=[a-f0-9]{64}/)?.[0];
    const payload=await encrypt(env,{from:env.GAME_EMAIL_FROM || original.from,to:[row.email],subject,...layout(subject,paragraphs,[[t('prediction'),recoveryURL],[t('unsubscribe'),unsubscribeURL]],locale)});
    await db.batch([
      db.prepare("INSERT OR IGNORE INTO game_mail_jobs(id,pick_id,kind,payload,available_at) VALUES(?,?,'results',?,?)").bind(`${row.pick_id}:results`,row.pick_id,payload,nowISO()),
      db.prepare('UPDATE game_emails SET result_queued_at=? WHERE pick_id=?').bind(nowISO(),row.pick_id),
    ]);
  }
}

export async function runGameMail(env,onlyJob=null,fetchImpl=fetch) {
  if(env.GAME_ENABLED!=='true' || !env.GAME_DB || !emailAvailable(env)) return;
  const db=env.GAME_DB;
  if(!onlyJob) await queueResults(env);
  const jobs=await db.prepare(`SELECT id FROM game_mail_jobs WHERE status IN ('pending','sending') AND available_at<=? AND (lease_until IS NULL OR lease_until<?) ${onlyJob?'AND id=?':''} ORDER BY available_at LIMIT 5`).bind(nowISO(),nowISO(),...(onlyJob?[onlyJob]:[])).all();
  for(const {id} of jobs.results) {
    const now=nowISO();
    const job=await db.prepare("UPDATE game_mail_jobs SET status='sending',lease_until=? WHERE id=? AND status IN ('pending','sending') AND (lease_until IS NULL OR lease_until<?) RETURNING *").bind(new Date(Date.now()+120000).toISOString(),id,now).first();
    if(!job) continue;
    const recipient=await db.prepare('SELECT confirmed_at,unsubscribed_at,confirm_expires FROM game_emails WHERE pick_id=?').bind(job.pick_id).first();
    if(recipient.unsubscribed_at || (job.kind==='results' && !recipient.confirmed_at) || (job.kind==='confirmation' && recipient.confirm_expires<now)) {
      await db.prepare("UPDATE game_mail_jobs SET status='cancelled',lease_until=NULL WHERE id=?").bind(id).run(); continue;
    }
    // Stop before the provider's 24-hour idempotency window expires. An
    // ambiguous old attempt is never retried with a fresh deduplication window.
    if(job.attempts>=6 || (job.first_attempt_at && Date.now()-Date.parse(job.first_attempt_at)>23*3600000)) {
      await db.prepare("UPDATE game_mail_jobs SET status='failed',lease_until=NULL WHERE id=?").bind(id).run(); continue;
    }
    const day=now.slice(0,10), month=now.slice(0,7);
    const reserved=await db.prepare(`INSERT INTO game_mail_budget(day,attempts) SELECT ?,1 WHERE COALESCE((SELECT sum(attempts) FROM game_mail_budget WHERE day LIKE ?),0)<? ON CONFLICT(day) DO UPDATE SET attempts=attempts+1 WHERE attempts<? RETURNING day`).bind(day,`${month}%`,Number(env.GAME_EMAIL_MONTHLY_LIMIT||2800),Number(env.GAME_EMAIL_DAILY_LIMIT||90)).first();
    if(!reserved) {
      await db.prepare("UPDATE game_mail_jobs SET status='pending',lease_until=NULL,available_at=? WHERE id=?").bind(new Date(Date.parse(day)+86400000).toISOString(),id).run(); continue;
    }
    await db.prepare('UPDATE game_mail_jobs SET attempts=attempts+1,first_attempt_at=COALESCE(first_attempt_at,?) WHERE id=?').bind(now,id).run();
    try {
      const payload=await decryptMail(env,job.payload);
      let providerId='local-preview';
      if(env.GAME_EMAIL_PREVIEW==='true') {
        if(!['localhost','127.0.0.1'].includes(new URL(origin(env)).hostname)) throw Error('preview_not_local');
        await db.prepare('INSERT OR IGNORE INTO game_mail_preview(id,payload) VALUES(?,?)').bind(id,JSON.stringify(payload)).run();
      } else {
        const response=await fetchImpl('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`hxh-${id}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
        if(!response.ok) {
          if(response.status!==429 && response.status<500) {
            await db.prepare("UPDATE game_mail_jobs SET status='failed',lease_until=NULL WHERE id=?").bind(id).run(); continue;
          }
          throw Error('provider_retry');
        }
        providerId=(await response.json()).id;
        if(typeof providerId!=='string') throw Error('provider_retry');
      }
      await db.prepare("UPDATE game_mail_jobs SET status='sent',sent_at=?,provider_id=?,lease_until=NULL WHERE id=?").bind(nowISO(),providerId,id).run();
    } catch {
      await db.prepare("UPDATE game_mail_jobs SET status='pending',lease_until=NULL,available_at=? WHERE id=?").bind(new Date(Date.now()+Math.min(3600000,60000*2**job.attempts)).toISOString(),id).run();
    }
  }
}
