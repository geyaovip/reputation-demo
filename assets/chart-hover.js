/* Shared interaction for the Demo's canvas line charts. Values come from each chart's own data. */
(()=>{
  const charts=new WeakMap();let active=null,sequence=0;
  const clamp=(value,min,max)=>Math.max(min,Math.min(Math.max(min,max),value));
  function restore(state){
    const ctx=state.canvas.getContext('2d');ctx.save();ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,state.canvas.width,state.canvas.height);ctx.drawImage(state.base,0,0);ctx.restore();
  }
  function hide(state){
    state.tooltip.hidden=true;state.canvas.removeAttribute('aria-describedby');
    if(state.index!==null)restore(state);state.index=null;if(active===state)active=null;
  }
  function show(state,index,pointerY){
    if(active&&active!==state)hide(active);active=state;
    const {canvas,model,tooltip}=state,point=model.points[index];
    if(state.index!==index){
      restore(state);const ctx=canvas.getContext('2d');ctx.save();
      ctx.setTransform(canvas.width/model.width,0,0,canvas.height/model.height,0,0);
      ctx.lineWidth=1;ctx.strokeStyle='#98a5ba';ctx.setLineDash([4,4]);
      ctx.beginPath();ctx.moveTo(point.x,model.plot.top);ctx.lineTo(point.x,model.plot.bottom);ctx.stroke();ctx.setLineDash([]);
      ctx.restore();state.index=index;
      tooltip.replaceChildren();const title=document.createElement('div');title.className='chart-hover-title';title.textContent=point.title;tooltip.append(title);
      point.items.forEach(item=>{
        const row=document.createElement('div'),dot=document.createElement('i'),name=document.createElement('span'),value=document.createElement('strong');
        row.className='chart-hover-row';dot.className='chart-hover-dot';dot.style.background=item.color;
        name.className='chart-hover-name';name.textContent=item.name;
        value.className='chart-hover-value';value.textContent=item.value==null?'—':String(item.value)+(item.unit||'');
        row.append(dot,name,value);tooltip.append(row);
      });
    }
    tooltip.hidden=false;canvas.setAttribute('aria-describedby',tooltip.id);
    const rect=canvas.getBoundingClientRect(),hostRect=state.host.getBoundingClientRect(),sx=rect.width/model.width,sy=rect.height/model.height;
    const x=rect.left-hostRect.left+point.x*sx,y=rect.top-hostRect.top+(pointerY??model.plot.top)*sy;
    const width=tooltip.offsetWidth,height=tooltip.offsetHeight;
    tooltip.style.left=clamp(x+16+width>state.host.clientWidth?x-width-16:x+16,8,state.host.clientWidth-width-8)+'px';
    tooltip.style.top=clamp(y+12,8,state.host.clientHeight-height-8)+'px';
  }
  window.bindChartHover=(canvas,model)=>{
    charts.get(canvas)?.destroy();
    const host=canvas.parentElement;host.classList.add('chart-hover-host');canvas.classList.add('chart-hover-canvas');canvas.tabIndex=0;
    const tooltip=document.createElement('div');tooltip.className='chart-hover-tooltip';tooltip.id='chart-tooltip-'+(++sequence);tooltip.setAttribute('role','tooltip');tooltip.hidden=true;host.append(tooltip);
    const base=document.createElement('canvas');base.width=canvas.width;base.height=canvas.height;base.getContext('2d').drawImage(canvas,0,0);
    const state={canvas,host,model,base,tooltip,index:null};
    const pointer=event=>{
      const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width*model.width,y=(event.clientY-rect.top)/rect.height*model.height;
      if(x<model.plot.left||x>model.plot.right||y<model.plot.top||y>model.plot.bottom||!model.points.length){hide(state);return}
      let index=0;model.points.forEach((point,i)=>{if(Math.abs(point.x-x)<Math.abs(model.points[index].x-x))index=i});show(state,index,y);
    };
    const leave=event=>{if(event.type==='pointerleave'&&event.pointerType==='touch')return;hide(state)},key=event=>{
      if(event.key==='Escape'){hide(state);return}
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||!model.points.length)return;
      event.preventDefault();let index=state.index??0;
      if(event.key==='Home')index=0;else if(event.key==='End')index=model.points.length-1;
      else if(state.index!==null)index+=event.key==='ArrowLeft'?-1:1;
      show(state,clamp(index,0,model.points.length-1));
    };
    canvas.addEventListener('pointermove',pointer);canvas.addEventListener('pointerdown',pointer);
    canvas.addEventListener('pointerleave',leave);canvas.addEventListener('pointercancel',leave);canvas.addEventListener('blur',leave);canvas.addEventListener('keydown',key);
    state.destroy=()=>{
      if(active===state)active=null;tooltip.remove();canvas.removeAttribute('aria-describedby');
      canvas.removeEventListener('pointermove',pointer);canvas.removeEventListener('pointerdown',pointer);canvas.removeEventListener('pointerleave',leave);
      canvas.removeEventListener('pointercancel',leave);canvas.removeEventListener('blur',leave);canvas.removeEventListener('keydown',key);
    };charts.set(canvas,state);
  };
  // Export the original chart, without a transient guide or selected point.
  window.chartBaseImageURL=canvas=>(charts.get(canvas)?.base||canvas).toDataURL('image/png');
  document.addEventListener('pointerdown',event=>{if(active&&event.target!==active.canvas)hide(active)});
})();
