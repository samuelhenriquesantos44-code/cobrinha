(function(root,factory) {
  if (typeof module === 'object' && module.exports) module.exports=factory();
  else root.TerritoryEngine=factory();
})(typeof globalThis !== 'undefined' ? globalThis : this,function() {
  const SIZE=24, TARGET=.5, STEP_MS=160, DURATION=90;
  const vectors={UP:[0,-1],RIGHT:[1,0],DOWN:[0,1],LEFT:[-1,0]};
  const opposite={UP:'DOWN',DOWN:'UP',LEFT:'RIGHT',RIGHT:'LEFT'};
  const levels={easy:{botEvery:3},normal:{botEvery:2},hard:{botEvery:1}};
  const inside=(x,y)=>x>=0&&y>=0&&x<SIZE&&y<SIZE;
  const index=(x,y)=>y*SIZE+x;
  function createGame(level='normal') {
    const actors=[{id:1,name:'Você',x:4,y:19,dir:'UP'},{id:2,name:'Atlas',x:19,y:4,dir:'LEFT'},{id:3,name:'Nova',x:19,y:19,dir:'UP'}].map(actor=>({...actor,nextDir:actor.dir,alive:true,trail:[],plan:[],cuts:0}));
    const grid=Array(SIZE*SIZE).fill(0);
    for(const actor of actors) for(let y=actor.y-2;y<=actor.y+2;y++) for(let x=actor.x-2;x<=actor.x+2;x++) grid[index(x,y)]=actor.id;
    return {grid,trails:Array(SIZE*SIZE).fill(0),actors,ticks:0,peak:25/(SIZE*SIZE)*100,level:Object.hasOwn(levels,level)?level:'normal',status:'running',reason:null,events:[]};
  }
  function turn(state,direction) {
    const actor=state.actors[0];
    if(state.status!=='running'||!vectors[direction]||direction===opposite[actor.dir])return false;
    actor.nextDir=direction;return true;
  }
  function count(state,id) { return state.grid.reduce((total,owner)=>total+(owner===id),0); }
  function percentage(state,id=1) { return count(state,id)/(SIZE*SIZE)*100; }
  function remaining(state) { return Math.max(0,DURATION-Math.floor(state.ticks*STEP_MS/1000)); }
  function eliminate(state,actor,reason,by) {
    if(!actor.alive)return;
    actor.alive=false;actor.reason=reason;
    for(let i=0;i<state.grid.length;i++) { if(state.grid[i]===actor.id)state.grid[i]=0;if(state.trails[i]===actor.id)state.trails[i]=0; }
    actor.trail=[];actor.plan=[];
    if(by&&by!==actor)by.cuts++;
    state.events.push({type:'eliminated',id:actor.id,reason,by:by?.id});
  }
  function claim(state,actor) {
    const before=count(state,actor.id);
    for(const cell of actor.trail) { state.grid[cell]=actor.id;state.trails[cell]=0; }
    actor.trail=[];actor.plan=[];
    // A região ligada às bordas permanece livre. O território e o rastro fechado
    // formam a barreira; regiões sem saída tornam-se parte da conquista.
    const exterior=new Uint8Array(SIZE*SIZE),queue=[];
    function visit(cell) { if(!exterior[cell]&&state.grid[cell]!==actor.id) { exterior[cell]=1;queue.push(cell); } }
    for(let i=0;i<SIZE;i++) { visit(index(i,0));visit(index(i,SIZE-1));visit(index(0,i));visit(index(SIZE-1,i)); }
    for(let cursor=0;cursor<queue.length;cursor++) {
      const cell=queue[cursor],x=cell%SIZE,y=Math.floor(cell/SIZE);
      for(const [dx,dy] of Object.values(vectors))if(inside(x+dx,y+dy))visit(index(x+dx,y+dy));
    }
    for(let i=0;i<exterior.length;i++)if(!exterior[i])state.grid[i]=actor.id;
    for(const other of state.actors)if(other!==actor&&other.alive) {
      if(state.grid[index(other.x,other.y)]===actor.id||!count(state,other.id))eliminate(state,other,'surrounded',actor);
      else {
        // Um rastro engolido pela nova área também é cortado.
        if(other.trail.some(cell=>state.grid[cell]===actor.id))eliminate(state,other,'trail',actor);
      }
    }
    state.events.push({type:'claim',id:actor.id,cells:count(state,actor.id)-before});
  }
  function routeHome(state,actor) {
    const start=index(actor.x,actor.y),queue=[start],seen=new Set([start]),paths=new Map([[start,[]]]);
    for(let cursor=0;cursor<queue.length;cursor++) {
      const cell=queue[cursor],x=cell%SIZE,y=Math.floor(cell/SIZE),path=paths.get(cell);
      if(cell!==start&&state.grid[cell]===actor.id)return path;
      for(const [dir,[dx,dy]] of Object.entries(vectors)) {
        if(!inside(x+dx,y+dy))continue;
        const next=index(x+dx,y+dy);
        if(seen.has(next)||state.trails[next]===actor.id)continue;
        seen.add(next);queue.push(next);paths.set(next,[...path,dir]);
      }
    }
    return [];
  }
  function planLoop(state,actor,random) {
    let best=[],bestScore=-1;
    for(let attempt=0;attempt<16;attempt++) {
      const dx=random()<.5?'LEFT':'RIGHT',dy=random()<.5?'UP':'DOWN';
      const width=3+Math.floor(random()*5),height=3+Math.floor(random()*5);
      let route=[...Array(width).fill(dx),...Array(height).fill(dy),...Array(width).fill(opposite[dx]),...Array(height).fill(opposite[dy])];
      if(random()<.5)route=[...Array(height).fill(dy),...Array(width).fill(dx),...Array(height).fill(opposite[dy]),...Array(width).fill(opposite[dx])];
      let x=actor.x,y=actor.y,score=0,valid=true;
      for(const dir of route) { const [mx,my]=vectors[dir];x+=mx;y+=my;if(!inside(x,y)){valid=false;break;}if(state.grid[index(x,y)]!==actor.id)score++; }
      if(valid&&score>bestScore) {bestScore=score;best=route;}
    }
    return best;
  }
  function botDirection(state,actor,random) {
    // Ataques curtos ao rastro exposto tornam necessário voltar para casa.
    const human=state.actors[0];
    if(human.alive)for(const cell of human.trail) {
      const x=cell%SIZE,y=Math.floor(cell/SIZE),distance=Math.abs(x-actor.x)+Math.abs(y-actor.y);
      if(distance!==1)continue;
      const direction=Object.keys(vectors).find(dir=>actor.x+vectors[dir][0]===x&&actor.y+vectors[dir][1]===y);
      if(state.trails[cell]!==actor.id)return direction;
    }
    if(!actor.plan.length) actor.plan=actor.trail.length?routeHome(state,actor):planLoop(state,actor,random);
    let direction=actor.plan.shift();
    const safe=dir=>{if(!vectors[dir])return false;const [dx,dy]=vectors[dir];return inside(actor.x+dx,actor.y+dy)&&state.trails[index(actor.x+dx,actor.y+dy)]!==actor.id;};
    if(!safe(direction)) { actor.plan=routeHome(state,actor);direction=actor.plan.shift(); }
    if(!safe(direction)) { actor.plan=[];direction=Object.keys(vectors).find(safe); }
    return direction;
  }
  function move(state,actor,direction) {
    if(!vectors[direction])return;
    const [dx,dy]=vectors[direction],x=actor.x+dx,y=actor.y+dy;
    if(!inside(x,y)) {eliminate(state,actor,'wall');return;}
    const cell=index(x,y),trailOwner=state.trails[cell];
    if(trailOwner) {
      eliminate(state,state.actors[trailOwner-1],trailOwner===actor.id?'self':'trail',actor);
      if(!actor.alive)return;
    }
    actor.x=x;actor.y=y;actor.dir=direction;actor.nextDir=direction;
    if(state.grid[cell]===actor.id) { if(actor.trail.length)claim(state,actor); }
    else { actor.trail.push(cell);state.trails[cell]=actor.id; }
  }
  function step(state,random=Math.random) {
    if(state.status!=='running')return;
    state.events=[];state.ticks++;
    const before=state.actors.map(actor=>({x:actor.x,y:actor.y}));
    move(state,state.actors[0],state.actors[0].nextDir);
    state.peak=Math.max(state.peak,percentage(state));
    for(const actor of state.actors.slice(1))if(actor.alive&&state.ticks%levels[state.level].botEvery===0)move(state,actor,botDirection(state,actor,random));
    for(let i=0;i<state.actors.length;i++)for(let j=i+1;j<state.actors.length;j++) {
      const a=state.actors[i],b=state.actors[j];
      if(!a.alive||!b.alive)continue;
      const same=a.x===b.x&&a.y===b.y;
      const swap=a.x===before[j].x&&a.y===before[j].y&&b.x===before[i].x&&b.y===before[i].y;
      if(!same&&!swap)continue;
      const safeA=state.grid[index(a.x,a.y)]===a.id,safeB=state.grid[index(b.x,b.y)]===b.id;
      if(!safeA)eliminate(state,a,'head',b);
      if(!safeB)eliminate(state,b,'head',a);
    }
    const human=state.actors[0];
    if(!human.alive) {state.status='lost';state.reason=human.reason;}
    else if(count(state,1)>=SIZE*SIZE*TARGET||state.actors.filter(actor=>actor.alive).length===1) {
      state.status='won';state.reason=count(state,1)>=SIZE*SIZE*TARGET?'target':'survivor';
    } else if(remaining(state)===0) {
      const humanArea=count(state,1),rivalArea=Math.max(...state.actors.slice(1).filter(actor=>actor.alive).map(actor=>count(state,actor.id)),0);
      state.status=humanArea>rivalArea?'won':humanArea===rivalArea?'draw':'lost';state.reason='time';
    }
  }
  return {SIZE,TARGET,STEP_MS,DURATION,vectors,opposite,createGame,turn,step,count,percentage,remaining};
});
