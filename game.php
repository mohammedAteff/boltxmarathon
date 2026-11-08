<?php
require_once __DIR__.'/access.php';

function settings(?array $game=null): array {
    $defaults=one('SELECT * FROM settings WHERE id=1');
    return array_replace($defaults,[
        'auto_turn'=>1,'friction'=>1.1,'drag_sensitivity'=>1,'impulse'=>440,'max_speed'=>1600,
        'accept_mode'=>'confirm','opening_mode'=>'shake','scratch'=>0,'scratch_threshold'=>60,
        'volume'=>45,'language'=>'en',
    ],$game ? json_decode($game['options']??'{}',true,32,JSON_THROW_ON_ERROR) : []);
}
function game_set(int $id,string $kind): array {
    $game=one('SELECT *,access_expires_at IS NOT NULL AND access_expires_at<=CURRENT_TIMESTAMP AS access_expired FROM game_sets WHERE id=? AND kind=?',[$id,$kind]);
    need($game!==null,'This game no longer exists.');
    return $game;
}
function players(int $game): array {
    $p=rows('SELECT id,name,COALESCE(cap,?) AS max,cap,position,active,avatar IS NOT NULL AS photo FROM players WHERE game_id=? AND deleted=0 ORDER BY position,id',[settings(game_set($game,'wheel'))['default_limit'],$game]);
    $inventory=rows("SELECT u.id,u.player_id,u.completed,u.revision,i.id AS item_id,i.name,i.icon FROM units u JOIN items i ON i.id=u.item_id WHERE i.game_id=? AND u.status='assigned' ORDER BY u.id",[$game]);
    $by=[];
    foreach($inventory as $u) $by[$u['player_id']][]=$u;
    foreach($p as &$player) $player['items']=$by[$player['id']]??[];
    return $p;
}
function eligible(array $p): bool { return (bool)$p['active'] && (!$p['max'] || count($p['items'])<$p['max']); }
function turn(array $players,?int $current,bool $advance=false): ?array {
    $ids=array_column($players,'id');
    $start=array_search($current,$ids,true);
    $start=$start===false ? 0 : $start+(int)$advance;
    $n=count($players);
    for($i=0;$i<$n;$i++) {
        $p=$players[($start+$i)%$n];
        if(eligible($p)) return $p;
    }
    return null;
}
function pool(int $game): array {
    return rows("SELECT i.id,i.name,i.icon,COUNT(u.id) AS qty FROM items i JOIN units u ON u.item_id=i.id AND u.status='available' WHERE i.game_id=? GROUP BY i.id,i.name,i.icon ORDER BY i.id",[$game]);
}
function record(int $version,int $game,string $action,string $source,array $detail): void {
    sql('INSERT INTO events(id,game_id,action,source,detail) VALUES (?,?,?,?,?)',[$version,$game,$action,$source,json_encode($detail,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE)]);
}
function action(string $a,array $d,string $source,?array &$extra=null): int {
    $db=db(); $db->beginTransaction();
    try {
        // ponytail: one row serializes stream mutations; split per game only if contention warrants it.
        $clock=one('SELECT version FROM settings WHERE id=1 FOR UPDATE')['version'];
        $v=$clock+1;
        $kind=str_starts_with($a,'box_') || str_starts_with($a,'challenge_') ? 'boxes' : 'wheel';
        if(in_array($a,['game_create','game_rename','game_share','game_archive','settings'],true)) {
            $kind=$d['kind']??'wheel';
            need(in_array($kind,['wheel','boxes'],true),'Choose a game type.');
        }
        $game=number($d['game']??($kind==='wheel'?1:2));
        $target=$a==='game_create'?null:game_set($game,$kind);
        $current=$target['current_player']??null;
        $s=settings($target);
        if(isset($d['_access_version'])) {
            need($target && !$target['archived'] && !$target['access_expired'] && $target['share_role']==='play' && $target['access_version']===$d['_access_version'],'Challenge access has expired.');
        }
        if(in_array($a,['spin','spin_accept','box_open','box_reveal'],true)) need(!$target['archived'],'Restore this challenge before playing.');
        $requestId=null;
        if($a==='spin_accept'){
            $requestId=label($d['request_id']??'',32);
            need((bool)preg_match('/^[a-f0-9]{32}$/D',$requestId),'Invalid spin request.');
            $existing=one('SELECT event_id FROM spin_acceptances WHERE game_id=? AND request_id=?',[$game,$requestId]);
            if($existing){$db->commit(); return $existing['event_id'];}
            need(isset($d['version']),'Refresh the wheel and spin again.');
        }
        if(isset($d['version'])) {
            $seen=number($d['version'],0,PHP_INT_MAX);
            $relevantChange=$seen>$clock || ($a!=='game_create' && $seen<$target['state_version']);
            need(!$relevantChange,'The game changed in another tab. Review the refreshed state and try again.');
        }
        $id=fn($key='id')=>number($d[$key]??null);
        $text=fn($key,$size,$empty=false)=>label($d[$key]??'',$size,$empty);
        $count=fn(int $max=500)=>number($d['qty']??1,0,$max);
        $player=function(int $pid) use($game) {
            $list=players($game);
            $index=array_search($pid,array_column($list,'id'),true);
            need($index!==false,'Player no longer exists.');
            return $list[$index];
        };
        $item=function() use($d,$id,$text,$game) {
            if(!empty($d['item_id'])) {
                $iid=$id('item_id'); need(one('SELECT id FROM items WHERE id=? AND game_id=?',[$iid,$game])!==null,'Item no longer exists.'); return $iid;
            }
            sql('INSERT INTO items(game_id,name,icon) VALUES (?,?,?)',[$game,$text('name',120),$text('icon',24,true)]);
            return (int)db()->lastInsertId();
        };
        $add=function(int $iid,int $qty,?int $pid=null) {
            for($i=0;$i<$qty;$i++) sql('INSERT INTO units(item_id,player_id,status) VALUES (?,?,?)',[$iid,$pid,$pid===null?'available':'assigned']);
        };
        $move=function(int $uid,string $status,?int $pid=null) {
            sql('UPDATE units SET status=?,player_id=?,completed=0,revision=revision+1 WHERE id=?',[$status,$pid,$uid]);
        };
        $detail=array_intersect_key($d,array_flip(['id','name','qty','item_id','player_id','number','text','icon','cap','mode','status','challenge_id','position','active','default_limit']));
        $spin=null;
        switch($a) {
        case 'game_create':
            $defaults=array_intersect_key($s,array_flip(['default_limit','spin_ms','result_ms','box_ms','motion','intensity','sound','fullscreen']));
            $defaults['language']=($d['language']??'')==='ar'?'ar':'en';
            if($kind==='wheel') $defaults['default_limit']=number($d['default_limit']??$s['default_limit'],0,500);
            if($kind==='boxes'){
                $defaults['opening_mode']=($d['opening_mode']??'')==='key'?'key':'shake';
                $defaults['scratch']=flag($d['scratch']??0);
            }
            sql('INSERT INTO game_sets(kind,name,owner_id,options) VALUES (?,?,?,?)',[$kind,$text('name',100),$d['_owner']??null,json_encode($defaults,JSON_THROW_ON_ERROR)]);
            $game=(int)db()->lastInsertId();
            $lines=function(string $key,int $length) use($text){
                $entries=array_values(array_filter(array_map('trim',preg_split('/\R/u',$text($key,12000,true))),fn($line)=>$line!==''));
                need(count($entries)<=100,'Enter at most 100 initial entries.');
                return array_map(fn($line)=>label($line,$length),$entries);
            };
            if($kind==='wheel'){
                foreach($lines('initial_players',100) as $index=>$name) sql('INSERT INTO players(game_id,name,position) VALUES (?,?,?)',[$game,$name,$index+1]);
                foreach($lines('initial_items',120) as $name){
                    sql('INSERT INTO items(game_id,name) VALUES (?,?)',[$game,$name]);
                    $add((int)db()->lastInsertId(),1);
                }
            }else{
                foreach($lines('initial_boxes',600) as $index=>$challenge){
                    sql('INSERT INTO challenges(game_id,text) VALUES (?,?)',[$game,$challenge]);
                    sql('INSERT INTO boxes(game_id,challenge_id,number) VALUES (?,?,?)',[$game,(int)db()->lastInsertId(),$index+1]);
                }
            }
            $detail['game']=$game;
            $extra=issue_access($game,$d['role']??'view',number($d['expires_days']??0,0,365));
            break;
        case 'game_rename':
            sql('UPDATE game_sets SET name=? WHERE id=?',[$text('name',100),$game]);
            break;
        case 'game_share':
            if(!empty($d['revoke'])) sql('UPDATE game_sets SET code_hash=NULL,link_hash=NULL,display_hash=NULL,access_version=access_version+1 WHERE id=?',[$game]);
            else $extra=issue_access($game,$d['role']??'view',number($d['expires_days']??0,0,365));
            break;
        case 'game_archive':
            sql('UPDATE game_sets SET archived=?,access_version=access_version+1,code_hash=NULL,link_hash=NULL,display_hash=NULL WHERE id=?',[flag($d['archived']??1),$game]);
            break;
        case 'spin':
        case 'spin_accept':
            $list=players($game); $p=turn($list,$current);
            need($p!==null,'No active player has room for another item.');
            $pool=pool($game); $total=array_sum(array_column($pool,'qty'));
            need($total>0,'The wheel is empty.');
            if($a==='spin_accept'){
                need($p['id']===$id('player_id'),'The player changed. Spin again.');
                $ids=array_column($pool,'id');
                $index=array_search($id('item_id'),$ids,true);
                need($index!==false,'The selected item is no longer available. Spin again.');
                $angle=filter_var($d['angle']??null,FILTER_VALIDATE_FLOAT);
                need($angle!==false && is_finite($angle) && $angle>=0 && $angle<360,'Invalid wheel position. Spin again.');
                $pointerIndex=(int)round(fmod(360-$angle,360)*count($pool)/360)%count($pool);
                need($pointerIndex===$index,'The result does not match the pointer. Spin again.');
                $slot=$pool[$index]; $ticket=0;
            }else{
                $ticket=random_int(0,$total-1);
                foreach($pool as $slot) {
                    if($ticket<$slot['qty']) break;
                    $ticket-=$slot['qty'];
                }
            }
            $u=one("SELECT id,revision FROM units WHERE item_id=? AND status='available' ORDER BY id LIMIT ?,1",[$slot['id'],$ticket]);
            $move($u['id'],'assigned',$p['id']);
            $next=turn(players($game),$p['id'],(bool)$s['auto_turn']);
            sql('UPDATE game_sets SET current_player=? WHERE id=?',[$next['id']??null,$game]);
            $detail=['unit_id'=>$u['id'],'item'=>$slot,'player'=>array_intersect_key($p,array_flip(['id','name','photo'])),'pool'=>$pool,'duration'=>$s['motion']?$s['spin_ms']:0,'accepted'=>$a==='spin_accept'];
            $spin=[$v,$u['id'],$p['id'],$u['revision']+1];
            break;
        case 'undo':
            $x=isset($d['id'])
                ? one('SELECT s.* FROM spins s JOIN events e ON e.id=s.id WHERE s.id=? AND e.game_id=? AND s.undone=0',[$id(),$game])
                : one('SELECT s.* FROM spins s JOIN events e ON e.id=s.id WHERE e.game_id=? AND s.undone=0 ORDER BY s.id DESC LIMIT 1',[$game]);
            need($x!==null,'There is no spin to undo.');
            $u=one('SELECT * FROM units WHERE id=?',[$x['unit_id']]);
            need($u['status']==='assigned' && $u['player_id']===$x['player_id'] && $u['revision']===$x['revision'],'This result was manually changed and cannot be restored safely.');
            $move($u['id'],'available');
            sql('UPDATE spins SET undone=1 WHERE id=?',[$x['id']]);
            if(!isset($d['id']) || !one('SELECT s.id FROM spins s JOIN events e ON e.id=s.id WHERE e.game_id=? AND s.undone=0 AND s.id>? LIMIT 1',[$game,$x['id']])) sql('UPDATE game_sets SET current_player=? WHERE id=?',[$x['player_id'],$game]);
            $detail=['spin'=>$x['id'],'unit_id'=>$u['id']];
            break;
        case 'player_save':
            $cap=($d['cap']??'')==='' || $d['cap']===null ? null : number($d['cap'],0,500);
            $name=$text('name',100); $position=number($d['position']??0,0,100000); $active=flag($d['active']??1);
            if(empty($d['id'])) {
                sql('INSERT INTO players(game_id,name,cap,position,active) VALUES (?,?,?,?,?)',[$game,$name,$cap,$position,$active]); $detail['id']=(int)db()->lastInsertId();
            } else {
                $pid=$id(); $player($pid);
                sql('UPDATE players SET name=?,cap=?,position=?,active=? WHERE id=?',[$name,$cap,$position,$active,$pid]);
            }
            break;
        case 'avatar':
            $pid=$id(); $player($pid); sql('UPDATE players SET avatar=? WHERE id= ?',[$d['image']??null,$pid]);
            $detail['has_photo']=isset($d['image']);
            break;
        case 'player_delete':
        case 'player_clear':
            $pid=$id(); $player($pid);
            sql("UPDATE units SET status='removed',player_id=NULL,completed=0,revision=revision+1 WHERE player_id=?",[$pid]);
            if($a==='player_delete') sql('UPDATE players SET deleted=1,active=0,avatar=NULL WHERE id=?',[$pid]);
            break;
        case 'player_turn':
            $p=$player($id()); need(eligible($p),'That player is inactive or full.');
            sql('UPDATE game_sets SET current_player=? WHERE id=?',[$p['id'],$game]);
            break;
        case 'assign':
            $p=$player($id('player_id')); need(eligible($p),'That player is inactive or full.');
            $iid=$item(); $add($iid,1,$p['id']); $detail['item_id']=$iid; $detail['unit_id']=(int)db()->lastInsertId();
            break;
        case 'wheel_add':
            $qty=$count(); need($qty>0,'Add at least one unit.');
            $iid=$item(); $add($iid,$qty); $detail['item_id']=$iid;
            break;
        case 'item_save':
            $iid=$id(); need(one('SELECT id FROM items WHERE id=? AND game_id=?',[$iid,$game])!==null,'Item no longer exists.');
            sql('UPDATE items SET name=?,icon=? WHERE id=?',[$text('name',120),$text('icon',24,true),$iid]);
            if(isset($d['qty'])) {
                $existing=rows("SELECT id FROM units WHERE item_id=? AND status='available' ORDER BY id",[$iid]);
                $n=count($existing);
                $target=$count(max(500,$n));
                if($target>$n) $add($iid,$target-$n);
                else foreach(array_slice($existing,$target) as $u) $move($u['id'],'removed');
            }
            break;
        case 'unit':
            $u=one('SELECT u.* FROM units u JOIN items i ON i.id=u.item_id WHERE u.id=? AND i.game_id=?',[$id(),$game]); need($u!==null,'Unit no longer exists.');
            $mode=$d['mode']??'';
            $from=['remove_wheel'=>'available','remove_player'=>'assigned','return'=>'assigned','copy'=>'assigned','restore'=>'removed'];
            need(isset($from[$mode]) && $u['status']===$from[$mode],'This unit already moved. Refresh and try again.');
            if($mode==='copy') { $add($u['item_id'],1); $detail['copy']=(int)db()->lastInsertId(); }
            else $move($u['id'],str_starts_with($mode,'remove')?'removed':'available');
            break;
        case 'checklist':
            $u=one("SELECT u.id,u.revision FROM units u JOIN items i ON i.id=u.item_id WHERE u.id=? AND i.game_id=? AND u.status='assigned'",[$id(),$game]);
            need($u!==null && $u['revision']===number($d['revision']??null,0),'This assignment changed. Reload your list.');
            $detail['completed']=flag($d['completed']??null);
            sql('UPDATE units SET completed=? WHERE id=?',[$detail['completed'],$u['id']]);
            break;
        case 'wheel_reset':
            $mode=$d['mode']??'';
            need(in_array($mode,['wheel','players','both'],true),'Choose a reset type.');
            if($mode==='wheel' || $mode==='both') sql("UPDATE units u JOIN items i ON i.id=u.item_id SET u.status='available',u.revision=u.revision+1 WHERE i.game_id=? AND u.status='removed'",[$game]);
            if($mode==='players' || $mode==='both') {
                sql("UPDATE units u JOIN items i ON i.id=u.item_id SET u.status='available',u.player_id=NULL,u.completed=0,u.revision=u.revision+1 WHERE i.game_id=? AND u.status='assigned'",[$game]);
                sql('UPDATE game_sets SET current_player=NULL WHERE id=?',[$game]);
                sql('UPDATE spins s JOIN events e ON e.id=s.id SET s.undone=1 WHERE e.game_id=? AND s.undone=0',[$game]);
            }
            break;
        case 'collections_clear':
            sql("UPDATE units u JOIN items i ON i.id=u.item_id SET u.status='removed',u.player_id=NULL,u.completed=0,u.revision=u.revision+1 WHERE i.game_id=? AND u.status='assigned'",[$game]);
            break;
        case 'challenge_save':
            $txt=$text('text',600); $icon=$text('icon',24,true);
            if(empty($d['id'])) {
                sql('INSERT INTO challenges(game_id,text,icon) VALUES (?,?,?)',[$game,$txt,$icon]);
                $cid=(int)db()->lastInsertId(); $detail['id']=$cid;
                $n=one('SELECT COALESCE(MAX(number),0)+1 AS n FROM boxes WHERE game_id=?',[$game])['n'];
                sql('INSERT INTO boxes(game_id,challenge_id,number) VALUES (?,?,?)',[$game,$cid,$n]);
            } else {
                need(one('SELECT id FROM challenges WHERE id=? AND game_id=?',[$id(),$game])!==null,'Challenge no longer exists.');
                sql('UPDATE challenges SET text=?,icon=? WHERE id=?',[$txt,$icon,$id()]);
            }
            break;
        case 'challenge_delete':
            need(!one('SELECT id FROM boxes WHERE challenge_id=? LIMIT 1',[$id()]),'Remove or reassign its boxes before deleting this challenge.');
            sql('DELETE FROM challenges WHERE id=? AND game_id=?',[$id(),$game]);
            break;
        case 'box_save':
            $n=$id('number');
            $bid=empty($d['id'])?null:$id();
            $b=$bid?one('SELECT b.*,c.text,c.icon FROM boxes b JOIN challenges c ON c.id=b.challenge_id WHERE b.id=? AND b.game_id=?',[$bid,$game]):null;
            need(!$bid || $b!==null,'Box no longer exists.');
            if(isset($d['text'])) {
                $txt=$text('text',600); $icon=$text('icon',24,true);
                $cid=$b['challenge_id']??null;
                if(!$b || $b['text']!==$txt || $b['icon']!==$icon) {
                    sql('INSERT INTO challenges(game_id,text,icon) VALUES (?,?,?)',[$game,$txt,$icon]);
                    $cid=(int)db()->lastInsertId();
                }
            } else {
                $cid=$id('challenge_id');
                need(one('SELECT id FROM challenges WHERE id=? AND game_id=?',[$cid,$game])!==null,'Choose an existing challenge.');
            }
            $other=one('SELECT id FROM boxes WHERE number=? AND game_id=?',[$n,$game]);
            if($bid) {
                if($other && $other['id']!==$bid) {
                    sql('UPDATE boxes SET number=0 WHERE id=?',[$bid]);
                    sql('UPDATE boxes SET number=? WHERE id=?',[$b['number'],$other['id']]);
                }
                sql('UPDATE boxes SET number=?,challenge_id=? WHERE id=?',[$n,$cid,$bid]);
            } else {
                need(!$other,'That box number is already in use.');
                sql('INSERT INTO boxes(game_id,challenge_id,number) VALUES (?,?,?)',[$game,$cid,$n]); $detail['id']=(int)db()->lastInsertId();
            }
            break;
        case 'box_open':
        case 'box_mark':
        case 'box_close':
        case 'box_reveal':
        case 'box_scratch_reset':
            $bid=$id();
            $b=one('SELECT b.*,c.text,c.icon FROM boxes b JOIN challenges c ON c.id=b.challenge_id WHERE b.id=? AND b.game_id=?',[$bid,$game]);
            need($b!==null,'Box no longer exists.');
            if($a==='box_close') {
                need($b['opened_at']!==null,'This box is already sealed.');
                sql('UPDATE boxes SET opened_at=NULL,open_seq=NULL,scratch_pending=0 WHERE id=?',[$bid]);
            } elseif($a==='box_reveal'){
                need($b['opened_at']!==null && $b['scratch_pending'] && $b['open_seq']===$id('sequence'),'This box has changed. Open it again.');
                sql('UPDATE boxes SET scratch_pending=0 WHERE id=?',[$bid]);
            } elseif($a==='box_scratch_reset'){
                need($b['opened_at']!==null,'Open the box first.');
                sql('UPDATE boxes SET scratch_pending=1,open_seq=? WHERE id=?',[$v,$bid]);
            } elseif($a==='box_mark' && $b['opened_at']!==null){
                sql('UPDATE boxes SET scratch_pending=0 WHERE id=?',[$bid]);
            } else {
                need($b['opened_at']===null,'This box has already been opened.');
                sql('UPDATE boxes SET opened_at=CURRENT_TIMESTAMP(3),open_seq=?,scratch_pending=? WHERE id=?',[$v,$a==='box_open'?(int)$s['scratch']:0,$bid]);
                $detail=['id'=>$bid,'number'=>$b['number'],'text'=>$b['text'],'icon'=>$b['icon']];
            }
            break;
        case 'box_delete':
            sql('DELETE FROM boxes WHERE id=? AND game_id=?',[$id(),$game]);
            break;
        case 'box_reset':
            sql('UPDATE boxes SET opened_at=NULL,open_seq=NULL,scratch_pending=0 WHERE game_id=?',[$game]);
            break;
        case 'box_clear':
            sql('DELETE FROM boxes WHERE game_id=?',[$game]);
            sql('DELETE FROM challenges WHERE game_id=?',[$game]);
            break;
        case 'box_shuffle':
            need(!one('SELECT id FROM boxes WHERE game_id=? AND opened_at IS NOT NULL LIMIT 1',[$game]),'Seal all boxes before shuffling.');
            $boxes=rows('SELECT id,challenge_id FROM boxes WHERE game_id=? ORDER BY id',[$game]);
            $ids=array_column($boxes,'challenge_id'); shuffle($ids);
            foreach($boxes as $i=>$b) sql('UPDATE boxes SET challenge_id=? WHERE id=?',[$ids[$i],$b['id']]);
            break;
        case 'settings':
            $values=json_decode($target['options']??'{}',true,32,JSON_THROW_ON_ERROR);
            foreach(['default_limit'=>[0,500],'spin_ms'=>[500,12000],'result_ms'=>[0,60000],'box_ms'=>[150,8000],'motion'=>[0,1],'intensity'=>[0,100],'sound'=>[0,1],'fullscreen'=>[0,1],'auto_turn'=>[0,1],'impulse'=>[100,1200],'max_speed'=>[360,3200],'scratch'=>[0,1],'scratch_threshold'=>[20,90],'volume'=>[0,100]] as $key=>[$min,$max])
                if(isset($d[$key])) $values[$key]=number($d[$key],$min,$max);
            foreach(['friction'=>[.35,4],'drag_sensitivity'=>[.4,2]] as $key=>[$min,$max]) if(isset($d[$key])){
                $n=filter_var($d[$key],FILTER_VALIDATE_FLOAT);
                need($n!==false && $n>=$min && $n<=$max,'The wheel setting is outside its allowed range.');
                $values[$key]=$n;
            }
            foreach(['opening_mode'=>['shake','key'],'accept_mode'=>['confirm','automatic'],'language'=>['en','ar']] as $key=>$options) if(isset($d[$key])){
                need(in_array($d[$key],$options,true),'Invalid game setting.');
                $values[$key]=$d[$key];
            }
            sql('UPDATE game_sets SET options=? WHERE id=?',[json_encode($values,JSON_THROW_ON_ERROR),$game]);
            $detail=$values;
            break;
        default: throw new Rule('Unknown action.');
        }
        record($v,$game,$a,$source,$detail);
        if($spin) sql('INSERT INTO spins(id,unit_id,player_id,revision) VALUES (?,?,?,?)',$spin);
        if($requestId!==null) sql('INSERT INTO spin_acceptances(game_id,request_id,event_id) VALUES (?,?,?)',[$game,$requestId,$v]);
        sql('UPDATE game_sets SET state_version=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?',[$v,$game]);
        sql('UPDATE settings SET version=? WHERE id=1',[$v]);
        $db->commit(); return $v;
    } catch(Throwable $e) { $db->rollBack(); throw $e; }
}

function state(string $view,int $since,int $wheel=1,int $event=2,bool $scratchPreview=false): array {
    $db=db(); $db->beginTransaction();
    try {
        $wheelSet=$view==='boxes'?null:game_set($wheel,'wheel');
        $boxSet=$view==='wheel'?null:game_set($event,'boxes');
        $s=settings($wheelSet??$boxSet);
        $out=['version'=>$view==='admin'?$s['version']:($wheelSet??$boxSet)['state_version']];
        unset($s['version'],$s['current_player']);
        if($out['version']!==$since) {
            $out['settings']=$s;
            if($view!=='boxes') {
                $p=players($wheel); $pool=pool($wheel);
                $out['players']=$view==='admin'?$p:array_values(array_filter($p,fn($p)=>$p['active']));
                $out['current']=turn($p,$wheelSet['current_player'])['id']??null;
                $out['pool']=$pool;
                $out['remaining']=array_sum(array_column($pool,'qty'));
                $out['total']=one("SELECT COUNT(*) AS n FROM units u JOIN items i ON i.id=u.item_id WHERE i.game_id=? AND u.status<>'removed'",[$wheel])['n'];
                $last=one('SELECT e.detail FROM events e JOIN spins s ON s.id=e.id WHERE e.game_id=? AND s.undone=0 ORDER BY e.id DESC LIMIT 1',[$wheel]);
                $out['last']=$last?json_decode($last['detail'],true):null;
            }
            if($view!=='wheel') {
                $boxes=rows('SELECT b.*,c.text,c.icon FROM boxes b JOIN challenges c ON c.id=b.challenge_id WHERE b.game_id=? ORDER BY b.number',[$event]);
                if($view!=='admin') foreach($boxes as &$box) {
                    unset($box['challenge_id']);
                    if($box['scratch_pending']&&$scratchPreview) $box['scratch_text']=$box['text'];
                    if($box['opened_at']===null || $box['scratch_pending']) unset($box['text'],$box['icon']);
                }
                $out['boxes']=$boxes;
            }
            if($view==='admin') {
                $out['games']=rows('SELECT id,kind,name,owner_id,created_at,updated_at,archived,share_role,link_hash IS NOT NULL AS shared FROM game_sets ORDER BY id');
                $out['box_settings']=settings($boxSet);
                $out['items']=rows('SELECT * FROM items WHERE game_id=? ORDER BY id',[$wheel]);
                $out['units']=rows('SELECT u.* FROM units u JOIN items i ON i.id=u.item_id WHERE i.game_id=? ORDER BY u.id',[$wheel]);
                $out['challenges']=rows('SELECT * FROM challenges WHERE game_id=? ORDER BY id',[$event]);
                $out['history']=rows('SELECT e.*,s.undone,s.revision=u.revision AND u.status="assigned" AS reversible FROM events e LEFT JOIN spins s ON s.id=e.id LEFT JOIN units u ON u.id=s.unit_id WHERE e.game_id IN (?,?) ORDER BY e.id DESC LIMIT 150',[$wheel,$event]);
            } else {
                $out['game_name']=($wheelSet??$boxSet)['name'];
                if($since>=0) {
            $out['events']=$view==='wheel'
                    ? array_reverse(rows("SELECT e.id,e.detail FROM events e JOIN spins s ON s.id=e.id WHERE e.game_id=? AND e.id>? AND s.undone=0 ORDER BY e.id DESC LIMIT 60",[$wheel,$since]))
                    : rows("SELECT e.id FROM events e JOIN boxes b ON b.open_seq=e.id WHERE e.game_id=? AND e.id>? AND e.action='box_open' ORDER BY e.id",[$event,$since]);
                }
            }
        }
        $db->commit(); return $out;
    } catch(Throwable $e) { $db->rollBack(); throw $e; }
}
