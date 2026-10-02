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
const imagePath = (group,index) => group===1 ? `assets/builder/${ingredientGroups[group][index].asset}.png` : `assets/shop/${ingredientGroups[group][index].asset}.${group===2?'png':'jpg'}`;
const layerPath = (group,index) => group===0 ? `assets/builder/scoop-${['vanilla','chocolate','coffee','pistachio','strawberry-cheesecake','mango'][index]}.png` : group===1 ? imagePath(group,index) : `assets/builder/${['sauce-fudge','sauce-peanut','cream'][index]}.png`;
let order={vessel:null,flavors:[],toppings:[],drizzles:[],history:[]};
let station=0,pending=null,drag=null,suppressClick=false;
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
function layerImage(path){
 const image=document.createElement('img');image.addEventListener('load',()=>image.classList.add('ingredient-ready'),{once:true});image.src=path;image.alt='';image.draggable=false;return image;
}
function createLayer(group,index,slot){
 const layer=document.createElement('span');
 layer.dataset.layer=group===0?`scoop-${slot}`:`${group}-${index}`;
 layer.className=group===0?'build-scoop':group===1?'build-toppings':index===2?'build-cream':'build-sauce';
 const anchor=order.flavors.length>1?65:order.flavors.length===1?165:245;
 layer.style.setProperty('--layer-top',`${anchor}px`);
 if(group===1&&index===10&&order.drizzles.includes(2))layer.style.top=`${anchor-48}px`;
 if(group===0){layer.dataset.slot=String(slot);layer.append(layerImage(layerPath(group,index)));}
 else if(group===1){
  const count=index===10?1:index===0?7:6;
  for(let piece=0;piece<count;piece++){
   const image=layerImage(layerPath(group,index));
   // Stable positions: adding another ingredient never reshuffles existing pieces.
   image.style.left=`${8+(piece*23+index*13)%73}%`;
   image.style.top=`${8+(piece*17+index*11)%58}%`;
   image.style.rotate=`${(piece*47+index*9)%80-40}deg`;
   image.style.animationDelay=`${piece*35}ms`;
   layer.append(image);
  }
 } else {layer.append(layerImage(layerPath(group,index)));}
 return layer;
}
function syncComposition(){
 let root=select('#sundae').querySelector('.composition');
 if(!root){
  root=document.createElement('span');root.className='composition';
  const vessel=layerImage(`assets/builder/${order.vessel}.png`);vessel.className=`build-vessel ${order.vessel}`;
  root.append(vessel);select('#sundae').append(root);
 }
 const desired=new Set();
 ['flavors','toppings','drizzles'].forEach((key,group)=>order[key].forEach((index,slot)=>{
  const id=group===0?`scoop-${slot}`:`${group}-${index}`;desired.add(id);
  if(!Array.from(root.children).some(child=>child.dataset.layer===id))root.append(createLayer(group,index,slot));
 }));
 Array.from(root.children).forEach(child=>{if(child.dataset.layer&&!desired.has(child.dataset.layer))child.remove()});
}
function renderOrder(){syncComposition();renderStation();}
function addIngredient(group,index){
 if(!allowed(group,index)){announce('That ingredient is already added, or you’ve reached the limit.');return false;}
 const key=['flavors','toppings','drizzles'][group];order[key].push(index);order.history.push({group,index});pending=null;
 renderOrder();announce(`${ingredientGroups[group][index].name} added to your ${order.vessel}. ${group===0?`${order.flavors.length} of 2 scoops.`:group===1?`${order.toppings.length} of 3 toppings.`:'Looking sweet!'}`);
 return true;
}
function switchStation(next){station=(next+3)%3;pending=null;renderStation();announce(`Choose ${stationNames[station].toLowerCase()}, or finish your creation.`);}
function chooseVessel(vessel){order.vessel=vessel;station=0;pending=null;select('#vessel-choice').hidden=true;select('#workbench').hidden=false;renderOrder();announce(`Drag a flavor to your ${vessel}, or tap a flavor and then your ${vessel}.`);select('#builder-title').focus({preventScroll:true});}
function resetOrder(){cleanupDrag();order={vessel:null,flavors:[],toppings:[],drizzles:[],history:[]};pending=null;station=0;select('#sundae').replaceChildren();select('#finished-sundae').replaceChildren();select('#workbench').hidden=true;select('#finished').hidden=true;select('#vessel-choice').hidden=false;select('#builder-title').textContent='Cup or cone?';select('#builder-description').textContent='Every great scoop starts somewhere. Choose your favorite.';select('#builder-title').focus({preventScroll:true});window.scrollTo(0,0);}
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
 if(!drag.started){drag.started=true;drag.button.setPointerCapture(event.pointerId);const ghost=select('#drag-ghost');ghost.className=drag.group===0?'scoop-tool':'';ghost.replaceChildren(layerImage(drag.group===2?imagePath(drag.group,drag.index):layerPath(drag.group,drag.index)));ghost.hidden=false;document.body.classList.add('is-dragging');}
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
 select('#finished-sundae').replaceChildren(select('#sundae').querySelector('.composition').cloneNode(true));
 const lines=[['Served in',order.vessel==='cup'?'A little cup':'A waffle cone']];
 ['flavors','toppings','drizzles'].forEach((key,group)=>{if(!order[key].length)lines.push([stationNames[group],'None']);else order[key].forEach(index=>lines.push([group===0?'1 scoop':group===1?'Topping':'Drizzle',ingredientGroups[group][index].name]));});
 select('#receipt-ingredients').innerHTML=lines.map(([label,name])=>`<div class="receipt-line"><span>${escapeText(label)}</span><strong>${escapeText(name)}</strong></div>`).join('');
 select('#builder-title').focus({preventScroll:true});window.scrollTo(0,0);
});
