/* 会议优化：AI 评价处理、风险分类、当前页处置、分析与报告。 */
const opsState={riskKind:'all',reviewTab:'all',reviewJobs:new Map(),reviewClock:0,reviewNeedsRender:false,inlineReview:null,reportDraft:{from:'',to:''},reportFilter:{from:'',to:''}};
function opsResetReportFilters(){opsState.reportDraft={from:'',to:''};opsState.reportFilter={from:'',to:''}}
function opsFilteredReports(rows){const f=opsState.reportFilter;return rows.filter(r=>(!f.from||r.endDate>=f.from)&&(!f.to||r.startDate<=f.to))}
function opsReportFiltersHTML(){const d=opsState.reportDraft;return '<section class="card ops-report-filter" aria-label="报告时间筛选"><div class="ops-date-fields"><label>开始日期<input type="date" id="opsReportFrom" aria-label="报告开始日期" max="'+dateISO(dateAgo(1))+'" value="'+esc(d.from)+'"></label><span>至</span><label>结束日期<input type="date" id="opsReportTo" aria-label="报告结束日期" max="'+dateISO(dateAgo(1))+'" value="'+esc(d.to)+'"></label></div><div class="ops-filter-actions"><button class="btn-outline" id="opsReportReset">重置</button><button class="btn" id="opsReportApply">筛选</button></div></section>'}
function opsRadarHTML(){
 return '<section class="ops-collaboration" id="opsRadarPanel" aria-label="AI 多平台协同"><div class="ops-collab-head"><strong>'+icon('brain-circuit')+'AI 多平台协同</strong><span id="opsRadarParallel"></span></div><div class="ops-collab-body"><div class="ops-scan-wrap"><div class="ops-scan-dial" id="opsRadarDial" aria-hidden="true"><div class="ops-orbit outer"></div><div class="ops-orbit inner"></div><div class="ops-scan-beam"></div><div class="ops-core-pulse"></div><div class="ops-ai-core">'+icon('brain-circuit')+'<strong>知言 AI</strong><small id="opsRadarStage">理解评价</small></div>'+app.platforms.map((p,i)=>'<div class="ops-orbit-node" data-ops-node="'+p.id+'" style="--angle:'+i*60+'deg;--counter-angle:'+(-i*60)+'deg;--packet-x:'+(-Math.sin(i*Math.PI/3)).toFixed(3)+';--packet-y:'+Math.cos(i*Math.PI/3).toFixed(3)+';--delay:'+(-i*.7)+'s"><img src="'+PLATFORM_LOGOS[p.id]+'" alt=""><i class="ops-data-packet"></i></div>').join('')+'</div><div class="ops-ai-stages"><span>理解 <b data-ops-phase="0">0</b></span><span>判断 <b data-ops-phase="1">0</b></span><span>执行 <b data-ops-phase="2">0</b></span></div></div><div class="ops-channels">'+app.platforms.map(p=>'<div class="ops-channel" data-ops-channel="'+p.id+'"><div class="ops-channel-top"><span><img src="'+PLATFORM_LOGOS[p.id]+'" alt="">'+esc(p.short)+'</span><strong data-ops-platform="'+p.id+'">0<small>处理中</small></strong></div><div class="ops-channel-stage"><i></i><span data-ops-channel-stage="'+p.id+'">监听新评价</span></div><div class="ops-channel-foot">今日处理 <b data-ops-platform-done="'+p.id+'">0</b><span class="ops-channel-track"><i></i></span></div></div>').join('')+'</div></div></section>';
}
function opsUpdateRadar(){
 if(!$('#opsRadarPanel'))return;
 const live=aiHomeState.tasks.filter(t=>t.status!=='complete'),active=live.filter(t=>t.status==='processing'),stats=aihStats(),stageNames=['理解评价','风险判断','决策分流','执行回复'];
 const lead=active[Math.floor(Date.now()/4500)%Math.max(1,active.length)];
 $('#opsRadarParallel').textContent=active.length?active.length+' 条并行处理':'持续监听新评价';
 $('#opsRadarStage').textContent=lead?stageNames[lead.phase]:'等待新评价';
 $('#opsRadarDial').classList.toggle('has-work',active.length>0);
 const phaseCounts=[active.filter(t=>t.phase===0).length,active.filter(t=>t.phase===1||t.phase===2).length,active.filter(t=>t.phase===3).length];
 phaseCounts.forEach((n,i)=>{$('[data-ops-phase="'+i+'"]').textContent=n});
 app.platforms.forEach(p=>{
  const tasks=live.filter(t=>t.review.platformId===p.id),processing=tasks.filter(t=>t.status==='processing'),blocked=tasks.length-processing.length,current=processing[0];
  const el=$('[data-ops-channel="'+p.id+'"]'),node=$('[data-ops-node="'+p.id+'"]');
  const state=processing.length?'processing':blocked?'blocked':'idle';
  el.dataset.state=state;node.dataset.state=state;
  $('[data-ops-platform="'+p.id+'"]').firstChild.textContent=tasks.length;
  $('[data-ops-platform-done="'+p.id+'"]').textContent=stats.rows.filter(x=>x.r.platformId===p.id).length;
  $('[data-ops-channel-stage="'+p.id+'"]').textContent=current?stageNames[current.phase]:blocked?'等待人工确认':'监听新评价';
  const fill=current?Math.max(8,aihProgress(current)):blocked?100:0;
  el.querySelector('.ops-channel-track i').style.width=fill+'%';
 });
}
function opsRiskKinds(r){return (r.riskStandardIds||[]).map(id=>RISK_STANDARDS.find(s=>s.id===id)?.name).filter(Boolean)}
function opsRiskTitle(r){return opsRiskKinds(r).join(' · ')||r.riskType||riskLabel(r.risk)}
function opsEvidence(r){
 const day=r.opsEvidence?.day||dateISO(dateAgo(r.daysAgo)),profiles={
  r001:{items:'招牌菜、时令蔬菜',events:[['顾客下单','10:40'],['门店接单','10:41'],['菜品出餐','11:00'],['完成履约','11:03']],finding:'异物来源待核查。',todo:'核对顾客原图、该批次出品和当班检查记录。'},
  r002:{items:'招牌红烧肉、清炒时蔬',events:[['顾客下单','09:40'],['门店接单','09:41'],['顾客催菜','10:00、10:12'],['首菜出餐','10:23']],finding:'下单至首菜43分钟，与评价“等了40多分钟”基本一致。',todo:'核对后厨工单及两次催菜回应，确认延误环节。'},
  r006:{items:'双人到店套餐',events:[['顾客取号','17:48'],['首次叫号','18:43'],['顾客入座','18:46'],['完成点单','18:53']],finding:'取号至入座58分钟，与“等位将近一小时”基本一致。',todo:'核对叫号记录及现场扩音设备，确认叫号异常。'},
  r008:{items:'招牌套餐、附加服务项目',events:[['顾客下单','18:40'],['菜品出餐','19:02'],['完成结算','19:50']],finding:'结算含附加收费项目，待核查告知记录。',todo:'对照消费当日菜单、点单告知和实际结算明细。'},
  r009:{items:'家庭聚餐套餐',events:[['顾客下单','12:00'],['菜品出餐','12:20'],['现场沟通','12:35']],finding:'现场责任待核查。',todo:'保留原始视频，核对当班人员及现场记录。'}
 },fixture=r.opsEvidence||profiles[r.id];
 return '<section class="detail-section ops-evidence"><div class="ops-section-line"><h3>订单与履约证据</h3><span class="pill amber">模拟数据</span></div><div class="ops-evidence-meta"><span>订单 '+esc(r.order||'未关联')+'</span><span>'+day+'</span></div>'+(fixture?'<div class="ops-order-facts"><div><small>菜品明细</small><strong>'+fixture.items+'</strong></div></div><ol class="ops-timeline">'+fixture.events.map(([label,time])=>'<li><i></i><div><strong>'+label+'</strong><time>'+time+'</time></div></li>').join('')+'</ol><div class="ops-evidence-finding"><strong>交叉核对</strong><p>'+fixture.finding+'</p><small>'+fixture.todo+'</small></div>':'<div class="ops-evidence-missing">订单未关联，待补充消费与沟通记录。</div>')+'<div class="ops-evidence-source"><span>评价原文：已提供</span><span>订单/履约：'+(fixture?'模拟样例':'待关联')+'</span><span>现场记录：待核查</span></div></section>';
}
function opsRiskActions(r){return '<div class="ops-risk-drawer-actions">'+(riskCaseStatus(r)==='closed'?'<button class="btn-outline" data-open-risk="'+r.id+'">处理记录</button>':'<button class="btn" data-open-risk="'+r.id+'">'+(riskCaseStatus(r)==='pending'?'开始处理':'继续处理')+'</button>')+'<button class="btn-outline" data-ops-reply="'+r.id+'">'+(isReplyPending(r)?'处理回复':'查看回复')+'</button>'+(canRemoveRisk(r)?'<button class="link-btn danger" data-remove-risk="'+r.id+'">移出风险</button>':'')+'</div>'}
function opsBindRiskDrawer(r){$$('[data-open-risk]',$('#drawerOverlay')).forEach(b=>b.onclick=()=>openRiskDetail(r.id));$$('[data-ops-reply]',$('#drawerOverlay')).forEach(b=>b.onclick=()=>opsOpenReview(r.id));$$('[data-remove-risk]',$('#drawerOverlay')).forEach(b=>b.onclick=()=>requestRemoveRisk(r.id))}
function opsReviewRouting(r){
 if(isReplied(r))return {key:'done',label:isAutoReplied(r)?'AI 已自动回复':'人工确认回复',reason:r.reply||'回复已完成。'};
 if(r.risk!=='normal')return {key:'human',label:'需要你确认',reason:'已拦截自动回复 · '+opsRiskTitle(r),action:'核查后回复'};
 if(r.opsAutoError)return {key:'human',label:'需要你确认',reason:'AI 处理未完成：'+r.opsAutoError,action:'检查后回复'};
 const sentiment=reviewSentiment(r).key;
 if(!['good','bad'].includes(sentiment)||(r.rating>=4&&sentiment==='bad')||(r.rating<=3&&sentiment==='good'))
  return {key:'human',label:'需要你确认',reason:'语义或评分存在歧义，待确认',action:'确认回复'};
 const connection=app.connections[r.storeId]?.find(c=>c.platformId===r.platformId);
 if(connection?.status!=='connected'||!platformBy(r.platformId)?.reply)
  return {key:'human',label:'连接待恢复',reason:'平台连接异常，回复未发布',action:null};
 if(app.reviewDraftEdits?.[r.id]!==undefined)
  return {key:'human',label:'需要你确认',reason:'回复草稿已修改，待确认发布',action:'确认回复'};
 const policy=sentiment==='good'?app.settings.replyModePositive:app.settings.replyModeNegative;
 if(policy!=='auto')return {key:'human',label:'需要你确认',reason:'草稿已生成，待确认发布',action:'确认回复'};
 return {key:'processing',label:'等待 AI 处理',reason:(sentiment==='good'?'正向评价':'普通差评')+' · 可自动回复'};
}
function opsReviewDecision(r){
 const task=opsState.reviewJobs.get(r.id);
 if(task?.status==='processing'&&!isReplied(r))return {key:'processing',label:['正在理解评价…','正在判断风险…','正在确定回复方式…','正在生成并执行…'][task.phase],reason:task.phase<2?'核对评价与风险':aihTaskNote(task)};
 if(r.opsQueued&&!r.opsAIOutcome&&!isReplied(r))return {key:'processing',label:'等待 AI 处理',reason:'等待分配任务'};
 return opsReviewRouting(r);
}
function opsReviewTick(){
 aihEngineTick(1500);
 const editing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName),overlay=$('#drawerOverlay').classList.contains('open')||$('#modalOverlay').classList.contains('open')||$('#aiOverlay').classList.contains('open');
 if(opsState.reviewNeedsRender&&['reviews','home','risks','notifications'].includes(app.view)&&!overlay&&!editing){opsState.reviewNeedsRender=false;render()}
}
function opsOpenRisk(id){const r=reviewBy(id);if(!isActiveRisk(r)){if(r)opsOpenReview(id);else toast('该风险已不可查看');return}opsState.inlineReview=null;openDrawer('风险详情 · '+storeBy(r.storeId).name,'<div class="ops-section-line"><span class="pill '+(r.risk==='high'?'red':'amber')+'">'+riskLabel(r.risk)+'</span><span class="pill">'+riskCaseStatusLabel(riskCaseStatus(r))+'</span></div><h2 class="ops-event-title">'+esc(opsRiskTitle(r))+'</h2><p class="muted">'+riskEventId(r)+' · '+esc(platformBy(r.platformId).short)+' · '+riskTimeLabel(r)+'</p><div class="detail-text">'+esc(r.text)+'</div>'+reviewDetailMedia(r)+renderRiskIssueTags(r)+renderRiskAssessment(r)+opsEvidence(r)+(r.notes?'<section class="detail-section"><h3>处理记录</h3>'+renderRiskRecords(r)+'</section>':''),opsRiskActions(r));opsBindRiskDrawer(r)}
function opsInlineReviewHTML(r){opsState.drawingInline=true;try{
 const t=document.createElement('template');t.innerHTML=renderReviewDetail(r);
 const decision=opsReviewDecision(r);
 t.content.querySelector('.detail-panel')?.insertAdjacentHTML('afterbegin','<section class="ops-review-decision '+decision.key+'"><strong>'+esc(decision.label)+'</strong><p>'+esc(decision.reason)+'</p></section>');
 return t.innerHTML;
}finally{opsState.drawingInline=false}}
function opsBindInlineReview(r){
 const body=$('#drawerBody'),editor=$('#replyEditor',body);if(editor)editor.oninput=e=>setReviewDraftEdit(r,e.target.value);
 $$('[data-save-draft]',body).forEach(b=>b.onclick=()=>{const text=editor?.value.trim();if(!isReplyPending(r)||!text){toast('请填写有效草稿');return}saveReviewDraft(r,text);toast('草稿已保存');});
 $$('[data-confirm-reply]',body).forEach(b=>b.onclick=()=>confirmReply(r.id));
 $$('[data-regen]',body).forEach(b=>b.onclick=()=>previewDraftChange(r.id));
 $$('[data-restore-draft]',body).forEach(b=>b.onclick=()=>previewDraftChange(r.id,true));
 $$('[data-review-risk]',body).forEach(b=>b.onclick=()=>opsOpenRisk(r.id));
 $$('[data-edit-review-categories]',body).forEach(b=>b.onclick=()=>openReviewCategoryEditor(r.id));
 $$('[data-appeal]',body).forEach(b=>b.onclick=()=>openAppealRecord(r.id));
}
function opsOpenReview(id){const r=reviewBy(id);if(!r){toast('评价不可查看');return}if(opsReviewDecision(r).key!=='human'||!opsReviewDecision(r).action){opsOpenReviewView(id);return}opsState.reviewMode='edit';app.selectedReview=id;opsState.inlineReview=id;openDrawer('评价回复 · '+storeBy(r.storeId).name,opsInlineReviewHTML(r));$('.drawer').classList.add('ops-review-drawer');opsBindInlineReview(r)}
function opsReadOnlyReviewHTML(r){
 const t=document.createElement('template');t.innerHTML=opsInlineReviewHTML(r);
 const section=t.content.querySelector('#replyEditor')?.closest('.detail-section');
 if(section)section.innerHTML='<h3>AI回复草稿</h3><div class="detail-text">'+esc(reviewDraftText(r)||'暂无草稿')+'</div>';
 t.content.querySelectorAll('[data-edit-review-categories],[data-appeal]').forEach(b=>b.remove());
 return t.innerHTML;
}
function opsOpenReviewView(id){
 const r=reviewBy(id);if(!r){toast('评价不可查看');return}
 app.selectedReview=id;opsState.inlineReview=id;opsState.reviewMode='view';
 const decision=opsReviewDecision(r);
 openDrawer('评价详情 · '+storeBy(r.storeId).name,opsReadOnlyReviewHTML(r),'<button class="btn-outline" data-close-drawer>关闭</button>'+(decision.key==='human'&&decision.action?'<button class="btn" id="opsEnterReviewEdit">'+esc(decision.action)+'</button>':''));
 $('.drawer').classList.add('ops-review-drawer');opsBindInlineReview(r);
 const edit=$('#opsEnterReviewEdit');if(edit)edit.onclick=()=>opsOpenReview(r.id);
}
function opsReviewCardsHTML(original){
 const template=document.createElement('template');template.innerHTML=original;
 const head=template.content.querySelector('.page-head'),filters=template.content.querySelector('.review-filter-panel');
 const all=filteredReviews(),counts={all:all.length,processing:0,human:0,done:0};
 all.forEach(r=>counts[opsReviewDecision(r).key]++);
 const list=opsState.reviewTab==='all'?all:all.filter(r=>opsReviewDecision(r).key===opsState.reviewTab);
 const pageSize=app.reviewPageSize,pages=Math.max(1,Math.ceil(list.length/pageSize));
 app.reviewPage=Math.max(1,Math.min(app.reviewPage,pages));
 const start=(app.reviewPage-1)*pageSize,rows=list.slice(start,start+pageSize);
 const tabs='<div class="ops-review-toolbar"><div class="ops-review-tabs" role="tablist" aria-label="AI处理状态">'+
  [['all','全部评价'],['processing','AI处理中'],['human','需人工处理'],['done','已完成']].map(([key,label])=>'<button role="tab" data-ops-review-tab="'+key+'" aria-selected="'+(opsState.reviewTab===key)+'" class="'+(opsState.reviewTab===key?'active':'')+'">'+label+' <span>'+counts[key]+'</span></button>').join('')+
  '</div></div>';
 if(filters)filters.classList.add('ops-review-filter','expanded');
 const cards=rows.map(r=>{
  const decision=opsReviewDecision(r),tags=reviewIssueTagNames(r),media=reviewMedia(r).length;
  const action=decision.key==='human'&&decision.action?'<button class="btn-outline" data-ops-review-edit="'+r.id+'">'+esc(decision.action)+'</button>':'';
  return '<article class="card ops-review-event"><button class="ops-review-card-open" data-ops-review-view="'+r.id+'" aria-label="查看评价 '+r.id.toUpperCase()+' · '+esc(storeBy(r.storeId)?.name||'')+'"><span class="ops-review-event-top"><span class="ops-review-event-origin"><img src="'+PLATFORM_LOGOS[r.platformId]+'" alt=""><strong>'+esc(storeBy(r.storeId)?.name||'未知门店')+'</strong><small>'+esc(platformBy(r.platformId)?.short||'')+'</small></span><span class="pill '+(decision.key==='human'?'amber':decision.key==='done'?'green':'blue')+'">'+esc(decision.label)+'</span></span><span class="ops-review-event-meta">'+starRating(r.rating,true,'compact')+'<span>'+esc(r.nickname||'顾客')+'</span>'+(isActiveRisk(r)?'<span class="pill '+(r.risk==='high'?'red':'amber')+'">'+riskLabel(r.risk)+'</span>':'')+'</span><span class="ops-review-event-text">'+esc(r.text||'顾客未填写文字评价')+'</span><span class="ops-review-event-tags">'+tags.slice(0,3).map(tag=>'<span class="tag">'+esc(tag)+'</span>').join('')+(media?'<span class="ops-review-media-hint">'+icon('image')+media+'张图片</span>':'')+'</span><span class="ops-review-outcome '+decision.key+'"><strong>'+esc(decision.key==='processing'?'AI 决策':decision.key==='done'?'回复内容':'需要你处理')+'</strong><span>'+esc(decision.reason)+'</span></span></button><div class="ops-review-event-footer"><div><time>'+esc(timeLabel(r))+'</time><small>'+r.id.toUpperCase()+'</small></div>'+action+'</div></article>';
 }).join('');
 const pagination='<div class="pagination"><span>第 '+(list.length?start+1:0)+'—'+Math.min(start+pageSize,list.length)+' 条，共 '+list.length+' 条</span><div class="pagination-actions"><button data-review-page="'+(app.reviewPage-1)+'" '+(app.reviewPage===1?'disabled':'')+' aria-label="上一页">‹</button><span>'+app.reviewPage+' / '+pages+'</span><button data-review-page="'+(app.reviewPage+1)+'" '+(app.reviewPage===pages?'disabled':'')+' aria-label="下一页">›</button></div></div>';
 return (head?.outerHTML||'')+tabs+(filters?.outerHTML||'')+'<section class="ops-review-events" aria-label="评价事件卡片">'+(cards||'<div class="card ops-review-empty">'+empty('没有匹配评价','请切换处理状态或调整筛选条件。')+'</div>')+'</section>'+pagination;
}
function opsRiskFiltersHTML(list){
 const activeFilters=(app.store!=='all'?1:0)+(app.riskPlatform!=='all'?1:0)+(app.riskTab!=='all'?1:0)+(app.riskSeverity!=='all'?1:0)+(app.riskQuery?1:0)+(app.riskDateFrom||app.riskDateTo?1:0)+(opsState.riskKind!=='all'?1:0);
  const f=listFilterDraft('risks'),field=(label,id,content)=>'<div class="review-filter-field"><label for="'+id+'">'+label+'</label>'+content+'</div>';
  const filters='<section class="review-filter-panel expanded ops-risk-filter" aria-label="风险筛选"><div class="review-filter-grid risk-filter-grid">'+
    field('搜索风险','riskSearch','<input id="riskSearch" type="search" placeholder="编号、评价内容" value="'+esc(f.q)+'">')+
    field('门店','riskStore','<select id="riskStore"><option value="all">全部门店</option>'+app.stores.map(s=>'<option value="'+s.id+'" '+(f.store===s.id?'selected':'')+'>'+esc(s.name)+'</option>').join('')+'</select>')+
    field('平台','riskPlatform','<select id="riskPlatform"><option value="all">全部平台</option>'+app.platforms.map(p=>'<option value="'+p.id+'" '+(f.platform===p.id?'selected':'')+'>'+esc(p.short)+'</option>').join('')+'</select>')+
    field('处理状态','riskStatus','<select id="riskStatus"><option value="all" '+(f.status==='all'?'selected':'')+'>全部状态</option>'+[['open','未办结'],['pending','待处理'],['handling','处理中'],['closed','已办结']].map(a=>'<option value="'+a[0]+'" '+(f.status===a[0]?'selected':'')+'>'+a[1]+'</option>').join('')+'</select>')+
    field('风险等级','riskSeverity','<select id="riskSeverity"><option value="all">全部等级</option><option value="high" '+(f.severity==='high'?'selected':'')+'>高风险</option><option value="attention" '+(f.severity==='attention'?'selected':'')+'>一般风险</option></select>')+
    '<div class="review-filter-field"><label for="riskDateRange">识别时间</label>'+dateRangeTrigger('risk',{from:f.dateFrom,to:f.dateTo})+'</div>'+
    '</div><div class="review-filter-footer"><span>共 <strong>'+list.length+'</strong> 条风险'+(activeFilters?' · 已启用 '+activeFilters+' 个筛选条件':'')+'</span>'+filterActions('Risk',activeFilters||filterHasValues(f))+'</div></section>';
 return filters;
}
function opsRiskCardsHTML(){
 const base=app.reviews.filter(isActiveRisk);
 const list=riskReviews().filter(r=>opsState.riskKind==='all'||opsRiskKinds(r).includes(opsState.riskKind));
 const size=6,pages=Math.max(1,Math.ceil(list.length/size));
 app.riskPage=Math.max(1,Math.min(app.riskPage,pages));
 const kinds=[...new Set(base.flatMap(opsRiskKinds))];
 const tabs='<div class="ops-risk-type-tabs" role="tablist" aria-label="风险类型">'+
  '<button role="tab" data-ops-risk-kind="all" aria-selected="'+(opsState.riskKind==='all')+'" class="'+(opsState.riskKind==='all'?'active':'')+'">全部风险</button>'+
  kinds.map(k=>'<button role="tab" data-ops-risk-kind="'+esc(k)+'" aria-selected="'+(opsState.riskKind===k)+'" class="'+(opsState.riskKind===k?'active':'')+'">'+esc(k)+'</button>').join('')+'</div>';
 const cards=list.slice((app.riskPage-1)*size,app.riskPage*size).map(r=>
  '<article class="card ops-risk-card '+(r.risk==='high'?'high':'')+'"><div class="ops-section-line"><span class="pill '+(r.risk==='high'?'red':'amber')+'">'+riskLabel(r.risk)+'</span><span class="muted">'+riskCaseStatusLabel(riskCaseStatus(r))+'</span></div><h2>'+esc(opsRiskTitle(r))+'</h2><div class="ops-risk-origin"><img src="'+PLATFORM_LOGOS[r.platformId]+'" alt=""><span>'+esc(storeBy(r.storeId).name)+' · '+esc(platformBy(r.platformId).short)+'</span></div><p class="ops-risk-quote">'+esc(r.text)+'</p><div class="ops-risk-card-foot"><small>'+riskTimeLabel(r)+'</small><button class="btn-outline" data-ops-risk="'+r.id+'">查看详情 '+icon('arrow-up-right')+'</button></div></article>'
 ).join('');
 return titleBlock('风险中心')+'<section class="card ops-risk-hub">'+tabs+'</section>'+opsRiskFiltersHTML(list)+
  '<div class="ops-risk-cards">'+(cards||empty('暂无匹配风险','请调整筛选条件或重置筛选。'))+'</div>'+
  '<div class="pagination"><span>共 '+list.length+' 条 · 每页6条</span><div class="pagination-actions"><button data-ops-risk-page="'+(app.riskPage-1)+'" '+(app.riskPage===1?'disabled':'')+'>上一页</button><span>'+app.riskPage+' / '+pages+'</span><button data-ops-risk-page="'+(app.riskPage+1)+'" '+(app.riskPage===pages?'disabled':'')+'>下一页</button></div></div>';
}
function opsAnalysisData(){
 const source=analysisScopeReviews(),prev=app.reviews.filter(r=>r.daysAgo>=app.range&&r.daysAgo<app.range*2),bad=source.filter(r=>r.rating<=3),prevBad=prev.filter(r=>r.rating<=3),replied=bad.filter(isReplied).length;
 const issues=ISSUE_TAXONOMY.map(c=>({...c,n:bad.filter(r=>reviewIssueCategories(r).includes(c.id)).length,prev:prevBad.filter(r=>reviewIssueCategories(r).includes(c.id)).length})).filter(x=>x.n||x.prev).sort((a,b)=>b.n-a.n);
 const deltaPP=source.length&&prev.length?Math.round((bad.length/source.length-prevBad.length/prev.length)*100):null;
 const matrix=app.stores.map(store=>{const rows=source.filter(r=>r.storeId===store.id),low=rows.filter(r=>r.rating<=3),before=prev.filter(r=>r.storeId===store.id),beforeLow=before.filter(r=>r.rating<=3);return {store,total:rows.length,bad:low.length,pp:rows.length&&before.length?Math.round((low.length/rows.length-beforeLow.length/before.length)*100):null}}).filter(x=>x.total).sort((a,b)=>b.bad-a.bad);
 return {source,prev,bad,prevBad,replied,issues,deltaPP,matrix};
}
function opsAnalysisInsightsHTML(d){
 const {source,bad,issues,matrix}=d;
 if(!source.length)return '<section class="card ops-ai-findings">'+empty('暂无可分析评价','调整统计周期后查看。')+'</section>';
 const cards=[],risk=source.filter(r=>r.risk==='high'&&riskCaseStatus(r)!=='closed'),rising=[...issues].filter(x=>x.n>x.prev&&x.n>=2).sort((a,b)=>(b.n-b.prev)-(a.n-a.prev))[0];
 const card=(tone,title,evidence,action,button)=>'<article class="ops-ai-finding '+tone+'"><strong>'+esc(title)+'</strong>'+(evidence?'<p>'+esc(evidence)+'</p>':'')+(action?'<div class="ops-ai-advice">'+esc(action)+'</div>':'')+button+'</article>';
 if(risk.length){cards.push(card('risk',risk.length+' 条高风险需优先核查',new Set(risk.map(r=>r.storeId)).size+' 家门店 · '+[...new Set(risk.flatMap(opsRiskKinds))].slice(0,2).join('、'),'核查原图、订单和现场记录。','<button class="link-btn" data-ops-analysis-risk="'+risk[0].id+'">核查风险 '+icon('arrow-up-right')+'</button>'))}
 if(rising){const rows=bad.filter(r=>reviewIssueCategories(r).includes(rising.id));cards.push(card('issue',rising.name+'反馈增加',rising.n+' 条差评提及，上期 '+rising.prev+' 条；涉及 '+new Set(rows.map(r=>r.storeId)).size+' 家门店。',issueAction(rising)+'。','<button class="link-btn" data-ops-issue="'+rising.id+'">查看相关差评 '+icon('arrow-up-right')+'</button>'))}
 const top=matrix[0];
 if(top?.bad){const rows=bad.filter(r=>r.storeId===top.store.id),counts=ISSUE_TAXONOMY.map(c=>({c,n:rows.filter(r=>reviewIssueCategories(r).includes(c.id)).length})).sort((a,b)=>b.n-a.n),issue=counts[0];
 cards.push(card('store',top.store.name+'差评较集中',top.bad+' / '+top.total+' 条评价为差评'+(issue?.n?'，其中 '+issue.c.name+'提及 '+issue.n+' 条。':'。'),issue?.n?issueAction(issue.c)+'。':'核查诉求与回复进度。','<button class="link-btn" data-ops-analysis-store="'+top.store.id+'">定位门店评价 '+icon('arrow-up-right')+'</button>'))}
 const pending=bad.filter(isReplyPending);
 if(cards.length<3&&pending.length)cards.push(card('issue',pending.length+' 条差评尚未回复','','优先处理风险及待确认事项。','<button class="link-btn" data-ops-analysis-pending>查看待回复差评 '+icon('arrow-up-right')+'</button>'));
 if(!cards.length)cards.push(card('store','本期暂无集中差评',source.length+' 条评价，差评 '+bad.length+' 条。','',''));
 return '<section class="card ops-ai-findings"><div class="ops-findings-head"><h2>'+icon('sparkles')+'AI 经营研判</h2></div><div class="ops-findings-grid">'+cards.slice(0,3).join('')+'</div></section>';
}
function opsAnalysisHTML(d=opsAnalysisData()){
 const {source,prev,bad,prevBad,replied,issues,deltaPP,matrix}=d;
 return '<section class="ops-analysis-extra"><div class="ops-analysis-kpis">'+[['差评率较上期',deltaPP===null?'—':(deltaPP>0?'+':'')+deltaPP+' 个百分点'],['本期差评已回复',replied+' / '+bad.length+' 条'],['本期差评未回复',(bad.length-replied)+' 条'],['本期高风险',source.filter(r=>r.risk==='high').length+' 条']].map(([label,v])=>'<div class="card"><small>'+label+'</small><strong>'+v+'</strong></div>').join('')+'</div><div class="ops-analysis-grid"><section class="card"><div class="card-head"><h2>问题变化</h2></div><div class="ops-analysis-issues">'+(issues.length?issues.map(x=>'<button data-ops-issue="'+x.id+'"><span>'+esc(x.name)+'</span><strong>'+x.n+' 条</strong><small>上期 '+x.prev+' 条</small><em class="'+(x.n>x.prev?'up':'')+'">'+(x.n-x.prev>0?'+':'')+(x.n-x.prev)+'</em></button>').join(''):empty('暂无问题','所选周期暂无已标注差评'))+'</div></section><section class="card"><div class="card-head"><h2>门店问题定位</h2></div><div class="ops-store-problems">'+(matrix.length?matrix.map(x=>'<div><div><strong>'+esc(x.store.name)+'</strong><small>'+x.total+' 条评价 · 差评率 '+rateText(x.bad,x.total)+'</small></div><strong>'+x.bad+'<small>条差评</small></strong><span>'+(x.pp===null?'上期无评价':(x.pp>0?'+':'')+x.pp+' 个百分点')+'</span></div>').join(''):empty('暂无评价','当前范围无数据'))+'</div></section></div></section>';
}
function opsOpenImage(reviewId,index){
 const r=reviewBy(reviewId),media=reviewMedia(r),i=Number(index);if(!r||!media[i])return;
 openModal('顾客原图 · '+(i+1)+' / '+media.length,'<div class="ops-media-preview"><img src="'+media[i]+'" alt="顾客上传图片'+(i+1)+'"></div><p class="muted">'+esc(aihStore(r)+' · '+aihPlatform(r)+' · '+timeLabel(r))+'</p>','<button class="btn-outline" data-close-modal>关闭</button>');
}
function initOpsUpgrade(){
 document.addEventListener('click',e=>{const b=e.target.closest('[data-ops-image]');if(b)opsOpenImage(b.dataset.opsImage,b.dataset.opsImageIndex)});
 const baseNavigate=navigate;navigate=(view,detail=false,...rest)=>{const reviewTarget=view==='reviews'&&detail?app.selectedReview:null;if(view==='reports'&&detail&&app.selectedReport&&!opsFilteredReports(reportRows()).some(r=>r.id===app.selectedReport))opsResetReportFilters();const result=baseNavigate(view,view==='reviews'?false:detail,...rest);if(reviewTarget)opsOpenReviewView(reviewTarget);return result};
 const baseResetReview=resetReviewFilters;resetReviewFilters=(...args)=>{opsState.reviewTab='all';baseResetReview(...args)};
 const baseDetail=renderReviewDetail;renderReviewDetail=r=>{const html=baseDetail(r);if(app.view!=='reviews'||opsState.drawingInline||!r||!isReplyPending(r))return html;const t=document.createElement('template');t.innerHTML=html;const section=t.content.querySelector('#replyEditor')?.closest('.detail-section');if(section)section.innerHTML='<div class="review-section-heading"><h3>AI回复草稿</h3><button class="btn-outline" data-ops-open-reply="'+r.id+'">处理回复</button></div><div class="detail-text">'+esc(reviewDraftText(r)||'暂无草稿')+'</div>';return t.innerHTML};
 const baseReviews=renderReviews;renderReviews=()=>{const selected=app.selectedReview;app.selectedReview=null;const html=baseReviews();app.selectedReview=selected;return opsReviewCardsHTML(html)};
 renderRisks=opsRiskCardsHTML;
 const baseAnalysis=renderAnalysisV1;renderAnalysisV1=()=>{const html=baseAnalysis();if(app.analysisSection!=='overview')return html;const d=opsAnalysisData(),t=document.createElement('template');t.innerHTML=html;t.content.querySelector('.analysis-top')?.insertAdjacentHTML('afterend',opsAnalysisInsightsHTML(d));return t.innerHTML+opsAnalysisHTML(d)};
 const baseSettings=renderSettings;renderSettings=()=>{const template=document.createElement('template');template.innerHTML=baseSettings();const menu=template.content.querySelector('.settings-menu');menu.classList.add('ops-settings-menu');const buttons=[...menu.children];menu.innerHTML='<div class="ops-settings-group">业务配置</div>';buttons.slice(0,3).forEach(b=>menu.appendChild(b));menu.insertAdjacentHTML('beforeend','<div class="ops-settings-group account">账号管理</div>');menu.appendChild(buttons[3]);return template.innerHTML};
 const baseRiskDetail=openRiskDetail;openRiskDetail=id=>{opsState.inlineReview=null;baseRiskDetail(id);if(app.view==='ai-home')render();const r=reviewBy(id);if(!isActiveRisk(r))return;$('#drawerBody').insertAdjacentHTML('beforeend',opsEvidence(r)+'<button class="btn-outline" data-ops-reply="'+id+'">'+(isReplyPending(r)?'处理回复':'查看回复')+'</button>');opsBindRiskDrawer(r)};
 const baseRender=render;render=()=>{baseRender();$('#content').classList.toggle('ops-card-view',['reviews','risks'].includes(app.view));const r=reviewBy(opsState.inlineReview);if(r&&$('#drawerOverlay').classList.contains('open')){$('#drawerBody').innerHTML=opsState.reviewMode==='view'?opsReadOnlyReviewHTML(r):opsInlineReviewHTML(r);opsBindInlineReview(r)}};
 openRiskView=id=>opsOpenRisk(id);
 const baseClose=closeDrawer;closeDrawer=()=>{const wasInline=Boolean(opsState.inlineReview);opsState.inlineReview=null;$('.drawer').classList.remove('ops-review-drawer');baseClose();if(wasInline)$('#drawerBody').innerHTML='';if(wasInline&&app.view==='reviews')render();if(!app.lastFocusedElement?.isConnected)($('[data-ops-review-view="'+app.selectedReview+'"]')||$('.side-nav .active'))?.focus()};
 const baseReset=resetRiskFilters;resetRiskFilters=(...args)=>{opsState.riskKind='all';baseReset(...args)};
 const baseBind=bindView;bindView=()=>{baseBind();
  $$('[data-ops-review-view]').forEach(b=>b.onclick=()=>opsOpenReviewView(b.dataset.opsReviewView));
  $$('[data-ops-review-edit]').forEach(b=>b.onclick=()=>opsOpenReview(b.dataset.opsReviewEdit));
  $$('[data-ops-open-reply]').forEach(b=>b.onclick=()=>opsOpenReview(b.dataset.opsOpenReply));
  $$('[data-ops-review-tab]').forEach(b=>b.onclick=()=>{opsState.reviewTab=b.dataset.opsReviewTab;app.reviewPage=1;app.selectedReview=null;render()});
  $$('[data-ops-risk]').forEach(b=>b.onclick=()=>opsOpenRisk(b.dataset.opsRisk));
  $$('[data-ops-risk-kind]').forEach(b=>b.onclick=()=>{opsState.riskKind=b.dataset.opsRiskKind;app.riskPage=1;render()});
  $$('.ops-review-tabs [role="tab"],.ops-risk-type-tabs [role="tab"]').forEach(b=>b.onkeydown=e=>{
   const tabs=[...b.parentElement.querySelectorAll('[role="tab"]')],index=tabs.indexOf(b);
   const next=e.key==='ArrowRight'?tabs[(index+1)%tabs.length]:e.key==='ArrowLeft'?tabs[(index-1+tabs.length)%tabs.length]:e.key==='Home'?tabs[0]:e.key==='End'?tabs.at(-1):null;
   if(next){e.preventDefault();next.click();next.focus()}
  });
  $$('[data-ops-risk-page]').forEach(b=>b.onclick=()=>{app.riskPage=Number(b.dataset.opsRiskPage);app.selectedRisk=null;render()});
  $$('[data-ops-analysis-risk]').forEach(b=>b.onclick=()=>opsOpenRisk(b.dataset.opsAnalysisRisk));
  $$('[data-ops-analysis-store]').forEach(b=>b.onclick=()=>{const days=app.range;resetReviewFilters();app.store=b.dataset.opsAnalysisStore;app.reviewFilters.sentiment='bad';app.reviewFilters.period=days;navigate('reviews')});
  $$('[data-ops-analysis-pending]').forEach(b=>b.onclick=()=>{const days=app.range;resetReviewFilters();app.reviewFilters.sentiment='bad';app.reviewFilters.status='pending';app.reviewFilters.period=days;navigate('reviews')});
  $$('[data-ops-issue]').forEach(b=>b.onclick=()=>{const days=app.range;resetReviewFilters();app.reviewFilters.sentiment='bad';app.reviewFilters.period=days;app.reviewFilters.issue=b.dataset.opsIssue;navigate('reviews')});
  if($('#opsReportFrom')){['From','To'].forEach(s=>$('#opsReport'+s).onchange=e=>{opsState.reportDraft[s.toLowerCase()]=e.target.value});$('#opsReportApply').onclick=()=>{const f={...opsState.reportDraft},today=dateISO(dateAgo(1));if((f.from&&f.to&&f.from>f.to)||(f.to&&f.to>today)||(f.from&&f.from>today)){toast('请选择有效的已结束日期范围');return}opsState.reportFilter=f;app.selectedReport=null;app.mobileDetail=null;render()};$('#opsReportReset').onclick=()=>{opsResetReportFilters();app.selectedReport=null;render()}};
  if($('[data-back-home]'))$('[data-back-home]').onclick=()=>navigate('ai-home');
 };
 if(!opsState.reviewTimer){opsReviewTick();opsState.reviewTimer=setInterval(opsReviewTick,1500)}
}
