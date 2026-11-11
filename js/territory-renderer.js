const TerritoryRenderer=(()=>{
  const canvas=document.getElementById('territoryCanvas'),ctx=canvas.getContext('2d');
  const CELL=20;
  function draw(state,palette) {
    const colors={1:palette,2:{head:palette.bot2,body:palette.bot2},3:{head:palette.bot3,body:palette.bot3}};
    ctx.fillStyle='#07111f';ctx.fillRect(0,0,480,480);
    state.grid.forEach((owner,cell)=>{
      const x=cell%24*CELL,y=Math.floor(cell/24)*CELL;
      if(owner) { ctx.fillStyle=colors[owner].body+'40';ctx.fillRect(x,y,CELL,CELL); }
      ctx.strokeStyle='#ffffff07';ctx.strokeRect(x,y,CELL,CELL);
    });
    for(const actor of state.actors) {
      if(!actor.alive)continue;
      if(actor.trail.length) {
        ctx.strokeStyle=colors[actor.id].body;ctx.lineWidth=9;ctx.lineCap='round';ctx.lineJoin='round';
        ctx.beginPath();
        actor.trail.forEach((cell,i)=>{const x=cell%24*CELL+10,y=Math.floor(cell/24)*CELL+10;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});
        if(actor.trail.length===1)ctx.lineTo(actor.x*CELL+10.1,actor.y*CELL+10);
        ctx.stroke();
        ctx.strokeStyle='#ffffffa0';ctx.lineWidth=2;ctx.setLineDash([3,6]);ctx.stroke();ctx.setLineDash([]);
      }
      const x=actor.x*CELL,y=actor.y*CELL;
      ctx.save();ctx.fillStyle=colors[actor.id].head;ctx.shadowColor=colors[actor.id].body;ctx.shadowBlur=actor.id===1?16:5;
      ctx.beginPath();ctx.roundRect(x+2,y+2,16,16,actor.id===1?6:3);ctx.fill();ctx.restore();
      const [dx,dy]=TerritoryEngine.vectors[actor.dir];
      ctx.fillStyle='#07111f';
      if(dx) {ctx.fillRect(x+9+dx*4,y+5,3,3);ctx.fillRect(x+9+dx*4,y+12,3,3);}
      else {ctx.fillRect(x+5,y+9+dy*4,3,3);ctx.fillRect(x+12,y+9+dy*4,3,3);}
      if(actor.id===1) {ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x+1,y+1,18,18,6);ctx.stroke();}
    }
    ctx.strokeStyle='#688494';ctx.lineWidth=2;ctx.strokeRect(1,1,478,478);
  }
  return {draw};
})();
