import {$,esc,bdi,csrf,request,post,icon,avatar,appUrl} from './common.js';
const view=document.body.dataset.view;
const wheel=view==='wheel', operator=Boolean(csrf), reduced=matchMedia('(prefers-reduced-motion: reduce)');
const counter=$('#counter'),notice=$('#notice'),reveal=$('#reveal'),content=$('#reveal-content');
const spin=$('#spin'),undo=$('#undo'),rotor=$('#rotor'),svg=$('#segments'),grid=$('#boxes');
let state=null,version=-1,busy=false,pending=false,refreshing=false,dialogTimer,messageTimer;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const sum=n=>Number(n)||0;
const noticeText=(msg,temporary=false)=>{
    clearTimeout(messageTimer); notice.textContent=msg;
    if(temporary) messageTimer=setTimeout(()=>{if(notice.textContent===msg) notice.textContent='';},4200);
};
function motion(s=state){return !!s?.settings.motion&&!reduced.matches}
function result(markup,ms=0){
    clearTimeout(dialogTimer);
    content.innerHTML=markup;
    if(!reveal.open) reveal.showModal();
    if(ms) dialogTimer=setTimeout(()=>reveal.close(),ms);
}
$('.close',reveal).onclick=()=>reveal.close();
reveal.addEventListener('click',e=>{if(e.target===reveal && (e.clientX<reveal.getBoundingClientRect().left||e.clientX>reveal.getBoundingClientRect().right||e.clientY<reveal.getBoundingClientRect().top||e.clientY>reveal.getBoundingClientRect().bottom)) reveal.close()});
const full=$('#fullscreen');
full.onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen().catch(()=>noticeText('Fullscreen is unavailable.',true));
let audio;
function unlockAudio(){
    if(!state?.settings.sound || !window.AudioContext) return;
    try { audio??=new AudioContext(); audio.resume().catch(()=>{}); }catch{}
}
document.addEventListener('pointerdown',unlockAudio);
document.addEventListener('keydown',unlockAudio);
function sound(box){
    if(!state?.settings.sound || audio?.state!=='running') return;
    const tone=audio.createOscillator(), gain=audio.createGain(), t=audio.currentTime;
    tone.type='triangle'; tone.frequency.setValueAtTime(box?240:430,t); tone.frequency.exponentialRampToValueAtTime(box?660:920,t+.23);
    gain.gain.setValueAtTime(.0001,t); gain.gain.exponentialRampToValueAtTime(.11,t+.035); gain.gain.exponentialRampToValueAtTime(.0001,t+.46);
    tone.connect(gain).connect(audio.destination); tone.start(t); tone.stop(t+.48);
}
const palette=[['#f81aff','#6e059d'],['#a122ce','#31094b'],['#ab00ff','#3b087d'],['#f620ef','#650487'],['#8326b6','#2d063f'],['#b319f4','#480768'],['#8e2dc2','#300448']];
const drinkColors={'🍊':'#ff9e05','🍓':'#fd2468','⚡':'#1c81ff','🥭':'#ffad03','🥤':'#6a200c','🍋':'#89db25','🧋':'#d36a0c'};
function drink(symbol){
    return '<path d="M9 -24 4 -48 16 -53" fill="none" stroke="#e5afff" stroke-width="2"/><path d="M-18 -33H18L12 12Q0 16-12 12Z" fill="'+drinkColors[symbol]+'" stroke="#ffdcff" stroke-width="2"/><path d="M-15 -30 -10 8M14 -29 9 8" fill="none" stroke="#fff" opacity=".5" stroke-width="2"/><ellipse cy="-32" rx="18" ry="4" fill="#fff" opacity=".52"/><path d="m-8 -22 7 -3 3 7-7 3zm8 10 7-3 3 7-7 3z" fill="#fff" opacity=".45"/>';
}
const point=(r,a)=>[250+Math.sin(a)*r,250-Math.cos(a)*r];
function draw(pool){
    rotor.style.transform='rotate(0deg)';
    const n=pool.length, angle=2*Math.PI/(n||1);
    let defs='',segments='',labels='';
    pool.forEach((item,i)=>{
        const center=i*angle,[x1,y1]=point(249,center-angle/2),[x2,y2]=point(249,center+angle/2),[x,y]=point(n===1?0:174,center);
        const [light,dark]=palette[i%palette.length], [gx,gy]=point(260,center);
        defs+='<linearGradient id="slice-'+i+'" gradientUnits="userSpaceOnUse" x1="250" y1="250" x2="'+gx+'" y2="'+gy+'"><stop stop-color="'+light+'"/><stop offset=".82" stop-color="'+dark+'"/><stop offset="1" stop-color="'+dark+'"/></linearGradient>';
        const fill='url(#slice-'+i+')';
        segments+=n===1?'<circle cx="250" cy="250" r="249" fill="'+fill+'"/>':'<path d="M250 250 '+x1+' '+y1+' A249 249 0 '+(angle>Math.PI?1:0)+' 1 '+x2+' '+y2+' Z" fill="'+fill+'" stroke="#f478ff" stroke-width="1.25"/>';
        const label=Array.from(item.name), max=n>20?10:n>12?13:23, show=label.length>max?label.slice(0,max-1).join('')+'…':item.name;
        const width=Math.max(29,Math.min(n>16?57:n>10?86:132,show.length*(n>16?4.9:8.2)+17));
        const size=n>24?9:n>16?11:n>10?14:18;
        const rot=n>11?i*360/n+(i*360/n>90&&i*360/n<270?180:0):0;
        labels+='<g transform="translate('+x+' '+(n===1?135:y)+') rotate('+rot+')"><title>'+esc(item.name)+' ×'+item.qty+'</title>'+
            (item.icon&&n<=13?(drinkColors[item.icon]?'<g transform="translate(0 -10) scale('+ (n>9?.62:1)+')">'+drink(item.icon)+'</g>':'<text y="-7" text-anchor="middle" font-size="33">'+esc(item.icon)+'</text>'):'')+
            '<rect x="'+(-width/2)+'" y="'+(n>13?-9:10)+'" width="'+width+'" height="'+(n>13?17:27)+'" rx="12" fill="#170022" fill-opacity=".78"/><text text-anchor="middle" direction="inherit" unicode-bidi="plaintext" fill="#fff" font-family="Segoe UI,Tahoma,Arial,sans-serif" font-weight="800" font-size="'+size+'" y="'+(n>13?4:29)+'">'+esc(show)+'</text></g>';
    });
    svg.innerHTML='<defs>'+defs+'</defs>'+segments+labels+(!n?'<circle cx="250" cy="250" r="249" fill="#280b3b"/><text x="250" y="135" text-anchor="middle" fill="#f7c2ff" font-size="23">WHEEL EMPTY</text>':'');
}
function card(p,s){
    const current=s.current===p.id,full=p.max>0&&p.items.length>=p.max;
    return '<article class="player'+(current?' current':'')+(full?' full':'')+'" '+(current?'aria-current="true"':'')+'>'+avatar(p,s.version)+
        '<div class="player-head">'+(current?icon('crown'):'')+'<strong>'+bdi(p.name)+'</strong></div><div class="capacity">ITEMS <b>'+p.items.length+' <i>/ '+(p.max||'∞')+'</i></b></div>'+
        (p.items.length?'<ul class="inventory">'+p.items.map(u=>'<li>'+bdi(u.name)+(operator?'<button data-unit="'+u.id+'" aria-label="Return '+esc(u.name)+' to the wheel" type="button">×</button>':'')+'</li>').join('')+'</ul>':'<p class="empty-player">'+(full?'At capacity':'No items yet')+'</p>')+'</article>';
}
function controls(){
    if(!wheel) return;
    spin.disabled=!operator||busy||pending||!state?.current||!state?.remaining;
    undo.disabled=busy||pending||!state?.last;
    document.querySelectorAll('[data-unit]').forEach(b=>b.disabled=busy||pending);
}
function renderWheel(s){
    const p=s.players.find(p=>p.id===s.current);
    counter.innerHTML='<span>'+icon('people')+' PLAYERS</span><strong>'+s.players.length+'</strong><span class="rule"></span><span>'+icon('box')+' ITEMS</span><strong>'+s.remaining+' / '+s.total+'</strong>';
    const middle=Math.ceil(s.players.length/2);
    $('#players-left').innerHTML=s.players.filter((_,i)=>s.players.length===4?i%2===0:i<middle).map(p=>card(p,s)).join('');
    $('#players-right').innerHTML=s.players.filter((_,i)=>s.players.length===4?i%2===1:i>=middle).map(p=>card(p,s)).join('');
    const status=(i,title,value)=>'<div class="status-cell">'+icon(i)+'<span><small>'+title+'</small><b>'+value+'</b></span></div>';
    $('#status-bar').innerHTML=status('person','CURRENT PLAYER',p?bdi(p.name):'—')+status('gift','LAST RESULT',s.last?bdi(s.last.item.name):'—')+status('stack','REMAINING ITEMS',s.remaining);
    draw(s.pool); controls();
    if(!s.remaining) noticeText('The wheel is empty.');
    else if(!p) noticeText('No active player has room for another item.');
    else if(!notice.textContent||['The wheel is empty.','No active player has room for another item.','Connection lost. Reconnecting…'].includes(notice.textContent)) noticeText('');
}
async function animateSpin(e,next){
    const d=JSON.parse(e.detail), at=d.pool.findIndex(x=>x.id===d.item.id);
    if(at<0) return;
    busy=true; controls(); draw(d.pool);
    const degrees=360*6-at*360/d.pool.length;
    if(motion(next)&&d.duration){
        const anim=rotor.animate([{transform:'rotate(0deg)',offset:0},{transform:'rotate(13deg)',offset:.1},{transform:'rotate('+degrees+'deg)',offset:1,easing:'linear'}],{duration:d.duration,fill:'forwards',easing:'cubic-bezier(.4,.02,.1,1)'});
        await anim.finished.catch(()=>{}); rotor.style.transform='rotate('+degrees+'deg)'; anim.cancel();
    }
    sound(false);
    result(avatar(d.player,next.version)+'<p>'+bdi(d.player.name)+' · SPIN RESULT</p><div class="reveal-icon">'+esc(d.item.icon)+'</div><h2>'+bdi(d.item.name)+'</h2>',sum(next.settings.result_ms));
    if(motion(next)&&d.duration) await sleep(220);
    busy=false;
}
const crateUrl=esc(appUrl('assets/crate.svg'));
const crateMarkup='<span class="crate-glow"></span><svg class="lid" viewBox="0 0 200 170" aria-hidden="true"><use href="'+crateUrl+'#lid"/></svg><span class="paper" hidden></span><svg class="base" viewBox="0 0 200 170" aria-hidden="true"><use href="'+crateUrl+'#base"/></svg><span class="number"></span>';
function setBox(el,b,latest,opened){
    el.classList.toggle('open',opened); el.classList.toggle('latest',opened&&b.open_seq===latest);
    el.disabled=(!operator&&!opened);
    el.setAttribute('aria-label','Box '+b.number+(opened?': '+b.text:''));
    $('.number',el).textContent=String(b.number).padStart(2,'0');
    const paper=$('.paper',el); paper.hidden=!opened;
    if(opened){
        paper.innerHTML='<strong>'+esc(b.icon)+'</strong>'+bdi(b.text);
        paper.classList.toggle('long',Array.from(b.text).length>36);
    }
}
function renderBoxes(s){
    counter.innerHTML=icon('box')+' BOXES <strong>'+s.boxes.length+'</strong>';
    grid.style.setProperty('--cols',s.boxes.length<=4?Math.max(1,s.boxes.length):s.boxes.length>20?6:5);
    grid.style.maxWidth=s.boxes.length<5?Math.max(210,s.boxes.length*200)+'px':'';
    grid.style.setProperty('--box-time',(motion(s)?s.settings.box_ms:0)+'ms');
    grid.style.setProperty('--burst-scale',1+s.settings.intensity/100);
    grid.style.setProperty('--burst-bright',1+s.settings.intensity/70);
    const latest=Math.max(0,...s.boxes.map(b=>b.open_seq||0));
    const live=new Map(Array.from(grid.children,el=>[Number(el.dataset.id),el]));
    const openings=[];
    for(const [i,b] of s.boxes.entries()){
        let el=live.get(b.id);
        if(!el){el=document.createElement('button'); el.type='button'; el.className='crate'; el.dataset.id=b.id; el.innerHTML=crateMarkup;}
        if(grid.children[i]!==el) grid.insertBefore(el,grid.children[i]||null);
        live.delete(b.id);
        const animated=motion(s)&&s.events?.some(e=>e.id===b.open_seq)&&!el.classList.contains('open');
        if(animated){
            setBox(el,b,latest,false); el.disabled=true; el.classList.add('charging');
            openings.push(sleep(s.settings.box_ms*.24).then(()=>{
                if(el.dataset.seq!==String(b.open_seq)) return;
                el.classList.remove('charging'); el.classList.add('burst'); setBox(el,b,latest,true); sound(true);
                setTimeout(()=>el.classList.remove('burst'),s.settings.box_ms);
            }));
        } else {el.classList.remove('charging'); setBox(el,b,latest,!!b.opened_at);}
        el.dataset.seq=b.open_seq||'';
    }
    live.forEach(el=>el.remove());
    noticeText(s.boxes.length?'':'No boxes have been added yet.');
    return Promise.all(openings);
}
async function sync(){
    if(refreshing) return;
    refreshing=true;
    try {
        const next=await request(appUrl('api.php')+'?view='+view+'&since='+version);
        if(next.version!==version){
            const events=next.events||[];
            if(wheel) for(const e of events) await animateSpin(e,next);
            state=next; version=next.version;
            document.body.classList.toggle('no-motion',!next.settings.motion);
            full.hidden=!next.settings.fullscreen||!operator||!document.fullscreenEnabled;
            if(wheel) renderWheel(next); else await renderBoxes(next);
        }else if(notice.textContent==='Connection lost. Reconnecting…') noticeText('');
    } catch(e){noticeText('Connection lost. Reconnecting…');}
    finally{refreshing=false; controls();}
}
async function act(action,data={}){
    if(pending||busy||!operator) return;
    pending=true; controls();
    try{await post({action,source:'presenter',version,...data}); await sync();}
    catch(e){await sync(); noticeText(e.message,true);}
    finally{pending=false; controls();}
}
if(wheel){
    spin.onclick=()=>act('spin'); undo.onclick=()=>act('undo');
    document.body.addEventListener('click',e=>{const unit=e.target.closest('[data-unit]'); if(unit) act('unit',{id:Number(unit.dataset.unit),mode:'return'});});
}else{
    grid.onclick=e=>{
        const target=e.target.closest('.crate');
        const b=state?.boxes.find(b=>b.id===Number(target?.dataset.id));
        if(!b) return;
        if(b.opened_at && target.classList.contains('open')) result('<div class="paper-modal"><p style="color:inherit">BOX '+b.number+'</p><div class="reveal-icon">'+esc(b.icon)+'</div><h2>'+bdi(b.text)+'</h2></div>');
        else act('box_open',{id:b.id});
    };
}
await sync(); setInterval(sync,850);
