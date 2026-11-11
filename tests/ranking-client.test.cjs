const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {webcrypto}=require('node:crypto');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function setup() {
  const elements=new Map(),storage=new Map(),requests=[];
  let failSave=false;
  let ranking={entries:[{id:'someone',nickname:'<img src=x>',score:3,position:1}],personal:null};
  let rankingWait;
  function node() { return {value:'normal',textContent:'',hidden:false,children:[],classList:{add(){}},addEventListener(type,callback){this[type]=callback;},replaceChildren(){this.children=[];},append(...items){this.children.push(...items);}}; }
  const get=id=>{if(!elements.has(id))elements.set(id,node());return elements.get(id);};
  const context=vm.createContext({
    document:{getElementById:get,createElement:node},window:{addEventListener(){}},
    crypto:webcrypto,TextEncoder,AbortController,setTimeout,clearTimeout,
    localStorage:{getItem:key=>storage.get(key),setItem:(key,val)=>storage.set(key,val),removeItem:key=>storage.delete(key)},
    fetch:async(url,options)=>{
      requests.push({url,options});
      if(url.endsWith('/scores') && failSave)throw Error('Offline');
      if(url.includes('/ranking?')) { const data=ranking; if(rankingWait) await rankingWait; return Response.json(data); }
      return Response.json(url.endsWith('/sessions')?{id:'round-1',seed:42}:{saved:true,score:1});
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/ranking.js'),'utf8'),context);
  return {context,get,storage,requests,ranking:data=>{ranking=data;},delayRanking:promise=>{rankingWait=promise;},offline:()=>{failSave=true;},online:()=>{failSave=false;},run:code=>vm.runInContext(code,context)};
}
test('apelido é validado e salvo junto de uma identidade aleatória',async()=>{
  const ui=setup();await settle();
  assert.throws(()=>ui.run("RankingClient.profile('<b>x</b>')"));
  ui.run("RankingClient.profile('  Amigo   1  ')");
  const profile=JSON.parse(ui.storage.get('cobrinha:player:v1'));
  assert.equal(profile.nickname,'Amigo 1');
  assert.match(profile.token,/^[a-f0-9-]{36}$/);
  assert.equal(ui.get('nickname').value,'Amigo 1');
});

test('tela final usa melhor resultado e meta para ultrapassar rival empatado',async()=>{
  const ui=setup();await settle();
  ui.ranking({entries:[],personal:{position:12,score:5},rival:{nickname:'Amigo',score:5}});
  ui.run("RankingClient.finish({round:{id:'round-final'},profile:RankingClient.profile('Jogador'),moves:['RIGHT'],difficulty:'hard'},2)");
  await settle();await settle();await settle();
  assert.match(ui.get('finalPosition').textContent,/12º lugar.*5 pts/);
  assert.match(ui.get('nextRival').textContent,/Meta: 6 pts.*1 acima/);
  assert.ok(ui.requests.some(r=>r.url.includes('difficulty=hard')));
  assert.equal(ui.get('finalStanding').hidden,false);
});

test('resposta de ranking antiga não altera a próxima partida',async()=>{
  const ui=setup();await settle();await settle();
  let release;ui.delayRanking(new Promise(resolve=>{release=resolve;}));
  ui.ranking({entries:[],personal:{position:1,score:20},rival:null});
  ui.run("RankingClient.finish({round:{id:'old'},difficulty:'normal'},0)");
  await settle();
  ui.run("RankingClient.begin({id:'new'})");
  ui.get('finalPosition').textContent='Próxima partida';
  release();await settle();await settle();
  assert.equal(ui.get('finalPosition').textContent,'Próxima partida');
});
test('ranking escreve apelidos como texto e carrega o nível selecionado',async()=>{
  const ui=setup();await settle();await settle();
  await ui.run('RankingClient.refresh()');
  assert.equal(ui.get('rankingList').children[0].children[0].textContent,'<img src=x>');
  ui.get('difficulty').value='easy';
  await ui.get('difficulty').change();
  assert.equal(ui.get('rankingLevel').textContent,'Tranquilo');
  assert.ok(ui.requests.some(r=>r.url.includes('difficulty=easy')));
});
test('falha ao salvar preserva resultados para nova tentativa sem perder a próxima partida',async()=>{
  const ui=setup();await settle();
  ui.run("RankingClient.profile('Amigo 1')");
  ui.offline();
  ui.run("RankingClient.finish({round:{id:'round-1'},profile:RankingClient.profile('Amigo 1'),moves:['RIGHT'],difficulty:'normal'},1)");
  await settle();
  ui.run("RankingClient.finish({round:{id:'round-2'},profile:RankingClient.profile('Amigo 1'),moves:['RIGHT'],difficulty:'hard'},2)");
  await settle();
  assert.equal(JSON.parse(ui.storage.get('cobrinha:pending-score:v2')).length,2);
  assert.equal(ui.get('retryScore').hidden,false);
  ui.online();
  await ui.get('retryScore').click();await settle();await settle();
  assert.equal(JSON.parse(ui.storage.get('cobrinha:pending-score:v2')).length,0);
  assert.equal(ui.get('saveStatus').textContent,'Resultado salvo no ranking online!');
});
