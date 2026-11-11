const {test}=require('node:test');
const assert=require('node:assert/strict');
const Progress=require('../js/progression.js');

test('conquistas liberam cores nos limiares e não se repetem',()=>{
  let data=Progress.normalize();
  assert.equal(Progress.available(data,'blue'),false);
  let result=Progress.finish(data,{score:10,initialRecord:9});
  assert.deepEqual(result.unlocked.map(item=>item.id),['ten']);
  assert.equal(Progress.available(result.data,'blue'),true);
  data=result.data;
  for(let i=0;i<4;i++) data=Progress.finish(data,{score:11+i,initialRecord:10+i}).data;
  assert.equal(data.records,5);assert.equal(Progress.available(data,'gold'),true);
  result=Progress.finish(data,{score:25,initialRecord:24});
  assert.deepEqual(result.unlocked.map(item=>item.id),['twentyFive']);
  data=result.data;
  for(let i=0;i<4;i++) data=Progress.finish(data,{score:1,initialRecord:25}).data;
  assert.equal(data.games,10);assert.equal(Progress.available(data,'coral'),true);
  assert.equal(data.records,6);
  assert.equal(Progress.finish(data,{score:25,initialRecord:25}).unlocked.length,0);
});
test('zero pontos não conta partida nem recorde e dados inválidos não selecionam cor bloqueada',()=>{
  const data=Progress.normalize({best:-2,records:'5',games:NaN,selected:'gold'});
  assert.equal(data.selected,'green');assert.equal(data.records,0);
  assert.deepEqual(Progress.finish(data,{score:0,initialRecord:0}).data,data);
  assert.equal(Progress.available(data,'invalid'),false);
});
test('recordes antigos liberam metas de pontos sem inventar partidas e recordes superados',()=>{
  const data=Progress.normalize({selected:'purple'},30);
  assert.equal(data.best,30);assert.equal(data.games,0);assert.equal(data.records,0);
  assert.equal(data.selected,'purple');assert.equal(Progress.available(data,'gold'),false);
});
