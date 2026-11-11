(function(root,factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SnakeProgression = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const colors = [
    {id:'green',name:'Verde clássico',head:'#22c55e',body:'#4ade80'},
    {id:'blue',name:'Azul elétrico',head:'#0ea5e9',body:'#7dd3fc',goal:'ten'},
    {id:'purple',name:'Violeta',head:'#a78bfa',body:'#ddd6fe',goal:'twentyFive'},
    {id:'gold',name:'Dourada',head:'#f59e0b',body:'#fde68a',goal:'records'},
    {id:'coral',name:'Coral',head:'#fb7185',body:'#fda4af',goal:'games'}
  ];
  const goals = [
    {id:'ten',title:'Pegando o ritmo',description:'Faça 10 pontos em uma partida.',metric:'best',target:10,color:'blue'},
    {id:'twentyFive',title:'Cresceu demais',description:'Faça 25 pontos em uma partida.',metric:'best',target:25,color:'purple'},
    {id:'records',title:'Sempre melhor',description:'Termine 5 partidas superando seu recorde local do ritmo.',metric:'records',target:5,color:'gold'},
    {id:'games',title:'Mais uma partida',description:'Termine 10 partidas com pelo menos 1 ponto.',metric:'games',target:10,color:'coral'}
  ];
  const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
  function normalize(value,legacyBest=0) {
    const data = {best:Math.max(count(value?.best),count(legacyBest)),records:count(value?.records),games:count(value?.games),selected:'green'};
    if (available(data,value?.selected)) data.selected = value.selected;
    return data;
  }
  function available(data,id) {
    const color = colors.find(item=>item.id===id);
    if (!color) return false;
    const goal = goals.find(item=>item.id===color.goal);
    return !goal || data[goal.metric] >= goal.target;
  }
  function finish(data,{score,initialRecord}) {
    const next = {...data};
    if (count(score)>0) {
      next.best = Math.max(next.best,score);
      next.games++;
      if (score > count(initialRecord)) next.records++;
    }
    return {data:next,unlocked:goals.filter(goal=>data[goal.metric]<goal.target && next[goal.metric]>=goal.target)};
  }
  return {colors,goals,normalize,available,finish};
});
