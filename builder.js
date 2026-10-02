const select = s => document.querySelector(s);
const escapeText = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ingredientGroups = [
 [{name:'Vanilla',asset:'vanilla'},{name:'Chocolate',asset:'chocolate'},{name:'Coffee',asset:'coffee'},{name:'Pistachio',asset:'pistachio'},{name:'Strawberry Cheesecake',asset:'strawberry-cheesecake'},{name:'Mango',asset:'mango-ice-cream'}],
 [['Rainbow sprinkles','rainbow-sprinkles'],['Oreo crumbs','oreo-crumbs'],['Gummy bears','gummy-bears'],['Strawberries','strawberries'],['Blueberries','blueberries'],['Mango','mango'],['Reese’s peanut butter cups','peanut-butter-cups'],['Marshmallows','marshmallows'],['Graham crackers','graham-crackers'],['Brownie pieces','brownie-pieces'],['Cherry','cherry'],['Mochi bites','mochi-bites']].map(([name,asset])=>({name,asset})),
 [{name:'Hot fudge',asset:'hot-fudge-bottle',color:'#623828'},{name:'Peanut butter',asset:'peanut-butter-bottle',color:'#c18b44'},{name:'Whipped cream',asset:'whipped-cream-dispenser',color:'#fff7e4'}]
];
const stationNames=['Flavors','Toppings','Drizzles'];
const titles=['Pick your scoops.','A sprinkle of personality.','The finishing touch.'];
const descriptions=['Up to two scoops. Your favorite flavor can make a repeat appearance.','Up to three different toppings. A little crunch, a little color.','Any drizzles you like, once each. Finish whenever you’re happy.'];
const imagePath = (group,index) => `assets/shop/${ingredientGroups[group][index].asset}.${group===2?'png':'jpg'}`;
let order={vessel:null,flavors:[],toppings:[],drizzles:[],history:[]};
let station=0,pending=null,drag=null,suppressClick=false;
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function allowed(group,index){
 if(!order.vessel)return false;
 if(group===0)return order.flavors.length<2;
 const chosen=group===1?order.toppings:order.drizzles;
 return (group!==1||chosen.length<3)&&!chosen.includes(index);
}
function announce(message){select('#builder-status').textContent=message;}
function countText(){return station===0?`${order.flavors.length} / 2 SCOOPS`:station===1?`${order.toppings.length} / 3 TOPPINGS`:`${order.drizzles.length} DRIZZLES · OPTIONAL`;}
function renderStation(){
 select('#builder-title').textContent=titles[station];select('#builder-description').textContent=descriptions[station];
 select('#builder-count').textContent=countText();
 const container=select('#builder-items');container.className=stationNames[station].toLowerCase();
 container.innerHTML=ingredientGroups[station].map((item,i)=>`<button class="treat ingredient-button" data-ingredient="${i}" aria-label="Select ${escapeText(item.name)}" aria-pressed="${pending?.group===station&&pending.index===i}" ${allowed(station,i)?'':'disabled'}><img class="food-art" src="${imagePath(station,i)}" alt="" draggable="false" width="512" height="512"><span class="flavor">${escapeText(item.name)}</span></button>`).join('');
 document.querySelectorAll('[data-station]').forEach(button=>{if(Number(button.dataset.station)===station)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')});
 select('#undo').disabled=!order.history.length;
 select('#drop-zone').setAttribute('aria-label',pending?`Add ${ingredientGroups[pending.group][pending.index].name} to your ${order.vessel}`:`Your ${order.vessel}. Select an ingredient first.`);
}
function sundaeMarkup(){
 let html=`<span class="sundae-vessel ${order.vessel==='cone'?'cone-art':'cup-art'}"></span>`;
 order.flavors.forEach(index=>{html+=`<span class="scoop" style="background-image:url('${imagePath(0,index)}')"></span>`});
 // Percent positions keep decoration aligned with the miniature mobile preview.
 const top=order.flavors.length>1?8:order.flavors.length===1?35:54;
 order.toppings.forEach((index,batch)=>{
  for(let piece=0;piece<14;piece++){
   const x=28+(piece*17+batch*11)%44,y=top+(piece*7+batch*3)%22;
   const rainbow=['#ee809c','#eac460','#8fb6ce','#a4c484','#bda2d0'];
   html+=`<i class="topping-piece ${index===0?'sprinkle':''}" style="left:${x}%;top:${y}%;${index===0?`background:${rainbow[piece%5]}`:`background-image:url('${imagePath(1,index)}')`};rotate:${piece*29}deg;animation-delay:${piece*12}ms"></i>`;
  }
 });
 order.drizzles.forEach((index,i)=>{
  if(index===2){html+=`<span class="cream-swirl" style="top:${Math.max(0,top-5)}%"></span>`;return;}
  html+=`<svg class="sauce" style="top:${top+4+i*4}%" viewBox="0 0 140 80" aria-hidden="true"><path d="M18 8Q120 4 121 17T20 29Q16 36 120 42T22 55Q18 61 114 69" fill="none" stroke="${ingredientGroups[2][index].color}" stroke-width="7" stroke-linecap="round" pathLength="1">${reduceMotion?'':'<animate attributeName="stroke-dasharray" values="0 1;1 0" dur="0.55s" fill="freeze"/>'}</path></svg>`;
 });
 return html;
}
function renderOrder(){select('#sundae').innerHTML=sundaeMarkup();renderStation();}
function addIngredient(group,index){
 if(!allowed(group,index)){announce('That ingredient is already added, or you’ve reached the limit.');return false;}
 const key=['flavors','toppings','drizzles'][group];order[key].push(index);order.history.push({group,index});pending=null;
 renderOrder();announce(`${ingredientGroups[group][index].name} added to your ${order.vessel}. ${group===0?`${order.flavors.length} of 2 scoops.`:group===1?`${order.toppings.length} of 3 toppings.`:'Looking sweet!'}`);
 return true;
}
function switchStation(next){station=(next+3)%3;pending=null;renderStation();announce(`Choose ${stationNames[station].toLowerCase()}, or finish your creation.`);}
function chooseVessel(vessel){order.vessel=vessel;station=0;pending=null;select('#vessel-choice').hidden=true;select('#workbench').hidden=false;renderOrder();announce(`Drag a flavor to your ${vessel}, or tap a flavor and then your ${vessel}.`);select('#builder-title').focus({preventScroll:true});}
function resetOrder(){cleanupDrag();order={vessel:null,flavors:[],toppings:[],drizzles:[],history:[]};pending=null;station=0;select('#workbench').hidden=true;select('#finished').hidden=true;select('#vessel-choice').hidden=false;select('#builder-title').textContent='Cup or cone?';select('#builder-description').textContent='Every great scoop starts somewhere. Choose your favorite.';select('#builder-title').focus({preventScroll:true});window.scrollTo(0,0);}
function cleanupDrag(){if(drag){try{drag.button.releasePointerCapture(drag.id)}catch{}}drag=null;select('#drag-ghost').hidden=true;document.body.classList.remove('is-dragging');select('#drop-zone').classList.remove('drop-active');}
function overTarget(x,y){const r=select('#drop-zone').getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;}
function moveGhost(event){const ghost=select('#drag-ghost');ghost.style.transform=`translate(${event.clientX-25}px,${event.clientY-25}px)`;select('#drop-zone').classList.toggle('drop-active',overTarget(event.clientX,event.clientY));}
select('#builder-items').addEventListener('pointerdown',event=>{
 const button=event.target.closest('[data-ingredient]');if(!button||button.disabled||event.button!==0)return;
 drag={button,id:event.pointerId,group:station,index:Number(button.dataset.ingredient),x:event.clientX,y:event.clientY,started:false};
 // Desktop drags start immediately; touch users can tap, or hold briefly to drag without blocking scrolling.
 if(event.pointerType!=='touch'){event.preventDefault();button.setPointerCapture(event.pointerId);}
});
window.addEventListener('pointermove',event=>{
 if(!drag||event.pointerId!==drag.id)return;
 if(!drag.started&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<7)return;
 if(!drag.started){drag.started=true;drag.button.setPointerCapture(event.pointerId);const ghost=select('#drag-ghost');ghost.className=drag.group===0?'scoop-tool':'';ghost.innerHTML=`<img src="${imagePath(drag.group,drag.index)}" alt="">`;ghost.hidden=false;document.body.classList.add('is-dragging');}
 event.preventDefault();moveGhost(event);
},{passive:false});
window.addEventListener('pointerup',event=>{
 if(!drag||drag.id!==event.pointerId)return;
 const completed=drag,drop=drag.started&&overTarget(event.clientX,event.clientY);
 suppressClick=completed.started;
 cleanupDrag();
 if(drop)addIngredient(completed.group,completed.index);
 else if(completed.started)announce('Drop into your cup or cone to add it. You can also tap an ingredient, then tap your creation.');
 if(!completed.started&&event.pointerType!=='touch')pickIngredient(completed.group,completed.index);
 setTimeout(()=>{suppressClick=false},0);
});
window.addEventListener('pointercancel',cleanupDrag);window.addEventListener('blur',cleanupDrag);
function pickIngredient(group,index){if(!allowed(group,index))return;pending={group,index};renderStation();announce(`${ingredientGroups[group][index].name} selected. Tap your ${order.vessel} to add it.`);}
select('#builder-items').addEventListener('click',event=>{if(suppressClick)return;const button=event.target.closest('[data-ingredient]');if(button&&!button.disabled)pickIngredient(station,Number(button.dataset.ingredient));});
select('#drop-zone').addEventListener('click',()=>{if(pending)addIngredient(pending.group,pending.index);else announce('Select an ingredient first, then tap your cup or cone.');});
document.querySelectorAll('[data-vessel]').forEach(button=>button.addEventListener('click',()=>chooseVessel(button.dataset.vessel)));
document.querySelectorAll('[data-station]').forEach(button=>button.addEventListener('click',()=>switchStation(Number(button.dataset.station))));
select('#builder-previous').addEventListener('click',()=>switchStation(station-1));select('#builder-next').addEventListener('click',()=>switchStation(station+1));
select('#undo').addEventListener('click',()=>{const last=order.history.pop();if(!last)return;order[['flavors','toppings','drizzles'][last.group]].pop();pending=null;renderOrder();announce('Last ingredient removed.');});
select('#change-vessel').addEventListener('click',resetOrder);select('#restart').addEventListener('click',resetOrder);
select('#finish').addEventListener('click',()=>{
 cleanupDrag();pending=null;select('#workbench').hidden=true;select('#finished').hidden=false;select('#builder-title').textContent='Made by you.';select('#builder-description').textContent='A little something sweet, exactly your way.';
 select('#finished-sundae').innerHTML=`<div class="sundae-art">${sundaeMarkup()}</div>`;
 const lines=[['Served in',order.vessel==='cup'?'A little cup':'A waffle cone']];
 ['flavors','toppings','drizzles'].forEach((key,group)=>{if(!order[key].length)lines.push([stationNames[group],'None']);else order[key].forEach(index=>lines.push([group===0?'1 scoop':group===1?'Topping':'Drizzle',ingredientGroups[group][index].name]));});
 select('#receipt-ingredients').innerHTML=lines.map(([label,name])=>`<div class="receipt-line"><span>${escapeText(label)}</span><strong>${escapeText(name)}</strong></div>`).join('');
 select('#builder-title').focus({preventScroll:true});window.scrollTo(0,0);
});
