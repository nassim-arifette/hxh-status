import { normalizeEmail, registerEmail, emailState, emailAvailable, confirmEmail, unsubscribeEmail, emailRecovery, runGameMail } from "./game-mail.mjs";
import status from '../app/data/status-data.json' with { type: 'json' };
import { japanDay, validDate, summarizeVotes } from './game-stats.mjs';

const COOKIE = 'hxh_game';
const ID = /^[a-f0-9]{32}$/;
const SECRET = /^[a-f0-9]{64}$/;
const random = bytes => [...crypto.getRandomValues(new Uint8Array(bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
const hash = async text => [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');
const loopback = request => ['localhost','127.0.0.1','[::1]'].includes(new URL(request.url).hostname);
const cookie = request => (request.headers.get('Cookie') ?? '').split(';').map(s=>s.trim()).find(s=>s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);
const sessionCookie = (request, token) => `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${loopback(request)?'':'; Secure'}`;
function json(data, statusCode = 200, headers = {}) {
  return Response.json(data, { status: statusCode, headers: { 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', ...headers } });
}
class GameError extends Error { constructor(code, statusCode = 400) { super(code); this.statusCode=statusCode; } }
async function body(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new GameError('invalid_request',415);
  const reader=request.body?.getReader(); if(!reader) throw new GameError('invalid_request');
  let size=0, text=''; const decoder=new TextDecoder();
  while(true) { const {value,done}=await reader.read(); if(done) break; size+=value.length; if(size>4096){await reader.cancel();throw new GameError('invalid_request',413);} text+=decoder.decode(value,{stream:true}); }
  try { const data=JSON.parse(text+decoder.decode()); if(!data || Array.isArray(data) || typeof data!=='object') throw Error(); return data; } catch { throw new GameError('invalid_request'); }
}
async function identity(request, db) {
  const token=cookie(request);
  if(!token || !SECRET.test(token)) return null;
  return db.prepare('SELECT player_id FROM game_sessions WHERE token_hash=?').bind(await hash(token)).first();
}
async function findRound(db, chapter) {
  if(chapter!==null && (!Number.isInteger(Number(chapter)) || Number(chapter)<1)) throw new GameError('invalid_request');
  if(chapter!==null && Number(chapter)!==421) throw new GameError('not_found',404);
  const round=await db.prepare('SELECT * FROM game_rounds WHERE chapter=?').bind(421).first();
  if(!round) throw new GameError('not_found',404);
  return round;
}
// A deployment containing an announcement closes the database round. Never
// reopen it on a correction or postpone announcement. Operator close is also
// available immediately via the management script, before a site deployment.
export async function syncRound(db, round) {
  const chapter=status.chapters.find(c=>c.chapter===round.chapter);
  if(chapter?.releaseAt || ['scheduled','published'].includes(chapter?.status)) {
    const announced=chapter.releaseAt?.slice(0,10) ?? null;
    const actual=chapter.status==='published' ? announced : null;
    if(round.state==='open' || (actual && round.actual_date!==actual) || (round.state==='closed' && announced && round.announced_date!==announced)) {
      await db.prepare("UPDATE game_rounds SET state=CASE WHEN ? IS NOT NULL THEN 'settled' ELSE 'closed' END, closes_at=COALESCE(closes_at,?), announced_date=COALESCE(?,announced_date), actual_date=COALESCE(?,actual_date) WHERE chapter=?")
        .bind(actual,new Date().toISOString(),announced,actual,round.chapter).run();
      return findRound(db,round.chapter);
    }
  }
  if(round.state==='open' && round.closes_at && round.closes_at<=new Date().toISOString()) {
    await db.prepare("UPDATE game_rounds SET state='closed' WHERE chapter=? AND state='open'").bind(round.chapter).run();
    return findRound(db,round.chapter);
  }
  return round;
}
async function myPick(db, chapter, person) {
  return person ? db.prepare('SELECT id,predicted_date,nickname,created_at FROM game_picks WHERE chapter=? AND player_id=?').bind(chapter,person.player_id).first() : null;
}
async function verifyHuman(request, env, data) {
  if(!env.GAME_TURNSTILE_SECRET || typeof data.turnstile!=='string' || !data.turnstile || data.turnstile.length>2048) throw new GameError('verification_required',403);
  const result=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.GAME_TURNSTILE_SECRET,response:data.turnstile,remoteip:request.headers.get('CF-Connecting-IP')}),signal:AbortSignal.timeout(10000)});
  const verification=await result.json();
  if(!verification.success || verification.hostname!==new URL(request.url).hostname || verification.action!=='prediction') throw new GameError('verification_required',403);
}
async function groupView(db,id) {
  if(!ID.test(id)) throw new GameError('not_found',404);
  const group=await db.prepare('SELECT g.id,g.chapter,r.state,r.actual_date FROM game_groups g JOIN game_rounds r ON r.chapter=g.chapter WHERE g.id=?').bind(id).first();
  if(!group) throw new GameError('not_found',404);
  const members=await db.prepare(`SELECT p.id,p.nickname,p.predicted_date,
    CASE WHEN ? IS NOT NULL THEN ABS(CAST(julianday(p.predicted_date)-julianday(?) AS INTEGER)) END AS distance,
    CASE WHEN ? IS NOT NULL THEN RANK() OVER(ORDER BY ABS(julianday(p.predicted_date)-julianday(?))) END AS rank
    FROM game_members m JOIN game_picks p ON p.player_id=m.player_id AND p.chapter=?
    WHERE m.group_id=? ORDER BY distance ASC,p.created_at ASC LIMIT 100`)
    .bind(group.actual_date,group.actual_date,group.actual_date,group.actual_date,group.chapter,id).all();
  return {...group,members:members.results};
}
async function joinGroup(db, id, person, chapter) {
  if(!ID.test(id)) throw new GameError('not_found',404);
  const group=await db.prepare('SELECT chapter FROM game_groups WHERE id=?').bind(id).first();
  if(!group || group.chapter!==chapter) throw new GameError('not_found',404);
  await db.prepare(`INSERT OR IGNORE INTO game_members(group_id,player_id)
    SELECT ?,? WHERE (SELECT count(*) FROM game_members WHERE group_id=?)<100
    AND (SELECT count(*) FROM game_members m JOIN game_groups g ON g.id=m.group_id WHERE m.player_id=? AND g.chapter=?)<10
    AND EXISTS(SELECT 1 FROM game_picks WHERE player_id=? AND chapter=?)`)
    .bind(id,person.player_id,id,person.player_id,chapter,person.player_id,chapter).run();
  if(!await db.prepare('SELECT 1 FROM game_members WHERE group_id=? AND player_id=?').bind(id,person.player_id).first()) throw new GameError('group_full',409);
  return groupView(db,id);
}

export async function handleGameApi(request,env,ctx) {
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/game/')) return null;
  const db=env.GAME_DB;
  if(env.GAME_ENABLED!=='true' || !db) return json({error:'unavailable'},503);
  try {
    const mutation=request.method==='POST';
    if(!['GET','POST'].includes(request.method)) return json({error:'invalid_request'},405,{Allow:'GET, POST'});
    if((mutation && request.headers.get('Origin')!==url.origin) || request.headers.get('Sec-Fetch-Site')==='cross-site') throw new GameError('invalid_request',403);
    const limiter=mutation?env.GAME_WRITE_LIMITER:env.GAME_READ_LIMITER;
    if(!limiter) throw new GameError('unavailable',503);
    if(limiter && !(await limiter.limit({key:await hash(request.headers.get('CF-Connecting-IP') ?? 'preview')})).success) return json({error:'rate_limited'},429,{'Retry-After':'60'});
    const route=url.pathname.slice('/api/game/'.length);
    if (['confirm-email','unsubscribe-email'].includes(route) && mutation) {
      const data=await body(request);
      const ok=await (route==='confirm-email'?confirmEmail:unsubscribeEmail)(env,data.token);
      if(!ok) throw new GameError('email_link_invalid',400);
      if(route==='confirm-email') {
        const owner=await db.prepare('SELECT player_id FROM game_picks WHERE id=?').bind(ok.pick_id).first();
        const token=random(32);
        await db.prepare('INSERT INTO game_sessions(token_hash,player_id) VALUES(?,?)').bind(await hash(token),owner.player_id).run();
        return json({ok:true},200,{'Set-Cookie':sessionCookie(request,token)});
      }
      return json({ok:true});
    }
    if(route==='email' && mutation) {
      const data=await body(request), person=await identity(request,db);
      const pick=await myPick(db,Number(data.chapter),person);
      if(!pick) throw new GameError('vote_first',401);
      const result=await registerEmail(env,pick,Number(data.chapter),data.email,data.locale);
      if(result.jobId && ctx?.waitUntil) ctx.waitUntil(runGameMail(env,result.jobId).catch(()=>{}));
      return json({email:result.status});
    }
    if(route==='recover' && mutation) {
      const data=await body(request); if(!SECRET.test(data.token ?? '')) throw new GameError('recovery_invalid',403);
      const player=await db.prepare('SELECT id FROM game_players WHERE recovery_hash=?').bind(await hash(data.token)).first() ?? await emailRecovery(env,data.token);
      if(!player) throw new GameError('recovery_invalid',403);
      const token=random(32);
      await db.prepare('INSERT INTO game_sessions(token_hash,player_id) VALUES(?,?)').bind(await hash(token),player.id).run();
      return json({ok:true},200,{'Set-Cookie':sessionCookie(request,token)});
    }
    if(route==='recovery' && mutation) {
      const person=await identity(request,db); if(!person) throw new GameError('vote_first',401);
      const token=random(32);
      await db.prepare('UPDATE game_players SET recovery_hash=? WHERE id=?').bind(await hash(token),person.player_id).run();
      return json({token});
    }
    if(route.startsWith('group/') && !mutation) {
      const id=route.slice(6);
      if(!ID.test(id)) throw new GameError('not_found',404);
      const g=await db.prepare('SELECT chapter FROM game_groups WHERE id=?').bind(id).first();
      if(!g) throw new GameError('not_found',404);
      await syncRound(db,await findRound(db,g.chapter));
      return json(await groupView(db,id));
    }
    if(!['state','stats','vote','group','join'].includes(route)) throw new GameError('not_found',404);
    if(mutation !== ['vote','group','join'].includes(route)) throw new GameError('invalid_request',405);
    const data=mutation?await body(request):{};
    const round=await syncRound(db,await findRound(db,mutation?data.chapter??null:url.searchParams.get('chapter')));
    const person=await identity(request,db);
    if(route==='state') {
      let token=cookie(request); const headers={};
      if(!token || !SECRET.test(token)){token=random(32);headers['Set-Cookie']=sessionCookie(request,token);}
      const pick=await myPick(db,round.chapter,person);
      const ownGroup=person?await db.prepare('SELECT id FROM game_groups WHERE chapter=? AND owner_id=?').bind(round.chapter,person.player_id).first():null;
      const guesses=await db.prepare('SELECT COALESCE(SUM(votes),0) AS count FROM game_days WHERE chapter=?').bind(round.chapter).first();
      return json({round,pick,guessesSoFar:guesses.count,ownGroup:ownGroup?.id??null,today:japanDay(),turnstileSiteKey:env.GAME_TURNSTILE_SITE_KEY??null,emailAvailable:emailAvailable(env),emailStatus:await emailState(env,pick?.id)},200,headers);
    }
    if(route==='stats') {
      // Only public aggregates enter the cache. Credentials and private state
      // are never cached. Histogram reads are bounded by the voting date range.
      const cache=globalThis.caches?.default;
      const key=new Request(`${url.origin}/api/game/stats?chapter=${round.chapter}&state=${round.state}&actual=${round.actual_date??''}`);
      const fresh=url.searchParams.get('fresh')==='1';
      const cached=cache && !fresh ? await cache.match(key):null; if(cached) return cached;
      const rows=await db.prepare('SELECT predicted_date,votes FROM game_days WHERE chapter=? ORDER BY predicted_date').bind(round.chapter).all();
      const winners=round.actual_date ? (await db.prepare('SELECT nickname,predicted_date,ABS(CAST(julianday(predicted_date)-julianday(?) AS INTEGER)) AS distance,RANK() OVER(ORDER BY ABS(julianday(predicted_date)-julianday(?))) AS rank FROM game_picks WHERE chapter=? ORDER BY distance,created_at LIMIT 10').bind(round.actual_date,round.actual_date,round.chapter).all()).results : [];
      const result=json({...summarizeVotes(rows.results,null,round.actual_date),winners,days:rows.results,asOf:new Date().toISOString()},200,{'Cache-Control':fresh?'no-store':'public, max-age=60'});
      if(cache && !fresh && ctx?.waitUntil) ctx.waitUntil(cache.put(key,result.clone()));
      return result;
    }
    if(route==='vote') {
      const token=cookie(request); if(!token || !SECRET.test(token)) throw new GameError('reload',409);
      if(round.state!=='open') throw new GameError('closed',409);
      if(!validDate(data.date) || data.date<=japanDay() || data.date>round.max_date) throw new GameError('invalid_date');
      if(typeof data.nickname!=='string' || !data.nickname.trim() || [...data.nickname.trim()].length>24 || /[\p{Cc}\p{Cf}]/u.test(data.nickname)) throw new GameError('invalid_nickname');
      if(emailAvailable(env) && data.email && !normalizeEmail(data.email)) throw new GameError('invalid_email');
      const saveEmail=async pick=>{
        try {
          const result=await registerEmail(env,pick,round.chapter,data.email,data.locale);
          if(result.jobId && ctx?.waitUntil) ctx.waitUntil(runGameMail(env,result.jobId).catch(()=>{}));
          return result.status;
        } catch { return 'not_sent'; }
      };
      const existing=await myPick(db,round.chapter,person); if(existing) return json({pick:existing,alreadyVoted:true,email:await saveEmail(existing)});
      await verifyHuman(request,env,data);
      const player=random(16), pickId=random(16), sessionHash=await hash(token), now=new Date().toISOString();
      const result=await db.batch([
        db.prepare('INSERT INTO game_players(id,recovery_hash,created_at) SELECT ?,?,? WHERE NOT EXISTS(SELECT 1 FROM game_sessions WHERE token_hash=?)').bind(player,await hash(random(32)),now,sessionHash),
        db.prepare('INSERT OR IGNORE INTO game_sessions(token_hash,player_id) SELECT ?,id FROM game_players WHERE id=?').bind(sessionHash,player),
        db.prepare(`INSERT OR IGNORE INTO game_picks(id,chapter,player_id,predicted_date,nickname,created_at)
          SELECT ?,?,s.player_id,?,?,? FROM game_sessions s JOIN game_rounds r ON r.chapter=?
          WHERE s.token_hash=? AND r.state='open' AND (r.closes_at IS NULL OR r.closes_at>?)`)
          .bind(pickId,round.chapter,data.date,data.nickname.trim(),now,round.chapter,sessionHash,now),
        db.prepare('SELECT p.id,p.predicted_date,p.nickname,p.created_at FROM game_picks p JOIN game_sessions s ON s.player_id=p.player_id WHERE s.token_hash=? AND p.chapter=?').bind(sessionHash,round.chapter),
      ]);
      const pick=result[3].results[0]; if(!pick) throw new GameError('closed',409);
      return json({pick,alreadyVoted:pick.id!==pickId,email:await saveEmail(pick)},201);
    }
    if(!person || !await myPick(db,round.chapter,person)) throw new GameError('vote_first',401);
    if(route==='group') {
      const id=random(16);
      await db.prepare('INSERT OR IGNORE INTO game_groups(id,chapter,owner_id,created_at) VALUES(?,?,?,?)').bind(id,round.chapter,person.player_id,new Date().toISOString()).run();
      const group=await db.prepare('SELECT id FROM game_groups WHERE chapter=? AND owner_id=?').bind(round.chapter,person.player_id).first();
      return json(await joinGroup(db,group.id,person,round.chapter));
    }
    if(route==='join') return json(await joinGroup(db,String(data.group??''),person,round.chapter));
    throw new GameError('not_found',404);
  } catch(error) {
    if(error instanceof GameError) return json({error:error.message},error.statusCode);
    // Never log request bodies, cookies or recovery credentials.
    console.error('Prediction game request failed.',error.name);
    return json({error:'unavailable'},503);
  }
}
