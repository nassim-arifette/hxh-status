import test from 'node:test';
import assert from 'node:assert/strict';
import history from '../app/data/publication-history.json' with {type:'json'};
import status from '../app/data/status-data.json' with {type:'json'};
import posts from '../app/data/togashi-posts.json' with {type:'json'};
import {deriveHiatusStats} from '../app/data/hiatus-stats.ts';
import {fitPosterior,studentSurvival,predictiveQuantile,predictiveSurvival,conditionalProbability,deriveReleaseForecast,forecastSamples,backtestForecast,durationDays,japanDate} from '../app/data/release-forecast.ts';
import {completionEvents,productionCdf,deriveProductionForecast} from '../app/data/production-forecast.ts';
const records=deriveHiatusStats(history,status,'2026-09-12').historicalHiatuses.completed;
const input={records,chapter:421,nextChapter:421,chapterStatus:'delivered',publicationStatus:'hiatus',sinceDate:'2026-09-07',asOf:'2026-09-12'};
const news={records,posts:posts.posts,chapter:421,asOf:'2026-09-12'};
const close=(a,b,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<tolerance,`${a} ≠ ${b}`);

test('Student-t tails agree with independent Cauchy and df=2 closed forms',()=>{
  for(const z of [-100,-3,-1,0,1,3,100]) {
    close(studentSurvival(z,1),.5-Math.atan(z)/Math.PI);
    close(studentSurvival(z,2),.5-z/(2*Math.sqrt(2+z*z)));
    close(studentSurvival(z,13)+studentSurvival(-z,13),1);
  }
  // Published t table: t(10) 97.5% = 2.2281388519649385.
  close(studentSurvival(2.2281388519649385,10),.025,1e-10);
});
test('normal-inverse-gamma update matches hand calculation and sequential updating',()=>{
  const prior={mu:0,kappa:1,alpha:2,beta:3};
  const p=fitPosterior([Math.exp(1),Math.exp(3)],prior);
  close(p.mu,4/3);close(p.kappa,3);close(p.alpha,3);close(p.beta,16/3);
  const first=fitPosterior([Math.exp(1)],prior);
  const sequential=fitPosterior([Math.exp(3)],first);
  for(const key of ['mu','kappa','alpha','beta','scale']) close(p[key],sequential[key]);
  assert.throws(()=>fitPosterior([0]));assert.throws(()=>fitPosterior([NaN]));
  assert.throws(()=>fitPosterior([],{...prior,kappa:0}));
});
test('predictive quantiles normalize and include future noise, not only mean uncertainty',()=>{
  const p=fitPosterior([20,100,500,1400]);
  assert.ok(p.scale>Math.sqrt(p.beta/(p.alpha*p.kappa)));
  for(const elapsed of [0,5,500,20000]) for(const q of [.01,.1,.5,.9,.99]) {
    const t=predictiveQuantile(q,elapsed,p);
    assert.ok(t>elapsed);close(conditionalProbability(t,elapsed,p),q,1e-9);
  }
  close(predictiveSurvival(0,p),1);
  assert.throws(()=>predictiveQuantile(1,0,p));
});
test('ongoing censoring uses a survival ratio exactly once',()=>{
  const p=fitPosterior([20,100,500,1400]);
  const e=300,t=900;
  close(conditionalProbability(t,e,p),(predictiveSurvival(e,p)-predictiveSurvival(t,p))/predictiveSurvival(e,p));
  assert.equal(conditionalProbability(e,e,p),0);
  assert.ok(predictiveQuantile(.5,e,p)>predictiveQuantile(.5,0,p));
});
test('selection includes short interruptions, prioritizes exact dates and cannot see future returns',()=>{
  const f=deriveReleaseForecast(input);
  assert.equal(f.sampleCount,9);assert.equal(f.exactDateCount,3);
  assert.equal(f.samples.filter(r=>r.issues===1).length,2);
  close(durationDays(records.find(r=>r.resumedWithChapter===411)),567);
  assert.ok(f.lowerDate<f.medianDate&&f.medianDate<f.upperDate);
  const future={...records.find(r=>r.resumedWithChapter===411),precededByChapter:420,resumedWithChapter:421,startYear:2026,endYear:2027,resumedOnDate:'2027-01-01'};
  assert.deepEqual(deriveReleaseForecast({...input,records:[...records,future]}),f);
  assert.notEqual(f.allHistoryMedianDate,f.medianDate);
});
test('official publication states suppress the historical forecast',()=>{
  for(const override of [{chapterStatus:'scheduled'},{chapterStatus:'published'},{chapter:422},{publicationStatus:'publishing'},{sinceDate:'invalid'},{asOf:'2026-09-01'},{records:[]}]) assert.equal(deriveReleaseForecast({...input,...override}),null);
  const before=JSON.stringify(status);deriveReleaseForecast(input);deriveProductionForecast(news);assert.equal(JSON.stringify(status),before);
});
test('rolling validation is invariant to future data and reports proper log scores',()=>{
  const chronological=forecastSamples(records),full=backtestForecast(records),early=backtestForecast(chronological.slice(0,4));
  assert.deepEqual(early.trials[0],full.trials[0]);assert.equal(full.count,6);
  assert.ok(Number.isFinite(full.logScore)&&Number.isFinite(full.baselineLogScore));
  assert.ok(full.intervalScore>0);assert.equal(full.covered,5);
});
test('Gamma-Poisson waiting CDF matches the one-event Lomax closed form',()=>{
  for(const t of [0,1,30,100,1000]) close(productionCdf(t,1,7,138),1-(138/(138+t))**7);
  assert.equal(productionCdf(0,0,7,138),1);
});
test('news extraction requires author and explicit completion, uses JST and excludes future news',()=>{
  const e=completionEvents(posts.posts,'2026-09-12');
  assert.equal(e.get(421).date,'2026-05-27');assert.equal(e.has(430),false);
  assert.equal(completionEvents(posts.posts,'2026-08-31').has(427),false);
  assert.equal(completionEvents(posts.posts.map(p=>({...p,author:{id:'impostor'}})),'2026-09-12').size,0);
});
test('production posterior uses six events plus silent exposure, one editorial cycle, and stable quadrature',()=>{
  const p=deriveProductionForecast(news);
  assert.equal(p.batch.length,7);assert.equal(p.remaining,3);assert.equal(p.shape,7);assert.equal(p.rate,138);
  assert.equal(p.lagSamples.length,1);assert.equal(p.lagSamples[0].days,125);
  const fine=deriveProductionForecast({...news,integrationPoints:1024});
  for(const key of ['lowerDate','medianDate','upperDate']) assert.ok(Math.abs(Date.parse(p[key])-Date.parse(fine[key]))<=86400000);
  for(let i=0;i<4;i++) close(p.horizons[i].probability,fine.horizons[i].probability,.002);
  const silent=deriveProductionForecast({...news,asOf:'2026-10-12'});assert.equal(silent.shape,p.shape);assert.equal(silent.rate,p.rate+30);
  const changedPrior=deriveProductionForecast({...news,lagPriorDays:180});assert.notEqual(changedPrior.medianDate,p.medianDate);
});
test('production scenario withdraws when the archive cannot identify the process',()=>{
  assert.equal(deriveProductionForecast({...news,posts:[]}),null);
  assert.equal(deriveProductionForecast({...news,chapter:422}),null);
  assert.equal(deriveProductionForecast({...news,posts:posts.posts.filter(p=>!p.originalText.includes('No.422'))}),null);
});
test('Japan date crosses midnight correctly',()=>{
  assert.equal(japanDate(new Date('2026-12-31T16:00:00Z')),'2027-01-01');
});

test('completed batches condition editorial waiting without predicting the past',()=>{
  const extra=[428,429,430].map((chapter,i)=>({author:{id:'1528978792617611264'},createdAt:`2026-09-${String(2+i).padStart(2,'0')}T10:00:00Z`,url:`https://x.com/Un4v5s8bgsVk9Xp/status/test${chapter}`,originalText:`No.${chapter}、原稿完成。`}));
  const result=deriveProductionForecast({...news,posts:[...posts.posts,...extra]});
  assert.equal(result.remaining,0);assert.ok(result.lowerDate>news.asOf);
  const p=fitPosterior([125],{mu:Math.log(90),kappa:.25,alpha:2,beta:1});
  close(result.horizons[0].probability,conditionalProbability(98,8,p));
});
