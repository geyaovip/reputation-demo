/* 本地样例任务与评价共用记录；正式处理需接模型和平台成功回执。 */
const AI_HOME_PHASES=['理解','判断','决策','执行'];
const aiHomeState={initialized:false,sequence:0,cursor:0,todoTab:'risks',tasks:[],sources:[],nextAdmission:0,lastPulse:0};
let aiHomeReplayTimer=null;
function stopAIHomeReplay(){clearInterval(aiHomeReplayTimer);aiHomeReplayTimer=null}
function aihStore(r){return storeBy(r.storeId)?.name||'当前门店'}
function aihPlatform(r){return platformBy(r.platformId)?.short||'评价平台'}
function aihSeconds(ms){return (Math.max(0,ms)/1000).toFixed(1)+'s'}
function aihNow(){return new Date()}
function aihRecordTime(r,date){r.daysAgo=Math.round((new Date(dateISO(DEMO_NOW)+'T00:00:00')-new Date(dateISO(date)+'T00:00:00'))/86400000);r.publishedAt=date.toISOString();r.time=String(date.getHours()).padStart(2,'0')+':'+String(date.getMinutes()).padStart(2,'0')}
function aihOutcome(r,route,date=aihNow()){
 if(r.opsAIOutcome)return;
 r.opsAIOutcome={route,at:date.toISOString(),intercepted:route==='manual'&&r.risk==='high'};
}
function aihStats(){
 const day=dateISO(aihNow()),rows=app.reviews.map(r=>{
  if(r.opsAIOutcome)return {r,...r.opsAIOutcome};
  return isAutoReplied(r)&&r.replyPublishedAt?{r,route:'auto',at:r.replyPublishedAt,intercepted:false}:null;
 }).filter(x=>x&&dateISO(new Date(x.at))===day&&new Date(x.at)<=aihNow());
 const auto=rows.filter(x=>x.route==='auto').length,manual=rows.filter(x=>x.route==='manual').length;
 return {processed:rows.length,auto,manual,intercepted:rows.filter(x=>x.intercepted).length,rows};
}
function aihBootstrapCompleted(){
 const source=aiHomeState.sources.filter(r=>r.risk==='normal'&&['good','bad'].includes(reviewSentiment(r).key));
 for(let i=0;i<72&&source.length;i++){
  const original=source[i%source.length],platform=app.platforms[i%app.platforms.length];
  const stores=app.stores.filter(s=>app.connections[s.id]?.some(c=>c.platformId===platform.id&&c.status==='connected'));
  if(!stores.length)continue;
  const r=structuredClone(original),end=new Date(Date.now()-(i+2)*85000),start=new Date(end.getTime()-90000);
  Object.assign(r,{id:'ai-history-'+String(i+1).padStart(3,'0'),storeId:stores[i%stores.length].id,platformId:platform.id,nickname:'到店顾客'+(i+201),risk:'normal',riskType:'',riskStandardIds:[],status:'replied',replyStatus:'replied',replyOrigin:'auto-sample',replyPublishedAt:end.toISOString(),notes:'',riskRecords:[],media:i%4===0?[i%5]:[]});
  aihRecordTime(r,start);
  try{r.reply=validateGeneratedReply(replyGenerationInput(r),sampleReplyResult(replyGenerationInput(r))).text;r.draft=r.reply;app.reviews.push(r);const connection=app.connections[r.storeId]?.find(c=>c.platformId===r.platformId);if(connection)connection.count=(connection.count||0)+1}catch(_){}
 }
}
function aihCreateTask(r,phase=0){
 const n=++aiHomeState.sequence,durations=[3200+n%3*500,3900+n%4*450,2900+n%3*600,4300+n%4*450];
 const elapsed=durations.slice(0,phase).reduce((a,b)=>a+b,0);
 const t={id:'ZY-'+r.id.toUpperCase(),review:r,phase,durations,stageElapsed:0,elapsed,enteredAt:Date.now(),status:'processing',retireAt:null};
 delete r.opsQueued;opsState.reviewJobs.set(r.id,t);aiHomeState.tasks.push(t);return t;
}
function aihInit(){
 if(aiHomeState.initialized)return;
 aiHomeState.initialized=true;
 aiHomeState.sources=['r007','r005','r010','r004','r003','r002','r012','r001','r009'].map(reviewBy).filter(Boolean).map(r=>structuredClone(r));
 aihBootstrapCompleted();
 app.reviews.filter(isReplyPending).forEach(r=>{
  if(opsReviewRouting(r).key==='human'){aihOutcome(r,'manual',new Date(r.riskDetectedAt||reviewDate(r)));return}
  r.opsQueued=true;
 });
 const pending=app.reviews.filter(r=>isReplyPending(r)&&!r.opsAIOutcome).sort((a,b)=>a.daysAgo-b.daysAgo||b.time.localeCompare(a.time));
 pending.slice(0,5).forEach((r,i)=>aihCreateTask(r,[0,1,2,3,1][i]));
 app.reviews.filter(r=>isReplyPending(r)&&r.opsAIOutcome&&r.daysAgo===0&&r.risk!=='normal').slice(0,2).forEach(r=>{
  aiHomeState.tasks.unshift({id:'ZY-'+r.id.toUpperCase(),review:r,phase:3,durations:[1,1,1,1],stageElapsed:0,elapsed:0,enteredAt:Date.now()-1000,status:'blocked',result:'已拦截 · 等待人工确认',retireAt:Date.now()+20000});
 });
 aiHomeState.nextAdmission=Date.now()+4500;
}
function aihFeedReview(){
 const order=['r010','r005','r007','r004','r003','r002','r010','r012','r001','r005','r007','r009'],n=++aiHomeState.cursor;
 const source=aiHomeState.sources.find(r=>r.id===order[(n-1)%order.length])||aiHomeState.sources[0];
 const platform=app.platforms[(n-1)%app.platforms.length],stores=app.stores.filter(s=>app.connections[s.id]?.some(c=>c.platformId===platform.id&&c.status==='connected'));
 if(!source||!stores.length)return;
 const r=structuredClone(source),now=aihNow();
 Object.assign(r,{id:'live-'+String(n).padStart(4,'0'),storeId:stores[n%stores.length].id,platformId:platform.id,nickname:'新顾客'+(300+n),status:'pending',replyStatus:'pending',replyOrigin:'',replyPublishedAt:null,reply:'',draft:'',draftHistory:[],checklist:{},notes:'',riskRecords:[],caseStatus:'pending',order:'ZY'+dateISO(now).replaceAll('-','')+String(n).padStart(5,'0'),opsQueued:true});
 for(const key of ['opsAIOutcome','opsAutoError','opsPendingRisk','opsEvidence','opsSimulatedFailure','appeal','riskRemoved'])delete r[key];
 aihRecordTime(r,now);
 r.opsPendingRisk={risk:source.risk,riskType:source.riskType,riskStandardIds:[...(source.riskStandardIds||[])]};
 r.risk='normal';r.riskType='';r.riskStandardIds=[];delete r.riskDetectedAt;
 if(n%17===0)r.opsSimulatedFailure=true;
 const minute=offset=>{const d=new Date(now.getTime()-offset*60000);return [String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'),dateISO(d)]};
 const waiting=source.riskStandardIds?.includes('waiting');
 r.opsEvidence={items:waiting?'招牌红烧肉、清炒时蔬':'招牌套餐、时令蔬菜',events:waiting?[['顾客下单',minute(62)[0]],['门店接单',minute(61)[0]],['顾客催菜',minute(42)[0]+'、'+minute(30)[0]],['首菜出餐',minute(19)[0]]]:[['顾客下单',minute(50)[0]],['门店接单',minute(49)[0]],['菜品出餐',minute(30)[0]],['完成履约',minute(27)[0]]],day:minute(waiting?62:50)[1],finding:waiting?'下单至首菜43分钟，与评价中的长时间等待基本一致。':'已关联本次订单与出餐时序，具体事实仍需结合顾客原图和现场记录核查。',todo:waiting?'核对催菜后的回应及延误环节。':'保留顾客原始图片，核对该批次出品及当班记录。'};
 try{r.draft=sampleReplyResult(replyGenerationInput(r)).text}catch(_){}
 app.reviews.push(r);
 const connection=app.connections[r.storeId]?.find(c=>c.platformId===r.platformId);if(connection)connection.count=(connection.count||0)+1;
}
function aihFinish(t){
 const r=t.review;
 if(r.opsPendingRisk){Object.assign(r,r.opsPendingRisk);delete r.opsPendingRisk;if(r.risk!=='normal')r.riskDetectedAt=aihNow().toISOString()}
 if(r.opsSimulatedFailure)r.opsAutoError='分析超时，已保留原文并转人工核查';
 let decision=opsReviewRouting(r);
 if(decision.key==='processing'){
  try{
   const input=replyGenerationInput(r),result=validateGeneratedReply(input,sampleReplyResult(input)),error=replyValidation(r,result.text);
   if(error)throw new Error(error);
   r.reply=result.text;r.draft=result.text;r.replyStatus='replied';r.replyOrigin='auto-sample';r.replyPublishedAt=aihNow().toISOString();
   aihOutcome(r,'auto');t.status='complete';t.phase=4;t.result='已自动回复';t.retireAt=Date.now()+3600;
  }catch(error){r.opsAutoError=error.message||'回复执行未完成';decision=opsReviewRouting(r)}
 }
 if(t.status!=='complete'){
  aihOutcome(r,'manual');t.status='blocked';t.phase=3;t.result=r.risk!=='normal'?'已拦截 · 等待人工确认':'已分流 · 等待人工确认';t.retireAt=Date.now()+18000;
  if(!app.notifications.some(n=>n.id==='ai-'+r.id))app.notifications.unshift({id:'ai-'+r.id,type:r.risk!=='normal'?'risk':'review',title:r.risk!=='normal'?'AI 已拦截风险评价':'AI 处理需要你确认',detail:opsReviewRouting(r).reason,time:'今天 '+r.time,store:aihStore(r),read:false,target:r.risk!=='normal'?'risks':'reviews',targetId:r.id});
 }
 opsState.reviewJobs.delete(r.id);opsState.reviewNeedsRender=true;
}
function aihEngineTick(delta=1500){
 aihInit();
 if(document.hidden)return;
 const now=Date.now();
 if(now>=aiHomeState.nextAdmission){aihFeedReview();aiHomeState.nextAdmission=now+4500;opsState.reviewNeedsRender=true}
 for(const t of aiHomeState.tasks){
  if(t.status==='blocked'&&(isReplied(t.review)||t.review.risk!=='normal'&&riskCaseStatus(t.review)==='closed')){t.status='complete';t.result=isReplied(t.review)?'人工已确认回复':'风险已办结';t.retireAt=now+3200}
  if(t.status!=='processing')continue;
  if(isReplied(t.review)){t.status='complete';t.phase=4;t.result='回复已完成';t.retireAt=now+3200;opsState.reviewJobs.delete(t.review.id);continue}
  t.elapsed+=delta;t.stageElapsed+=delta;
  if(t.stageElapsed<t.durations[t.phase])continue;
  t.stageElapsed=0;
  if(t.phase===3){aihFinish(t);continue}
  t.phase++;
  if(t.phase===2&&t.review.opsPendingRisk){Object.assign(t.review,t.review.opsPendingRisk);delete t.review.opsPendingRisk;if(t.review.risk!=='normal')t.review.riskDetectedAt=aihNow().toISOString()}
  opsState.reviewNeedsRender=true;
 }
 aiHomeState.tasks=aiHomeState.tasks.filter(t=>t.retireAt===null||now<t.retireAt);
 const slots=5-opsState.reviewJobs.size;
 if(slots>0){const queue=app.reviews.filter(r=>isReplyPending(r)&&!r.opsAIOutcome&&!opsState.reviewJobs.has(r.id)).sort((a,b)=>a.daysAgo-b.daysAgo||b.time.localeCompare(a.time));queue.slice(0,slots).forEach(r=>aihCreateTask(r))}
 if(app.view==='ai-home')aiHomeUpdateScene();
 updateNoticeBadge();
}
function aihStageText(t){if(t.status==='blocked')return t.result||'已拦截 · 等待人工确认';if(t.status==='complete')return t.result;return ['理解评价中…','识别问题与风险中…','确定处理方式…',opsReviewRouting(t.review).key==='human'?'整理核查建议…':'生成并执行回复…'][t.phase]}
function aihTaskNote(t){
 const r=t.review;if(t.status==='complete')return '';
 if(t.status==='blocked')return opsReviewRouting(r).reason;
 if(t.phase===0)return '';
 if(t.phase===1)return [reviewSentiment(r).emotion,...reviewIssueTagNames(r)].join(' · ');
 if(r.risk!=='normal')return opsRiskTitle(r)+' · 拦截自动回复';
 return opsReviewRouting(r).key==='human'?'需要人工确认 · 保留原文与草稿':'未命中风险 · 按规则自动回复';
}
function aihTone(t){return t.status==='blocked'?'red':t.status==='complete'?'green':'blue'}
function aihProgress(t){return t.status!=='processing'?100:Math.min(99,Math.round((t.phase+t.stageElapsed/t.durations[t.phase])/4*100))}
function aihTaskHTML(t){
 const r=t.review;
 return '<article class="aih-task '+(t.status==='blocked'?'is-blocked':'')+'" data-aih-task="'+t.id+'" data-review-id="'+r.id+'" aria-label="任务 '+t.id+'">'+
 '<div class="aih-task-header"><div class="aih-task-meta"><img src="'+PLATFORM_LOGOS[r.platformId]+'" alt="" aria-hidden="true"><strong>'+esc(aihStore(r))+'</strong><span>'+esc(aihPlatform(r))+'</span></div><div class="aih-task-measures">'+starRating(r.rating,true,'compact')+'<time class="aih-task-elapsed" title="处理耗时">'+aihSeconds(t.elapsed)+'</time></div></div>'+
 '<p class="aih-task-summary" title="'+esc(r.text)+'">'+esc(r.text)+'</p><div class="aih-task-outcome"><strong class="aih-task-current" data-tone="'+aihTone(t)+'">'+esc(aihStageText(t))+'</strong><span class="aih-task-note" title="'+esc(aihTaskNote(t))+'">'+esc(aihTaskNote(t))+'</span></div>'+
 '<div class="aih-task-flow"><ol class="aih-task-pipeline" aria-label="AI 处理进度">'+AI_HOME_PHASES.map((label,i)=>'<li data-phase="'+i+'"><span></span><b>'+label+'</b>'+(i<3?'<i class="aih-task-connector" aria-hidden="true"><i></i></i>':'')+'</li>').join('')+'</ol><div class="aih-task-progress" role="progressbar" aria-label="任务 '+t.id+' 的进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+aihProgress(t)+'"></div></div></article>';
}
function aihStatsHTML(){const s=aihStats();return [['今日已处理',s.processed,'条'],['自主完成',s.auto,'条'],['风险拦截',s.intercepted,'条'],['人工分流',s.manual,'条'],['自动处理率',s.processed?(s.auto/s.processed*100).toFixed(1):'—',s.processed?'%':'']].map(([label,n,unit],i)=>'<div class="aih-result '+(i===1?'auto':i===2?'risk':'')+'"><small>'+label+'</small><strong data-aih-stat="'+i+'">'+n+'<span>'+unit+'</span></strong></div>').join('')}
function aihPendingRisks(){return homeFocusQueue('risks')}
function aihPendingReplies(){return homeFocusQueue('reviews')}
function aihRisksHTML(){const rows=aihPendingRisks().slice(0,5);return rows.length?rows.map(r=>riskListItem(r).replace('data-select-risk=','data-aih-risk=').replace('risk-list-item active','risk-list-item')).join(''):'<div class="aih-clear">'+icon('shield-check')+'<strong>暂无待处理风险</strong></div>'}
function aihRepliesHTML(){const rows=aihPendingReplies().slice(0,5);return rows.length?rows.map(r=>reviewListItem(r).replace('data-select-review=','data-aih-review=').replace('review-item active','review-item')).join(''):'<div class="aih-clear">'+icon('message-square-reply')+'<strong>暂无待回复差评</strong></div>'}
function aihTodoTabsHTML(){return [['risks','风险待处理',aihPendingRisks().length],['reviews','差评待回复',aihPendingReplies().length]].map(([key,label,count])=>'<button id="aihTodoTab-'+key+'" role="tab" data-aih-todo-tab="'+key+'" aria-selected="'+(aiHomeState.todoTab===key)+'" aria-controls="aihTodoList" tabindex="'+(aiHomeState.todoTab===key?'0':'-1')+'" class="'+(aiHomeState.todoTab===key?'active':'')+'">'+label+'<span id="'+(key==='risks'?'aihRiskCount':'aihReplyCount')+'">'+count+'</span></button>').join('')}
function renderAIHome(){aihInit();return '<div class="ai-home">'+titleBlock('工作台','<button class="btn-outline" data-go="home">'+icon('layout-dashboard')+'数据概览</button>')+
 '<section class="card aih-operations" aria-label="今日 AI 处理成果"><div class="aih-results">'+aihStatsHTML()+'</div></section><div class="aih-layout">'+
 '<section class="card aih-pool" aria-labelledby="aihPoolTitle"><div class="aih-section-heading"><div><h2 id="aihPoolTitle">AI 实时任务池</h2><p id="aihPoolCount"></p></div></div>'+opsRadarHTML()+'<div class="aih-task-list" id="aihTaskList" role="region" aria-label="AI 任务列表" tabindex="0">'+aiHomeState.tasks.slice().reverse().map(aihTaskHTML).join('')+'</div></section>'+
 '<section class="card aih-todo-panel" aria-labelledby="aihTodoTitle"><div class="aih-module-head"><h2 id="aihTodoTitle">'+icon('phone-call')+'重点待办</h2><button class="link-btn" data-aih-all-todos>查看全部风险 '+icon('chevron-right')+'</button></div><div class="home-focus-tabs" role="tablist" aria-label="工作台待办类型">'+aihTodoTabsHTML()+'</div><div id="aihTodoList" class="aih-todo-list" role="tabpanel" aria-labelledby="aihTodoTab-'+aiHomeState.todoTab+'">'+(aiHomeState.todoTab==='risks'?aihRisksHTML():aihRepliesHTML())+'</div></section></div></div>'}
function aihUpdateBlock(selector,html,force=false){const el=$(selector);if(!el||(!force&&el.contains(document.activeElement))||el.dataset.html===html)return false;el.innerHTML=html;el.dataset.html=html;return true}
function aiHomeUpdateScene(force=false){
 if(app.view!=='ai-home'||!$('#aihTaskList'))return;
 const ids=new Set(aiHomeState.tasks.map(t=>t.id));$$('#aihTaskList [data-aih-task]').forEach(el=>{if(!ids.has(el.dataset.aihTask))el.remove()});let changed=false;
 aiHomeState.tasks.forEach(t=>{
  let el=$('[data-aih-task="'+t.id+'"]');if(!el){$('#aihTaskList').insertAdjacentHTML('afterbegin',aihTaskHTML(t));el=$('[data-aih-task="'+t.id+'"]');changed=true}
  el.classList.toggle('is-blocked',t.status==='blocked');el.classList.toggle('is-complete',t.status==='complete');el.querySelector('.aih-task-elapsed').textContent=aihSeconds(t.elapsed);el.querySelector('.aih-task-current').textContent=aihStageText(t);
  const note=el.querySelector('.aih-task-note');note.textContent=aihTaskNote(t);note.title=note.textContent;el.querySelector('.aih-task-current').dataset.tone=aihTone(t);
  const bar=el.querySelector('.aih-task-progress');bar.setAttribute('aria-valuenow',aihProgress(t));bar.setAttribute('aria-valuetext',aihStageText(t));
  el.querySelectorAll('[data-phase]').forEach(node=>{const p=Number(node.dataset.phase),mode=t.status==='complete'||p<t.phase?'done':p===t.phase?'active':'';node.className=mode;const connector=node.querySelector('.aih-task-connector');if(connector)connector.firstElementChild.style.width=(t.status==='complete'||p<t.phase?100:p===t.phase?Math.min(100,t.stageElapsed/t.durations[p]*100):0)+'%';const key=mode==='done'?'check':t.status==='blocked'&&p===3?'pause':mode==='active'?'loader-circle':'circle';if(node.dataset.icon!==key){node.firstElementChild.innerHTML=icon(key);node.dataset.icon=key;changed=true}});
 });
 $('#aihPoolCount').textContent=aiHomeState.tasks.filter(t=>t.status!=='complete').length+' 条处理中';
 const s=aihStats();[s.processed,s.auto,s.intercepted,s.manual,s.processed?(s.auto/s.processed*100).toFixed(1):'—'].forEach((value,i)=>{$('[data-aih-stat="'+i+'"]').firstChild.textContent=value});
 $('[data-aih-stat="4"] span').textContent=s.processed?'%':'';
 $('#aihRiskCount').textContent=aihPendingRisks().length;$('#aihReplyCount').textContent=aihPendingReplies().length;
 $$('[data-aih-todo-tab]').forEach(button=>{const active=button.dataset.aihTodoTab===aiHomeState.todoTab;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1});
 $('#aihTodoList').setAttribute('aria-labelledby','aihTodoTab-'+aiHomeState.todoTab);
 const all=$('[data-aih-all-todos]'),label=aiHomeState.todoTab==='risks'?'查看全部风险':'查看全部差评';if(all.dataset.label!==label){all.innerHTML=label+' '+icon('chevron-right');all.dataset.label=label;changed=true}
 changed=aihUpdateBlock('#aihTodoList',aiHomeState.todoTab==='risks'?aihRisksHTML():aihRepliesHTML(),force)||changed;
 opsUpdateRadar();if(changed)refreshIcons();aihSizeTaskList();
}
function aiHomeStartReplay(){stopAIHomeReplay();if(app.view!=='ai-home')return;aiHomeReplayTimer=setInterval(()=>{if(!document.hidden)aiHomeUpdateScene()},700)}
function aihSizeTaskList(){
 const list=$('#aihTaskList');if(!list)return;
 const root=$('.ai-home'),style=getComputedStyle(list),rows=[...list.children].slice(0,5),gap=parseFloat(style.rowGap)||0;
 const contentHeight=rows.reduce((sum,row)=>sum+row.offsetHeight,0)+Math.max(0,rows.length-1)*gap+(parseFloat(style.paddingTop)||0)+(parseFloat(style.paddingBottom)||0);
 if(window.innerWidth<=1000){root.style.removeProperty('--aih-panel-height');const limit=Math.min(contentHeight,Math.round(window.innerHeight*.55));if(limit)list.style.maxHeight=limit+'px';return}
 list.style.removeProperty('max-height');
 const top=$('.aih-layout').getBoundingClientRect().top+window.scrollY,fixedHeight=$('.aih-pool .aih-section-heading').offsetHeight+$('#opsRadarPanel').offsetHeight+2;
 const firstRowHeight=(rows[0]?.offsetHeight||0)+(parseFloat(style.paddingTop)||0)+(parseFloat(style.paddingBottom)||0);
 const available=Math.max(fixedHeight+firstRowHeight,window.innerHeight-top-24);
 const height=Math.round(Math.min(contentHeight+fixedHeight,available));
 if(height&&root.style.getPropertyValue('--aih-panel-height')!==height+'px')root.style.setProperty('--aih-panel-height',height+'px');
}
function aihSwitchTodo(tab,focus=false){if(!['risks','reviews'].includes(tab))return;aiHomeState.todoTab=tab;const list=$('#aihTodoList');list.innerHTML='';delete list.dataset.html;list.scrollTop=0;aiHomeUpdateScene(true);if(focus)$('#aihTodoTab-'+tab).focus({preventScroll:true})}
function bindAIHome(){
 $$('[data-aih-todo-tab]').forEach(button=>button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();aihSwitchTodo(event.key==='Home'?'risks':event.key==='End'?'reviews':aiHomeState.todoTab==='risks'?'reviews':'risks',true)}));
 const list=$('#aihTaskList');list.addEventListener('keydown',event=>{if(event.target!==list)return;const steps={ArrowDown:40,ArrowUp:-40,PageDown:list.clientHeight,PageUp:-list.clientHeight};if(event.key==='End'||event.key==='Home'||event.key in steps){event.preventDefault();list.scrollTop=event.key==='End'?list.scrollHeight:event.key==='Home'?0:list.scrollTop+steps[event.key]}});
 $('.ai-home').addEventListener('click',event=>{const b=event.target.closest('button');if(!b||b.disabled)return;if(b.dataset.aihRisk){opsOpenRisk(b.dataset.aihRisk);return}if(b.dataset.aihReview){opsOpenReview(b.dataset.aihReview);return}if(b.dataset.aihTodoTab){aihSwitchTodo(b.dataset.aihTodoTab);return}if(b.hasAttribute('data-aih-all-todos'))openHomeFocusList(aiHomeState.todoTab)});
 aiHomeUpdateScene();aiHomeStartReplay();
}
window.addEventListener('resize',()=>{if(document.getElementById('aihTaskList'))requestAnimationFrame(aihSizeTaskList)});
