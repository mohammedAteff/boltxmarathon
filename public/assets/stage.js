import {$,esc,bdi,csrf,request,post,icon,avatar,appUrl} from './common.js';
import './locale.js';
const view=document.body.dataset.view;
const game=Number(document.body.dataset.game);
const admin=['admin','owner'].includes(document.body.dataset.role);
const wheel=view==='wheel', operator=Boolean(csrf), reduced=matchMedia('(prefers-reduced-motion: reduce)');
const counter=$('#counter'),notice=$('#notice'),reveal=$('#reveal'),content=$('#reveal-content');
const spin=$('#spin'),undo=$('#undo'),rotor=$('#rotor'),svg=$('#segments'),grid=$('#boxes');
let state=null,version=-1,busy=false,pending=false,refreshing=false,dialogTimer,messageTimer;
let angle=0,velocity=0,frame=0,lastFrame=0,drag,held=false,preview,spinVersion;
const normalize=degrees=>((degrees%360)+360)%360;
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
$('.close',reveal).onclick=()=>{if(!pending) reveal.close();};
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
function sound(box,phase='reveal'){
    if(!state?.settings.sound || audio?.state!=='running') return;
    const tone=audio.createOscillator(), gain=audio.createGain(), t=audio.currentTime;
    const [start,end]=phase==='charge'?[95,57]:phase==='unlock'?[420,1050]:box?[240,660]:[430,920];
    tone.type=phase==='charge'?'sawtooth':'triangle'; tone.frequency.setValueAtTime(start,t); tone.frequency.exponentialRampToValueAtTime(end,t+.23);
    gain.gain.setValueAtTime(.0001,t); gain.gain.exponentialRampToValueAtTime(.12*Math.max(.001,state.settings.volume/100),t+.035); gain.gain.exponentialRampToValueAtTime(.0001,t+.46);
    tone.connect(gain).connect(audio.destination); tone.start(t); tone.stop(t+.48);
}
const palette=[['#f81aff','#6e059d'],['#a122ce','#31094b'],['#ab00ff','#3b087d'],['#f620ef','#650487'],['#8326b6','#2d063f'],['#b319f4','#480768'],['#8e2dc2','#300448']];
const point=(r,a)=>[250+Math.sin(a)*r,250-Math.cos(a)*r];
function draw(pool){
    angle=0;
    rotor.style.transform='rotate(0deg)';
    const n=pool.length, arc=2*Math.PI/(n||1);
    let defs='',segments='',labels='';
    pool.forEach((item,i)=>{
        const center=i*arc,[x1,y1]=point(249,center-arc/2),[x2,y2]=point(249,center+arc/2),[x,y]=point(n===1?0:174,center);
        const [light,dark]=palette[i%palette.length], [gx,gy]=point(260,center);
        defs+='<linearGradient id="slice-'+i+'" gradientUnits="userSpaceOnUse" x1="250" y1="250" x2="'+gx+'" y2="'+gy+'"><stop stop-color="'+light+'"/><stop offset=".82" stop-color="'+dark+'"/><stop offset="1" stop-color="'+dark+'"/></linearGradient>';
        const fill='url(#slice-'+i+')';
        segments+=n===1?'<circle data-slice="'+i+'" cx="250" cy="250" r="249" fill="'+fill+'"/>':'<path data-slice="'+i+'" d="M250 250 '+x1+' '+y1+' A249 249 0 '+(arc>Math.PI?1:0)+' 1 '+x2+' '+y2+' Z" fill="'+fill+'" stroke="#f478ff" stroke-width="1.25"/>';
        const label=Array.from(item.name), max=n>20?10:n>12?13:23, show=label.length>max?label.slice(0,max-1).join('')+'…':item.name;
        const width=Math.max(29,Math.min(n>16?57:n>10?86:132,show.length*(n>16?4.9:8.2)+17));
        const size=n>24?9:n>16?11:n>10?14:18;
        const rot=n>11?i*360/n+(i*360/n>90&&i*360/n<270?180:0):0;
        labels+='<g transform="translate('+x+' '+(n===1?135:y)+') rotate('+rot+')"><title>'+esc(item.name)+' ×'+item.qty+'</title>'+
            (item.icon&&n<=13?'<text y="-7" text-anchor="middle" font-size="33">'+esc(item.icon)+'</text>':'')+
            '<rect x="'+(-width/2)+'" y="'+(n>13?-9:10)+'" width="'+width+'" height="'+(n>13?17:27)+'" rx="12" fill="#170022" fill-opacity=".78"/><text text-anchor="middle" direction="inherit" unicode-bidi="plaintext" fill="#fff" font-family="Segoe UI,Tahoma,Arial,sans-serif" font-weight="800" font-size="'+size+'" y="'+(n>13?4:29)+'">'+esc(show)+'</text></g>';
    });
    svg.innerHTML='<defs>'+defs+'</defs>'+segments+labels+(!n?'<circle cx="250" cy="250" r="249" fill="#280b3b"/><text x="250" y="135" text-anchor="middle" fill="#f7c2ff" font-size="23">WHEEL EMPTY</text>':'');
}
function card(p,s){
    const current=s.current===p.id,full=p.max>0&&p.items.length>=p.max;
    return '<article class="player'+(current?' current':'')+(full?' full':'')+'" '+(current?'aria-current="true"':'')+'>'+avatar(p,s.version)+
        '<div class="player-head">'+(current?icon('crown'):'')+'<strong>'+bdi(p.name)+'</strong></div><div class="capacity">ITEMS <b>'+p.items.length+' <i>/ '+(p.max||'∞')+'</i></b></div>'+
        (p.items.length?'<ul class="inventory">'+p.items.map(u=>'<li>'+bdi(u.name)+(admin?'<button data-unit="'+u.id+'" aria-label="Return '+esc(u.name)+' to the wheel" type="button">×</button>':'')+'</li>').join('')+'</ul>':'<p class="empty-player">'+(full?'At capacity':'No items yet')+'</p>')+
        (operator?'<div class="live-player-actions">'+(!current&&!full?'<button type="button" data-turn="'+p.id+'">Set turn</button>':'')+
        (admin?'<a href="'+appUrl(document.body.dataset.role==='admin'?'admin/':'my/')+'?wheel='+game+'&amp;player='+p.id+'">Manage</a>':'')+'</div>':'')+'</article>';
}
function controls(){
    if(!wheel) return;
    spin.disabled=!operator||busy||pending||!!preview||!state?.current||!state?.remaining;
    undo.disabled=busy||pending||!!frame||!!drag||!!preview||!state?.last;
    document.querySelectorAll('[data-unit],[data-turn]').forEach(b=>b.disabled=busy||pending||!!frame||!!drag||!!preview);
}
function renderWheel(s){
    const p=s.players.find(p=>p.id===s.current);
    counter.innerHTML='<span>'+icon('people')+' PLAYERS</span><strong>'+s.players.length+'</strong><span class="rule"></span><span>'+icon('box')+' ITEMS</span><strong>'+s.remaining+' / '+s.total+'</strong>';
    const middle=Math.ceil(s.players.length/2);
    $('#players-left').innerHTML=s.players.filter((_,i)=>s.players.length===4?i%2===0:i<middle).map(p=>card(p,s)).join('');
    $('#players-right').innerHTML=s.players.filter((_,i)=>s.players.length===4?i%2===1:i>=middle).map(p=>card(p,s)).join('');
    const status=(i,title,value)=>'<div class="status-cell">'+icon(i)+'<span><small>'+title+'</small><b>'+value+'</b></span></div>';
    $('#status-bar').innerHTML=status('person','CURRENT PLAYER',p?bdi(p.name):'—')+status('gift','LAST RESULT',s.last?bdi(s.last.item.name):'—')+status('stack','REMAINING ITEMS',s.remaining);
    if(!frame&&!drag&&!preview) draw(s.pool);
    controls();
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
    if(motion(next)){
        rotor.style.transform='rotate('+degrees+'deg)';
        await strike(at);
    }
    result(avatar(d.player,next.version)+'<p>'+bdi(d.player.name)+' · SPIN RESULT</p><div class="reveal-icon">'+esc(d.item.icon)+'</div><h2>'+bdi(d.item.name)+'</h2>',sum(next.settings.result_ms));
    busy=false;
}
async function strike(index){
    const surface=rotor.parentElement, winner=$('[data-slice="'+index+'"]',svg);
    surface.classList.add('landed');
    winner?.classList.add('winning-slice');
    await sleep(480);
    surface.classList.remove('landed');
    winner?.classList.remove('winning-slice');
}
function rotation(value){
    angle=value;
    rotor.style.transform='rotate('+angle+'deg)';
}
function beginMotion(){
    if(!frame&&!drag) spinVersion=version;
}
function kick(){
    if(spin.disabled||drag) return;
    beginMotion();
    const {impulse,max_speed}=state.settings;
    velocity=Math.max(-max_speed,Math.min(max_speed,velocity+(velocity<0?-impulse:impulse)));
    if(!frame){lastFrame=performance.now();frame=requestAnimationFrame(roll);}
    controls();
}
function roll(now){
    const dt=Math.min(.05,(now-lastFrame)/1000);
    lastFrame=now;
    const {friction,max_speed,impulse,spin_ms}=state.settings;
    if(held) velocity=Math.max(-max_speed,Math.min(max_speed,velocity+(velocity<0?-1:1)*impulse*2*dt));
    const damping=friction*4600/spin_ms;
    velocity*=Math.exp(-damping*dt);
    rotation(angle+velocity*dt);
    if(!held&&Math.abs(velocity)<24){
        frame=0;
        settle();
    }else frame=requestAnimationFrame(roll);
}
async function settle(){
    if(version!==spinVersion){
        velocity=0; draw(state.pool); controls();
        noticeText('The wheel changed. Spin again.',true); return;
    }
    const step=360/state.pool.length;
    const index=Math.round(normalize(-angle)/step)%state.pool.length;
    const center=-index*step;
    const delta=normalize(center-angle+180)-180;
    const player=state.players.find(p=>p.id===state.current), item=state.pool[index];
    velocity=0;
    if(!player||!item) return;
    busy=true; controls();
    if(motion()){
        const slide=rotor.animate([{transform:'rotate('+angle+'deg)'},{transform:'rotate('+(angle+delta)+'deg)'}],{duration:260,easing:'ease-out',fill:'forwards'});
        await slide.finished.catch(()=>{});
        rotation(angle+delta); slide.cancel();
        await strike(index);
    }else rotation(angle+delta);
    if(version!==spinVersion){
        busy=false; draw(state.pool); controls(); noticeText('The wheel changed. Spin again.',true); return;
    }
    const bytes=crypto.getRandomValues(new Uint8Array(16));
    preview={item,player,angle:normalize(angle),version:spinVersion,request_id:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')};
    busy=false; controls();
    sound(false);
    if(state.settings.accept_mode==='automatic'){await acceptPreview();return;}
    result(avatar(player,version)+'<p>'+bdi(player.name)+' · <span>Proposed result</span></p><div class="reveal-icon">'+esc(item.icon)+'</div><h2>'+bdi(item.name)+'</h2>'+
        '<div class="result-actions"><button type="button" data-accept>Accept &amp; assign</button><button type="button" data-again>Spin again</button></div>');
}
async function acceptPreview(){
    if(!preview||pending) return;
    const {item,player,angle:stopped,version:seen,request_id}=preview;
    pending=true; controls();
    const accept=$('[data-accept]',reveal);
    if(accept) accept.disabled=true;
    try{
        const saved=await post({action:'spin_accept',source:'presenter',game,item_id:item.id,player_id:player.id,angle:stopped,version:seen,request_id});
        // The operator already saw this result. Other screens still play its event.
        localSpin=saved.version;
        preview=null;
        if(reveal.open) reveal.close();
        await sync();
        noticeText('Result assigned.',true);
    }catch(e){
        if(e.message.startsWith('The game changed')||e.message.includes('Spin again')){
            preview=null; if(reveal.open) reveal.close();
            await sync(); draw(state.pool);
            noticeText(e.message,true);
        }else{
            if(accept) accept.disabled=false;
            const error=$('.accept-error',content)||content.appendChild(Object.assign(document.createElement('p'),{className:'accept-error'}));
            error.textContent=e.message;
            if(!reveal.open){preview=null;noticeText(e.message,true);}
        }
    }finally{pending=false;controls();}
}
let localSpin;
function pointerAngle(e){
    const rect=rotor.getBoundingClientRect();
    return Math.atan2(e.clientY-rect.top-rect.height/2,e.clientX-rect.left-rect.width/2)*180/Math.PI;
}
function bindWheelPhysics(){
    const surface=rotor.parentElement;
    if(operator) surface.classList.add('wheel-interactive');
    surface.addEventListener('pointerdown',e=>{
        if(spin.disabled||drag||e.button!==0) return;
        if(!frame) beginMotion();
        cancelAnimationFrame(frame);frame=0;velocity=0;
        drag={id:e.pointerId,last:pointerAngle(e),time:performance.now(),travel:0};
        surface.setPointerCapture(e.pointerId);
        controls();
    });
    surface.addEventListener('pointermove',e=>{
        if(drag?.id!==e.pointerId) return;
        const current=pointerAngle(e),now=performance.now();
        const delta=(normalize(current-drag.last+180)-180)*state.settings.drag_sensitivity;
        const instantaneous=delta*1000/Math.max(8,now-drag.time);
        velocity=.42*velocity+.58*instantaneous;
        rotation(angle+delta);
        drag={...drag,last:current,time:now,travel:drag.travel+Math.abs(delta)};
    });
    function release(e){
        if(drag?.id!==e.pointerId) return;
        const {travel,time}=drag;drag=null;
        if(!travel||e.type==='pointercancel'){velocity=0;controls();return;}
        if(performance.now()-time>100) velocity=0;
        const limit=state.settings.max_speed;
        velocity=Math.max(-limit,Math.min(limit,velocity));
        lastFrame=performance.now();frame=requestAnimationFrame(roll);
    }
    surface.addEventListener('pointerup',release);
    surface.addEventListener('pointercancel',release);
    spin.addEventListener('pointerdown',e=>{
        if(spin.disabled||e.button!==0) return;
        spin.setPointerCapture(e.pointerId);held=true;kick();
    });
    for(const name of ['pointerup','pointercancel','lostpointercapture']) spin.addEventListener(name,()=>{held=false;});
    spin.addEventListener('click',e=>{if(e.detail===0) kick();});
    reveal.addEventListener('click',e=>{
        if(e.target.closest('[data-accept]')) acceptPreview();
        if(e.target.closest('[data-again]')&&!pending){preview=null;reveal.close();controls();kick();}
    });
    reveal.addEventListener('cancel',e=>{if(pending)e.preventDefault();});
    reveal.addEventListener('close',()=>{if(preview&&!pending){preview=null;controls();}});
}
const crateUrl=esc(appUrl('assets/crate.svg'));
const crateMarkup='<span class="crate-glow"></span><svg class="lid" viewBox="0 0 200 170" aria-hidden="true"><use href="'+crateUrl+'#lid"/></svg><span class="paper" hidden></span><svg class="base" viewBox="0 0 200 170" aria-hidden="true"><use href="'+crateUrl+'#base"/></svg><svg class="crate-key" viewBox="0 0 100 50" aria-hidden="true"><path d="M38 25h54v9H80v8h-9V31H38m0-6a15 15 0 1 1-30 0 15 15 0 1 1 30 0Z"/></svg><span class="crate-sparks" aria-hidden="true"></span><span class="number"></span>';
const boxReveals=[];
function showBoxResult(box,ms=0){
    if(box.scratch_pending){
        result('<div class="paper-modal scratch-modal"><p style="color:inherit">Scratch to reveal</p><div class="scratch-area">'+
            (operator?'<h2>'+bdi(box.scratch_text||'')+'</h2><canvas width="420" height="200" aria-hidden="true"></canvas>':'<h2>Waiting for reveal</h2>')+
            '</div>'+(operator?'<button type="button" data-reveal-box>Reveal challenge</button>':'')+'</div>');
        reveal.dataset.scratchBox=box.id;
        if(operator) bindScratch(box);
        return;
    }
    delete reveal.dataset.scratchBox;
    result('<div class="paper-modal"><p style="color:inherit">BOX '+box.number+'</p><div class="reveal-icon">'+esc(box.icon)+'</div><h2>'+bdi(box.text)+'</h2></div>',ms);
}
function bindScratch(box){
    const canvas=$('canvas',reveal),ctx=canvas.getContext('2d',{willReadFrequently:true});
    const fill=ctx.createLinearGradient(0,0,canvas.width,canvas.height);
    fill.addColorStop(0,'#251045');fill.addColorStop(.5,'#9260be');fill.addColorStop(1,'#39165b');
    ctx.fillStyle=fill;ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#f3dcff';ctx.textAlign='center';ctx.font='bold 48px sans-serif';
    ctx.fillText('ϟ BOLTX',canvas.width/2,canvas.height/2+16);
    ctx.globalCompositeOperation='destination-out';
    ctx.lineWidth=36;ctx.lineCap='round';ctx.lineJoin='round';
    let pointer,last,submitting=false;
    const finish=async()=>{
        if(submitting) return;
        submitting=true;
        try{
            await post({action:'box_reveal',source:'presenter',game,id:box.id,sequence:box.open_seq});
            await sync();
        }catch(e){
            submitting=false;
            const p=$('.scratch-error',content)||content.appendChild(Object.assign(document.createElement('p'),{className:'scratch-error'}));
            p.textContent=e.message;
        }
    };
    $('[data-reveal-box]',reveal).onclick=finish;
    function erase(e){
        const rect=canvas.getBoundingClientRect();
        const next=[(e.clientX-rect.left)*canvas.width/rect.width,(e.clientY-rect.top)*canvas.height/rect.height];
        ctx.beginPath();ctx.moveTo(...(last||[next[0]-.1,next[1]]));ctx.lineTo(...next);ctx.stroke();last=next;
    }
    canvas.onpointerdown=e=>{pointer=e.pointerId;last=null;canvas.setPointerCapture(pointer);erase(e);};
    canvas.onpointermove=e=>{if(pointer===e.pointerId&&!submitting) erase(e);};
    canvas.onpointerup=e=>{
        if(pointer!==e.pointerId) return;
        pointer=null;
        const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let total=0,clear=0;
        for(let i=3;i<pixels.length;i+=32){total++;if(!pixels[i]) clear++;}
        if(clear*100/total>=state.settings.scratch_threshold) finish();
    };
    canvas.onpointercancel=()=>{pointer=null;};
}
function showNextBox(){
    if(reveal.open || !boxReveals.length) return;
    const {box,ms}=boxReveals.shift();
    showBoxResult(box,ms);
}
if(!wheel) reveal.addEventListener('close',showNextBox);
function setBox(el,b,latest,opened){
    el.classList.toggle('open',opened); el.classList.toggle('latest',opened&&b.open_seq===latest);
    el.disabled=(!operator&&!opened);
    el.setAttribute('aria-label','Box '+b.number+(opened&&!b.scratch_pending?': '+b.text:''));
    $('.number',el).textContent=String(b.number).padStart(2,'0');
    const paper=$('.paper',el); paper.hidden=!opened;
    if(opened){
        paper.innerHTML=b.scratch_pending?'<strong>ϟ</strong><span>Scratch to reveal</span>':'<strong>'+esc(b.icon)+'</strong>'+bdi(b.text);
        paper.classList.toggle('long',Array.from(b.text||'').length>36);
        paper.classList.toggle('scratch-paper',!!b.scratch_pending);
    }
}
async function renderBoxes(s){
    counter.innerHTML=icon('box')+' BOXES <strong>'+s.boxes.length+'</strong>';
    grid.style.setProperty('--cols',s.boxes.length<=4?Math.max(1,s.boxes.length):s.boxes.length>20?6:5);
    grid.style.maxWidth=s.boxes.length<5?Math.max(210,s.boxes.length*200)+'px':'';
    grid.style.setProperty('--box-time',(motion(s)?s.settings.box_ms:0)+'ms');
    grid.style.setProperty('--burst-scale',1+s.settings.intensity/100);
    grid.style.setProperty('--burst-bright',1+s.settings.intensity/70);
    grid.classList.toggle('key-mode',s.settings.opening_mode==='key');
    const latest=Math.max(0,...s.boxes.map(b=>b.open_seq||0));
    const live=new Map(Array.from(grid.children,el=>[Number(el.dataset.id),el]));
    const openings=[];
    const revealIds=new Set((s.events||[]).map(e=>e.id));
    const newlyOpened=[];
    for(const [i,b] of s.boxes.entries()){
        let el=live.get(b.id);
        if(!el){el=document.createElement('button'); el.type='button'; el.className='crate'; el.dataset.id=b.id; el.innerHTML=crateMarkup;}
        if(grid.children[i]!==el) grid.insertBefore(el,grid.children[i]||null);
        live.delete(b.id);
        const isReveal=revealIds.has(b.open_seq);
        if(isReveal) newlyOpened.push(b);
        const animated=motion(s)&&isReveal;
        if(animated){
            setBox(el,b,latest,false); el.disabled=true; el.classList.add('charging');
            sound(true,'charge');
            openings.push(sleep(s.settings.box_ms*.44).then(async ()=>{
                el.classList.remove('charging'); el.classList.add('burst'); setBox(el,b,latest,true); sound(true,'unlock');
                await sleep(s.settings.box_ms*.56);
                el.classList.remove('burst');
                if(!b.scratch_pending) sound(true);
            }));
        } else {el.classList.remove('charging'); setBox(el,b,latest,!!b.opened_at);}
    }
    live.forEach(el=>el.remove());
    noticeText(s.boxes.length?'':'No boxes have been added yet.');
    await Promise.all(openings);
    const scratched=s.boxes.find(b=>b.id===Number(reveal.dataset.scratchBox)&&b.opened_at&&!b.scratch_pending);
    if(reveal.open&&scratched){sound(true);showBoxResult(scratched,sum(s.settings.result_ms));}
    for(const box of newlyOpened.sort((a,b)=>a.open_seq-b.open_seq)){
        boxReveals.push({box,ms:sum(s.settings.result_ms)});
    }
    showNextBox();
}
async function sync(){
    if(refreshing) return;
    refreshing=true;
    try {
        const next=await request(appUrl('api.php')+'?view='+view+'&game='+game+'&since='+version+(!operator?'&display=1':''));
        if(next.version!==version){
            const events=next.events||[];
            if(wheel&&!frame&&!drag&&!preview&&!busy) for(const e of events) if(e.id!==localSpin) await animateSpin(e,next);
            state=next; version=next.version;
            if(game!==(wheel?1:2)) {$('#game-name').dataset.userText='';$('#game-name').textContent=next.game_name;}
            document.body.classList.toggle('no-motion',!next.settings.motion);
            full.hidden=!next.settings.fullscreen||!operator||!document.fullscreenEnabled;
            if(wheel) renderWheel(next); else await renderBoxes(next);
        }else if(notice.textContent==='Connection lost. Reconnecting…') noticeText('');
    } catch(e){noticeText(e.message.startsWith('Challenge unavailable')?e.message:'Connection lost. Reconnecting…');}
    finally{refreshing=false; controls();}
}
async function act(action,data={}){
    if(pending||busy||!operator) return;
    pending=true; controls();
    try{await post({action,source:'presenter',version,game,...data}); await sync();}
    catch(e){await sync(); noticeText(e.message,true);}
    finally{pending=false; controls();}
}
if(wheel){
    bindWheelPhysics(); undo.onclick=()=>act('undo');
    document.body.addEventListener('click',e=>{
        const unit=e.target.closest('[data-unit]'),turn=e.target.closest('[data-turn]');
        if(unit) act('unit',{id:Number(unit.dataset.unit),mode:'return'});
        if(turn) act('player_turn',{id:Number(turn.dataset.turn)});
    });
}else{
    grid.onclick=e=>{
        const target=e.target.closest('.crate');
        const b=state?.boxes.find(b=>b.id===Number(target?.dataset.id));
        if(!b) return;
        if(b.opened_at){
            if(!target.classList.contains('burst')) showBoxResult(b);
        }else act('box_open',{id:b.id});
    };
}
await sync(); setInterval(sync,850);
