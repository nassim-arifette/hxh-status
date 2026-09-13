import { japanDay, validDate, summarizeVotes } from '../worker/game-stats.mjs';

// Disposable identities and challenges, isolated from D1 and email providers.
export function createPreviewGame() {
  const players = new Map(), groups = new Map(), recoveries = new Map();
  const id = () => crypto.randomUUID().replaceAll('-', '');
  return async request => {
    const url = new URL(request.url);
    let token = request.headers.get('cookie')?.match(/(?:^|;\s*)hxh_preview=([a-f0-9]{32})(?:;|$)/)?.[1];
    if (!players.has(token)) { token = id(); players.set(token, { pick: null }); }
    const reply = (data, status = 200) => Response.json(data, {status, headers: {'Cache-Control':'no-store', 'Set-Cookie':`hxh_preview=${token}; Path=/; HttpOnly; SameSite=Lax`}});
    const player = players.get(token);
    const route = url.pathname.slice('/api/game/'.length);
    const maxDate = `${Number(japanDay().slice(0,4)) + 5}-12-31`;
    const view = group => ({id:group.id,chapter:421,members:[...group.members].map(key=>players.get(key)?.pick).filter(Boolean).map(pick=>({...pick,rank:null,distance:null}))});
    if (request.method === 'POST') {
      if (request.headers.get('origin') !== url.origin) return reply({error:'invalid_request'},403);
      let data;
      try { const body=await request.text(); if(body.length>4096) return reply({error:'invalid_request'},413); data=JSON.parse(body); if(!data || typeof data!=='object' || Array.isArray(data)) throw Error(); } catch { return reply({error:'invalid_request'},400); }
      if (route === 'preview-new-player') { token=id(); players.set(token,{pick:null}); return reply({ok:true}); }
      if (route === 'preview-reset') {
        player.pick=null;
        for(const group of groups.values()) group.members.delete(token);
        for(const [key,value] of recoveries) if(value===token) recoveries.delete(key);
        return reply({ok:true});
      }
      if (data.chapter !== undefined && data.chapter !== 421) return reply({error:'not_found'},404);
      if (route === 'vote') {
        if(!validDate(data.date) || data.date<=japanDay() || data.date>maxDate) return reply({error:'invalid_date'},400);
        if(typeof data.nickname!=='string' || !data.nickname.trim() || [...data.nickname.trim()].length>24 || /[\p{Cc}\p{Cf}]/u.test(data.nickname)) return reply({error:'invalid_nickname'},400);
        player.pick ??= {id:id(),predicted_date:data.date,nickname:data.nickname.trim()};
        return reply({pick:player.pick,email:'none'});
      }
      if(route==='recover') { const owner=recoveries.get(data.token); if(!owner) return reply({error:'recovery_invalid'},404); token=owner; return reply({ok:true}); }
      if(!player.pick) return reply({error:'vote_first'},409);
      if(route==='recovery') { for(const [key,value] of recoveries) if(value===token) recoveries.delete(key); const secret=id()+id(); recoveries.set(secret,token); return reply({token:secret}); }
      if(route==='group') {
        let group=[...groups.values()].find(g=>g.owner===token);
        if(!group) {group={id:id(),owner:token,members:new Set()}; groups.set(group.id,group);}
        group.members.add(token); return reply(view(group));
      }
      if(route==='join') {const group=groups.get(data.group); if(!group) return reply({error:'not_found'},404); if(!group.members.has(token) && group.members.size>=100) return reply({error:'group_full'},409); group.members.add(token); return reply(view(group));}
      return reply({error:'unavailable'},503);
    }
    if(request.method!=='GET') return reply({error:'invalid_request'},405);
    if(url.searchParams.has('chapter') && url.searchParams.get('chapter')!=='421') return reply({error:'not_found'},404);
    if(route.startsWith('group/')) {const group=groups.get(route.slice(6)); return group?reply(view(group)):reply({error:'not_found'},404);}
    const picks=[...players.values()].map(p=>p.pick).filter(Boolean);
    if(route==='state') return reply({preview:true,round:{chapter:421,state:'open',max_date:maxDate,actual_date:null},pick:player.pick,guessesSoFar:picks.length,ownGroup:[...groups.values()].find(g=>g.owner===token)?.id??null,today:japanDay(),turnstileSiteKey:null,emailAvailable:false,emailStatus:null});
    if(route==='stats') {const counts=new Map(); for(const pick of picks) counts.set(pick.predicted_date,(counts.get(pick.predicted_date)??0)+1); const days=[...counts].sort(([a],[b])=>a.localeCompare(b)).map(([predicted_date,votes])=>({predicted_date,votes})); return reply({...summarizeVotes(days),days,winners:[]});}
    return reply({error:'not_found'},404);
  };
}
