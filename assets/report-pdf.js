/* 本地PDF导出：固定报告快照，A4分页，中文与图表随页面图像嵌入。 */
function opsPDFBytes(pages){
 const enc=new TextEncoder(),chunks=[],offsets=[0];let length=0;
 const put=data=>{const bytes=typeof data==='string'?enc.encode(data):data;chunks.push(bytes);length+=bytes.length};
 const obj=(id,data)=>{offsets[id]=length;put(id+' 0 obj\n');put(data);put('\nendobj\n')};
 put('%PDF-1.4\n% Report export\n');
 obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
 obj(2,'<< /Type /Pages /Count '+pages.length+' /Kids ['+pages.map((_,i)=>(5+i*3)+' 0 R').join(' ')+'] >>');
 pages.forEach((page,i)=>{const imageId=3+i*3,contentId=imageId+1,pageId=imageId+2;
  offsets[imageId]=length;put(imageId+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+page.width+' /Height '+page.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+page.bytes.length+' >>\nstream\n');put(page.bytes);put('\nendstream\nendobj\n');
  const command='q\n595.28 0 0 841.89 0 0 cm\n/ReportImage Do\nQ\n';
  obj(contentId,'<< /Length '+enc.encode(command).length+' >>\nstream\n'+command+'endstream');
  obj(pageId,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /ReportImage '+imageId+' 0 R >> >> /Contents '+contentId+' 0 R >>');
 });
 const xref=length,total=3+pages.length*3;put('xref\n0 '+total+'\n0000000000 65535 f \n');
 for(let i=1;i<total;i++)put(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
 put('trailer\n<< /Size '+total+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
 return new Blob(chunks,{type:'application/pdf'});
}
function opsBuildReportPDF(row){
 const W=800,H=1131,M=48,CW=W-M*2,BOTTOM=H-58,canvases=[];let c,ctx,y;
 const font=(size=13,weight=400)=>{ctx.font=weight+' '+size+'px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif';ctx.textBaseline='top'};
 function newPage(){c=document.createElement('canvas');c.width=W*2;c.height=H*2;ctx=c.getContext('2d');ctx.scale(2,2);ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.fillStyle='#7383a5';font(10);ctx.fillText('知言 · 口碑运营',M,23);ctx.fillStyle='#e2e9f5';ctx.fillRect(M,41,CW,1);y=60;canvases.push(c)}
 const ensure=h=>{if(y+h>BOTTOM)newPage()};
 function wrap(value,width,size=13,weight=400){font(size,weight);const result=[];for(const paragraph of String(value??'—').split('\n')){let line='';for(const char of paragraph){if(line&&ctx.measureText(line+char).width>width){result.push(line);line=char}else line+=char}result.push(line)}return result.length?result:['']}
 function text(value,size=13,weight=400,color='#192a4d'){const lines=wrap(value,CW,size,weight),lh=size*1.65;lines.forEach(line=>{ensure(lh);ctx.fillStyle=color;font(size,weight);ctx.fillText(line,M,y);y+=lh});y+=6}
 function heading(label){ensure(72);y+=12;ctx.fillStyle='#245fe8';ctx.fillRect(M,y,3,19);font(16,650);ctx.fillStyle='#192a4d';ctx.fillText(label,M+12,y);y+=36}
 function table(headers,rows,widths){
  const draw=(values,head=false)=>{const cells=values.map((v,i)=>wrap(v,widths[i]-16,head?11:12,head?600:400)),height=Math.max(...cells.map(a=>a.length))*18+18;if(y+height>BOTTOM){newPage();if(!head)draw(headers,true)}
   ctx.fillStyle=head?'#edf3ff':'#fff';ctx.fillRect(M,y,CW,height);let x=M;
   cells.forEach((lines,i)=>{ctx.fillStyle=head?'#48648f':'#263b5c';font(head?11:12,head?600:400);lines.forEach((line,n)=>ctx.fillText(line,x+8,y+9+n*18));x+=widths[i]});
   ctx.fillStyle='#e2e9f5';ctx.fillRect(M,y+height-1,CW,1);y+=height;
  };ensure(80);draw(headers,true);rows.forEach(r=>draw(r));y+=15;
 }
 newPage();text(row.name,24,700);text(row.range,12,400,'#7383a5');y+=5;
 const metrics=[['评价总量',row.total+'条'],['差评数量',row.bad+'条'],['差评率',rateText(row.bad,row.total)],['已回复差评',row.replied+'条'],['差评回复率',rateText(row.replied,row.bad)],['高风险已办结',row.highDone+' / '+row.highAll]];
 const cellW=CW/3;metrics.forEach(([label,value],i)=>{const x=M+i%3*cellW,yy=y+Math.floor(i/3)*76;ctx.fillStyle='#f5f8ff';ctx.fillRect(x,yy,cellW-8,66);font(11);ctx.fillStyle='#7383a5';ctx.fillText(label,x+12,yy+10);font(21,650);ctx.fillStyle='#192a4d';ctx.fillText(value,x+12,yy+30)});y+=162;
 heading('一、本期结论');const summary=reportSummary(row);text(summary.overview);text(summary.focus);
 heading('二、评价趋势与星级结构');ensure(250);
 const trend=reportTrendRows(row),gx=M+32,gy=y+8,gw=CW-42,gh=154,max=Math.max(1,...trend.map(r=>r.total)),upper=max<=4?4:Math.ceil(max/4)*4;
 ctx.strokeStyle='#e2e9f5';ctx.lineWidth=1;font(10);for(let i=0;i<=4;i++){const py=gy+gh-i*gh/4;ctx.beginPath();ctx.moveTo(gx,py);ctx.lineTo(gx+gw,py);ctx.stroke();ctx.fillStyle='#7383a5';ctx.fillText(String(upper*i/4),M,py-5)}
 for(const [key,color] of [['total','#2864e8'],['bad','#f43d51']]){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();trend.forEach((r,i)=>{const px=gx+i/Math.max(1,trend.length-1)*gw,py=gy+gh-r[key]/upper*gh;i?ctx.lineTo(px,py):ctx.moveTo(px,py)});ctx.stroke()}
 const step=Math.max(1,Math.ceil(trend.length/7));trend.forEach((r,i)=>{if(i%step&&i!==trend.length-1)return;font(9);ctx.fillStyle='#7383a5';const label=r.label,x=gx+i/Math.max(1,trend.length-1)*gw;ctx.fillText(label,Math.min(gx+gw-ctx.measureText(label).width,Math.max(gx,x-ctx.measureText(label).width/2)),gy+gh+10)});
 y=gy+gh+40;font(11);ctx.fillStyle='#2864e8';ctx.fillText('— 评价量',M,y);ctx.fillStyle='#f43d51';ctx.fillText('— 差评量',M+105,y);y+=32;
 table(['星级','评价数量','占比'],[5,4,3,2,1].map(star=>{const count=row.list.filter(r=>r.rating===star).length;return [star+'星',count,rateText(count,row.total)]}),[230,230,244]);
 heading('三、品牌平台汇总');
 table(['平台','评价量','差评','差评回复率'],row.platforms.map(p=>{const rs=row.list.filter(r=>r.platformId===p.id),low=rs.filter(r=>r.rating<=3);return [p.name,rs.length,low.length,rateText(row.platformStats[p.id].replied,low.length)]}),[254,150,150,150]);
 heading('四、门店运营表现');
 const stores=row.stores.filter(s=>row.list.some(r=>r.storeId===s.id)).sort((a,b)=>row.storeStats[b.id].low-row.storeStats[a.id].low);
 table(['门店','评价量','差评','差评回复率','高风险识别','高风险办结'],stores.map(s=>{const rs=row.list.filter(r=>r.storeId===s.id),st=row.storeStats[s.id];return [s.name,rs.length,st.low,rateText(st.replied,st.low),st.highAll,st.highDone]}),[174,82,82,122,122,122]);
 text('分平台明细',14,650);
 table(['门店','平台','评价量','差评','已回复差评'],stores.flatMap(s=>row.platforms.map(p=>{const rs=row.list.filter(r=>r.storeId===s.id&&r.platformId===p.id),low=rs.filter(r=>r.rating<=3);return [s.name,p.name,rs.length,low.length,low.filter(isReplied).length]})),[164,210,100,100,130]);
 heading('五、问题与风险');
 const issues=row.issueDefinitions.map(i=>[i.name,row.list.filter(r=>r.issueCategories.includes(i.id)).length]).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]);
 if(issues.length)table(['问题标签','提及评价数'],issues,[504,200]);else text('暂无已标注问题');
 table(['本期识别高风险','生成时已办结','生成时未办结'],[[row.highAll,row.highDone,row.highAll-row.highDone]],[234,235,235]);
 return canvases.map((canvas,index)=>{const footer=canvas.getContext('2d');footer.save();footer.setTransform(2,0,0,2,0,0);footer.font='10px -apple-system,"PingFang SC",sans-serif';footer.fillStyle='#7383a5';footer.textAlign='right';footer.fillText((index+1)+' / '+canvases.length,W-M,H-28);footer.restore();const encoded=canvas.toDataURL('image/jpeg',.92).split(',')[1],binary=atob(encoded),bytes=Uint8Array.from(binary,ch=>ch.charCodeAt(0));return {width:canvas.width,height:canvas.height,bytes}});
}
let opsPDFExporting=false;
async function exportReportPDF(id){
 if(opsPDFExporting)return;const source=reportRows().find(x=>x.id===id);if(!source||app.selectedReport!==id){toast('请先打开要下载的报告');return}
 const row=structuredClone(source),button=$('[data-export-report="'+id+'"]');opsPDFExporting=true;if(button){button.disabled=true;button.textContent='正在生成 PDF…'}
 try{await document.fonts.ready;await new Promise(resolve=>setTimeout(resolve,20));const pages=opsBuildReportPDF(row),blob=opsPDFBytes(pages),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=row.name.replace(/[\\/:*?"<>|]/g,'_')+'.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);toast('PDF 已生成，共 '+pages.length+' 页')}
 catch(error){console.error('PDF export failed',error);toast('PDF 生成失败，请重试')}
 finally{opsPDFExporting=false;if(button?.isConnected){button.disabled=false;button.innerHTML=icon('download')+'下载 PDF';refreshIcons()}}
}
