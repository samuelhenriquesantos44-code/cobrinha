const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function setup(blocked=false) {
  const elements=new Map(),events={},storage=new Map(),timers=new Map();let now=0,nextId=0,state;
  const get=id=>{
    if(!elements.has(id))elements.set(id,{hidden:false,value:'normal',dataset:{},clientWidth:300,textContent:'',style:{setProperty(){}},classList:{toggle(){}},selectedOptions:[{textContent:'Disputa'}],focus(){},scrollIntoView(){},addEventListener(type,fn){this[type]=fn;},setAttribute(key,value){this[key]=value;}});
    return elements.get(id);
  };
  const buttons=['UP','DOWN','LEFT','RIGHT'].map(dir=>{const node=get('dir'+dir);node.dataset.territoryDir=dir;return node;});
  function schedule(fn,delay,repeat=false){const id=++nextId;timers.set(id,{fn,delay,at:now+delay,repeat});return id;}
  function advance(ms){const until=now+ms;for(;;){const entry=[...timers].filter(([,t])=>t.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!entry)break;const [id,t]=entry;now=t.at;if(t.repeat)t.at+=t.delay;else timers.delete(id);t.fn();}now=until;}
  const E=require('../js/territory-engine.js');
  const context=vm.createContext({TerritoryEngine:{...E,createGame(level){state=E.createGame(level);return state;}},SnakeProgression:require('../js/progression.js'),TerritoryRenderer:{draw(){}},document:{hidden:false,getElementById:get,querySelectorAll:()=>buttons,addEventListener(name,fn){events[name]=fn;}},window:{PointerEvent:function(){},addEventListener(name,fn){events[name]=fn;}},localStorage:{getItem(key){if(blocked)throw Error();return storage.get(key);},setItem(key,val){if(blocked)throw Error();storage.set(key,val);}},setTimeout:(fn,delay)=>schedule(fn,delay),clearTimeout:id=>timers.delete(id),setInterval:(fn,delay)=>schedule(fn,delay,true),clearInterval:id=>timers.delete(id)});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/territory.js'),'utf8'),context);
  return {get,events,storage,advance,context,state:()=>state};
}
test('contagem segura, pausa ao sair da aba e reinício sem relógios duplicados',()=>{
  const ui=setup();ui.get('territoryStart').click();assert.equal(ui.state().status,'countdown');
  ui.advance(2999);assert.equal(ui.state().ticks,0);ui.advance(1);assert.equal(ui.state().status,'running');
  ui.advance(160);assert.equal(ui.state().ticks,1);
  ui.context.document.hidden=true;ui.events.visibilitychange();assert.equal(ui.state().status,'paused');
  ui.advance(5000);assert.equal(ui.state().ticks,1);
  ui.context.document.hidden=false;ui.events.visibilitychange();assert.equal(ui.state().status,'paused');
  ui.get('territoryRestart').click();ui.advance(3160);assert.equal(ui.state().ticks,1);
  ui.get('territoryMenu').click();ui.advance(5000);assert.equal(ui.get('territoryArea').hidden,true);assert.equal(ui.get('territorySetup').hidden,false);
});
test('deslize e duas curvas rápidas funcionam com setas ocultas',()=>{
  const ui=setup();ui.get('territoryStart').click();ui.get('territoryToggleControls').click();assert.equal(ui.get('territoryControls').hidden,true);
  const board=ui.get('territoryBoard');
  board.pointerdown({pointerId:1,button:0,clientX:100,clientY:100,target:{closest:()=>null},preventDefault(){}});
  board.pointermove({pointerId:1,clientX:150,clientY:100,preventDefault(){}});
  ui.get('dirDOWN').click({detail:0});
  ui.advance(3160);assert.equal(ui.state().actors[0].dir,'RIGHT');
  ui.advance(160);assert.equal(ui.state().actors[0].dir,'DOWN');
  ui.get('territoryPause').click();ui.advance(5000);assert.equal(ui.state().ticks,2);
});
test('fim salva recorde separado, bloqueia controles e funciona sem armazenamento',()=>{
  for(const blocked of [false,true]) {
    const ui=setup(blocked);ui.get('territoryStart').click();ui.advance(3000);
    ui.state().grid.fill(1,0,300);ui.advance(160);
    assert.equal(ui.state().status,'won');assert.equal(ui.get('territoryResult').hidden,false);
    assert.equal(ui.get('territoryPause').disabled,true);assert.equal(ui.get('territoryControls').hidden,true);
    if(!blocked)assert.ok(Number(ui.storage.get('cobrinha:territory:record:v1:normal'))>50);
    ui.get('territoryOverlayAction').click();assert.equal(ui.state().status,'countdown');assert.equal(ui.get('territoryResult').hidden,true);
  }
});
