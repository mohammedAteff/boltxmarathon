<?php
require_once __DIR__.'/config.php';

function settings(): array { return one('SELECT * FROM settings WHERE id=1'); }
function players(): array {
    $p=rows('SELECT id,name,COALESCE(cap,(SELECT default_limit FROM settings WHERE id=1)) AS max,cap,position,active,avatar IS NOT NULL AS photo FROM players WHERE deleted=0 ORDER BY position,id');
    $inventory=rows("SELECT u.id,u.player_id,i.id AS item_id,i.name,i.icon FROM units u JOIN items i ON i.id=u.item_id WHERE u.status='assigned' ORDER BY u.id");
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
function pool(): array {
    return rows("SELECT i.id,i.name,i.icon,COUNT(u.id) AS qty FROM items i JOIN units u ON u.item_id=i.id AND u.status='available' GROUP BY i.id,i.name,i.icon ORDER BY i.id");
}
function record(int $version,string $action,string $source,array $detail): void {
    sql('INSERT INTO events(id,action,source,detail) VALUES (?,?,?,?)',[$version,$action,$source,json_encode($detail,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE)]);
}
function action(string $a,array $d,string $source): int {
    $db=db(); $db->beginTransaction();
    try {
        // ponytail: one row serializes stream mutations; split per game only if contention warrants it.
        $s=one('SELECT * FROM settings WHERE id=1 FOR UPDATE');
        if(isset($d['version'])) need(number($d['version'],0,PHP_INT_MAX)===(int)$s['version'],'The game changed in another tab. Review the refreshed state and try again.');
        $v=$s['version']+1;
        $id=fn($key='id')=>number($d[$key]??null);
        $text=fn($key,$size,$empty=false)=>label($d[$key]??'',$size,$empty);
        $count=fn()=>number($d['qty']??1,0,500);
        $player=function(int $pid) {
            $list=players();
            $index=array_search($pid,array_column($list,'id'),true);
            need($index!==false,'Player no longer exists.');
            return $list[$index];
        };
        $item=function() use($d,$id,$text) {
            if(!empty($d['item_id'])) {
                $iid=$id('item_id'); need(one('SELECT id FROM items WHERE id=?',[$iid])!==null,'Item no longer exists.'); return $iid;
            }
            sql('INSERT INTO items(name,icon) VALUES (?,?)',[$text('name',120),$text('icon',24,true)]);
            return (int)db()->lastInsertId();
        };
        $add=function(int $iid,int $qty,?int $pid=null) {
            for($i=0;$i<$qty;$i++) sql('INSERT INTO units(item_id,player_id,status) VALUES (?,?,?)',[$iid,$pid,$pid===null?'available':'assigned']);
        };
        $move=function(int $uid,string $status,?int $pid=null) {
            sql('UPDATE units SET status=?,player_id=?,revision=revision+1 WHERE id=?',[$status,$pid,$uid]);
        };
        $detail=array_intersect_key($d,array_flip(['id','name','qty','item_id','player_id','number','text','icon','cap','mode','status','challenge_id','position','active','default_limit']));
        $spin=null;
        switch($a) {
        case 'spin':
            $list=players(); $p=turn($list,$s['current_player']);
            need($p!==null,'No active player has room for another item.');
            $pool=pool(); $total=array_sum(array_column($pool,'qty'));
            need($total>0,'The wheel is empty.');
            $ticket=random_int(0,$total-1);
            foreach($pool as $slot) {
                if($ticket<$slot['qty']) break;
                $ticket-=$slot['qty'];
            }
            $u=one("SELECT id,revision FROM units WHERE item_id=? AND status='available' ORDER BY id LIMIT ?,1",[$slot['id'],$ticket]);
            $move($u['id'],'assigned',$p['id']);
            $next=turn(players(),$p['id'],true);
            sql('UPDATE settings SET current_player=? WHERE id=1',[$next['id']??null]);
            $detail=['unit_id'=>$u['id'],'item'=>$slot,'player'=>array_intersect_key($p,array_flip(['id','name','photo'])),'pool'=>$pool,'duration'=>$s['motion']?$s['spin_ms']:0];
            $spin=[$v,$u['id'],$p['id'],$u['revision']+1];
            break;
        case 'undo':
            $x=isset($d['id']) ? one('SELECT * FROM spins WHERE id=? AND undone=0',[$id()]) : one('SELECT * FROM spins WHERE undone=0 ORDER BY id DESC LIMIT 1');
            need($x!==null,'There is no spin to undo.');
            $u=one('SELECT * FROM units WHERE id=?',[$x['unit_id']]);
            need($u['status']==='assigned' && $u['player_id']===$x['player_id'] && $u['revision']===$x['revision'],'This result was manually changed and cannot be restored safely.');
            $move($u['id'],'available');
            sql('UPDATE spins SET undone=1 WHERE id=?',[$x['id']]);
            if(!isset($d['id']) || !one('SELECT id FROM spins WHERE undone=0 AND id>? LIMIT 1',[$x['id']])) sql('UPDATE settings SET current_player=? WHERE id=1',[$x['player_id']]);
            $detail=['spin'=>$x['id'],'unit_id'=>$u['id']];
            break;
        case 'player_save':
            $cap=($d['cap']??'')==='' || $d['cap']===null ? null : number($d['cap'],0,500);
            $name=$text('name',100); $position=number($d['position']??0,0,100000); $active=flag($d['active']??1);
            if(empty($d['id'])) {
                sql('INSERT INTO players(name,cap,position,active) VALUES (?,?,?,?)',[$name,$cap,$position,$active]); $detail['id']=(int)db()->lastInsertId();
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
            sql("UPDATE units SET status='removed',player_id=NULL,revision=revision+1 WHERE player_id=?",[$pid]);
            if($a==='player_delete') sql('UPDATE players SET deleted=1,active=0,avatar=NULL WHERE id=?',[$pid]);
            break;
        case 'player_turn':
            $p=$player($id()); need(eligible($p),'That player is inactive or full.');
            sql('UPDATE settings SET current_player=? WHERE id=1',[$p['id']]);
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
            $iid=$id(); need(one('SELECT id FROM items WHERE id=?',[$iid])!==null,'Item no longer exists.');
            sql('UPDATE items SET name=?,icon=? WHERE id=?',[$text('name',120),$text('icon',24,true),$iid]);
            if(isset($d['qty'])) {
                $target=$count();
                $existing=rows("SELECT id FROM units WHERE item_id=? AND status='available' ORDER BY id",[$iid]);
                $n=count($existing);
                if($target>$n) $add($iid,$target-$n);
                else foreach(array_slice($existing,$target) as $u) $move($u['id'],'removed');
            }
            break;
        case 'unit':
            $u=one('SELECT * FROM units WHERE id=?',[$id()]); need($u!==null,'Unit no longer exists.');
            $mode=$d['mode']??'';
            $from=['remove_wheel'=>'available','remove_player'=>'assigned','return'=>'assigned','copy'=>'assigned','restore'=>'removed'];
            need(isset($from[$mode]) && $u['status']===$from[$mode],'This unit already moved. Refresh and try again.');
            if($mode==='copy') { $add($u['item_id'],1); $detail['copy']=(int)db()->lastInsertId(); }
            else $move($u['id'],str_starts_with($mode,'remove')?'removed':'available');
            break;
        case 'wheel_reset':
            $mode=$d['mode']??'';
            need(in_array($mode,['wheel','players','both'],true),'Choose a reset type.');
            if($mode==='wheel' || $mode==='both') sql("UPDATE units SET status='available',revision=revision+1 WHERE status='removed'");
            if($mode==='players' || $mode==='both') {
                sql("UPDATE units SET status='available',player_id=NULL,revision=revision+1 WHERE status='assigned'");
                sql('UPDATE settings SET current_player=NULL WHERE id=1');
                sql('UPDATE spins SET undone=1 WHERE undone=0');
            }
            break;
        case 'collections_clear':
            sql("UPDATE units SET status='removed',player_id=NULL,revision=revision+1 WHERE status='assigned'");
            break;
        case 'challenge_save':
            $txt=$text('text',600); $icon=$text('icon',24,true);
            if(empty($d['id'])) {
                sql('INSERT INTO challenges(text,icon) VALUES (?,?)',[$txt,$icon]);
                $cid=(int)db()->lastInsertId(); $detail['id']=$cid;
                $n=one('SELECT COALESCE(MAX(number),0)+1 AS n FROM boxes')['n'];
                sql('INSERT INTO boxes(challenge_id,number) VALUES (?,?)',[$cid,$n]);
            } else {
                need(one('SELECT id FROM challenges WHERE id=?',[$id()])!==null,'Challenge no longer exists.');
                sql('UPDATE challenges SET text=?,icon=? WHERE id=?',[$txt,$icon,$id()]);
            }
            break;
        case 'challenge_delete':
            need(!one('SELECT id FROM boxes WHERE challenge_id=? LIMIT 1',[$id()]),'Remove or reassign its boxes before deleting this challenge.');
            sql('DELETE FROM challenges WHERE id=?',[$id()]);
            break;
        case 'box_save':
            $cid=$id('challenge_id'); $n=$id('number');
            need(one('SELECT id FROM challenges WHERE id=?',[$cid])!==null,'Choose an existing challenge.');
            $bid=empty($d['id'])?null:$id();
            $other=one('SELECT id FROM boxes WHERE number=?',[$n]);
            if($bid) {
                $b=one('SELECT * FROM boxes WHERE id=?',[$bid]); need($b!==null,'Box no longer exists.');
                if($other && $other['id']!==$bid) {
                    sql('UPDATE boxes SET number=0 WHERE id=?',[$bid]);
                    sql('UPDATE boxes SET number=? WHERE id=?',[$b['number'],$other['id']]);
                }
                sql('UPDATE boxes SET number=?,challenge_id=? WHERE id=?',[$n,$cid,$bid]);
            } else {
                need(!$other,'That box number is already in use.');
                sql('INSERT INTO boxes(challenge_id,number) VALUES (?,?)',[$cid,$n]); $detail['id']=(int)db()->lastInsertId();
            }
            break;
        case 'box_open':
        case 'box_mark':
        case 'box_close':
            $bid=$id();
            $b=one('SELECT b.*,c.text,c.icon FROM boxes b JOIN challenges c ON c.id=b.challenge_id WHERE b.id=?',[$bid]);
            need($b!==null,'Box no longer exists.');
            if($a==='box_close') {
                need($b['opened_at']!==null,'This box is already sealed.');
                sql('UPDATE boxes SET opened_at=NULL,open_seq=NULL WHERE id=?',[$bid]);
            } else {
                need($b['opened_at']===null,'This box has already been opened.');
                sql('UPDATE boxes SET opened_at=CURRENT_TIMESTAMP(3),open_seq=? WHERE id=?',[$v,$bid]);
                $detail=['id'=>$bid,'number'=>$b['number'],'text'=>$b['text'],'icon'=>$b['icon']];
            }
            break;
        case 'box_delete':
            sql('DELETE FROM boxes WHERE id=?',[$id()]);
            break;
        case 'box_reset':
            sql('UPDATE boxes SET opened_at=NULL,open_seq=NULL');
            break;
        case 'box_clear':
            sql('DELETE FROM boxes'); sql('DELETE FROM challenges');
            break;
        case 'box_shuffle':
            need(!one('SELECT id FROM boxes WHERE opened_at IS NOT NULL LIMIT 1'),'Seal all boxes before shuffling.');
            $boxes=rows('SELECT id,challenge_id FROM boxes ORDER BY id');
            $ids=array_column($boxes,'challenge_id'); shuffle($ids);
            foreach($boxes as $i=>$b) sql('UPDATE boxes SET challenge_id=? WHERE id=?',[$ids[$i],$b['id']]);
            break;
        case 'settings':
            $values=[];
            foreach(['default_limit'=>[0,500],'spin_ms'=>[500,12000],'result_ms'=>[0,60000],'box_ms'=>[150,8000],'motion'=>[0,1],'intensity'=>[0,100],'sound'=>[0,1],'fullscreen'=>[0,1]] as $key=>[$min,$max]) $values[]=number($d[$key]??null,$min,$max);
            sql('UPDATE settings SET default_limit=?,spin_ms=?,result_ms=?,box_ms=?,motion=?,intensity=?,sound=?,fullscreen=? WHERE id=1',$values);
            $detail=array_intersect_key($d,array_flip(['default_limit','spin_ms','result_ms','box_ms','motion','intensity','sound','fullscreen']));
            break;
        default: throw new Rule('Unknown action.');
        }
        record($v,$a,$source,$detail);
        if($spin) sql('INSERT INTO spins(id,unit_id,player_id,revision) VALUES (?,?,?,?)',$spin);
        sql('UPDATE settings SET version=? WHERE id=1',[$v]);
        $db->commit(); return $v;
    } catch(Throwable $e) { $db->rollBack(); throw $e; }
}

function state(string $view,int $since): array {
    $db=db(); $db->beginTransaction();
    try {
        $s=settings(); $out=['version'=>$s['version']];
        if($s['version']!==$since) {
            $out['settings']=$s;
            if($view!=='boxes') {
                $p=players(); $pool=pool();
                $out['players']=$view==='admin'?$p:array_values(array_filter($p,fn($p)=>$p['active']));
                $out['current']=turn($p,$s['current_player'])['id']??null;
                $out['pool']=$pool;
                $out['remaining']=array_sum(array_column($pool,'qty'));
                $out['total']=one("SELECT COUNT(*) AS n FROM units WHERE status<>'removed'")['n'];
                $last=one('SELECT e.detail FROM events e JOIN spins s ON s.id=e.id WHERE s.undone=0 ORDER BY e.id DESC LIMIT 1');
                $out['last']=$last?json_decode($last['detail'],true):null;
            }
            if($view!=='wheel') {
                $boxes=rows('SELECT b.*,c.text,c.icon FROM boxes b JOIN challenges c ON c.id=b.challenge_id ORDER BY b.number');
                if($view!=='admin') foreach($boxes as &$box) {
                    unset($box['challenge_id']);
                    if($box['opened_at']===null) unset($box['text'],$box['icon']);
                }
                $out['boxes']=$boxes;
            }
            if($view==='admin') {
                $out['items']=rows('SELECT * FROM items ORDER BY id');
                $out['units']=rows('SELECT * FROM units ORDER BY id');
                $out['challenges']=rows('SELECT * FROM challenges ORDER BY id');
                $out['history']=rows('SELECT e.*,s.undone,s.revision=u.revision AND u.status="assigned" AS reversible FROM events e LEFT JOIN spins s ON s.id=e.id LEFT JOIN units u ON u.id=s.unit_id ORDER BY e.id DESC LIMIT 150');
            } elseif($since>=0) {
            $out['events']=$view==='wheel'
                ? array_reverse(rows("SELECT e.id,e.detail FROM events e JOIN spins s ON s.id=e.id WHERE e.id>? AND s.undone=0 ORDER BY e.id DESC LIMIT 60",[$since]))
                : rows("SELECT e.id FROM events e JOIN boxes b ON b.open_seq=e.id WHERE e.id>? AND e.action='box_open' ORDER BY e.id",[$since]);
            }
        }
        $db->commit(); return $out;
    } catch(Throwable $e) { $db->rollBack(); throw $e; }
}
