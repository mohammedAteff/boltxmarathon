import {$,esc,bdi,request,post,appUrl,avatar} from './common.js';

const root=$('#panel'), status=$('#admin-status'), dialog=$('#editor'), editor=$('#editor-body');
const url=new URL(location.href);
const selected={wheel:Number(url.searchParams.get('wheel'))||1,boxes:Number(url.searchParams.get('event'))||2};
let tab=url.searchParams.has('event')&&!url.searchParams.has('wheel')?'boxes':'wheel';
if(['wheel','boxes','settings'].includes(url.searchParams.get('tab'))) tab=url.searchParams.get('tab');
let state, saving=false, loading, formVersion, settingsDirty=false, pendingPlayer=Number(url.searchParams.get('player'));

const attrs=data=>Object.entries(data).map(([key,value])=>' data-'+key+'="'+esc(value)+'"').join('');
const action=(title,name,data={},confirm='',kind='',disabled=false)=>'<button type="button" class="'+kind+'"'+attrs({action:name,...data,...(confirm?{confirm}:{})})+(disabled?' disabled':'')+'>'+esc(title)+'</button>';
const edit=(title,editor,id='',kind='')=>'<button type="button" class="'+kind+'"'+attrs({editor,id})+'>'+esc(title)+'</button>';
const input=(title,name,value='',{type='text',min=0,max=120,optional=false}={})=>
    '<label>'+esc(title)+'<input name="'+name+'" value="'+esc(value??'')+'" type="'+type+'" '+(type==='number'?'min="'+min+'" max="'+max+'"':'maxlength="'+max+'" dir="auto"')+(optional?'':' required')+'></label>';
const num=(title,name,value,max,min=0,optional=false)=>input(title,name,value,{type:'number',min,max,optional});
const select=(title,name,value,options)=>'<label>'+esc(title)+'<select name="'+name+'">'+options.map(([id,text])=>'<option value="'+esc(id)+'" '+(String(id)===String(value??'')?'selected':'')+'>'+esc(text)+'</option>').join('')+'</select></label>';
const yes=(title,name,value,on='On',off='Off')=>select(title,name,value,[[1,on],[0,off]]);
const row=(...items)=>'<div class="actions">'+items.join('')+'</div>';
const form=(name,body,id='',submit='Save')=>'<form class="editor-form" data-form="'+name+'">'+(id?'<input type="hidden" name="id" value="'+id+'">':'')+body+'<div class="form-end"><button class="primary">'+esc(submit)+'</button></div></form>';
const section=(title,body,buttons='')=>'<section class="panel"><div class="section-heading"><h2>'+esc(title)+'</h2>'+buttons+'</div>'+body+'</section>';
const empty=text=>'<p class="empty-state">'+esc(text)+'</p>';
const table=(headers,body)=>'<div class="table-scroll"><table><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table></div>';
const link=(text,kind,display=false)=>'<a class="dashboard-link" target="_blank" rel="noopener" href="'+appUrl(kind==='wheel'?'wheel.php':'boxes.php')+'?game='+selected[kind]+(display?'&amp;display=1':'')+'">'+esc(text)+' ↗</a>';
const currentGame=()=>state.games.find(g=>g.id===selected[tab]);
const unit=(title,id,mode,confirm='')=>action(title,'unit',{id,mode},confirm);
const counts=id=>state.units.filter(u=>u.item_id===id);

function gameToolbar(){
    const noun=tab==='wheel'?'wheel':'event';
    const options=state.games.filter(g=>g.kind===tab).map(g=>[g.id,g.name]);
    return '<section class="panel game-toolbar"><div class="game-picker">'+select(tab==='wheel'?'Selected wheel':'Selected box event','game-picker',selected[tab],options)+
        edit('New '+noun,'new-game','','primary')+edit('Rename','rename-game')+'</div>'+
        row(link('Open live game',tab),link('Display only',tab,true))+'</section>';
}
function playerCard(p){
    const current=p.id===state.current, full=p.max>0&&p.items.length>=p.max;
    return '<article class="operator-player'+(current?' is-current':'')+'"><header>'+avatar(p,state.version)+'<div><h3>'+bdi(p.name)+'</h3><p class="muted">'+p.items.length+' / '+(p.max||'∞')+' items · '+(current?'Current turn':!p.active?'Inactive':full?'At capacity':'Ready')+'</p></div></header>'+
        row(!current&&p.active&&!full?action('Set turn','player_turn',{id:p.id}):'',edit('Manage','player',p.id),edit('Items','player-items',p.id))+'</article>';
}
function wheel(){
    const current=state.players.find(p=>p.id===state.current);
    const quantities=new Map(state.pool.map(i=>[i.id,i.qty]));
    const assigned=new Map();
    for(const u of state.units) if(u.status==='assigned') assigned.set(u.item_id,(assigned.get(u.item_id)||0)+1);
    const items=state.items.map(i=>'<tr><td>'+bdi((i.icon?i.icon+' ':'')+i.name)+'</td><td>'+ (quantities.get(i.id)||0)+'</td><td>'+(assigned.get(i.id)||0)+'</td><td>'+edit('Edit','item',i.id)+'</td></tr>').join('');
    return gameToolbar()+
        section('Live wheel','<p class="muted">'+(current?'Current turn: '+bdi(current.name):'No eligible player')+' · '+state.remaining+' available'+(state.last?' · Last result: '+bdi(state.last.item.name):'')+'</p>',
            row(action('Spin','spin',{},'','primary',!current||!state.remaining),action('Undo spin','undo',{},'Reverse the latest spin and return its item?','',!state.last),edit('Round controls','wheel-round')))+
        section('Wheel items',items?table(['Item','Available','Assigned','Actions'],items):empty('Add the first item to this wheel.'),edit('+ Add item','new-item','','primary'))+
        section('Players',state.players.length?'<div class="operator-grid">'+state.players.map(playerCard).join('')+'</div>':empty('Add players to enable spins and show their cards on the live wheel.'),edit('+ Add player','new-player','','primary'))+
        activity(e=>e.game_id===selected.wheel&&e.action!=='settings');
}
function boxes(){
    const body=state.boxes.map(b=>'<tr><td>#'+b.number+'</td><td>'+bdi((b.icon?b.icon+' ':'')+b.text)+'</td><td><span class="table-state">'+(b.opened_at?'Revealed':'Sealed')+'</span></td><td>'+
        row(b.opened_at?action('Seal','box_close',{id:b.id}):action('Reveal','box_open',{id:b.id}),edit('Edit','box',b.id))+'</td></tr>').join('');
    return gameToolbar()+section('Boxes · '+state.boxes.length,body?table(['Box','Challenge','Status','Actions'],body):empty('Add the first box to this event.'),row(edit('Event controls','box-round'),edit('+ Add box','new-box','','primary')))+
        activity(e=>e.game_id===selected.boxes);
}
function activity(filter){
    const history=state.history.filter(filter);
    if(!history.length) return '';
    const entries=history.map(e=>{
        const d=JSON.parse(e.detail);
        const summary=e.action==='spin'?d.player.name+' → '+d.item.name:d.text||d.name||(d.id?'#'+d.id:'');
        return '<div class="row">'+row('<strong>'+esc(e.action.replaceAll('_',' '))+'</strong>','<time>'+esc(e.created_at)+'</time>',
            e.action==='spin'&&!e.undone&&e.reversible?action('Undo this spin','undo',{id:e.id},'Reverse this spin and return its exact item?'):'')+
            (summary?bdi(summary):'')+'</div>';
    }).join('');
    return '<details class="panel activity"><summary>Activity</summary><div class="history">'+entries+'</div></details>';
}
function settings(){
    const s=state.settings;
    return section('Game settings',form('settings',num('Default player limit (0 = unlimited)','default_limit',s.default_limit,500)+
        num('Spin duration (ms)','spin_ms',s.spin_ms,12000,500)+num('Result popup duration (ms)','result_ms',s.result_ms,60000)+
        num('Box opening duration (ms)','box_ms',s.box_ms,8000,150)+num('Effects (0–100)','intensity',s.intensity,100)+
        yes('Animation','motion',s.motion)+yes('Sound','sound',s.sound)+yes('Fullscreen control','fullscreen',s.fullscreen))+
        '<p class="muted">These settings apply to all games. Set the result duration to 0 to keep popups open until dismissed.</p>');
}
function playerForm(p={}){
    const next=Math.max(0,...state.players.map(p=>p.position))+1;
    return form('player_save',input('Name','name',p.name,{max:100})+
        num('Item limit (blank = default, 0 = unlimited)','cap',p.cap,500,0,true)+
        num('Turn order','position',p.position??next,100000)+yes('Status','active',p.active??1,'Active','Inactive'),p.id,p.id?'Save player':'Add player');
}
function playerItems(p){
    const inventory=p.items.map(u=>'<div class="chip">'+bdi(u.icon+' '+u.name)+unit('Return to wheel',u.id,'return')+
        unit('Copy to wheel',u.id,'copy')+unit('Remove',u.id,'remove_player','Remove this item without returning it to the wheel?')+'</div>').join('');
    return (inventory||empty('No assigned items.'))+form('assign','<input type="hidden" name="player_id" value="'+p.id+'">'+
        select('Wheel item','item_id','',[['','Create a new item'],...state.items.map(i=>[i.id,i.name])])+
        input('New item name','name','',{optional:true})+input('Icon','icon','',{max:24,optional:true}),'','Assign item')+
        action('Clear player items','player_clear',{id:p.id},'Remove all items from this player’s collection?','danger');
}
function itemForm(i={}){
    const existing=i.id?counts(i.id):[];
    const quantity=i.id?existing.filter(u=>u.status==='available').length:1;
    const removed=existing.filter(u=>u.status==='removed');
    return form(i.id?'item_save':'wheel_add',input('Item name','name',i.name)+num('Available quantity','qty',quantity,Math.max(500,quantity),i.id?0:1)+
        input('Icon (optional)','icon',i.icon,{max:24,optional:true}),i.id,i.id?'Save item':'Add item')+
        (removed.length?'<details><summary>Restore removed units ('+removed.length+')</summary>'+removed.map(u=>'<div class="chip">Unit #'+u.id+unit('Restore',u.id,'restore')+'</div>').join('')+'</details>':'');
}
function boxForm(b={}){
    const next=Math.max(0,...state.boxes.map(b=>b.number))+1;
    const text='<label>Challenge text<textarea name="text" dir="auto" maxlength="600" rows="4" required>'+esc(b.text??'')+'</textarea></label>';
    return form('box_save',text+input('Icon (optional)','icon',b.icon,{max:24,optional:true})+
        num('Box number','number',b.number??next,2147483647,1),b.id,b.id?'Save box':'Add box')+
        (b.id&&state.challenges.length>1?'<details><summary>Use an existing challenge</summary>'+
            form('box_save','<input type="hidden" name="number" value="'+b.number+'">'+
                select('Challenge','challenge_id',b.challenge_id,state.challenges.map(c=>[c.id,c.text.slice(0,90)])),b.id,'Assign challenge')+'</details>':'')+
        (b.id?row(!b.opened_at?action('Mark revealed quietly','box_mark',{id:b.id}):'',action('Remove box','box_delete',{id:b.id},'Remove this box from the event?','danger')):'');
}
function openEditor(kind,id){
    const p=state.players.find(p=>p.id===id), i=state.items.find(i=>i.id===id), b=state.boxes.find(b=>b.id===id);
    let title, body;
    if(kind==='new-game'||kind==='rename-game'){
        const noun=tab==='wheel'?'wheel':'box event', creating=kind==='new-game';
        title=(creating?'New ':'Rename ')+noun;
        body=form(creating?'game_create':'game_rename','<input type="hidden" name="kind" value="'+tab+'">'+
            input('Name','name',creating?'':currentGame().name,{max:100}),'',creating?'Create '+noun:'Save name');
    }else if(kind==='new-item'||kind==='item'){
        title=i?'Edit item':'Add item'; body=itemForm(i);
    }else if(kind==='new-box'||kind==='box'){
        title=b?'Edit box #'+b.number:'Add box'; body=boxForm(b);
    }else if(kind==='new-player'||kind==='player'){
        title=p?'Manage '+p.name:'Add player'; body=playerForm(p);
        if(p) body+=form('avatar','<label>Player photo<input required type="file" name="image" accept="image/jpeg,image/png,image/webp"></label>',p.id,'Upload photo')+
            row(p.photo?action('Remove photo','avatar',{id:p.id}):'',action('Remove player','player_delete',{id:p.id},'Remove this player and their collection?','danger'));
    }else if(kind==='player-items'&&p){
        title=p.name+' · Items'; body=playerItems(p);
    }else if(kind==='wheel-round'){
        title='Wheel round controls'; body=row(
            action('Restore removed items','wheel_reset',{mode:'wheel'},'Return all removed units to this wheel?'),
            action('Return player items','wheel_reset',{mode:'players'},'Return all assigned items to this wheel?'),
            action('Reset wheel and players','wheel_reset',{mode:'both'},'Restore all items and reset turns for this wheel?','danger'),
            action('Clear player collections','collections_clear',{},'Remove assigned items without returning them to this wheel?','danger'));
    }else if(kind==='box-round'){
        title='Box event controls'; body=row(
            action('Seal all boxes','box_reset',{},'Seal all boxes in this event?'),
            action('Shuffle challenges','box_shuffle',{},'Shuffle challenges across sealed boxes in this event?'),
            action('Clear event','box_clear',{},'Permanently delete all boxes and challenges in this event?','danger'));
    }else return;
    $('#editor-title').textContent=title;
    $('#editor-error').textContent='';
    editor.innerHTML=body;
    formVersion=state.version;
    dialog.showModal();
}
function render(){
    if(!state) return;
    const activityOpen=Boolean(root.querySelector('.activity[open]'));
    root.innerHTML='<div class="group">'+({wheel,boxes,settings})[tab]()+'</div>';
    const activity=root.querySelector('.activity');
    if(activity) activity.open=activityOpen;
    document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
    root.setAttribute('aria-labelledby','tab-'+tab);
    if(pendingPlayer){
        const id=pendingPlayer;
        pendingPlayer=0;
        url.searchParams.delete('player');
        history.replaceState(null,'',url);
        if(tab==='wheel'&&state.players.some(p=>p.id===id)) openEditor('player',id);
    }
}
async function refresh(force=false){
    if(loading){
        if(force){await loading; return refresh(true);}
        return;
    }
    if(!force&&(saving||settingsDirty||dialog.open||root.contains(document.activeElement))) return;
    const query=new URLSearchParams({view:'admin',wheel:selected.wheel,event:selected.boxes,since:force?-1:state?.version??-1});
    let done;
    loading=new Promise(resolve=>{done=resolve;});
    try{
        const next=await request(appUrl('api.php')+'?'+query);
        if(Number(query.get('wheel'))!==selected.wheel||Number(query.get('event'))!==selected.boxes) return;
        if(!force&&(saving||settingsDirty||dialog.open||root.contains(document.activeElement))) return;
        if(next.settings){state=next; render();}
    }catch(e){status.textContent=e.message;}
    finally{loading=null;done();}
}
function storeSelection(){
    url.searchParams.set('tab',tab);
    url.searchParams.set('wheel',selected.wheel);
    url.searchParams.set('event',selected.boxes);
    history.replaceState(null,'',url);
}
async function save(data,fromDialog=false){
    if(saving||!state) return;
    saving=true;
    const version=fromDialog?formVersion:state.version;
    const game=tab==='settings'?1:selected[tab];
    const error=fromDialog?$('#editor-error'):status;
    root.inert=true;
    editor.inert=true;
    status.textContent='Saving…';
    error.textContent=fromDialog?'':'Saving…';
    try{
        if(data instanceof FormData){data.set('version',version); data.set('game',game);}
        else Object.assign(data,{version,game});
        const result=await post(data);
        settingsDirty=false;
        if(result.game){selected[tab]=result.game; storeSelection();}
        if(dialog.open) dialog.close();
        await refresh(true);
        status.textContent='Saved.';
    }catch(e){
        status.textContent='';
        error.textContent=e.message;
        if(e.message.startsWith('The game changed')){
            await refresh(true);
            if(fromDialog) error.textContent='The game changed in another tab. Close this popup and reopen it to review the latest values.';
        }
    }finally{saving=false;root.inert=false;editor.inert=false;}
}
$('.tabs').addEventListener('click',e=>{
    const target=e.target.closest('[data-tab]');
    if(!target||tab===target.dataset.tab||saving||dialog.open) return;
    if(settingsDirty&&!confirm('Discard unsaved settings?')) return;
    settingsDirty=false;
    tab=target.dataset.tab; storeSelection(); render(); refresh();
});
root.addEventListener('change',async e=>{
    if(e.target.name!=='game-picker'||saving) return;
    selected[tab]=Number(e.target.value);
    storeSelection();
    state=null;
    root.textContent='Loading game…';
    await refresh(true);
});
function click(e){
    const b=e.target.closest('[data-editor],[data-action]');
    if(!b||!state||saving) return;
    if(b.dataset.editor){openEditor(b.dataset.editor,Number(b.dataset.id));return;}
    const {confirm:prompt,...data}=b.dataset;
    if(!prompt||confirm(prompt)) save(data,dialog.open);
}
function submit(e){
    if(!e.target.dataset.form) return;
    e.preventDefault();
    const f=e.target, data=new FormData(f);
    save(f.dataset.form==='avatar'?data:{action:f.dataset.form,...Object.fromEntries(data)},dialog.open);
}
root.addEventListener('click',click);
root.addEventListener('input',()=>{if(tab==='settings') settingsDirty=true;});
editor.addEventListener('click',click);
root.addEventListener('submit',submit);
editor.addEventListener('submit',submit);
$('#editor-close').onclick=()=>dialog.close();
dialog.addEventListener('cancel',e=>{if(saving)e.preventDefault();});
await refresh(true);
setInterval(refresh,1250);
