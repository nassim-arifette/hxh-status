import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { japanDay, validDate } from '../worker/game-stats.mjs';
import status from '../app/data/status-data.json' with { type: 'json' };

// Explicit operator commands: no automatic new round, no reopening old rounds.
const args=process.argv.slice(2), [command, chapterText, date]=args.filter(a=>!a.startsWith('--'));
const chapter=Number(chapterText), remote=args.includes('--remote'), dryRun=args.includes('--dry-run');
if(!['open','close','settle'].includes(command) || !Number.isSafeInteger(chapter) || chapter!==421 || (date && !validDate(date))) {
  console.error('Usage: npm run game:round -- open|close|settle 421 [YYYY-MM-DD] [--remote] [--dry-run]'); process.exit(1);
}
const quoted=value=>`'${value.replaceAll("'","''")}'`;
const now=new Date().toISOString();
let sql;
if(command==='open') {
  const source=status.chapters.find(c=>c.chapter===chapter);
  if(!source || source.releaseAt || ['scheduled','published'].includes(source.status)) throw Error('Only a known chapter without an official date can open a round.');
  const maxDate=date ?? `${Number(japanDay().slice(0,4))+5}${japanDay().slice(4)}`;
  if(!validDate(maxDate) || maxDate<=japanDay()) throw Error('A valid future maximum date is required.');
  sql=`INSERT INTO game_rounds(chapter,opened_at,max_date) VALUES(${chapter},${quoted(now)},${quoted(maxDate)});`;
} else if(command==='close') {
  sql=`UPDATE game_rounds SET state='closed',closes_at=COALESCE(closes_at,${quoted(now)}),announced_date=COALESCE(${date?quoted(date):'NULL'},announced_date) WHERE chapter=${chapter} AND state!='settled';`;
} else {
  if(!date || date>japanDay()) throw Error('Settle only after publication, with the actual Japan date.');
  sql=`UPDATE game_rounds SET state='settled',closes_at=COALESCE(closes_at,${quoted(now)}),actual_date=${quoted(date)} WHERE chapter=${chapter};`;
}
sql+=`\nSELECT chapter,state,closes_at,announced_date,actual_date,max_date FROM game_rounds WHERE chapter=${chapter};`;
if(dryRun) { console.log(sql); process.exit(0); }
if(!remote) { console.error('Use --remote to confirm a change to Cloudflare D1.'); process.exit(1); }
const directory=mkdtempSync(join(tmpdir(),'hxh-game-round-'));
const file=join(directory,'round.sql');
try {
  writeFileSync(file,sql);
  const wrangler=fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url));
  const result=spawnSync(process.execPath,[wrangler,'d1','execute','GAME_DB','--remote','--config','wrangler.jsonc','--file',file],{stdio:'inherit'});
  process.exitCode=result.status ?? 1;
} finally { unlinkSync(file); rmdirSync(directory); }
