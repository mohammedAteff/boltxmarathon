<?php
// Run only against a freshly imported, dedicated test schema.
require __DIR__.'/game.php';
if(PHP_SAPI!=='cli' || !preg_match('/(?:^|;)dbname=[a-zA-Z0-9_]+_test(?:;|$)/',getenv('BOLTX_DSN')?:'') || settings()['version']!==0) {
    fwrite(STDERR,"Use a fresh database whose name ends in _test.\n"); exit(1);
}
function check(bool $ok,string $msg): void { if(!$ok) throw new RuntimeException($msg); }
function change(string $a,array $d=[]): int { return action($a,$d,'dashboard'); }
function reject(string $a,array $d=[],string $msg=''): void {
    try { change($a,$d); }
    catch(Rule $e) { check(str_contains($e->getMessage(),$msg),'Unexpected rejection: '.$e->getMessage()); return; }
    throw new RuntimeException('Expected rejection: '.$a);
}
function snap(): array { return state('admin',-1); }
function event(int $id): array { return json_decode(one('SELECT detail FROM events WHERE id=?',[$id])['detail'],true); }
function unit_state(int $id): string { return one('SELECT status FROM units WHERE id=?',[$id])['status']; }
$p=event(change('player_save',['name'=>'BOLTX','position'=>1,'cap'=>1]))['id'];
$q=event(change('player_save',['name'=>'فارس','position'=>2,'cap'=>1]))['id'];
change('player_save',['id'=>$q,'name'=>'فارس الثاني','position'=>3,'cap'=>1]);
check(snap()['players'][1]['name']==='فارس الثاني','Arabic rename');
change('avatar',['id'=>$q,'image'=>'test-blob']); check((bool)snap()['players'][1]['photo'],'Avatar stored');
change('avatar',['id'=>$q]); check(!snap()['players'][1]['photo'],'Avatar removed');
$i=event(change('wheel_add',['name'=>'عصير','qty'=>3]))['item_id'];
$j=event(change('wheel_add',['name'=>'عصير','qty'=>2]))['item_id'];
check($i!==$j && snap()['remaining']===5,'Duplicate names preserve identity');
$a=event(change('spin'));
check($a['player']['id']===$p && snap()['current']===$q && snap()['remaining']===4 && unit_state($a['unit_id'])==='assigned','Exact spin unit and turn');
reject('player_turn',['id'=>$p],'full');
$b=event(change('spin'));
check($b['player']['id']===$q && snap()['current']===null && snap()['remaining']===3,'Skip full players');
reject('spin',[],'No active player');
reject('assign',['player_id'=>$p,'item_id'=>$i],'full');
change('undo');
check(unit_state($b['unit_id'])==='available' && snap()['current']===$q,'Undo exact unit and restore turn');
change('unit',['id'=>$a['unit_id'],'mode'=>'copy']);
check(unit_state($a['unit_id'])==='assigned' && snap()['remaining']===5,'Copy retains assignment');
change('unit',['id'=>$a['unit_id'],'mode'=>'return']);
check(snap()['remaining']===6 && unit_state($a['unit_id'])==='available','Return assignment');
reject('undo',[],'manually changed');
$assign=event(change('assign',['player_id'=>$q,'item_id'=>$i]))['unit_id'];
change('unit',['id'=>$assign,'mode'=>'remove_player']);
check(unit_state($assign)==='removed' && snap()['remaining']===6,'Remove player unit only');
$u=one("SELECT id FROM units WHERE status='available' LIMIT 1")['id'];
change('unit',['id'=>$u,'mode'=>'remove_wheel']); check(snap()['remaining']===5,'Remove wheel unit only');
change('unit',['id'=>$u,'mode'=>'restore']); check(snap()['remaining']===6,'Restore wheel unit');
change('item_save',['id'=>$i,'name'=>'مانجو','qty'=>4]);
check(array_column(snap()['pool'],'qty','id')[$i]===4,'Set available quantity');
change('player_delete',['id'=>$q]); check(count(snap()['players'])===1,'Soft delete preserves history');
$before=settings()['version'];
reject('wheel_add',['name'=>'Duplicate request','version'=>$before-1],'another tab');
$c1=event(change('challenge_save',['text'=>'أضف شطة حارة','icon'=>'🌶️']))['id'];
$c2=event(change('challenge_save',['text'=>'Go again']))['id'];
change('box_save',['challenge_id'=>$c1,'number'=>3]);
$boxes=snap()['boxes']; check(count($boxes)===3,'Boxes generated and added');
$public=state('boxes',-1); check(!isset($public['boxes'][0]['text']),'Closed challenge is private');
$box=$boxes[0]['id']; $cursor=settings()['version'];
change('box_open',['id'=>$box]);
$public=state('boxes',$cursor);
check($public['boxes'][0]['text']==='أضف شطة حارة' && count($public['events'])===1,'Reveal event and persistent paper');
check(state('boxes',$public['version'])===['version'=>$public['version']],'Unchanged poll is version only');
reject('box_open',['id'=>$box],'already been opened');
change('challenge_save',['id'=>$c1,'text'=>'تحدي جديد']); check(state('boxes',-1)['boxes'][0]['text']==='تحدي جديد','Opened challenge edit syncs');
change('box_close',['id'=>$box]); check(!isset(state('boxes',-1)['boxes'][0]['text']),'Reclose hides challenge');
change('box_save',['id'=>$box,'number'=>2,'challenge_id'=>$c2]);
check(snap()['boxes'][1]['id']===$box,'Box reorder swaps existing positions');
change('box_shuffle'); change('box_mark',['id'=>$box]); change('box_reset');
check(count(array_filter(snap()['boxes'],fn($b)=>$b['opened_at']))===0 && snap()['remaining']>0,'Independent box reset');
change('box_delete',['id'=>$box]); change('box_clear'); check(!snap()['boxes']&&!snap()['challenges'],'Clear configuration');
change('wheel_reset',['mode'=>'both']);
check(snap()['remaining']===snap()['total'],'Wheel reset reconciles units');
$otherWheel=event(change('game_create',['kind'=>'wheel','name'=>'Bonus wheel']))['game'];
$otherEvent=event(change('game_create',['kind'=>'boxes','name'=>'Bonus boxes']))['game'];
$otherPlayer=event(change('player_save',['game'=>$otherWheel,'name'=>'Guest']))['id'];
$otherItem=event(change('wheel_add',['game'=>$otherWheel,'name'=>'Bonus','qty'=>2]))['item_id'];
$mainRemaining=snap()['remaining'];
reject('player_turn',['game'=>$otherWheel,'id'=>$p],'Player no longer exists');
reject('assign',['player_id'=>$p,'item_id'=>$otherItem],'Item no longer exists');
$cursor=settings()['version'];
$otherSpin=change('spin',['game'=>$otherWheel,'version'=>$cursor]);
check(event($otherSpin)['player']['id']===$otherPlayer,'The other wheel spins for its own player');
check(snap()['remaining']===$mainRemaining && !state('wheel',$cursor)['events'],'Other wheel spin does not appear on main wheel');
check(count(state('wheel',$cursor,$otherWheel)['events'])===1,'Selected wheel receives its spin event');
change('wheel_reset',['mode'=>'both','version'=>$cursor]);
check(state('wheel',-1,$otherWheel)['remaining']===1,'Reset keeps other wheel assignments');
reject('undo',['id'=>$otherSpin],'There is no spin');
$mainBox=event(change('box_save',['number'=>1,'text'=>'Main only']))['id'];
$otherBox=event(change('box_save',['game'=>$otherEvent,'number'=>1,'text'=>'Bonus only']))['id'];
reject('box_open',['game'=>$otherEvent,'id'=>$mainBox],'Box no longer exists');
$cursor=settings()['version'];
change('box_open',['game'=>$otherEvent,'id'=>$otherBox]);
check(!state('boxes',$cursor)['events'] && state('boxes',$cursor,1,$otherEvent)['boxes'][0]['text']==='Bonus only','Box reveal is isolated');
change('box_clear');
check(count(state('boxes',-1,1,$otherEvent)['boxes'])===1,'Clearing one event preserves the other');

$share=null;
action('game_create',['kind'=>'wheel','name'=>'V2 preview','role'=>'play','initial_players'=>"ليلى\nGuest",'initial_items'=>"فراولة\nTell a joke"],'dashboard',$share);
$g=$share['game'];
$w=state('wheel',-1,$g);
$accept=['game'=>$g,'version'=>$w['version'],'item_id'=>$w['pool'][1]['id'],'player_id'=>$w['current'],'angle'=>180,'request_id'=>str_repeat('1',32)];
reject('spin_accept',array_replace($accept,['angle'=>0]),'does not match the pointer');
check(state('wheel',-1,$g)['remaining']===2,'Invalid preview consumes no inventory');
$accepted=change('spin_accept',$accept);
check(change('spin_accept',$accept)===$accepted && state('wheel',-1,$g)['remaining']===1,'Accept is idempotent');
reject('spin_accept',array_replace($accept,['request_id'=>str_repeat('2',32)]),'another tab');
$u=state('wheel',-1,$g)['players'][0]['items'][0];
change('checklist',['game'=>$g,'id'=>$u['id'],'revision'=>$u['revision'],'completed'=>1]);
check(state('wheel',-1,$g)['players'][0]['items'][0]['completed']===1,'Checklist completion persists');
change('checklist',['game'=>$g,'id'=>$u['id'],'revision'=>$u['revision'],'completed'=>0]);
check(state('wheel',-1,$g)['players'][0]['items'][0]['completed']===0,'Checklist can be unchecked');
change('undo',['game'=>$g]);
check(!state('wheel',-1,$g)['players'][0]['items'] && unit_state($u['id'])==='available','Undo removes checklist entry');
change('settings',['game'=>$g,'default_limit'=>2,'friction'=>1.5]);
check(state('wheel',-1,$g)['settings']['default_limit']===2 && state('wheel',-1)['settings']['default_limit']===5,'Settings are isolated');
$guest=game_set($g,'wheel');
$_SESSION=['boltx_access'=>[$g=>['version'=>$guest['access_version'],'role'=>'view']]];
check(role_for($guest)==='view' && !role_for(game_set(1,'wheel')),'Guest grant is scoped and read-only');
change('game_share',['game'=>$g,'revoke'=>1]);
check(!role_for(game_set($g,'wheel')),'Revocation invalidates existing grants');
$_SESSION=[];
change('settings',['game'=>$otherEvent,'kind'=>'boxes','opening_mode'=>'key','scratch'=>1]);
change('box_close',['game'=>$otherEvent,'id'=>$otherBox]);
$sequence=change('box_open',['game'=>$otherEvent,'id'=>$otherBox]);
check(!isset(state('boxes',-1,1,$otherEvent)['boxes'][0]['text']),'Read-only scratch is concealed');
reject('box_reveal',['game'=>$otherEvent,'id'=>$otherBox,'sequence'=>$sequence-1],'has changed');
change('box_reveal',['game'=>$otherEvent,'id'=>$otherBox,'sequence'=>$sequence]);
check(state('boxes',-1,1,$otherEvent)['boxes'][0]['text']==='Bonus only','Scratch completion persists');
echo "BOLTX database integration checks passed.\n";
