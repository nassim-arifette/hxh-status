import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleGameApi } from './prediction-game.mjs';
import { japanDay, validDate, summarizeVotes } from './game-stats.mjs';
import { runGameMail, decryptMail, normalizeEmail } from './game-mail.mjs';

const nativeFetch = globalThis.fetch;
test.beforeEach(() => {
  globalThis.fetch = (input, init) => String(input).includes('/turnstile/v0/siteverify')
    ? Promise.resolve(Response.json({success:true,hostname:'localhost',action:'prediction'}))
    : nativeFetch(input, init);
});
test.afterEach(() => { globalThis.fetch = nativeFetch; });

// Real SQLite executes the same prepared statements and migration as D1.
function fixture() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../migrations/0001_prediction_game.sql', import.meta.url), 'utf8'));
  sql.exec(readFileSync(new URL('../migrations/0002_prediction_emails.sql', import.meta.url), 'utf8'));

  const prepare = query => {
    let values=[];
    const statement = {
      bind(...args) { values=args; return statement; },
      async first() { return sql.prepare(query).get(...values) ?? null; },
      async all() { return { results: sql.prepare(query).all(...values) }; },
      async run() { return { meta: sql.prepare(query).run(...values) }; },
      execute() { return /^SELECT/i.test(query) ? { results: sql.prepare(query).all(...values) } : { results: [], meta: sql.prepare(query).run(...values) }; },
    };
    return statement;
  };
  const db={prepare, async batch(statements) { sql.exec('BEGIN'); try { const results=statements.map(s=>s.execute()); sql.exec('COMMIT'); return results; } catch(e) { sql.exec('ROLLBACK'); throw e; } }};
  const limiter={limit:async()=>({success:true})};
  const env={GAME_DB:db,GAME_ENABLED:'true',GAME_TURNSTILE_SECRET:'test-only',GAME_READ_LIMITER:limiter,GAME_WRITE_LIMITER:limiter};
  const client = () => {
    let cookie='';
    return async (route, data, options={}) => {
      const req = new Request(`http://localhost/api/game/${route}`, { method:data?'POST':'GET', headers:{ Origin:'http://localhost', Cookie:cookie, 'Content-Type':'application/json', ...options.headers }, body:data?JSON.stringify(data):undefined });
      const response = await handleGameApi(req,env,options.ctx);
      if(response.headers.has('Set-Cookie')) cookie=response.headers.get('Set-Cookie').split(';')[0];
      return { status:response.status, body:await response.json(), headers:response.headers };
    };
  };
  return {sql,env,client};
}
const future = offset => new Date(Date.parse(japanDay()) + offset*86400000).toISOString().slice(0,10);
const vote = (date=future(30),nickname='Gon') => ({chapter:421,date,nickname,turnstile:'test-token'});

test('calendar validation and JST boundary',()=>{
  assert.equal(validDate('2027-02-29'),false); assert.equal(validDate('2028-02-29'),true);
  assert.equal(validDate('2026-9-13'),false); assert.equal(validDate(undefined),false);
  assert.equal(japanDay(new Date('2026-09-12T15:00:00Z')),'2026-09-13');
});
test('weighted statistics, ties, month boundaries and empty population',()=>{
  assert.equal(summarizeVotes([]).median,null);
  const stats=summarizeVotes([{predicted_date:'2026-12-31',votes:2},{predicted_date:'2027-01-02',votes:2}],null,'2027-01-02');
  assert.equal(stats.count,4); assert.equal(stats.mean,'2027-01-01'); assert.equal(stats.median,'2027-01-01');
  assert.deepEqual(stats.modes,['2026-12-31','2027-01-02']); assert.equal(stats.exact,2);
  assert.deepEqual(stats.months.map(m=>m.percent),[50,50]);
});
test('one immutable pick and one histogram increment, including simultaneous retries',async()=>{
  const {client,sql}=fixture(); const c=client();
  const initialState=(await c('state')).body;
  assert.equal(initialState.pick,null);
  assert.equal(initialState.guessesSoFar,0);
  const results=await Promise.all([c('vote',vote()),c('vote',vote(future(31)))]);
  assert.ok(results.every(r=>r.status<300));
  assert.equal(results[0].body.pick.id,results[1].body.pick.id);
  assert.equal(sql.prepare('SELECT count(*) n FROM game_players').get().n,1);
  assert.equal(sql.prepare('SELECT sum(votes) n FROM game_days').get().n,1);
  assert.equal((await c('state')).body.guessesSoFar,1);
  assert.throws(()=>sql.prepare('UPDATE game_picks SET predicted_date=?').run(future(40)),/picks_are_final/);
  const stats=await c('stats'); assert.equal(stats.body.count,1);
  assert.equal(stats.headers.get('Set-Cookie'),null);
  assert.doesNotMatch(JSON.stringify(stats.body),/player_id|recovery_hash|nickname|token/);
});
test('community comparison reads new votes and explicit refresh bypasses cached totals',async()=>{
  const {client}=fixture(), a=client(), b=client();
  const previous=globalThis.caches;
  const responses=new Map();
  globalThis.caches={default:{
    async match(key) { return responses.get(key.url)?.clone() ?? null; },
    async put(key,response) { responses.set(key.url,response.clone()); },
  }};
  try {
    await a('state'); await b('state');
    await a('vote',vote(future(20)));
    const options={ctx:{waitUntil(promise) { void promise; }}};
    assert.equal((await a('stats?chapter=421',undefined,options)).body.count,1);
    await b('vote',vote(future(40),'Killua'));
    assert.equal((await a('stats?chapter=421',undefined,options)).body.count,1);
    const fresh=await a('stats?chapter=421&fresh=1',undefined,options);
    assert.equal(fresh.body.count,2);
    assert.equal(fresh.body.days.find(day=>day.predicted_date===future(40)).votes,1);
    assert.equal(fresh.headers.get('Cache-Control'),'no-store');
  } finally { globalThis.caches=previous; }
});
test('private recovery crosses browsers, replaces old links, preserves pick and identity',async()=>{
  const {client}=fixture(), a=client(), b=client();
  await a('state'); const saved=await a('vote',vote());
  const first=await a('recovery',{}); const second=await a('recovery',{});
  assert.equal((await b('recover',{token:first.body.token})).status,403);
  assert.equal((await b('recover',{token:second.body.token})).status,200);
  assert.deepEqual((await b('state')).body.pick,saved.body.pick);
  assert.equal((await b('vote',vote(future(50)))).body.pick.id,saved.body.pick.id);
});
test('bad dates, oversized nicknames, cross-origin writes and missing identity are rejected',async()=>{
  const {client}=fixture(), c=client();
  assert.equal((await c('vote',vote())).body.error,'reload'); await c('state');
  for(const date of [japanDay(),'2027-02-29','9999-01-01']) assert.equal((await c('vote',vote(date))).body.error,'invalid_date');
  assert.equal((await c('vote',vote(future(5),'x'.repeat(25)))).body.error,'invalid_nickname');
  assert.equal((await c('vote',vote(),{headers:{Origin:'https://evil.example'}})).status,403);
});
test('closed rounds refuse votes and other chapters cannot become prediction targets',async()=>{
  const {client,sql}=fixture(), c=client(); await c('state');
  sql.exec("UPDATE game_rounds SET state='closed' WHERE chapter=421");
  assert.equal((await c('vote',vote())).body.error,'closed');
  sql.exec("INSERT INTO game_rounds(chapter,opened_at,max_date) VALUES(420,'2026-09-01','2031-09-12')");
  assert.equal((await c('state?chapter=420')).status,404);
  sql.exec("INSERT INTO game_rounds(chapter,opened_at,max_date) VALUES(422,'2026-09-01','2031-09-12')");
  assert.equal((await c('state')).body.round.chapter,421);
  assert.equal((await c('state?chapter=422')).status,404);
  assert.equal((await c('vote',{...vote(),chapter:422})).status,404);
});
test('database closing deadline wins even if a round is still marked open',async()=>{
  const {client,sql}=fixture(), c=client(); await c('state');
  sql.exec("UPDATE game_rounds SET closes_at='2000-01-01T00:00:00.000Z'");
  assert.equal((await c('vote',vote())).body.error,'closed');
  assert.equal(sql.prepare('SELECT count(*) n FROM game_picks').get().n,0);
});
test('friend groups are idempotent, public, and give equal distances the same rank',async()=>{
  const {client,sql}=fixture(), a=client(), b=client();
  await a('state'); await b('state');
  await a('vote',vote(future(20),'Gon')); await b('vote',vote(future(22),'Killua'));
  const group=(await a('group',{chapter:421})).body;
  assert.equal((await a('group',{chapter:421})).body.id,group.id);
  await b('join',{chapter:421,group:group.id}); await b('join',{chapter:421,group:group.id});
  sql.prepare("UPDATE game_rounds SET state='settled',actual_date=? WHERE chapter=421").run(future(21));
  const publicGroup=(await client()(`group/${group.id}`)).body;
  assert.equal(publicGroup.members.length,2); assert.deepEqual(publicGroup.members.map(p=>p.rank),[1,1]);
  assert.deepEqual(publicGroup.members.map(p=>p.distance),[1,1]);
  assert.doesNotMatch(JSON.stringify(publicGroup),/player_id|recovery_hash|token/);
});
test('game API requires a rate limiter',async()=>{
  const {env}=fixture();
  delete env.GAME_READ_LIMITER;
  const response=await handleGameApi(new Request('https://hxhstatus.com/api/game/state'),env);
  assert.equal(response.status,503);
});
test('a nickname is required and whitespace is trimmed',async()=>{
  const {client}=fixture(), c=client();
  await c('state');
  for (const nickname of ['', '  ']) {
    const rejected=await c('vote',vote(future(30),nickname));
    assert.equal(rejected.status,400);
    assert.equal(rejected.body.error,'invalid_nickname');
  }
  assert.equal((await c('state')).body.pick,null);
  const saved=await c('vote',vote(future(30),'  Gon  '));
  assert.equal(saved.status,201);
  assert.equal(saved.body.pick.nickname,'Gon');
});
test('Turnstile checks the hostname and action before accepting a vote',async()=>{
  const {client}=fixture(), c=client();
  await c('state'); const previous=globalThis.fetch;
  try {
    assert.equal((await c('vote',{...vote(),turnstile:''})).status,403);
    globalThis.fetch=async()=>Response.json({success:true,hostname:'other.example',action:'prediction'});
    assert.equal((await c('vote',{...vote(),turnstile:'test-token'})).status,403);
    globalThis.fetch=async()=>Response.json({success:true,hostname:'localhost',action:'other'});
    assert.equal((await c('vote',{...vote(),turnstile:'test-token'})).status,403);
    globalThis.fetch=async()=>Response.json({success:true,hostname:'localhost',action:'prediction'});
    assert.equal((await c('vote',{...vote(),turnstile:'test-token'})).status,201);
  } finally { globalThis.fetch=previous; }
});
test('full challenges reject new members and cross-round joins are refused',async()=>{
  const {sql,client}=fixture(), a=client(), b=client();
  await a('state'); await b('state'); await a('vote',vote()); await b('vote',vote());
  const group=(await a('group',{chapter:421})).body;
  for(let i=0;i<99;i++) {
    sql.prepare('INSERT INTO game_players VALUES(?,?,?)').run(`fixture${i}`,`hash${i}`,'2026-01-01');
    sql.prepare('INSERT INTO game_picks VALUES(?,?,?,?,?,?)').run(`pick${i}`,421,`fixture${i}`,future(5),'Fixture','2026-01-01');
    sql.prepare('INSERT INTO game_members VALUES(?,?)').run(group.id,`fixture${i}`);
  }
  assert.equal((await b('join',{chapter:421,group:group.id})).body.error,'group_full');
  assert.equal((await a('join',{chapter:421,group:group.id})).body.members.length,100);
  sql.exec("INSERT INTO game_rounds VALUES(9001,'open','2026-01-01',NULL,NULL,NULL,'2031-09-12')");
  const other='a'.repeat(32);
  sql.prepare('INSERT INTO game_groups SELECT ?,9001,owner_id,created_at FROM game_groups WHERE id=?').run(other,group.id);
  assert.equal((await b('join',{chapter:421,group:other})).status,404);
});

function enableMail(env) {
  Object.assign(env,{GAME_EMAIL_ENABLED:'true',GAME_EMAIL_PREVIEW:'true',GAME_EMAIL_KEY:'test-only-email-encryption-key-at-least-32',GAME_PUBLIC_ORIGIN:'http://localhost'});
}
const mailToken=(mail,kind)=>mail.text.match(new RegExp(`#${kind}=([a-f0-9]{64})`))[1];
test('email queues once, stays private, and confirmation restores the pick',async()=>{
  const {env,client,sql}=fixture();enableMail(env);const c=client();await c('state');
  const saved=await c('vote',{...vote(),email:'Gon@example.test',locale:'fr'});
  assert.equal(saved.body.email,'pending');
  await c('vote',{...vote(),email:'gon@example.test',locale:'fr'});
  assert.equal(sql.prepare('SELECT count(*) n FROM game_mail_jobs').get().n,1);
  const job=sql.prepare('SELECT * FROM game_mail_jobs').get();
  assert.doesNotMatch(job.payload,/gon@example|recover=|confirm=/);
  const payload=await decryptMail(env,job.payload);
  assert.match(payload.subject,/Gon/);assert.match(payload.text,/chapitre 421/);
  await runGameMail(env);
  assert.equal(sql.prepare('SELECT count(*) n FROM game_mail_preview').get().n,1);
  const fresh=client();
  const token=mailToken(payload,'confirm');
  assert.equal((await fresh('confirm-email',{token})).status,200);
  assert.equal((await fresh('state')).body.pick.id,saved.body.pick.id);
  assert.equal((await fresh('state')).body.emailStatus,'confirmed');
  const recovered=client();await recovered('recover',{token:mailToken(payload,'recover')});
  assert.equal((await recovered('state')).body.pick.id,saved.body.pick.id);
  const publicStats=(await client()('stats')).body;
  assert.doesNotMatch(JSON.stringify(publicStats),/email|@|confirm_hash|recovery_hash/);
});
test('same email cannot receive duplicate confirmation messages from other browsers',async()=>{
  const {env,client,sql}=fixture();enableMail(env);const a=client(),b=client();await a('state');await b('state');
  await a('vote',{...vote(),email:'gon@example.test'});
  const second=await b('vote',{...vote(),email:'GON@example.test'});
  assert.equal(second.status,201);assert.equal(second.body.email,'not_sent');
  assert.equal(sql.prepare('SELECT count(*) n FROM game_picks').get().n,2);
  assert.equal(sql.prepare('SELECT count(*) n FROM game_mail_jobs').get().n,1);
});
test('results are queued only after publication and confirmation, with distance and rank',async()=>{
  const {env,client,sql}=fixture();enableMail(env);const a=client(),b=client();await a('state');await b('state');
  const saved=await a('vote',{...vote(future(20)),email:'gon@example.test',locale:'fr'});
  await b('vote',{...vote(future(22),'Killua'),email:'killua@example.test',locale:'fr'});
  const message=await decryptMail(env,sql.prepare('SELECT payload FROM game_mail_jobs WHERE pick_id=?').get(saved.body.pick.id).payload);
  const group=(await a('group',{chapter:421})).body;
  await b('join',{chapter:421,group:group.id});
  await runGameMail(env);assert.equal(sql.prepare("SELECT count(*) n FROM game_mail_jobs WHERE kind='results'").get().n,0);
  await a('confirm-email',{token:mailToken(message,'confirm')});
  sql.prepare("UPDATE game_rounds SET state='settled',actual_date=? WHERE chapter=421").run(future(21));
  await runGameMail(env);await runGameMail(env);
  const results=sql.prepare("SELECT * FROM game_mail_jobs WHERE kind='results'").all();
  assert.equal(results.length,1);assert.equal(results[0].status,'sent');
  const result=await decryptMail(env,results[0].payload);
  assert.match(result.text,/Écart en jours : 1/);assert.match(result.text,/Ton rang : 1 sur 2/);assert.match(result.text,/Défi 1 : 1 sur 2/);
  assert.equal((await a('stats')).body.winners.length,2);
});
test('expired links and unsubscribed recipients cannot receive result emails',async()=>{
  const {env,client,sql}=fixture();enableMail(env);const c=client();await c('state');await c('vote',{...vote(),email:'gon@example.test'});
  const message=await decryptMail(env,sql.prepare('SELECT payload FROM game_mail_jobs').get().payload);
  sql.exec("UPDATE game_emails SET confirm_expires='2000-01-01'");
  assert.equal((await c('confirm-email',{token:mailToken(message,'confirm')})).status,400);
  sql.exec("UPDATE game_emails SET confirm_expires='2099-01-01',confirmed_at='2026-01-01'");
  assert.equal((await c('unsubscribe-email',{token:mailToken(message,'unsubscribe')})).status,200);
  sql.prepare("UPDATE game_rounds SET state='settled',actual_date=?").run(future(20));await runGameMail(env);
  assert.equal(sql.prepare("SELECT count(*) n FROM game_mail_jobs WHERE kind='results'").get().n,0);
  assert.equal(sql.prepare('SELECT status FROM game_mail_jobs').get().status,'cancelled');
});
test('provider retries keep identical payload and idempotency key; old ambiguous jobs stop',async()=>{
  const {env,client,sql}=fixture();enableMail(env);env.GAME_EMAIL_PREVIEW='false';env.RESEND_API_KEY='test-key';env.GAME_EMAIL_FROM='HxH <game@example.test>';env.GAME_PUBLIC_ORIGIN='https://hxhstatus.com';
  const c=client();await c('state');await c('vote',{...vote(),email:'gon@example.test'});
  const sends=[];let fail=true;
  const provider=async(url,options)=>{sends.push(options);return fail?new Response('',{status:503}):Response.json({id:'provider-test'});};
  await runGameMail(env,null,provider);sql.exec("UPDATE game_mail_jobs SET available_at='2000-01-01'");fail=false;
  await Promise.all([runGameMail(env,null,provider),runGameMail(env,null,provider)]);
  assert.equal(sends.length,2);assert.equal(sends[0].body,sends[1].body);assert.equal(sends[0].headers['Idempotency-Key'],sends[1].headers['Idempotency-Key']);
  assert.equal(sql.prepare('SELECT status FROM game_mail_jobs').get().status,'sent');
  sql.exec("UPDATE game_mail_jobs SET status='pending',available_at='2000-01-01',first_attempt_at='2000-01-01'");
  await runGameMail(env,null,provider);assert.equal(sends.length,2);assert.equal(sql.prepare('SELECT status FROM game_mail_jobs').get().status,'failed');
});
test('invalid email rejects a vote, and daily budget postpones excess mail',async()=>{
  assert.equal(normalizeEmail('x\r\nBcc:evil@example.test'),null);
  const {env,client,sql}=fixture();enableMail(env);env.GAME_EMAIL_DAILY_LIMIT='1';const a=client(),b=client();await a('state');await b('state');
  assert.equal((await a('vote',{...vote(),email:'invalid'})).status,400);
  assert.equal(sql.prepare('SELECT count(*) n FROM game_picks').get().n,0);
  await a('vote',{...vote(),email:'a@example.test'});
  await a('email',{chapter:421,email:'a@example.test'});await b('vote',{...vote(),email:'b@example.test'});await runGameMail(env);
  assert.equal(sql.prepare("SELECT count(*) n FROM game_mail_jobs WHERE status='sent'").get().n,1);
  assert.equal(sql.prepare("SELECT count(*) n FROM game_mail_jobs WHERE status='pending'").get().n,1);
});

test('email is optional even when mail is enabled',async()=>{
  const {env,client,sql}=fixture();enableMail(env);
  for(const email of [undefined,'']) {
    const c=client();await c('state');
    assert.equal((await c('vote',{...vote(),email})).status,201);
  }
  assert.equal(sql.prepare('SELECT count(*) n FROM game_picks').get().n,2);
  assert.equal(sql.prepare('SELECT count(*) n FROM game_mail_jobs').get().n,0);
});

test('emails preserve all seven locales through confirmation and results',async()=>{
  for(const locale of ['en','fr','es','pt','ja','zh','ar']) {
    const {env,client,sql}=fixture();enableMail(env);const c=client();await c('state');
    const response=await c('vote',{...vote(),email:'locale@example.test',locale});assert.equal(response.status,201);
    const row=sql.prepare('SELECT * FROM game_emails').get();assert.equal(row.locale,locale);
    const confirmation=await decryptMail(env,sql.prepare("SELECT payload FROM game_mail_jobs WHERE kind='confirmation'").get().payload);
    assert.ok(confirmation.html.includes(`lang="${locale}"`));assert.ok(confirmation.html.includes(`dir="${locale==='ar'?'rtl':'ltr'}"`));
    assert.ok(confirmation.text.includes(`http://localhost/${locale==='en'?'':locale+'/'}predictions?`));
    assert.doesNotMatch(confirmation.text,/undefined|\{(?:name|date|chapter)\}/);
    sql.prepare('UPDATE game_emails SET confirmed_at=?').run(new Date().toISOString());
    sql.prepare("UPDATE game_rounds SET state='settled',actual_date=? WHERE chapter=421").run(future(31));
    await runGameMail(env);
    const result=await decryptMail(env,sql.prepare("SELECT payload FROM game_mail_jobs WHERE kind='results'").get().payload);
    assert.ok(result.html.includes(`lang="${locale}"`));assert.doesNotMatch(result.text,/undefined|\{(?:rank|count|distance)\}/);
  }
});
