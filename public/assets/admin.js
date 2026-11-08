import {$,esc,bdi,request,post,appUrl,avatar} from './common.js';
import {tr} from './locale.js?v=quick-add';

const root=$('#panel'), status=$('#admin-status'), dialog=$('#editor'), editor=$('#editor-body');
const url=new URL(location.href);
const personal=document.body.dataset.dashboard==='mine';
const selected={wheel:Number(url.searchParams.get('wheel'))||0,boxes:Number(url.searchParams.get('event'))||0};
let tab=url.searchParams.has('event')&&!url.searchParams.has('wheel')?'boxes':personal&&!url.searchParams.has('wheel')?'settings':'wheel';
if(['wheel','boxes','settings'].includes(url.searchParams.get('tab'))) tab=url.searchParams.get('tab');
let state, saving=false, loading, formVersion, pendingPlayer=Number(url.searchParams.get('player'));
let pendingCreate=url.searchParams.has('create'), pendingShare=url.searchParams.has('share'), overviewKind='all',overviewStatus='all';
let issuedShare;

const attrs=data=>Object.entries(data).map(([key,value])=>' data-'+key+'="'+esc(value)+'"').join('');
const action=(title,name,data={},confirm='',kind='',disabled=false)=>'<button type="button" class="'+kind+'"'+attrs({action:name,...data,...(confirm?{confirm}:{})})+(disabled?' disabled':'')+'>'+esc(title)+'</button>';
const edit=(title,editor,id='',kind='')=>'<button type="button" class="'+kind+'"'+attrs({editor,id})+'>'+esc(title)+'</button>';
const input=(title,name,value='',{type='text',min=0,max=120,optional=false}={})=>
    '<label>'+esc(title)+'<input name="'+name+'" value="'+esc(value??'')+'" type="'+type+'" '+(type==='number'?'min="'+min+'" max="'+max+'"':'maxlength="'+max+'" dir="auto"')+(optional?'':' required')+'></label>';
const num=(title,name,value,max,min=0,optional=false)=>input(title,name,value,{type:'number',min,max,optional});
const initial=(title,name)=>'<label>'+title+'<textarea name="'+name+'" dir="auto" rows="3" maxlength="12000"></textarea></label>';
const select=(title,name,value,options)=>'<label>'+esc(title)+'<select name="'+name+'">'+options.map(([id,text])=>'<option value="'+esc(id)+'" '+(String(id)===String(value??'')?'selected':'')+'>'+esc(text)+'</option>').join('')+'</select></label>';
const yes=(title,name,value,on='On',off='Off')=>select(title,name,value,[[1,on],[0,off]]);
const expires=()=>select('Access expires','expires_days',0,[[0,'Never'],[1,'After one day'],[7,'After one week'],[30,'After 30 days']]);
const row=(...items)=>'<div class="actions">'+items.join('')+'</div>';
const details=(title,body,kind='')=>'<details class="'+kind+'"><summary>'+esc(title)+'</summary><div class="disclosure-body">'+body+'</div></details>';
const form=(name,body,id='',submit='Save',again='')=>'<form class="editor-form" data-form="'+name+'">'+(id?'<input type="hidden" name="id" value="'+id+'">':'')+body+
    '<div class="form-end"><button class="primary">'+esc(submit)+'</button>'+(again?'<button name="again" value="'+again+'">Save &amp; add another</button>':'')+'</div></form>';
const section=(title,body,buttons='')=>'<section class="panel"><div class="section-heading"><h2>'+esc(title)+'</h2>'+buttons+'</div>'+body+'</section>';
const empty=text=>'<p class="empty-state">'+esc(text)+'</p>';
const table=(headers,body)=>'<div class="table-scroll"><table><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table></div>';
const link=(text,kind,display=false,style='')=>'<a class="dashboard-link '+style+'" target="_blank" rel="noopener" href="'+appUrl(kind==='wheel'?'wheel.php':'boxes.php')+'?game='+selected[kind]+(display?'&amp;display=1':'')+'">'+esc(text)+' ↗</a>';
const currentGame=()=>state.games.find(g=>g.id===selected[tab]);
const unit=(title,id,mode,confirm='')=>action(title,'unit',{id,mode},confirm);
const counts=id=>state.units.filter(u=>u.item_id===id);

function gameToolbar(){
    const noun=tab==='wheel'?'wheel':'event';
    const options=state.games.filter(g=>g.kind===tab).map(g=>[g.id,g.name]);
    if(!options.length) return section(tab==='wheel'?'My Wheels':'My Mystery Boxes',empty('Create a challenge to get started.'),edit('New '+noun,'new-game','','primary'));
    return '<section class="panel game-toolbar"><div class="game-picker">'+select(tab==='wheel'?'Selected wheel':'Selected box event','game-picker',selected[tab],options)+
        edit('New '+noun,'new-game')+'</div>'+
        row(link('Open live game',tab,false,'launch-game'),edit('Share','share'),edit('Game settings','game-settings'))+
        details('More actions',row(edit('Rename','rename-game'),link('Display only',tab,true),
            edit(tab==='wheel'?'Round controls':'Event controls',tab==='wheel'?'wheel-round':'box-round')),'game-more')+'</section>';
}
function playerCard(p){
    const current=p.id===state.current, full=p.max>0&&p.items.length>=p.max;
    return '<article class="operator-player'+(current?' is-current':'')+'"><header>'+avatar(p,state.version)+'<div><h3>'+bdi(p.name)+'</h3><p class="muted">'+p.items.length+' / '+(p.max||'∞')+' items · '+(current?'Current turn':!p.active?'Inactive':full?'At capacity':'Ready')+'</p></div></header>'+
        row(!current&&p.active&&!full?action('Set turn','player_turn',{id:p.id}):'',edit('Manage','player',p.id),edit('Items','player-items',p.id))+'</article>';
}
function wheel(){
    if(!selected.wheel) return gameToolbar();
    const current=state.players.find(p=>p.id===state.current);
    const quantities=new Map(state.pool.map(i=>[i.id,i.qty]));
    const assigned=new Map();
    for(const u of state.units) if(u.status==='assigned') assigned.set(u.item_id,(assigned.get(u.item_id)||0)+1);
    const items=state.items.map(i=>'<tr><td>'+bdi((i.icon?i.icon+' ':'')+i.name)+'</td><td>'+ (quantities.get(i.id)||0)+'</td><td>'+(assigned.get(i.id)||0)+'</td><td>'+edit('Edit','item',i.id)+'</td></tr>').join('');
    return gameToolbar()+
        section('Live wheel','<p class="muted">'+(current?'Current turn: '+bdi(current.name):'No eligible player')+' · '+state.remaining+' available'+(state.last?' · Last result: '+bdi(state.last.item.name):'')+'</p>',
            row('<a class="dashboard-link" href="'+appUrl('list.php')+'?game='+selected.wheel+'" target="_blank" rel="noopener">View your list ↗</a>',state.last?action('Undo spin','undo',{},'Reverse the latest spin and return its item?'):''))+
        section('Wheel items',items?table(['Item','Available','Assigned','Actions'],items):empty('Add the first item to this wheel.'),edit('+ Add item','new-item','','primary'))+
        section('Players',state.players.length?'<div class="operator-grid">'+state.players.map(playerCard).join('')+'</div>':empty('Add players to enable spins and show their cards on the live wheel.'),edit('+ Add player','new-player','','primary'))+
        activity(e=>e.game_id===selected.wheel&&e.action!=='settings');
}
function boxes(){
    if(!selected.boxes) return gameToolbar();
    const body=state.boxes.map(b=>'<tr><td>#'+b.number+'</td><td>'+bdi((b.icon?b.icon+' ':'')+b.text)+'</td><td><span class="table-state">'+(b.opened_at?'Revealed':'Sealed')+'</span></td><td>'+
        row(b.opened_at?action('Seal','box_close',{id:b.id}):action('Reveal','box_open',{id:b.id}),edit('Edit','box',b.id))+'</td></tr>').join('');
    return gameToolbar()+section('Boxes · '+state.boxes.length,body?table(['Box','Challenge','Status','Actions'],body):empty('Add the first box to this event.'),edit('+ Add box','new-box','','primary'))+
        activity(e=>e.game_id===selected.boxes);
}
function activity(filter){
    const history=state.history.filter(filter);
    if(!history.length) return '';
    const entries=history.map(e=>{
        const d=JSON.parse(e.detail);
        const isSpin=['spin','spin_accept'].includes(e.action);
        const summary=isSpin?d.player.name+' → '+d.item.name:d.text||d.name||(d.id?'#'+d.id:'');
        return '<div class="row">'+row('<strong>'+esc(e.action.replaceAll('_',' '))+'</strong>','<time>'+esc(e.created_at)+'</time>',
            isSpin&&!e.undone&&e.reversible?action('Undo this spin','undo',{id:e.id},'Reverse this spin and return its exact item?'):'')+
            (summary?bdi(summary):'')+'</div>';
    }).join('');
    return '<details class="panel activity"><summary>Activity</summary><div class="history">'+entries+'</div></details>';
}
function settings(){
    const games=state.games.filter(g=>(overviewKind==='all'||g.kind===overviewKind)&&(overviewStatus==='all'||Boolean(g.archived)===(overviewStatus==='archived')));
    const body=games.map(g=>{
        const param=g.kind==='wheel'?'wheel':'event';
        const key={game:g.id,kind:g.kind};
        return '<tr><td>'+bdi(g.name)+'</td><td>'+(g.kind==='wheel'?'Spin Wheel':'Mystery Boxes')+'</td><td>'+esc(g.created_at.slice(0,10))+'</td><td>'+esc(g.updated_at.slice(0,16))+'</td><td>'+(g.archived?'Archived':'Active')+'</td><td class="challenge-actions">'+
            '<a class="dashboard-link" href="?tab='+g.kind+'&amp;'+param+'='+g.id+'">Edit challenge ↗</a>'+
            '<a class="dashboard-link" target="_blank" rel="noopener" href="'+appUrl(g.kind==='wheel'?'wheel.php':'boxes.php')+'?game='+g.id+'">Open challenge ↗</a>'+
            details('More actions',row('<a class="dashboard-link" href="?tab='+g.kind+'&amp;'+param+'='+g.id+'&amp;share=1">Share ↗</a>',
                '<button type="button"'+attrs({'share-game':g.id,'share-value':'token'})+'>Copy link</button>',
                '<button type="button"'+attrs({'share-game':g.id,'share-value':'code'})+'>Copy code</button>',
                action('Reset',g.kind==='wheel'?'wheel_reset':'box_reset',{...key,mode:'both'},'Reset this challenge’s results and restore items or boxes?'),
                action('Delete','game_delete',key,'Delete this challenge and revoke its shared links?','danger')),'game-more')+'</td></tr>';
    }).join('');
    return section('Saved challenges',row(select('Type','overview-kind',overviewKind,[['all','All games'],['wheel','Spin Wheel'],['boxes','Mystery Boxes']]),
        select('Status','overview-status',overviewStatus,[['all','All statuses'],['active','Active'],['archived','Archived']]))+
        (body?table(['Challenge','Type','Created','Last activity','Status','Actions'],body):empty('No challenges match these filters.')),
        row('<a class="dashboard-link" href="?tab=wheel&amp;create=1">New wheel ↗</a>','<a class="dashboard-link" href="?tab=boxes&amp;create=1">New box event ↗</a>'));
}
function gameSettings(){
    const s=tab==='wheel'?state.settings:state.box_settings;
    const wheelFields=num('Default player limit (0 = unlimited)','default_limit',s.default_limit,500)+
        select('Accept results','accept_mode',s.accept_mode,[['confirm','Confirm each result'],['automatic','Assign automatically']]);
    const boxFields=select('Opening animation','opening_mode',s.opening_mode,[['shake','Shake & pop'],['key','Key unlock']])+
        yes('Scratch to reveal','scratch',s.scratch);
    const wheelTuning=num('Spin duration (ms)','spin_ms',s.spin_ms,12000,500)+
        input('Friction (0.35–4)','friction',s.friction)+input('Drag sensitivity (0.4–2)','drag_sensitivity',s.drag_sensitivity)+
        num('Click momentum','impulse',s.impulse,1200,100)+num('Maximum speed','max_speed',s.max_speed,3200,360)+
        yes('Automatic turns','auto_turn',s.auto_turn);
    const boxTuning=num('Box opening duration (ms)','box_ms',s.box_ms,8000,150)+num('Scratch threshold (%)','scratch_threshold',s.scratch_threshold,90,20);
    return form('settings','<input type="hidden" name="kind" value="'+tab+'">'+(tab==='wheel'?wheelFields:boxFields)+
        select('Preferred language','language',s.language,[['en','English'],['ar','العربية']])+yes('Sound','sound',s.sound)+
        details('Advanced settings',(tab==='wheel'?wheelTuning:boxTuning)+
            num('Result popup duration (ms)','result_ms',s.result_ms,60000)+num('Effects (0–100)','intensity',s.intensity,100)+
            yes('Animation','motion',s.motion)+num('Sound volume (%)','volume',s.volume,100)+
            '<button type="button" data-sound-preview>Preview sound</button>'+yes('Fullscreen control','fullscreen',s.fullscreen),'form-disclosure'));
}
const sharedLink=token=>new URL(appUrl('open.php')+'?token='+token,location.origin).href;
const getShare=async id=>(await request(appUrl('api.php')+'?view=share&game='+id)).credentials;
function shareResult(s){
    const copy=(title,value)=>'<div class="share-field"><label>'+title+'<input readonly dir="ltr" data-user-text value="'+esc(value)+'"></label>'+
        '<button type="button" data-copy="'+esc(value)+'">Copy</button></div>';
    return copy('Private link',sharedLink(s.token))+copy('Access code',s.code)+details('Display link',copy('Read-only display link',sharedLink(s.display)));
}
function playerForm(p={}){
    const next=Math.max(0,...state.players.map(p=>p.position))+1;
    const photo='<label class="player-upload"><span class="upload-title">Player photo</span><span class="upload-preview">'+
        (p.photo?'<img alt="" src="'+appUrl('avatar.php')+'?id='+p.id+'&amp;v='+state.version+'">':'<span aria-hidden="true">+</span>')+
        '</span><input type="file" name="image" accept="image/jpeg,image/png,image/webp"><small>Optional · JPG, PNG or WebP · up to 4 MB</small></label>';
    return form('player_save',input('Name','name',p.name,{max:100})+
        photo+
        num('Item limit (blank = default, 0 = unlimited)','cap',p.cap,500,0,true)+
        details('Advanced settings',num('Turn order','position',p.position??next,100000)+yes('Status','active',p.active??1,'Active','Inactive'),'form-disclosure'),
        p.id,p.id?'Save player':'Add player',p.id?'':'new-player');
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
        details('Customize item',input('Icon (optional)','icon',i.icon,{max:24,optional:true}),'form-disclosure'),i.id,i.id?'Save item':'Add item',i.id?'':'new-item')+
        (removed.length?'<details><summary>Restore removed units ('+removed.length+')</summary>'+removed.map(u=>'<div class="chip">Unit #'+u.id+unit('Restore',u.id,'restore')+'</div>').join('')+'</details>':'');
}
function boxForm(b={}){
    const next=Math.max(0,...state.boxes.map(b=>b.number))+1;
    const text='<label>Challenge text<textarea name="text" dir="auto" maxlength="600" rows="4" required>'+esc(b.text??'')+'</textarea></label>';
    return form('box_save',text+details('Customize box',input('Icon (optional)','icon',b.icon,{max:24,optional:true})+
        num('Box number','number',b.number??next,2147483647,1),'form-disclosure'),b.id,b.id?'Save box':'Add box',b.id?'':'new-box')+
        (b.id&&state.challenges.length>1?'<details><summary>Use an existing challenge</summary>'+
            form('box_save','<input type="hidden" name="number" value="'+b.number+'">'+
                select('Challenge','challenge_id',b.challenge_id,state.challenges.map(c=>[c.id,c.text.slice(0,90)])),b.id,'Assign challenge')+'</details>':'')+
        (b.id?row(!b.opened_at||b.scratch_pending?action('Mark revealed quietly','box_mark',{id:b.id}):'',
            b.opened_at?action('Restart scratch layer','box_scratch_reset',{id:b.id}):'',action('Remove box','box_delete',{id:b.id},'Remove this box from the event?','danger')):'');
}
function openEditor(kind,id,created=false){
    const p=state.players.find(p=>p.id===id), i=state.items.find(i=>i.id===id), b=state.boxes.find(b=>b.id===id);
    let title, body;
    if(kind==='new-game'||kind==='rename-game'){
        const noun=tab==='wheel'?'wheel':'box event', creating=kind==='new-game';
        title=(creating?'New ':'Rename ')+noun;
        body=form(creating?'game_create':'game_rename','<input type="hidden" name="kind" value="'+tab+'">'+
            input('Name','name',creating?'':currentGame().name,{max:100})+
            (creating?details('Initial setup (optional)',select('Sharing permission','role','view',[['view','View only'],['play','Allow gameplay']])+expires()+
            select('Preferred language','language','en',[['en','English'],['ar','العربية']])+
            (tab==='wheel'?initial('Players, one per line','initial_players')+initial('Items, one per line','initial_items')+
                num('Default player limit (0 = unlimited)','default_limit',5,500):
                initial('Box challenges, one per line','initial_boxes')+
                select('Opening animation','opening_mode','shake',[['shake','Shake & pop'],['key','Key unlock']])+yes('Scratch to reveal','scratch',0)),
            'form-disclosure') : ''),'',creating?'Create '+noun:'Save name');
    }else if(kind==='game-settings'){
        title='Game settings'; body=gameSettings();
    }else if(kind==='share'){
        const g=currentGame();
        const options=(!g.archived?form('game_share','<input type="hidden" name="kind" value="'+tab+'">'+
            select('Sharing permission','role',g.share_role,[['view','View only'],['play','Allow gameplay']])+expires(),'',g.shared?'Rotate code and links':'Generate code and links'):'')+
            row(g.shared?action('Revoke links','game_share',{kind:tab,revoke:1},'Revoke the existing code, links, and guest sessions?','danger'):'',
                action(g.archived?'Restore challenge':'Archive challenge','game_archive',{kind:tab,archived:g.archived?0:1},g.archived?'Restore this challenge?':'Archive this challenge and revoke guest access?'));
        title=created?'Challenge Created!':'Share challenge';
        body=(created?'<p>'+bdi(g.name)+' · <span>'+(tab==='wheel'?'Spin Wheel':'Mystery Boxes')+'</span></p>':'')+
            '<div id="share-values">'+(issuedShare?.game===g.id?shareResult(issuedShare):'<p>Loading shared links…</p>')+'</div>'+
            (created?row(link('Open challenge',tab),'<button type="button" data-manage-created>Manage challenge</button>'):'')+
            (g.shared?details('Sharing options','<p>Generating new credentials revokes the previous ones.</p>'+options,'form-disclosure'):options);
    }else if(kind==='new-item'||kind==='item'){
        title=i?'Edit item':'Add item'; body=itemForm(i);
    }else if(kind==='new-box'||kind==='box'){
        title=b?'Edit box #'+b.number:'Add box'; body=boxForm(b);
    }else if(kind==='new-player'||kind==='player'){
        title=p?'Manage '+p.name:'Add player'; body=playerForm(p);
        if(p) body+=details('More actions',row(p.photo?action('Remove photo','avatar',{id:p.id}):'',action('Remove player','player_delete',{id:p.id},'Remove this player and their collection?','danger')),'game-more');
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
    $('#editor-feedback').textContent='';
    editor.innerHTML=body;
    formVersion=state.version;
    if(!dialog.open){
        dialog.showModal();
        if(!editor.inert) $('[name="name"],[name="text"]',editor)?.focus();
    }
    if(kind==='share'){
        const slot=$('#share-values',editor), game=selected[tab], issued=issuedShare;
        issuedShare=null;
        if(issued?.game!==game) getShare(game).then(credentials=>{
            if(slot.isConnected){
                slot.innerHTML=credentials?shareResult(credentials):'<p>Generate a private code and links for this challenge.</p>';
                if(!credentials&&g.shared) $('.form-disclosure',editor).open=true;
            }
        }).catch(e=>{if(slot.isConnected) slot.textContent=e.message;});
    }
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
    if(pendingCreate&&tab!=='settings'){
        pendingCreate=false; url.searchParams.delete('create'); history.replaceState(null,'',url);
        openEditor('new-game',0);
    }
    if(pendingShare&&tab!=='settings'&&selected[tab]&&!dialog.open){
        pendingShare=false; url.searchParams.delete('share'); history.replaceState(null,'',url);
        openEditor('share',0);
    }
}
async function refresh(force=false){
    if(loading){
        if(force){await loading; return refresh(true);}
        return;
    }
    const editing=()=>saving||dialog.open||root.contains(document.activeElement)||root.querySelector('.game-more[open]');
    if(!force&&editing()) return;
    const query=new URLSearchParams({view:personal?'mine':'admin',wheel:selected.wheel,event:selected.boxes,since:force?-1:state?.version??-1});
    let done;
    loading=new Promise(resolve=>{done=resolve;});
    try{
        const next=await request(appUrl('api.php')+'?'+query);
        if(Number(query.get('wheel'))!==selected.wheel||Number(query.get('event'))!==selected.boxes) return;
        if(!force&&editing()) return;
        if(next.settings){state=next; Object.assign(selected,next.selected); render();}
    }catch(e){status.textContent=e.message;}
    finally{loading=null;done();}
}
function storeSelection(){
    url.searchParams.set('tab',tab);
    url.searchParams.set('wheel',selected.wheel);
    url.searchParams.set('event',selected.boxes);
    history.replaceState(null,'',url);
}
async function save(data,fromDialog=false,again=''){
    if(saving||!state) return;
    saving=true;
    const version=fromDialog?formVersion:state.version;
    const game=data instanceof FormData?selected[tab]:Number(data.game)||(tab==='settings'?0:selected[tab]);
    const error=fromDialog?$('#editor-error'):status;
    root.inert=true;
    editor.inert=true;
    status.textContent=fromDialog?'':'Saving…';
    $('#editor-feedback').textContent=fromDialog?'Saving…':'';
    if(fromDialog) error.textContent='';
    let focusNext=false;
    try{
        if(data instanceof FormData){data.set('version',version); data.set('game',game);}
        else Object.assign(data,{version,...(game?{game}:{})});
        const result=await post(data);
        if(result.game){selected[tab]=result.game; storeSelection();issuedShare=result;}
        if(data.action==='game_delete'){
            for(const kind of ['wheel','boxes']) if(selected[kind]===game) selected[kind]=0;
            storeSelection();
        }
        if(dialog.open&&!again) dialog.close();
        await refresh(true);
        status.textContent='Saved.';
        if(result.code) openEditor('share',0,data.action==='game_create');
        if(again){
            if(state.version>=result.version){
                openEditor(again,0);
                $('#editor-feedback').textContent='Saved. Ready for the next one.';
                focusNext=true;
            }else{
                dialog.close();
                status.textContent='Saved. Reload the dashboard before adding more.';
            }
        }
    }catch(e){
        status.textContent='';
        $('#editor-feedback').textContent='';
        error.textContent=e.message;
        if(e.message.startsWith('The game changed')){
            await refresh(true);
            if(fromDialog) error.textContent='The game changed in another tab. Close this popup and reopen it to review the latest values.';
        }
    }finally{
        saving=false;root.inert=false;editor.inert=false;
        if(focusNext) $('[name="name"],[name="text"]',editor)?.focus();
    }
}
$('.tabs').addEventListener('click',e=>{
    const target=e.target.closest('[data-tab]');
    if(!target||tab===target.dataset.tab||saving||dialog.open) return;
    tab=target.dataset.tab; storeSelection(); render(); refresh();
});
root.addEventListener('change',async e=>{
    if(e.target.name==='overview-kind'||e.target.name==='overview-status'){
        if(e.target.name==='overview-kind') overviewKind=e.target.value;
        else overviewStatus=e.target.value;
        render(); return;
    }
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
    if(!prompt||confirm(tr(prompt))) save(data,dialog.open);
}
function submit(e){
    if(!e.target.dataset.form) return;
    e.preventDefault();
    const f=e.target, data=new FormData(f);
    data.set('action',f.dataset.form);
    const image=data.get('image');
    if(!image?.name) data.delete('image');
    save(image?.name?data:Object.fromEntries(data),dialog.open,e.submitter?.value||'');
}
root.addEventListener('click',click);
root.addEventListener('click',async e=>{
    const copy=e.target.closest('[data-share-game]');
    if(!copy) return;
    try{
        const s=await getShare(Number(copy.dataset.shareGame));
        if(!s){status.textContent='Open Share to generate copyable credentials.';return;}
        await navigator.clipboard.writeText(copy.dataset.shareValue==='code'?s.code:sharedLink(s.token));
        status.textContent='Copied';
    }catch(e){status.textContent=e.message;}
});
editor.addEventListener('click',click);
editor.addEventListener('invalid',e=>{
    const disclosure=e.target.closest('details');
    if(disclosure) disclosure.open=true;
},true);
editor.addEventListener('change',e=>{
    const upload=e.target.closest('.player-upload');
    const file=e.target.files?.[0];
    if(!upload||!file||file.size>4*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type)) return;
    const reader=new FileReader();
    reader.onload=()=>{
        if(e.target.files?.[0]!==file) return;
        const img=document.createElement('img');
        img.alt='';
        img.src=reader.result;
        $('.upload-preview',upload).replaceChildren(img);
    };
    reader.readAsDataURL(file);
});
editor.addEventListener('click',async e=>{
    if(e.target.closest('[data-manage-created]')) dialog.close();
    const copy=e.target.closest('[data-copy]');
    if(copy){
        try{await navigator.clipboard.writeText(copy.dataset.copy);copy.textContent='Copied';}
        catch{$('#editor-error').textContent='Select the value and copy it manually.';}
    }
    if(e.target.closest('[data-sound-preview]')){
        const audio=new AudioContext(), tone=audio.createOscillator(), gain=audio.createGain();
        const start=audio.currentTime, volume=Number($('[name="volume"]',editor).value)/100;
        tone.type='triangle';tone.frequency.setValueAtTime(240,start);tone.frequency.exponentialRampToValueAtTime(750,start+.28);
        gain.gain.setValueAtTime(volume*.15,start);gain.gain.linearRampToValueAtTime(0,start+.45);
        tone.connect(gain).connect(audio.destination);tone.start();tone.stop(start+.46);tone.onended=()=>audio.close();
    }
});
root.addEventListener('submit',submit);
editor.addEventListener('submit',submit);
$('#editor-close').onclick=()=>{if(!saving) dialog.close();};
dialog.addEventListener('cancel',e=>{if(saving)e.preventDefault();});
await refresh(true);
setInterval(refresh,1250);
