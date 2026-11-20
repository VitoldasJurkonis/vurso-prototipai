(() => {
  'use strict';
  const {orders,groups,history}=window.FinanceDemo;
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const labels={all:'Visi klientai',b2b:'B2B',b2c:'B2C',unknown:'Kliento tipas nepriskirtas'};
  const money=(n,d=2)=>new Intl.NumberFormat('lt-LT',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n/100)+' €';
  const money0=n=>money(n,0);
  const decimal=(n,d=1)=>new Intl.NumberFormat('lt-LT',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);
  const percent=n=>decimal(n)+' %';
  const share=(n,total)=>total>0?n/total*100:0;
  const signedMoney=n=>(n>=.5?'+':n<=-.5?'−':'')+money(Math.abs(n));
  const change=(current,previous)=>previous>0?(current/previous-1)*100:null;
  const signedPercent=n=>n===null?'—':(n>=.05?'+':n<=-.05?'−':'')+percent(Math.abs(n));
  const signedPoints=n=>(n>0?'+':n<0?'−':'')+decimal(Math.abs(n))+' proc. p.';
  const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let view='all',segment='all',selectedMonth=5,returnFocus=null;
  const sorts={services:'revenue',employees:'revenue',makers:'revenue'};
  const expanded={services:false,makers:false};
  const scenarios={};
  const scope=key=>key==='all'?orders:orders.filter(o=>o.segment===key);
  function total(items){return items.reduce((s,o)=>{s.revenue+=o.revenue;s.services+=o.serviceRevenue;s.parts+=o.parts;s.partsCost+=o.partsCost;s.laborCost+=o.laborCost;s.draft+=o.status==='draft'?o.revenue:0;s.orders++;return s},{revenue:0,services:0,parts:0,partsCost:0,laborCost:0,draft:0,orders:0})}
  const summaries=Object.fromEntries(Object.keys(labels).map(key=>[key,total(scope(key))]));
  function scenarioBase(key){const s=summaries[key];return {service:0,markup:(s.parts/s.partsCost-1)*100,orders:s.orders}}
  ['all','b2b','b2c'].forEach(key=>scenarios[key]=scenarioBase(key));
  function text(key,value){$$(`[data-bind="${key}"]`).forEach(el=>el.textContent=value)}
  function deltaClass(el,value){el.classList.toggle('delta-positive',value>0);el.classList.toggle('delta-negative',value<0)}
  function analysis(kind,key=segment){
    const map=new Map();
    for(const o of scope(key)){
      const pieces=kind==='services'?o.services.map(l=>({id:l.group,name:groups.find(g=>g.id===l.group).name,value:l.revenue})):[{id:kind==='employees'?o.employee:(o.maker||'unassigned'),name:kind==='employees'?o.employee:(o.maker||'Gamintojas nepriskirtas'),value:o.revenue}];
      for(const piece of pieces){
        if(!map.has(piece.id))map.set(piece.id,{id:piece.id,name:piece.name,revenue:0,draft:0,orderIds:new Set(),codes:[piece.id],unassigned:piece.id==='unassigned'||piece.id==='Nepriskirta'});
        const row=map.get(piece.id);row.revenue+=piece.value;if(o.status==='draft')row.draft+=piece.value;row.orderIds.add(o.id);
      }
    }
    return [...map.values()].map(row=>({...row,count:row.orderIds.size}));
  }
  function combined(rows,name){return {id:'remainder',name,revenue:rows.reduce((a,r)=>a+r.revenue,0),draft:rows.reduce((a,r)=>a+r.draft,0),count:rows.reduce((a,r)=>a+r.count,0),codes:rows.flatMap(r=>r.codes),remainder:true}}
  function displayRows(kind){
    const full=analysis(kind),named=full.filter(r=>!r.unassigned).sort((a,b)=>b.revenue-a.revenue||a.name.localeCompare(b.name)),unassigned=full.filter(r=>r.unassigned);
    const base=kind==='services'?summaries[segment].services:summaries[segment].revenue;
    let selected=[...named];
    if(kind!=='employees'&&!expanded[kind]){
      let amount=0,index=0;
      for(;index<named.length;index++){amount+=named[index].revenue;if(share(amount,base)>=80||(kind==='makers'&&index+1>=15)){index++;break}}
      while(index<named.length&&index>0&&named[index].revenue===named[index-1].revenue)index++;
      selected=named.slice(0,index);
    }
    const selectedSum=selected.reduce((n,r)=>n+r.revenue,0),remainder=named.filter(r=>!selected.includes(r));
    const ordered=[...selected].sort((a,b)=>sorts[kind]==='draft'?(b.draft-a.draft||b.revenue-a.revenue):(b.revenue-a.revenue));
    if(remainder.length)ordered.push(combined(remainder,kind==='services'?'Kitos įvardytos paslaugos':'Kiti gamintojai'));
    ordered.push(...unassigned);
    return {rows:ordered,base,totalCount:full.reduce((a,r)=>a+r.count,0),namedCount:named.length,shownCount:selected.length,coverage:share(selectedSum,base)};
  }
  function renderAnalysis(kind){
    const info=displayRows(kind),max=Math.max(1,...info.rows.map(r=>r.revenue)),countBase=kind==='services'?info.totalCount:summaries[segment].orders;
    const target={services:'#serviceRows',employees:'#employeeRevenueRows',makers:'#makerRows'}[kind];
    $(target).innerHTML=info.rows.map(row=>{
      const draftShare=share(row.draft,row.revenue),sfShare=100-draftShare,critical=draftShare>50;
      return `<tr class="${critical?'critical-row ':''}${row.unassigned?'unassigned-row ':''}${row.remainder?'remainder-row':''}">
        <td><span class="row-name">${esc(row.name)}</span>${kind==='makers'?`<span class="cell-meta">${money(row.revenue/row.count)} vid. čekis</span>`:''}<div class="revenue-meter"><i style="width:${share(row.revenue,max)}%"></i></div></td>
        <td data-label="${kind==='services'?'Atlikimai':'Užsakymai'}"><span class="row-count num">${row.count}</span><span class="cell-meta">${percent(share(row.count,countBase))} ${kind==='services'?'atlikimų':'užsakymų'}</span></td>
        <td data-label="Pajamos · dalis"><strong class="row-revenue num">${money0(row.revenue)}</strong><span class="cell-meta">${percent(share(row.revenue,info.base))} ${kind==='services'?'paslaugų pajamų':'pjūvio pajamų'}</span></td>
        <td data-label="Išrašyta su S.F."><strong class="quality-number num">${percent(sfShare)}</strong><div class="quality-track"><i class="sf" style="width:${sfShare}%"></i><i class="draft" style="width:${draftShare}%"></i></div></td>
        <td data-label="Liko juodraštyje"><button class="row-draft num ${row.draft===0?'zero':''}" data-inspect-kind="${kind}" data-inspect-codes="${esc(JSON.stringify(row.codes))}" data-inspect-name="${esc(row.name)}" aria-label="${esc(row.name)}: juodraštyje ${money0(row.draft)}, ${percent(draftShare)}. Peržiūrėti užsakymus">${money0(row.draft)}<span class="cell-meta">${percent(draftShare)} eilutės pajamų</span></button></td>
      </tr>`;
    }).join('');
    if(kind==='services'){$('#serviceCoverage').textContent=`${info.shownCount} iš ${info.namedCount} grupių · ${percent(info.coverage)}`;$('#toggleServices').textContent=expanded.services?'Rodyti 80 % sudarančias paslaugas':'Rodyti visas paslaugas'}
    if(kind==='employees')$('#employeeSegmentBadge').textContent=labels[segment];
    if(kind==='makers'){$('#makerCoverage').textContent=`${info.shownCount} iš ${info.namedCount} gamintojų · ${percent(info.coverage)}`;$('#toggleMakers').textContent=expanded.makers?'Rodyti pagrindinius gamintojus':'Rodyti visus gamintojus';$('#toggleMakers').disabled=info.namedCount===0}
  }
  function renderClientTypes(){
    const all=summaries.all;
    if(segment==='all'){
      const keys=['b2b','b2c','unknown'],colors=['var(--blue)','var(--green)','var(--faint)'];
      $('#clientTypeBar').innerHTML=keys.map((key,i)=>`<i style="width:${share(summaries[key].revenue,all.revenue)}%;background:${colors[i]}"></i>`).join('');
      $('#clientBreakdown').innerHTML=keys.map((key,i)=>`<div class="split"><i class="dot" style="background:${colors[i]}"></i><span>${key==='unknown'?'Nepriskirta':labels[key]}</span><strong class="num">${money0(summaries[key].revenue)} · ${percent(share(summaries[key].revenue,all.revenue))}</strong></div>`).join('');
      $('#clientTypeNote').textContent='Suma ir dalis nuo visų šio mėnesio pajamų';
    }else{
      const s=summaries[segment],value=share(s.revenue,all.revenue);
      $('#clientTypeBar').innerHTML=`<i style="width:${value}%;background:var(--blue)"></i><i style="width:${100-value}%;background:var(--surface-2)"></i>`;
      $('#clientTypeNote').textContent='Pasirinkto kliento tipo dalis nuo viso serviso';
      $('#clientBreakdown').innerHTML=`<div class="split"><span>${labels[segment]} pajamos</span><strong>${money0(s.revenue)}</strong></div><div class="split"><span>Visų pajamų dalis</span><strong>${percent(value)}</strong></div><div class="split"><span>Visų užsakymų dalis</span><strong>${percent(share(s.orders,all.orders))}</strong></div>`;
    }
  }
  function renderDashboard(){
    const s=summaries[segment],invoiced=s.revenue-s.draft,draftShare=share(s.draft,s.revenue),sfShare=100-draftShare;
    text('segmentLabel',labels[segment]);text('revenue',money0(s.revenue));text('revenuePlain',money0(s.revenue));text('revenueExact',money(s.revenue));text('orders',s.orders);text('ordersShort',s.orders);text('ordersFormula',`${s.orders} užs.`);text('aov',money(s.revenue/s.orders));
    text('services',`${money0(s.services)} · ${percent(share(s.services,s.revenue))}`);text('parts',`${money0(s.parts)} · ${percent(share(s.parts,s.revenue))}`);text('servicesPlain',money0(s.services));text('partsPlain',money0(s.parts));text('servicePerOrder',money(s.services/s.orders));text('partsPerOrder',money(s.parts/s.orders));text('costPerOrder',money(s.partsCost/s.orders));text('serviceShare',`${percent(share(s.services,s.revenue))} čekio`);text('partsShare',`${percent(share(s.parts,s.revenue))} čekio`);text('currentMarkup',percent((s.parts/s.partsCost-1)*100));
    $('#costShare').textContent=`${percent(share(s.partsCost,s.parts))} detalių pardavimo sumos`;
    $('#partsCostNote').textContent=`Detalių savikaina: ${money0(s.partsCost)} · ${percent(share(s.partsCost,s.parts))} jų pardavimo sumos`;
    $('#orderShare').textContent=`${percent(share(s.orders,summaries.all.orders))} viso serviso užsakymų`;
    $('#serviceBar').style.width=share(s.services,s.revenue)+'%';$('#partsBar').style.width=share(s.parts,s.revenue)+'%';
    $('#invoicedRevenue').textContent=`${money0(invoiced)} · ${percent(sfShare)}`;$('#draftRevenue').textContent=`${money0(s.draft)} · ${percent(draftShare)}`;
    $('#invoicedBar').style.width=sfShare+'%';$('#draftBar').style.width=draftShare+'%';$('#documentBar').setAttribute('aria-label',`Išrašyta su S.F. ${percent(sfShare)}; juodraštyje ${percent(draftShare)}`);
    $('#documentCard').classList.toggle('critical',draftShare>50);$('#documentCritical').classList.toggle('hidden',draftShare<=50);
    const h=history[segment],now=h[5],prev=h[4],metrics=[['#revenueMonthDelta',change(now.revenue,prev.revenue)],['#ordersMonthDelta',change(now.count,prev.count)],['#aovMonthDelta',change(now.revenue/now.count,prev.revenue/prev.count)]];
    metrics.forEach(([id,value])=>{$(id).textContent=`${signedPercent(value)} prieš liepą`;deltaClass($(id),value)});
    const pp=share(now.invoiced,now.revenue)-share(prev.invoiced,prev.revenue);$('#documentMonthDelta').textContent=`Įforminta ${signedPoints(pp)} prieš liepą`;deltaClass($('#documentMonthDelta'),pp);
    renderClientTypes();['services','employees','makers'].forEach(renderAnalysis);
    const problematic=analysis('employees').filter(r=>share(r.draft,r.revenue)>50),largest=analysis('employees').sort((a,b)=>b.draft-a.draft)[0];
    $('#focusStrip').innerHTML=`<div><h3>Kur daugiausia pajamų liko juodraštyje?</h3><p>${largest?`${esc(largest.name)}: ${money0(largest.draft)} · ${percent(share(largest.draft,largest.revenue))} jo priskirtų pajamų.`:''} ${problematic.length?`${problematic.length} darbuotojų pjūvio ${problematic.length===1?'eilutėje':'eilutėse'} juodraščiai viršija 50 %.`:'Šiame darbuotojų pjūvyje nėra eilučių, viršijančių 50 %.'}</p></div><button data-inspect-kind="total">Peržiūrėti juodraščius →</button>`;
  }
  function renderComparison(){
    const a=summaries.b2b,b=summaries.b2c,aovDiff=change(a.revenue/a.orders,b.revenue/b.orders),qualityDiff=share(b.revenue-b.draft,b.revenue)-share(a.revenue-a.draft,a.revenue);
    $('#comparisonInsights').innerHTML=`<article class="comparison-insight"><span>Vidutinio čekio skirtumas</span><strong>B2B ${signedPercent(aovDiff)}</strong><p>Vienas B2B užsakymas vidutiniškai atneša daugiau pajamų nei B2C užsakymas.</p></article><article class="comparison-insight"><span>Sąskaitomis įformintos pajamų dalies skirtumas</span><strong>B2C ${signedPoints(qualityDiff)}</strong><p>Įforminimo palyginimas nuo kiekvieno segmento pajamų. Apmokėjimo jis neparodo.</p></article>`;
    const row=(label,values,notes,cls='')=>`<tr class="${cls}"><td>${label}</td>${values.map((value,i)=>`<td><strong>${value}</strong><span class="cell-meta">${notes[i]}</span></td>`).join('')}</tr>`;
    const data=[a,b],contributions=data.map(s=>s.revenue-s.partsCost-s.laborCost);
    $('#comparisonRows').innerHTML=
      row('Pajamos',data.map(s=>money0(s.revenue)),data.map(s=>`${percent(share(s.revenue,summaries.all.revenue))} viso serviso pajamų`))+
      row('Užbaigti užsakymai',data.map(s=>s.orders),data.map(s=>`${percent(share(s.orders,summaries.all.orders))} viso serviso užsakymų`))+
      row('Vidutinis čekis',data.map(s=>money(s.revenue/s.orders)),['Vienam B2B užsakymui','Vienam B2C užsakymui'])+
      row('Paslaugų pajamos',data.map(s=>money0(s.services)),data.map(s=>`${percent(share(s.services,s.revenue))} segmento pajamų`))+
      row('Detalių pajamos',data.map(s=>money0(s.parts)),data.map(s=>`${percent(share(s.parts,s.revenue))} segmento pajamų`))+
      row('Išrašyta su S.F.',data.map(s=>percent(share(s.revenue-s.draft,s.revenue))),data.map(s=>`${money0(s.revenue-s.draft)} · nuo segmento pajamų`))+
      `<tr><td>Liko juodraštyje</td>${data.map((s,i)=>`<td><button class="row-draft draft-compare" data-inspect-kind="total" data-inspect-segment="${i?'b2c':'b2b'}">${money0(s.draft)}<span class="cell-meta">${percent(share(s.draft,s.revenue))} segmento pajamų</span></button></td>`).join('')}</tr>`+
      '<tr class="cost-section"><td colspan="3">Nauda po suvestų tiesioginių kaštų · demonstracinis paskirstymas</td></tr>'+
      row('Detalių savikaina',data.map(s=>money(s.partsCost)),data.map(s=>`${percent(share(s.partsCost,s.revenue))} segmento pajamų`),'minor')+
      row('Priskirtas darbuotojų atlygis',data.map(s=>money(s.laborCost)),data.map(s=>`${percent(share(s.laborCost,s.revenue))} segmento pajamų`),'minor')+
      row('Įnašas po suvestų tiesioginių kaštų',contributions.map(money0),data.map((s,i)=>`${percent(share(contributions[i],s.revenue))} segmento pajamų`))+
      row('Įnašas vienam užsakymui',data.map((s,i)=>money(contributions[i]/s.orders)),[`${signedPercent(change(contributions[0]/a.orders,contributions[1]/b.orders))} palyginti su B2C`,`${signedPercent(change(contributions[1]/b.orders,contributions[0]/a.orders))} palyginti su B2B`]);
    $('#comparisonNote').innerHTML=`<b>Kliento tipui nepriskirta: ${money0(summaries.unknown.revenue)} · ${percent(share(summaries.unknown.revenue,summaries.all.revenue))} visų pajamų.</b> Ši suma lieka bendrame rezultate. Įnašas apskaičiuotas atėmus detalių savikainą ir suvestą darbuotojų atlygį; bendrosios išlaidos ir neįvesti atlygio ar mokesčių kaštai neatimti.`;
  }
  function chartSeries(metric){
    const getValue=(r,key)=>key==='revenue'?r.revenue:key==='orders'?r.count:key==='aov'?r.revenue/r.count:share(r.invoiced,r.revenue);
    if(view==='compare')return ['b2b','b2c'].map((key,i)=>({label:labels[key],color:i?'var(--green)':'var(--blue)',values:history[key].map(r=>getValue(r,metric))}));
    if(metric==='quality')return [{label:'Su S.F.',color:'var(--green)',values:history[segment].map(r=>share(r.invoiced,r.revenue))},{label:'Juodraštyje',color:'var(--red)',values:history[segment].map(r=>share(r.revenue-r.invoiced,r.revenue))}];
    return [{label:labels[segment],color:'var(--blue)',values:history[segment].map(r=>getValue(r,metric))}];
  }
  function drawChart(id,metric){
    const container=$(id),width=Math.max(180,container.clientWidth),height=220,left=47,right=17,top=27,bottom=29,series=chartSeries(metric),max=metric==='quality'?100:Math.max(1,...series.flatMap(s=>s.values))*1.15;
    const chartW=width-left-right,chartH=height-top-bottom,x=i=>left+i*chartW/5,y=v=>top+chartH*(1-v/max),format=v=>metric==='quality'?`${Math.round(v)} %`:metric==='orders'?String(Math.round(v)):metric==='aov'?money0(v):new Intl.NumberFormat('lt-LT',{maximumFractionDigits:1}).format(v/100000)+' k€';
    let svg=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc({revenue:'Pajamų',orders:'Užsakymų',aov:'Vidutinio čekio',quality:'Įforminimo'}[metric])} tendencija nuo kovo iki rugpjūčio"><title>${esc(series.map(s=>`${s.label}: ${s.values.map(format).join(', ')}`).join('. '))}</title>`;
    for(let i=0;i<=4;i++){const v=max*i/4,py=y(v);svg+=`<line x1="${left}" x2="${width-right}" y1="${py}" y2="${py}" stroke="var(--border)" stroke-width="1"/><text x="${left-8}" y="${py+4}" fill="var(--muted)" font-size="10" text-anchor="end">${format(v)}</text>`}
    svg+=`<line x1="${x(selectedMonth)}" x2="${x(selectedMonth)}" y1="${top}" y2="${height-bottom}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 4" opacity=".65"/>`;
    series.forEach(s=>{
      svg+=`<path d="${s.values.map((v,i)=>`${i?'L':'M'}${x(i)} ${y(v)}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
      s.values.forEach((v,i)=>{svg+=`<circle cx="${x(i)}" cy="${y(v)}" r="${i===selectedMonth?5:3.5}" fill="${s.color}"><title>${history.all[i].label}: ${format(v)} · ${esc(s.label)}</title></circle>`});
    });
    history.all.forEach((r,i)=>{svg+=`<text x="${x(i)}" y="${height-7}" font-size="11" fill="${i===selectedMonth?'var(--text)':'var(--muted)'}" text-anchor="${i===0?'start':i===5?'end':'middle'}">${['Kov.','Bal.','Geg.','Bir.','Lie.','Rug.'][i]}</text>`});
    svg+='</svg>';container.innerHTML=svg;
    $(id.replace('Chart','Legend')).innerHTML=series.map(s=>`<span><i style="background:${s.color}"></i>${esc(s.label)}</span>`).join('');
  }
  function renderHistory(){
    $('#historyScope').textContent=view==='compare'?'B2B ↔ B2C':labels[segment];
    const key=view==='compare'?'all':segment,row=history[key][selectedMonth],prev=selectedMonth?history[key][selectedMonth-1]:null;
    const pairs=[['#historyRevenueValue',money0(row.revenue),prev?change(row.revenue,prev.revenue):null],['#historyOrdersValue',row.count,prev?change(row.count,prev.count):null],['#historyAovValue',money(row.revenue/row.count),prev?change(row.revenue/row.count,prev.revenue/prev.count):null]];
    pairs.forEach(([id,val,delta])=>{$(id).innerHTML=view==='compare'?'<small>B2B ir B2C atskirai</small>':`${val}<small class="${delta>0?'delta-positive':delta<0?'delta-negative':''}">${delta===null?'Pirmas rodomas mėnuo':`${signedPercent(delta)} prieš ankstesnį mėnesį`}</small>`});
    const quality=share(row.invoiced,row.revenue),pp=prev?quality-share(prev.invoiced,prev.revenue):null;
    $('#historyQualityValue').innerHTML=view==='compare'?'<small>Su S.F. · % segmento pajamų</small>':`${percent(quality)}<small class="${pp>0?'delta-positive':pp<0?'delta-negative':''}">${pp===null?'Su S.F.':signedPoints(pp)+' prieš ankstesnį mėnesį'}</small>`;
    $('#monthButtons').innerHTML=history.all.map((m,i)=>`<button data-month="${i}" class="${i===selectedMonth?'active':''}" aria-pressed="${i===selectedMonth}">${m.label}</button>`).join('');
    if(view==='compare'){
      $('#historyDetail').innerHTML=['b2b','b2c'].map(key=>{const r=history[key][selectedMonth],p=selectedMonth?history[key][selectedMonth-1]:null;return `<b>${r.label} · ${labels[key]}:</b> ${money0(r.revenue)} ${p?'('+signedPercent(change(r.revenue,p.revenue))+')':''} · ${r.count} užs. · ${money(r.revenue/r.count)} vid. čekis · su S.F. ${percent(share(r.invoiced,r.revenue))} · <span class="draft-history">juodraštyje ${money0(r.revenue-r.invoiced)} / ${percent(share(r.revenue-r.invoiced,r.revenue))}</span>`}).join('<br>');
    }else $('#historyDetail').innerHTML=`<b>${row.label} · ${labels[segment]}:</b> pajamos ${money0(row.revenue)} · ${row.count} užs. · ${money(row.revenue/row.count)} vid. čekis · su S.F. ${percent(quality)} · <span class="draft-history">juodraštyje ${money0(row.revenue-row.invoiced)} / ${percent(100-quality)}</span>${prev?` · įforminimo pokytis ${signedPoints(pp)}`:''}`;
    [['#revenueChart','revenue'],['#ordersChart','orders'],['#aovChart','aov'],['#qualityChart','quality']].forEach(([id,metric])=>drawChart(id,metric));
  }
  function render(){
    $$('[data-view]').forEach(btn=>{const active=btn.dataset.view===view;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active))});
    $('#dashboardView').classList.toggle('hidden',view==='compare');$('#comparisonView').classList.toggle('hidden',view!=='compare');
    if(view==='compare')renderComparison();else renderDashboard();
    renderHistory();syncScenario();
  }
  function syncScenario(){
    const s=summaries[segment],st=scenarios[segment];
    $$('#aovOverlay .segment-tab').forEach(btn=>{btn.classList.toggle('active',btn.dataset.segment===segment);btn.setAttribute('aria-pressed',String(btn.dataset.segment===segment))});
    if(view==='compare')return;
    $('#servicePct').value=decimal(st.service,2).replace(',','.');$('#markupPct').value=decimal(st.markup,4).replace(',','.');$('#scenarioOrders').value=st.orders;
    renderScenario();
  }
  function renderScenario(){
    const s=summaries[segment],st=scenarios[segment];
    const read=(id,old,min,max)=>{const input=$(id),raw=input.value;if(raw.trim()==='')return old;const n=Number(raw);if(!Number.isFinite(n))return old;const value=Math.max(min,Math.min(max,n));if(n!==value)input.value=value;return value};
    st.service=read('#servicePct',st.service,-100,1000);st.markup=read('#markupPct',st.markup,-100,1000);st.orders=Math.round(read('#scenarioOrders',st.orders,0,10000));
    $('#scenarioOrders').value=st.orders;
    const sp=s.services/s.orders,cp=s.partsCost/s.orders,newService=sp*(1+st.service/100),newParts=cp*(1+st.markup/100),aov=newService+newParts,r=st.orders*aov,gain=r-s.revenue;
    $('#serviceControlResult').textContent=`${money(sp)} → ${money(newService)} · ${signedPercent(st.service)}`;
    $('#partsControlResult').textContent=`Dabar ${percent((s.parts/s.partsCost-1)*100)} → scenarijus ${percent(st.markup)}`;
    $('#ordersControlResult').textContent=`Dabar ${s.orders} → ${st.orders} · ${signedPercent(change(st.orders,s.orders))}`;
    $('#calcServices').textContent=`${money(sp)} × ${decimal(1+st.service/100,2)}`;$('#calcServicesResult').textContent='= '+money(newService);
    $('#calcParts').textContent=`${money(cp)} × ${decimal(1+st.markup/100,2)}`;$('#calcPartsResult').textContent='= '+money(newParts);
    $('#calcAov').textContent=`${money(newService)} + ${money(newParts)}`;$('#calcAovResult').textContent=`= ${money(aov)} · ${signedPercent(change(aov,s.revenue/s.orders))}`;
    $('#calcRevenue').textContent=`${st.orders} × ${money(aov)}`;$('#calcRevenueResult').textContent='= '+money(r);
    $('#scenarioRevenue').textContent=money(r);$('#scenarioMeta').textContent=`${st.orders} užs. · ${money(aov)} vid. čekis`;
    $('#scenarioGain').textContent=signedMoney(gain);$('#scenarioGainPct').textContent=signedPercent(change(r,s.revenue));
    const gainBlock=$('#scenarioGain').parentElement;gainBlock.classList.toggle('negative',gain<-.01);gainBlock.classList.toggle('neutral',Math.abs(gain)<.01);
    $('#effectService').textContent=signedMoney(s.services*st.service/100);$('#effectParts').textContent=signedMoney(s.partsCost*(1+st.markup/100)-s.parts);$('#effectOrders').textContent=signedMoney((st.orders-s.orders)*aov);
  }
  function openOverlay(id){returnFocus=document.activeElement;$(id).classList.remove('hidden');document.body.classList.add('modal-open');$(id+' .back').focus()}
  function closeOverlay(id){$(id).classList.add('hidden');document.body.classList.remove('modal-open');if(returnFocus&&document.contains(returnFocus))returnFocus.focus()}
  function inspect(kind,codes,name,key=segment){
    let rows=scope(key).filter(o=>o.status==='draft');
    if(kind==='services')rows=rows.filter(o=>o.services.some(l=>codes.includes(l.group)));
    if(kind==='employees')rows=rows.filter(o=>codes.includes(o.employee));
    if(kind==='makers')rows=rows.filter(o=>codes.includes(o.maker||'unassigned'));
    const value=o=>kind==='services'?o.services.filter(l=>codes.includes(l.group)).reduce((n,l)=>n+l.revenue,0):o.revenue;
    const sum=rows.reduce((n,o)=>n+value(o),0);
    $('#inspectorTotal').textContent=money0(sum);$('#inspectorContext').textContent=`${labels[key]} · ${name||'Visi juodraščiai'} · ${rows.length} užs. · rugpjūtis`;
    $('#inspectorRows').innerHTML=rows.length?rows.sort((a,b)=>value(b)-value(a)).map(o=>`<tr><td>${o.id}</td><td>${esc(o.employee)}</td><td>${esc(o.maker||'Nepriskirta')}</td><td>${esc(labels[o.segment])}</td><td class="num">${money(value(o))}</td></tr>`).join(''):'<tr><td colspan="5">Šioje eilutėje nėra juodraštyje likusių pajamų.</td></tr>';
    openOverlay('#draftOverlay');
  }
  document.addEventListener('click',event=>{
    const btn=event.target.closest('button');if(!btn)return;
    if(btn.dataset.view){view=btn.dataset.view;if(view!=='compare')segment=view;render()}
    if(btn.dataset.segment){segment=btn.dataset.segment;view=segment;render()}
    if(btn.dataset.sort){const kind=btn.closest('[data-sort-kind]').dataset.sortKind;sorts[kind]=btn.dataset.sort;if(kind!=='employees'&&sorts[kind]==='draft')expanded[kind]=true;$$(`[data-sort-kind="${kind}"] button`).forEach(b=>b.classList.toggle('active',b===btn));renderAnalysis(kind)}
    if(btn.dataset.month!==undefined){selectedMonth=Number(btn.dataset.month);renderHistory()}
    if(btn.dataset.inspectKind)inspect(btn.dataset.inspectKind,JSON.parse(btn.dataset.inspectCodes||'[]'),btn.dataset.inspectName,btn.dataset.inspectSegment||segment);
    if(btn.dataset.themeValue){document.documentElement.dataset.theme=btn.dataset.themeValue;$$('[data-theme-value]').forEach(b=>b.classList.toggle('active',b===btn))}
    if(btn.dataset.step){const map={service:'#servicePct',markup:'#markupPct',orders:'#scenarioOrders'},input=$(map[btn.dataset.step]);input.value=Number(input.value||0)+Number(btn.dataset.delta);renderScenario()}
  });
  $('#toggleServices').addEventListener('click',()=>{expanded.services=!expanded.services;renderAnalysis('services')});
  $('#toggleMakers').addEventListener('click',()=>{expanded.makers=!expanded.makers;renderAnalysis('makers')});
  $('#openDraftTotal').addEventListener('click',()=>inspect('total',[],'Visi juodraščiai'));
  $('#openAov').addEventListener('click',()=>{syncScenario();openOverlay('#aovOverlay')});$('#openAov').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();syncScenario();openOverlay('#aovOverlay')}});
  [['#closeAov','#aovOverlay'],['#closeAovX','#aovOverlay'],['#closeDraft','#draftOverlay'],['#closeDraftX','#draftOverlay']].forEach(([button,id])=>$(button).addEventListener('click',()=>closeOverlay(id)));
  ['#aovOverlay','#draftOverlay'].forEach(id=>$(id).addEventListener('click',e=>{if(e.target===$(id))closeOverlay(id)}));
  document.addEventListener('keydown',event=>{
    const open=['#aovOverlay','#draftOverlay'].find(id=>!$(id).classList.contains('hidden'));if(!open)return;
    if(event.key==='Escape'){closeOverlay(open);return}
    if(event.key==='Tab'){const focusable=[...$(open).querySelectorAll('button,input,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}
  });
  ['#servicePct','#markupPct','#scenarioOrders'].forEach(id=>$(id).addEventListener('input',renderScenario));
  $('#resetScenario').addEventListener('click',()=>{scenarios[segment]=scenarioBase(segment);syncScenario()});
  let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(renderHistory,120)});
  render();
})();
