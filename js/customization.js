/* Conquistas locais: nenhuma mudança nas regras ou no ranking online. */
const GameCustomization = (() => {
  const $ = id => document.getElementById(id);
  const key = 'cobrinha:progression:v1';
  let saved, legacyBest=0, persistent=true;
  try {
    saved = JSON.parse(localStorage.getItem(key));
    for (const level of ['easy','normal','hard']) {
      const score = Number(localStorage.getItem(`cobrinha:walls-v2:record:${level}`));
      if (Number.isSafeInteger(score)) legacyBest = Math.max(legacyBest,score);
    }
  } catch { persistent=false; }
  let data = SnakeProgression.normalize(saved,legacyBest);
  function remember() {
    try { localStorage.setItem(key,JSON.stringify(data)); }
    catch { persistent=false; }
  }
  function render() {
    const {goals,colors,available} = SnakeProgression;
    $('achievementCount').textContent = `${goals.filter(goal=>available(data,goal.color)).length}/${goals.length}`;
    $('progressionHint').textContent = persistent ? 'Conquistas e cores salvas neste aparelho. Recordes anteriores contam para as metas de pontos.' : 'Armazenamento indisponível: conquistas e cores duram apenas nesta sessão.';
    $('colorOptions').replaceChildren();
    for (const color of colors) {
      const unlocked = available(data,color.id);
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'color-option';
      button.disabled = !unlocked;
      button.setAttribute('aria-pressed',String(data.selected===color.id));
      const swatch = document.createElement('span');
      swatch.className = 'color-swatch'; swatch.style.backgroundColor = color.body;
      swatch.setAttribute('aria-hidden','true');
      const name = document.createElement('span');
      name.textContent = color.name + (unlocked ? '' : ' · Bloqueada');
      button.append(swatch,name);
      button.addEventListener('click',()=>{
        if (!available(data,color.id)) return;
        data.selected = color.id; remember(); render();
        $('colorStatus').textContent = `${color.name} selecionada para a próxima partida.`;
      });
      $('colorOptions').append(button);
    }
    $('achievementList').replaceChildren();
    for (const goal of goals) {
      const unlocked = available(data,goal.color);
      const row = document.createElement('li');
      row.className = unlocked ? 'achievement unlocked' : 'achievement';
      const title = document.createElement('strong'); title.textContent = `${unlocked?'✓':'○'} ${goal.title}`;
      const description = document.createElement('p'); description.textContent = goal.description;
      const progress = document.createElement('progress'); progress.max = goal.target; progress.value = Math.min(data[goal.metric],goal.target);
      progress.setAttribute('aria-label',goal.title);
      const reward = document.createElement('span'); reward.textContent = `${progress.value}/${goal.target} · ${unlocked?'Liberou':'Libera'} ${colors.find(color=>color.id===goal.color).name}`;
      row.append(title,description,progress,reward); $('achievementList').append(row);
    }
  }
  function finish(result) {
    const update = SnakeProgression.finish(data,result);
    data = update.data; remember(); render();
    $('unlockNotice').hidden = !update.unlocked.length;
    $('unlockNotice').textContent = update.unlocked.map(goal=>`Conquista: ${goal.title}! ${SnakeProgression.colors.find(color=>color.id===goal.color).name} liberada.`).join(' ');
  }
  remember(); render();
  return {finish,palette:()=>({...SnakeProgression.colors.find(color=>color.id===data.selected)})};
})();
