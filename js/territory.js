(()=>{
  const $=id=>document.getElementById(id),E=TerritoryEngine;
  let state,timer,countdownTimer,sequence=0,queue=[],gesture,palette,peak=0,record=0,hideArrows=false,claimMessage='',claimUntil=0;
  const key=()=>`cobrinha:territory:record:v1:${$('territoryDifficulty').value}`;
  try {hideArrows=localStorage.getItem('cobrinha:hide-arrows:v1')==='true';}catch{}
  function getPalette() {
    let color=SnakeProgression.colors[0];
    try {
      const data=SnakeProgression.normalize(JSON.parse(localStorage.getItem('cobrinha:progression:v1')));
      color=SnakeProgression.colors.find(item=>item.id===data.selected);
    }catch{}
    return {...color,bot2:color.id==='blue'?'#fbbf24':'#38bdf8',bot3:color.id==='coral'?'#c4b5fd':'#fb7185'};
  }
  function controls() {
    const active=state&&['running','countdown','paused'].includes(state.status);
    $('territoryControls').hidden=!active||hideArrows;
    $('territoryArea').dataset.arrows=hideArrows?'hidden':'visible';
    $('territoryToggleControls').textContent=hideArrows?'Mostrar setas':'Ocultar setas';
    $('territoryToggleControls').setAttribute('aria-expanded',String(!hideArrows));
    $('territoryToggleControls').disabled=!active;
  }
  function clearTimers() {clearInterval(timer);clearTimeout(countdownTimer);sequence++;queue=[];gesture=null;}
  function score() {
    const area=E.percentage(state),seconds=E.remaining(state);
    $('territoryPercent').textContent=area.toFixed(1)+'%';
    $('territoryTime').textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
    $('territoryProgress').value=area;
    $('territoryBest').textContent=record.toFixed(1)+'%';
    for(const actor of state.actors) {
      $('territoryOwner'+actor.id).textContent=actor.alive?E.percentage(state,actor.id).toFixed(1)+'%':'Fora';
      $('territoryRival'+actor.id).classList.toggle('eliminated',!actor.alive);
    }
  }
  function overlay(title,text,action) {
    $('territoryOverlayTitle').textContent=title;$('territoryOverlayText').textContent=text;
    $('territoryOverlayAction').textContent=action;$('territoryOverlay').hidden=false;
    $('territoryOverlayAction').focus({preventScroll:true});
  }
  function countdown() {
    clearTimers();const version=sequence;
    if(document.hidden) {pause();return;}
    state.status='countdown';$('territoryOverlay').hidden=true;$('territoryCountdown').hidden=false;
    $('territoryPause').textContent='Pausar';$('territoryPause').disabled=false;controls();
    let count=3;$('territoryCountdownNumber').textContent=count;
    function next() {
      if(version!==sequence||state?.status!=='countdown')return;
      count--;
      if(!count) {$('territoryCountdown').hidden=true;state.status='running';timer=setInterval(tick,E.STEP_MS);return;}
      $('territoryCountdownNumber').textContent=count;countdownTimer=setTimeout(next,1000);
    }
    countdownTimer=setTimeout(next,1000);
  }
  function start() {
    clearTimers();palette=getPalette();state=E.createGame($('territoryDifficulty').value);peak=E.percentage(state);claimMessage='';claimUntil=0;
    try {record=Math.max(0,Math.min(100,Number(localStorage.getItem(key()))||0));}catch{record=0;}
    $('territorySetup').hidden=true;$('territoryArea').hidden=false;$('territoryResult').hidden=true;
    $('territoryLevel').textContent=$('territoryDifficulty').selectedOptions[0].textContent;
    $('territoryDanger').textContent='Você está em casa. Saia e volte para conquistar.';
    $('territoryDanger').dataset.danger='false';
    $('territoryArea').style.setProperty('--territory-player',palette.body);
    $('territoryArea').style.setProperty('--territory-bot2',palette.bot2);
    $('territoryArea').style.setProperty('--territory-bot3',palette.bot3);
    score();TerritoryRenderer.draw(state,palette);countdown();
    $('territoryArea').scrollIntoView({block:'start'});$('territoryPause').focus({preventScroll:true});
  }
  function pause() {
    if(!state||!['running','countdown','paused'].includes(state.status))return;
    clearTimers();state.status='paused';$('territoryCountdown').hidden=true;$('territoryPause').textContent='Continuar';
    overlay('Pausa no mapa','Seu território fica aqui. Retomamos em 3, 2, 1.','Continuar');
  }
  function togglePause() {
    if(state?.status==='paused')countdown();else pause();
  }
  function finish() {
    clearTimers();$('territoryPause').disabled=true;controls();
    if(peak>record) {record=peak;try{localStorage.setItem(key(),String(record));}catch{}}
    const reasons={wall:'Você bateu no limite do mapa.',self:'Você cruzou o próprio rastro.',trail:'Um rival cortou seu rastro.',head:'Você encontrou um rival fora de casa.',surrounded:'Um rival cercou você.',time:'O tempo acabou.',target:'Você conquistou metade do mapa!',survivor:'Você eliminou os dois rivais!'};
    $('territoryDanger').textContent=reasons[state.reason]||'Disputa encerrada.';
    $('territoryDanger').dataset.danger='false';
    overlay(state.status==='won'?'O mapa é seu!':state.status==='draw'?'Disputa empatada':state.reason==='time'?'O tempo acabou':'Fim da disputa',reasons[state.reason]||'Tente uma nova rota.','Jogar novamente');
    $('territoryResult').hidden=false;
    $('territoryResult').textContent=`Maior área nesta partida: ${peak.toFixed(1)}% · Cortes: ${state.actors[0].cuts} · Recorde local: ${record.toFixed(1)}%.`;
    score();
  }
  function tick() {
    if(state?.status!=='running')return;
    if(queue.length)E.turn(state,queue.shift());
    E.step(state);
    peak=Math.max(peak,state.peak);
    const claim=state.events.find(event=>event.type==='claim'&&event.id===1);
    if(claim) {claimMessage=`+${claim.cells} casas conquistadas. Seu rastro está seguro!`;claimUntil=state.ticks+12;}
    const danger=state.actors[0].trail.length>0;
    const message=danger?'Rastro exposto! Volte ao seu território.':state.ticks<claimUntil?claimMessage:'Você está em casa. Saia e volte para conquistar.';
    if($('territoryDanger').textContent!==message)$('territoryDanger').textContent=message;
    $('territoryDanger').dataset.danger=String(danger);
    score();TerritoryRenderer.draw(state,palette);
    if(state.status!=='running')finish();
  }
  function direction(dir) {
    if(!state||!['running','countdown'].includes(state.status))return;
    const previous=queue.at(-1)||state.actors[0].nextDir;
    if(!E.vectors[dir]||dir===previous||dir===E.opposite[previous]||queue.length>=2)return;
    queue.push(dir);
  }
  $('territoryStart').addEventListener('click',start);
  $('territoryRestart').addEventListener('click',start);
  $('territoryPause').addEventListener('click',togglePause);
  $('territoryOverlayAction').addEventListener('click',()=>state?.status==='paused'?countdown():start());
  $('territoryMenu').addEventListener('click',()=>{
    clearTimers();state=null;controls();$('territoryArea').hidden=true;$('territorySetup').hidden=false;$('territoryStart').focus();
  });
  $('territoryToggleControls').addEventListener('click',()=>{
    hideArrows=!hideArrows;try{localStorage.setItem('cobrinha:hide-arrows:v1',String(hideArrows));}catch{}controls();
  });
  document.querySelectorAll('[data-territory-dir]').forEach(button=>{
    button.addEventListener('pointerdown',event=>{if(event.button>0)return;event.preventDefault();direction(button.dataset.territoryDir);});
    button.addEventListener('click',event=>{if(event.detail===0||!('PointerEvent' in window))direction(button.dataset.territoryDir);});
  });
  const board=$('territoryBoard');
  board.addEventListener('pointerdown',event=>{
    if(event.button>0||gesture||!['running','countdown'].includes(state?.status)||event.target.closest('button'))return;
    event.preventDefault();gesture={id:event.pointerId,x:event.clientX,y:event.clientY};board.setPointerCapture?.(event.pointerId);
  });
  board.addEventListener('pointermove',event=>{
    if(!gesture||gesture.id!==event.pointerId)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
    if(Math.max(Math.abs(dx),Math.abs(dy))<Math.max(16,Math.min(28,board.clientWidth*.07)))return;
    event.preventDefault();direction(Math.abs(dx)>Math.abs(dy)?dx>0?'RIGHT':'LEFT':dy>0?'DOWN':'UP');gesture=null;
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])board.addEventListener(name,event=>{if(gesture?.id===event.pointerId)gesture=null;});
  board.addEventListener('contextmenu',event=>event.preventDefault());
  document.addEventListener('keydown',event=>{
    if(!state||event.ctrlKey||event.altKey||event.metaKey||/^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName))return;
    const dirs={ArrowUp:'UP',ArrowDown:'DOWN',ArrowLeft:'LEFT',ArrowRight:'RIGHT',w:'UP',a:'LEFT',s:'DOWN',d:'RIGHT'};
    const dir=dirs[event.key]||dirs[event.key.toLowerCase()];
    if(dir){event.preventDefault();direction(dir);}
    if(!event.repeat&&(event.key==='Escape'||event.code==='Space'&&event.target.tagName!=='BUTTON')) {event.preventDefault();togglePause();}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&['running','countdown'].includes(state?.status))pause();});
  window.addEventListener('blur',()=>{if(['running','countdown'].includes(state?.status))pause();});
  palette=getPalette();TerritoryRenderer.draw(E.createGame(),palette);controls();
})();
