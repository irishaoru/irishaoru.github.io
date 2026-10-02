const $ = selector => document.querySelector(selector);
const e = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const flavors=['Vanilla','Chocolate','Coffee','Pistachio','Strawberry Cheesecake','Mango'];
const flavorAssets=['vanilla','chocolate','coffee','pistachio','strawberry-cheesecake','mango-ice-cream'];
const colors=['#f4e6c8','#94613f','#b49473','#c5d995','#f2b8b6','#f3ce76'];
const toppings=[
 ['Rainbow sprinkles','Traveling','Hobby','rainbow-sprinkles'],
 ['Oreo crumbs','Python','Skill','oreo-crumbs'],
 ['Gummy bears','CSS','Skill','gummy-bears'],
 ['Strawberries','HTML','Skill','strawberries'],
 ['Blueberries','JavaScript','Skill','blueberries'],
 ['Mango','Swimming','Hobby','mango'],
 ['Reese’s peanut butter cups','Excel','Skill','peanut-butter-cups'],
 ['Marshmallows','PowerPoint','Skill','marshmallows'],
 ['Graham crackers','Canva','Skill','graham-crackers'],
 ['Brownie pieces','CapCut','Skill','brownie-pieces'],
 ['Cookie dough pieces','Framer','Skill','cookie-dough'],
 ['Cherry','Content Creation','Hobby','cherry'],
 ['Mochi bites','Skiing','Hobby','mochi-bites']
].map(([flavor,name,category,asset],i)=>({flavor,name,category,asset,color:colors[i%6]}));
const awards=[{flavor:'Hot fudge',name:'1st Place',category:'Award',details:'Undergraduate Consulting Club Case Competition',date:'December 2025',color:'#815846'},{flavor:'Peanut butter',name:'2nd Place',category:'Award',details:'180 Degrees Consulting × BNY Case Competition',date:'November 2025',color:'#d5ad6b'},{flavor:'Whipped cream',name:'Gold Award',category:'Award',details:'President’s Volunteer Service Award',date:'National Service Honor',color:'#fff4dc'}];
const sections=[{name:'Flavors',title:'A scoop of what I do.',kicker:'THE FLAVOR CASE · PROJECTS',description:'Every flavor has a story. Pick one to take a peek.',caption:'SMALL BATCH PROJECTS',items:[]},{name:'Toppings',title:'The little things I love.',kicker:'THE TOPPING BAR · HOBBIES & SKILLS',description:'A sprinkle of personality, a handful of skills.',caption:'HOBBIES & SKILLS',items:toppings},{name:'Drizzles',title:'A sweet finishing touch.',kicker:'THE DRIZZLE STATION · AWARDS',description:'A few proud moments, poured with a little extra love.',caption:'AWARDS & RECOGNITION',items:awards}];
let current=0,lastTrigger;
function art(item,kind,index){
 const asset=kind===0?flavorAssets[index]:kind===1?item.asset:['hot-fudge-bottle','peanut-butter-bottle','whipped-cream-dispenser'][index];
 return `<img class="food-art" src="assets/shop/${asset}.${kind===2?'png':'jpg'}" alt="" loading="lazy" width="512" height="512">`;
}
function render(index){
 current=(index+3)%3;const s=sections[current];
 ['title','kicker','description','caption'].forEach(key=>$('#'+key).textContent=s[key]);
 $('#items').className=s.name.toLowerCase();
 $('#items').innerHTML=s.items.map((item,i)=>`<button class="treat" data-item="${i}" aria-label="${e(item.flavor)}: ${e(item.name)}">${art(item,current,i)}<span class="flavor">${e(item.flavor)}</span><span class="item-name">${e(item.name)}</span></button>`).join('');
 document.querySelectorAll('[data-section]').forEach(button=>{if(Number(button.dataset.section)===current)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')});
 for(const [id,offset] of [['previous',-1],['next',1]]){const name=sections[(current+offset+3)%3].name;$('#'+id).setAttribute('aria-label','Go to '+name.toLowerCase());$('#'+id+' small').textContent=name;}
}
function show(html,trigger,nutrition=false){lastTrigger=trigger;$('#content').className=nutrition?'nutrition':'label';$('#content').innerHTML=html;$('dialog').showModal();$('#close').focus()}
$('#items').addEventListener('click',event=>{const button=event.target.closest('[data-item]');if(!button)return;const item=sections[current].items[Number(button.dataset.item)];if(current===0){show(`<p class="facts">Project Facts</p><div class="serving">Flavor: ${e(item.flavor)} · Serving size: 100 g</div><h2 id="dialog-title">${e(item.name)}</h2><div class="fact-row"><strong>Category</strong><span>${e(item.category)}</span></div><div class="fact-row"><strong>Made during / type</strong><span>${e(item.date)}</span></div><div class="fact-row"><strong>Role / ingredients</strong><span>${e(item.role)}</span></div><p>${e(item.details)}</p>${item.url?`<a href="${e(item.url)}" target="_blank" rel="noopener noreferrer">Explore this project ↗</a>`:''}`,button,true)}else{show(`<p class="eyebrow">${e(item.category)}</p><p class="note">${e(item.flavor)}</p><h2 id="dialog-title">${e(item.name)}</h2>${item.details?`<p>${e(item.details)}</p><p class="eyebrow">${e(item.date)}</p>`:''}`,button)}});
$('#explore').addEventListener('click',()=>{stopGreeting();$('#welcome').hidden=true;$('#shop').hidden=false;render(0);$('#title').focus({preventScroll:true});window.scrollTo(0,0)});
$('#home').addEventListener('click',()=>{$('#shop').hidden=true;$('#welcome').hidden=false;startGreeting();$('#explore').focus();window.scrollTo(0,0)});
$('#previous').addEventListener('click',()=>render(current-1));$('#next').addEventListener('click',()=>render(current+1));
 document.querySelectorAll('[data-section]').forEach(button=>button.addEventListener('click',()=>render(Number(button.dataset.section))));
$('#close').addEventListener('click',()=>$('dialog').close());$('dialog').addEventListener('close',()=>lastTrigger?.focus());
$('dialog').addEventListener('click',event=>{if(event.target===$('dialog')){const r=$('dialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('dialog').close()}});
$('#about').addEventListener('click',event=>show('<img class="shopkeeper-photo" src="iris-hao-portrait.jpg" alt="Iris Hao by the water with the sunset behind her"><p class="eyebrow">MEET THE SHOPKEEPER</p><h2 id="dialog-title">Hi, I’m Iris.</h2><p>I’m a business student at Carnegie Mellon University interested in entrepreneurship, strategy, and innovation. I’m also looking to pursue an additional major in Human-Computer Interaction.</p><p>I love product design and development, using technology to create a better user experience, and client-facing consulting work that combines problem solving with communication.</p>',event.currentTarget));
fetch('assets/projects.json').then(response=>{if(!response.ok)throw new Error('Could not load projects');return response.json()}).then(projects=>{sections[0].items=projects.map((p,i)=>({...p,flavor:flavors[i],color:colors[i]}));render(current)}).catch(()=>{$('#items').innerHTML='<p>Projects could not load. Please refresh the page.</p>'});
render(0);

// The sign arrives first; the greeting follows without repeated screen-reader announcements.
const greeting = 'Hi, I’m Iris. Welcome to my little corner of the internet.';
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
let greetingTimer;
function stopGreeting() {
 clearTimeout(greetingTimer);
 $('#welcome').classList.remove('is-entering');
}
function startGreeting() {
 stopGreeting();
 const output = $('#typed-greeting');
 output.classList.remove('is-typing');
 if (motionPreference.matches) { output.textContent = greeting; return; }
 output.textContent = '';
 // Restart the hanging logo sign when returning from the shop.
 void $('#welcome').offsetWidth;
 $('#welcome').classList.add('is-entering');
 let position = 0;
 function typeNext() {
  output.classList.add('is-typing');
  output.textContent = greeting.slice(0, ++position);
  if (position < greeting.length) greetingTimer = setTimeout(typeNext, 38);
  else output.classList.remove('is-typing');
 }
 greetingTimer = setTimeout(typeNext, 1300);
}
motionPreference.addEventListener('change', () => {
 if (!$('#welcome').hidden) startGreeting();
});
startGreeting();
