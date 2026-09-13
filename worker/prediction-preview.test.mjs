import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreviewGame } from '../scripts/preview-game-api.mjs';
import { japanDay } from './game-stats.mjs';

function client(handler) {
  let cookie='';
  return async (route,data) => {
    const response=await handler(new Request(`http://localhost:3002/api/game/${route}`,{method:data?'POST':'GET',headers:{cookie,origin:'http://localhost:3002'},...(data?{body:JSON.stringify(data)}:{})}));
    cookie=response.headers.get('set-cookie').split(';')[0];
    return {status:response.status,...await response.json()};
  };
}
const vote = nickname => ({chapter:421,nickname,date:new Date(Date.parse(japanDay())+30*86400000).toISOString().slice(0,10)});

test('local friends have independent picks and join one idempotent challenge',async()=>{
  const handler=createPreviewGame(),owner=client(handler),friend=client(handler);
  assert.equal((await owner('state')).pick,null);
  await owner('vote',vote('Gon'));
  const group=await owner('group',{chapter:421});
  assert.equal((await owner('group',{chapter:421})).id,group.id);
  assert.equal((await friend(`group/${group.id}`)).members[0].nickname,'Gon');
  assert.equal((await friend('join',{chapter:421,group:group.id})).status,409);
  await friend('vote',vote('Killua'));
  await friend('join',{chapter:421,group:group.id});
  assert.equal((await friend('join',{chapter:421,group:group.id})).members.length,2);
  assert.equal((await owner('state')).ownGroup,group.id);
  assert.equal((await owner('stats')).count,2);
  assert.equal((await owner('group/missing')).status,404);
  assert.equal((await owner('vote',{...vote('Gon'),nickname:'  '})).status,400);
});

test('simulate friend preserves the owner and reset only removes the active pick',async()=>{
  const handler=createPreviewGame(),c=client(handler);
  await c('vote',vote('Gon'));
  const recovery=await c('recovery',{});
  const group=await c('group',{chapter:421});
  await c('preview-new-player',{});
  assert.equal((await c('state')).pick,null);
  await c('vote',vote('Killua')); await c('join',{chapter:421,group:group.id});
  await c('preview-reset',{});
  assert.equal((await c('stats')).count,1);
  assert.equal((await c(`group/${group.id}`)).members.length,1);
  await c('recover',{token:recovery.token});
  assert.equal((await c('state')).pick.nickname,'Gon');
});
