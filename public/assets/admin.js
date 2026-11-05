import {$,esc,bdi,request,post,appUrl} from './common.js';
const root=$('#panel'),status=$('#admin-status');
let state,tab='wheel',saving=false,updating=false,dirty=false;
const fields=(pairs)=>Object.entries(pairs).map(([k,v])=>' data-'+k+'="'+esc(v)+'"').join('');
const button=(name,action,params={},confirm='',kind='')=>'<button type="button" class="'+kind+'"'+fields({action,...params,...(confirm?{confirm}:{})})+'>'+esc(name)+'</button>';
const submit=(name='Save')=>'<button class="primary">'+esc(name)+'</button>';
const input=(label,name,value='',options={})=>'<label class="'+(options.class||'')+'">'+esc(label)+'<input name="'+name+'" value="'+esc(value??'')+'" type="'+(options.type||'text')+'" '+(options.type==='number'?'min="'+(options.min??0)+'" max="'+(options.max??2147483647)+'"':'maxlength="'+(options.max??120)+'" dir="auto"')+' '+(options.optional?'':'required')+'></label>';
const num=(label,name,value,max,min=0,optional=false)=>input(label,name,value,{type:'number',max,min,optional,class:'tiny'});
const select=(label,name,value,options)=>'<label>'+esc(label)+'<select name="'+name+'">'+options.map(([v,t])=>'<option value="'+esc(v)+'" '+(String(v)===String(value??'')?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label>';
const yes=(label,key,v,on='On',off='Off')=>select(label,key,v,[[1,on],[0,off]]);
const form=(action,body,id='',className='form-row')=>'<form class="'+className+'" data-form="'+action+'">'+(id?'<input type="hidden" name="id" value="'+id+'">':'')+body+'</form>';
const box=(title,html)=>'<section class="panel"><h2>'+esc(title)+'</h2>'+html+'</section>';
const actions=(...buttons)=>'<div class="actions">'+buttons.join('')+'</div>';
const detail=(id,label,html)=>'<details data-key="'+id+'"><summary>'+esc(label)+'</summary>'+html+'</details>';
const optionItems=()=>[['','New item'],...state.items.map(i=>[i.id,i.name+' (#'+i.id+')'])];
const optionChallenges=()=>state.challenges.map(c=>[c.id,(c.icon?c.icon+' ':'')+c.text.slice(0,80)+' (#'+c.id+')']);
const unit=(name,id,mode,confirm='')=>button(name,'unit',{id,mode},confirm,confirm?'danger':'');
function playerFields(p={}){
    return input('Name','name',p.name,{max:100,class:'grow'})+num('Limit (0 = ∞)','cap',p.cap,500,0,true)+num('Order','position',p.position??(Math.max(0,...state.players.map(p=>p.position))+1),100000)+yes('Status','active',p.active??1,'Active','Inactive');
}
function player(p){
    const id=p.id, current=id===state.current;
    const collection=p.items.length?p.items.map(u=>'<div class="chip"><bdi>'+esc(u.icon+' '+u.name)+' · #'+u.id+'</bdi>'+unit('Remove only',u.id,'remove_player','Remove this unit from the player without returning it to the wheel?')+unit('Return',u.id,'return')+unit('Copy to wheel',u.id,'copy')+'</div>').join(''):'<p class="muted">No assigned items.</p>';
    return '<article class="row"><h3>'+bdi(p.name)+' · '+p.items.length+' / '+(p.max||'∞')+(current?' · Current turn':'')+(!p.active?' · Inactive':'')+'</h3>'+
      form('player_save',playerFields(p)+submit(),id)+
      '<div class="subtle">'+actions(button('Make current','player_turn',{id}),button('Clear collection','player_clear',{id},'Remove every item from this player’s collection?','danger'),button('Delete player','player_delete',{id},'Delete this player and remove their collection? Their history will be retained.','danger'))+'</div>'+
      detail('avatar'+id,'Player photo',(p.photo?'<img class="mini-photo" alt="" src="'+esc(appUrl('avatar.php'))+'?id='+id+'&amp;v='+state.version+'">':'<p class="muted">Using initials.</p>')+
       form('avatar','<label>Upload or replace photo<input required type="file" name="image" accept="image/jpeg,image/png,image/webp"></label>'+submit('Upload')+(p.photo?button('Remove photo','avatar',{id}):''),id))+
      detail('inventory'+id,'Collection and direct assignment',collection+form('assign','<input type="hidden" name="player_id" value="'+id+'">'+select('Item','item_id','',optionItems())+input('New item name','name','',{optional:true})+input('Icon','icon','',{max:24,optional:true})+submit('Assign')))+'</article>';
}
function wheel(){
    const current=state.players.find(p=>p.id===state.current);
    const groups=new Map(state.items.map(i=>[i.id,{available:[],assigned:[],removed:[]}]));
    for(const u of state.units) groups.get(u.item_id)[u.status].push(u);
    const items=state.items.map(i=>{
        const {available,assigned,removed}=groups.get(i.id);
        return '<article class="row"><h3>'+bdi(i.icon+' '+i.name)+' <span class="muted">#'+i.id+'</span></h3>'+
        form('item_save',input('Item name','name',i.name,{class:'grow'})+input('Icon','icon',i.icon,{max:24,optional:true})+num('Available','qty',available.length,Math.max(500,available.length))+submit(),i.id)+
        detail('units'+i.id,available.length+' available · '+assigned.length+' assigned · '+removed.length+' removed',
        available.map(u=>'<div class="chip"><bdi>Available #'+u.id+'</bdi>'+unit('Remove from wheel',u.id,'remove_wheel')+'</div>').join('')+
        assigned.map(u=>'<div class="chip"><bdi>Assigned #'+u.id+' · '+esc(state.players.find(p=>p.id===u.player_id)?.name||'')+'</bdi></div>').join('')+
        removed.map(u=>'<div class="chip"><bdi>Removed #'+u.id+'</bdi>'+unit('Restore to wheel',u.id,'restore')+'</div>').join(''))+'</article>';
    }).join('');
    return '<div class="group">'+box('Live wheel','<p class="muted">Current: '+(current?bdi(current.name):'No eligible player')+' · '+state.remaining+' / '+state.total+' units on wheel'+(state.last?' · Last result: '+bdi(state.last.item.name):'')+'</p>'+
        actions(button('Spin','spin',{},'','primary'),button('Undo last spin','undo',{},'Reverse the latest spin and return its item?'),button('Restore removed wheel units','wheel_reset',{mode:'wheel'},'Restore all administratively removed units to the wheel?'),button('Reset collections','wheel_reset',{mode:'players'},'Return all assigned units to the wheel and reset turn order?'),button('Reset wheel and collections','wheel_reset',{mode:'both'},'Restore removed units, return assigned units and reset turns?','danger'),button('Clear all collections','collections_clear',{},'Remove all assigned items without returning them to the wheel?','danger')))+
        '<div class="columns">'+box('Players',detail('newplayer','Add player',form('player_save',playerFields()+submit('Add player')))+'<div class="subtle">'+(state.players.map(player).join('')||'<p class="muted">Add a player to start the round.</p>')+'</div>')+
        box('Wheel items',detail('newitem','Add wheel item or quantity',form('wheel_add',select('Item','item_id','',optionItems())+input('New item name','name','',{optional:true,class:'grow'})+input('Icon','icon','',{max:24,optional:true})+num('Quantity','qty',1,500,1)+submit('Add units')))+
        '<div class="subtle">'+(items||'<p class="muted">Add items to populate the wheel.</p>')+'</div>')+'</div>'+history('Wheel activity',e=>!e.action.startsWith('box_')&&!e.action.startsWith('challenge_')&&e.action!=='settings')+'</div>';
}
function history(title,filter){
    const log=state.history.filter(filter);
    return box(title,'<div class="history">'+(log.map(e=>{
        const d=JSON.parse(e.detail);
        const summary=e.action==='spin'?(d.player.name+' → '+d.item.name):d.text||d.name||(d.spin?'Spin #'+d.spin:d.id?'#'+d.id:'');
        return '<div class="row"><div class="actions"><strong>'+esc(e.action.replaceAll('_',' '))+'</strong><time>'+esc(e.created_at)+'</time><span class="muted">'+esc(e.source)+'</span>'+
          (e.action==='spin'?(e.undone?'<span class="muted">Undone or reset</span>':e.reversible?button('Restore result to wheel','undo',{id:e.id},'Reverse this spin and return its exact unit to the wheel?'):'<span class="muted">Unit changed</span>'):'')+
          '</div><bdi>'+esc(summary)+'</bdi>'+detail('event'+e.id,'Event details','<pre style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(JSON.stringify(e.action==='spin'?{...d,pool:undefined}:d,null,2))+'</pre>')+'</div>';
    }).join('')||'<p class="muted">No activity recorded yet.</p>')+'</div>');
}
function challengeFields(c={}){
    return input('Challenge text','text',c.text,{max:600,class:'grow'})+input('Icon','icon',c.icon,{max:24,optional:true});
}
function boxFields(b={}){
    return num('Box number','number',b.number??Math.max(0,...state.boxes.map(b=>b.number))+1,2147483647,1)+select('Challenge','challenge_id',b.challenge_id??state.challenges[0]?.id,optionChallenges());
}
function boxes(){
    const latest=state.boxes.filter(b=>b.opened_at).sort((a,b)=>b.open_seq-a.open_seq)[0];
    return '<div class="group">'+box('Live mystery boxes','<p class="muted">'+state.boxes.length+' boxes · '+state.boxes.filter(b=>b.opened_at).length+' revealed'+(latest?' · Last: #'+latest.number+' '+bdi(latest.text):'')+'</p>'+actions(
      button('Seal all boxes','box_reset',{},'Close every box and keep the configured challenges?'),
      button('Shuffle assignments','box_shuffle',{},'Randomly reassign challenges among the sealed boxes?'),
      button('Clear boxes and challenges','box_clear',{},'Permanently delete all configured boxes and challenges?','danger')))+
      '<div class="columns">'+box('Challenges',form('challenge_save',challengeFields()+submit('Add challenge + box'))+'<div class="subtle">'+state.challenges.map(c=>'<article class="row">'+form('challenge_save',challengeFields(c)+submit()+button('Delete','challenge_delete',{id:c.id},'Delete this unassigned challenge?','danger'),c.id)+'</article>').join('')+'</div>')+
      box('Box assignments',(state.challenges.length?form('box_save',boxFields()+submit('Add box')):'<p class="muted">Add a challenge to create the first box.</p>')+
      '<div class="subtle">'+state.boxes.map(b=>'<article class="row"><h3>Box '+b.number+' · '+(b.opened_at?'Revealed':'Sealed')+'</h3>'+
       form('box_save',boxFields(b)+submit(),b.id)+'<div class="subtle">'+actions(b.opened_at?button('Seal / reset box','box_close',{id:b.id}):button('Open on stream','box_open',{id:b.id},'','primary'),b.opened_at?'':button('Mark revealed','box_mark',{id:b.id}),button('Remove box','box_delete',{id:b.id},'Remove this box? Its challenge will be kept.','danger'))+'</div></article>').join('')+'</div>')+'</div>'+
       history('Box activity',e=>e.action.startsWith('box_')||e.action.startsWith('challenge_'))+'</div>';
}
function settings(){
    const s=state.settings;
    return '<div class="group">'+box('Game settings',form('settings',num('Default limit (0 = ∞)','default_limit',s.default_limit,500)+
      num('Spin (ms)','spin_ms',s.spin_ms,12000,500)+num('Result popup (ms)','result_ms',s.result_ms,60000)+
      num('Box opening (ms)','box_ms',s.box_ms,8000,150)+num('Effects (0–100)','intensity',s.intensity,100)+
      yes('Animation','motion',s.motion)+yes('Sound','sound',s.sound)+yes('Fullscreen control','fullscreen',s.fullscreen)+submit('Save settings'))+
      '<p class="muted">Leave a player limit blank to use the default. A result duration of 0 keeps the popup open until dismissed. Browser audio starts after interacting with the game page.</p>')+
      box('Round controls',actions(button('Reset wheel and collections','wheel_reset',{mode:'both'},'Restore all units and reset wheel turns?','danger'),button('Reset mystery boxes','box_reset',{},'Seal all mystery boxes and keep the challenges?')))+
      history('Settings activity',e=>e.action==='settings')+'</div>';
}
function render(){
    if(!state) return;
    const open=new Set(Array.from(root.querySelectorAll('details[open]'),d=>d.dataset.key));
    const scroll=root.querySelector('.history')?.scrollTop||0;
    root.innerHTML=({wheel,boxes,settings})[tab]();
    root.querySelectorAll('details').forEach(d=>d.open=open.has(d.dataset.key));
    const log=root.querySelector('.history'); if(log) log.scrollTop=scroll;
}
async function refresh(force=false){
    if(updating){
        if(force){await updating; return refresh(true);}
        return;
    }
    if(!force&&(saving||dirty||root.contains(document.activeElement))) return;
    let finish;
    updating=new Promise(resolve=>{finish=resolve});
    try{
        const version=state?.version??-1;
        const next=await request(appUrl('api.php')+'?view=admin&since='+(force?-1:version));
        if(!force&&(saving||dirty||root.contains(document.activeElement))) return;
        if(force||next.version!==version){state=next;render();}
        if(status.textContent==='Connection lost. Retrying…') status.textContent='';
    }catch(e){status.textContent=e.message==='Sign in to continue.'?'Session expired. Sign in again.':'Connection lost. Retrying…';}
    finally{updating=false;finish();}
}
async function save(data){
    if(saving||!state) return;
    saving=true;
    root.inert=true;
    status.textContent='Saving…';
    try{
        if(data instanceof FormData) data.set('version',state.version);
        else data.version=state.version;
        await post(data);
        dirty=false; await refresh(true); status.textContent='Saved.';
    }catch(e){
        if(e.message.startsWith('The game changed')){dirty=false;await refresh(true);}
        status.textContent=e.message;
    }finally{saving=false;root.inert=false;}
}
$('.tabs').addEventListener('click',e=>{
    const target=e.target.closest('[data-tab]');
    if(!target||tab===target.dataset.tab||saving) return;
    if(dirty&&!confirm('Discard the unsaved edits in this section?')) return;
    tab=target.dataset.tab; dirty=false;
    document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b===target)));
    root.setAttribute('aria-labelledby',target.id); render(); refresh();
});
root.addEventListener('input',()=>{dirty=true});
root.addEventListener('submit',e=>{
    e.preventDefault();
    const f=e.target, fd=new FormData(f);
    if(f.dataset.form==='avatar') save(fd);
    else save({action:f.dataset.form,...Object.fromEntries(fd)});
});
root.addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');
    if(!b) return;
    const {confirm:prompt,...data}=b.dataset;
    if(prompt&&!confirm(prompt)) return;
    if(dirty&&!confirm('This action will discard unsaved edits. Continue?')) return;
    save({...data});
});
await refresh(true); setInterval(refresh,1250);
