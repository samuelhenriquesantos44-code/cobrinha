const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup({supported=true,blocked=false,saved}={}) {
  const nodes=new Map(),vibrations=[],tones=[],events={},storage=new Map();let contexts=0;
  if(saved)storage.set('cobrinha:feedback:v1',JSON.stringify(saved));
  const get=id=>{if(!nodes.has(id))nodes.set(id,{addEventListener(type,fn){this[type]=fn;},setAttribute(name,value){this[name]=value;}});return nodes.get(id);};
  class Audio {
    constructor(){contexts++;this.currentTime=0;this.state='suspended';}
    resume(){this.state='running';return Promise.resolve();}
    createOscillator(){const osc={frequency:{},connect(){},disconnect(){},start(){tones.push(osc);},stop(){osc.stopped=true;}};return osc;}
    createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
  }
  const context=vm.createContext({document:{getElementById:get,addEventListener(type,fn){events[type]=fn;}},window:{AudioContext:supported?Audio:undefined,addEventListener(type,fn){events[type]=fn;}},navigator:supported?{vibrate:value=>vibrations.push(value)}:{},localStorage:{getItem(key){if(blocked)throw Error();return storage.get(key);},setItem(key,val){if(blocked)throw Error();storage.set(key,val);}}});
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../js/feedback.js'),'utf8'),context);
  return {get,tones,vibrations,events,storage,contexts:()=>contexts,run:code=>vm.runInContext(code,context)};
}
test('áudio só começa com interação e mute para os efeitos e persiste',()=>{
  const ui=setup();assert.equal(ui.contexts(),0);
  ui.run("GameFeedback.play('eat')");assert.equal(ui.tones.length,0);
  ui.run("GameFeedback.unlock();GameFeedback.play('record')");assert.equal(ui.tones.length,4);assert.equal(ui.contexts(),1);
  ui.get('muteSound').click();assert.ok(ui.tones.every(t=>t.stopped));
  ui.run("GameFeedback.play('eat')");assert.equal(ui.tones.length,4);
  assert.equal(JSON.parse(ui.storage.get('cobrinha:feedback:v1')).sound,false);
  ui.get('muteSound').click();assert.equal(ui.contexts(),1);
});
test('vibração é optativa, lembra preferência e para ao perder foco',()=>{
  const ui=setup();ui.run("GameFeedback.play('eat')");assert.equal(ui.vibrations.length,0);
  ui.get('vibrationToggle').change({target:{checked:true}});
  ui.run("GameFeedback.play('eat')");assert.equal(ui.vibrations.at(-1),15);
  ui.events.blur();assert.equal(ui.vibrations.at(-1),0);
  const restored=setup({saved:{sound:false,vibration:true}});
  assert.equal(restored.get('soundToggle').checked,false);assert.equal(restored.get('vibrationToggle').checked,true);
});
test('navegador sem efeitos e armazenamento bloqueado continua funcionando',()=>{
  const ui=setup({supported:false,blocked:true});
  ui.run("GameFeedback.unlock();GameFeedback.play('lost');GameFeedback.stop()");
  assert.equal(ui.get('vibrationToggle').disabled,true);assert.equal(ui.get('muteSound').disabled,true);
});
