/* Demonstraciniai ryšiai. Išsaugoti ankstesnio modelio bendri rugpjūčio skaičiai. */
(() => {
  'use strict';
  const makers=['Volkswagen','BMW','Audi','Toyota','Mercedes-Benz','Škoda','Volvo','Ford','Opel','Peugeot','Renault','Nissan','Honda','Hyundai','Kia','Citroën'];
  const definitions=[
    ['b2b','Tomas',[425,375,340,320,300,260,180]],
    ['b2b','Andrius',[380,330,290,260,240,200]],
    ['b2b','Marek',[430,350,280,230,160]],
    ['b2b','Lukas',[300,240,190,150]],
    ['b2b','Nepriskirta',[200]],
    ['b2c','Tomas',[320,260,230,150]],
    ['b2c','Andrius',[380,330,250,200]],
    ['b2c','Marek',[350,280,220,140]],
    ['b2c','Lukas',[300,197,120]],
    ['b2c','Nepriskirta',[60]],
    ['unknown','Tomas',[260]],['unknown','Nepriskirta',[240]]
  ];
  const orders=[];
  definitions.forEach(([segment,employee,values])=>values.forEach((value,position)=>{
    const i=orders.length;
    const draft=(employee==='Lukas' && value!==197) ||
      (segment==='b2b' && employee==='Tomas' && value===425) ||
      (segment==='b2b' && employee==='Marek' && value===430) ||
      (segment==='b2b' && employee==='Andrius' && [260,200].includes(value));
    orders.push({id:`UZ-${String(260801+i)}`,segment,employee,maker:employee==='Lukas'?'Opel':makers[i%makers.length],revenue:Math.round(value*100),status:draft?'draft':'invoiced',services:[],position});
  }));
  function allocate(total,weights){
    const sum=weights.reduce((a,b)=>a+b,0),raw=weights.map(w=>total*w/sum),values=raw.map(Math.floor);
    let left=total-values.reduce((a,b)=>a+b,0);
    const ranks=raw.map((v,i)=>({i,remainder:v-values[i]})).sort((a,b)=>b.remainder-a.remainder||a.i-b.i);
    for(let n=0;n<left;n++)values[ranks[n%ranks.length].i]++;
    return values;
  }
  const totals={b2b:{parts:103000,cost:79000,labor:42000},b2c:{parts:65700,cost:50520,labor:28250},unknown:{parts:8000,cost:6200,labor:3000}};
  Object.entries(totals).forEach(([segment,t])=>{
    const rows=orders.filter(o=>o.segment===segment),parts=allocate(t.parts,rows.map(o=>o.revenue));
    const costs=allocate(t.cost,parts),labor=allocate(t.labor,rows.map((o,i)=>o.revenue-parts[i]));
    rows.forEach((o,i)=>{o.parts=parts[i];o.partsCost=costs[i];o.laborCost=labor[i];o.serviceRevenue=o.revenue-o.parts});
  });
  const main=[['oil','Tepalų ir filtrų keitimas',205000],['brakes','Stabdžių diskų ir kaladėlių keitimas',165000],['steering','Vairo kolonėlės keitimas',135000],['bearing','Šarnyro ir rato guolio keitimas',120000],['caliper','Stabdžių suporto keitimas',100000]];
  const otherNames=['Kompiuterinė diagnostika','Ratų suvedimas','Padangų keitimas','Akumuliatoriaus keitimas','Generatoriaus remontas','Starterio remontas','Kondicionieriaus aptarnavimas','Aušinimo sistemos remontas','Išmetimo sistemos remontas','Sankabos keitimas','Paskirstymo diržo keitimas','Amortizatorių keitimas','Žvakių keitimas','Lempučių keitimas','Kuro sistemos darbai','Elektros instaliacijos darbai','Važiuoklės patikra','Kiti įvardyti darbai'];
  const otherValues=allocate(95000,otherNames.map((_,i)=>18-i));
  const groups=[...main.map(([id,name,total])=>({id,name,total})),...otherNames.map((name,i)=>({id:`other-${i}`,name,total:otherValues[i]})),{id:'unassigned',name:'Paslauga nepriskirta',total:75000}];
  const remaining=groups.map(g=>g.total);
  const shuffled=[...orders].sort((a,b)=>(Number(a.id.slice(3))*17%41)-(Number(b.id.slice(3))*17%41));
  shuffled.forEach((o,index)=>{
    let left=o.serviceRevenue,preferred=index%5;
    while(left>0){
      let chosen=remaining[preferred]>0?preferred:remaining.indexOf(Math.max(...remaining));
      const amount=Math.min(left,remaining[chosen]);
      const line=o.services.find(l=>l.group===groups[chosen].id);
      if(line)line.revenue+=amount;else o.services.push({group:groups[chosen].id,revenue:amount});
      remaining[chosen]-=amount;left-=amount;preferred=(chosen+1)%groups.length;
    }
  });
  const monthLabels=['Kovas','Balandis','Gegužė','Birželis','Liepa','Rugpjūtis'];
  const monthData={
    b2b:[[5200,19,3224],[5600,20,3696],[5700,21,3876],[6200,22,4340],[6300,23,4095],[6430,23,4235]],
    b2c:[[3100,15,2294],[3200,16,2560],[3500,17,2905],[3650,17,3102.5],[3650,17,2956.5],[3787,16,3367]],
    unknown:[[400,2,282],[400,2,368],[400,2,323],[400,2,245],[450,2,228.5],[500,2,500]]
  };
  const history={};
  Object.entries(monthData).forEach(([segment,rows])=>history[segment]=rows.map(([revenue,count,invoiced],i)=>({label:monthLabels[i],revenue:Math.round(revenue*100),count,invoiced:Math.round(invoiced*100)})));
  history.all=monthLabels.map((label,i)=>['b2b','b2c','unknown'].reduce((row,segment)=>({label,revenue:row.revenue+history[segment][i].revenue,count:row.count+history[segment][i].count,invoiced:row.invoiced+history[segment][i].invoiced}),{label,revenue:0,count:0,invoiced:0}));
  window.FinanceDemo=Object.freeze({orders,groups,history,makers});
})();
