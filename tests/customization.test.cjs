const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function setup({blocked=false,storage=new Map()}={}) {
  const nodes=new Map();
  function element(){return {hidden:false,dataset:{},style:{},children:[],setAttribute(key,val){this[key]=val;},addEventListener(name,fn){this[name]=fn;},replaceChildren(){this.children=[];},append(...children){this.children.push(...children);}};}
  const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
  const context=vm.createContext({SnakeProgression:require('../js/progression.js'),document:{getElementById:get,createElement:element},localStorage:{getItem(key){if(blocked)throw Error();return storage.get(key);},setItem(key,value){if(blocked)throw Error();storage.set(key,value);}}});
  for(const file of ['customization','layout'])vm.runInContext(fs.readFileSync(path.join(__dirname,`../js/${file}.js`),'utf8'),context);
  return {get,storage,run:code=>vm.runInContext(code,context)};
}
test('cor bloqueada não pode ser escolhida; conquista, seleção e progresso sobrevivem ao recarregar',()=>{
  const ui=setup();assert.equal(ui.get('colorOptions').children[1].disabled,true);
  ui.get('colorOptions').children[1].click();assert.equal(ui.run('GameCustomization.palette().id'),'green');
  ui.run('GameCustomization.finish({score:10,initialRecord:0})');
  assert.match(ui.get('unlockNotice').textContent,/Azul elétrico/);
  ui.get('colorOptions').children[1].click();
  const restored=setup({storage:ui.storage});
  assert.equal(restored.run('GameCustomization.palette().id'),'blue');
  assert.equal(restored.get('achievementCount').textContent,'1/4');
  assert.equal(JSON.parse(ui.storage.get('cobrinha:progression:v1')).games,1);
});
test('ocultar setas persiste, amplia o modo por deslize e não mostra controles após fim de jogo',()=>{
  const ui=setup();ui.run('GameLayout.setActive(true)');assert.equal(ui.get('controls').hidden,false);
  ui.get('toggleControls').click();assert.equal(ui.get('controls').hidden,true);
  assert.equal(ui.get('gameArea').dataset.arrows,'hidden');
  const restored=setup({storage:ui.storage});restored.run('GameLayout.setActive(true)');
  assert.equal(restored.get('controls').hidden,true);
  restored.get('toggleControls').click();assert.equal(restored.get('controls').hidden,false);
  restored.run('GameLayout.setActive(false)');assert.equal(restored.get('controls').hidden,true);
  assert.equal(restored.get('toggleControls').disabled,true);
});
test('armazenamento bloqueado mantém personalização funcional na sessão',()=>{
  const ui=setup({blocked:true});ui.run('GameCustomization.finish({score:25,initialRecord:0})');
  assert.match(ui.get('progressionHint').textContent,/apenas nesta sessão/);
  ui.get('colorOptions').children[2].click();assert.equal(ui.run('GameCustomization.palette().id'),'purple');
  ui.get('hideArrows').change({target:{checked:true}});ui.run('GameLayout.setActive(true)');
  assert.equal(ui.get('controls').hidden,true);
});
