<?php
require dirname(__DIR__).'/game.php';
security(); session_open();
try{
    $id=number($_GET['game']??1);
    $game=authorized_game($id,'wheel');
    $editable=!isset($_GET['display']) && role_for($game)!=='view';
    $csrf=$editable?token():'';
    session_write_close();
    $all=players($id);
    $filter=isset($_GET['player']) && $_GET['player']!==''?number($_GET['player']):null;
    $shown=$filter?array_values(array_filter($all,fn($p)=>$p['id']===$filter)):$all;
}catch(Rule){
    header('Location: open.php?kind=wheel',true,303); exit;
}
if(isset($_GET['csv'])){
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="boltx-challenge-'.$id.'.csv"');
    $out=fopen('php://output','wb');
    fwrite($out,"\xEF\xBB\xBF");
    fputcsv($out,['Challenge','Player','Item','Assignment ID','Status'],',','"','');
    $cell=fn($s)=>preg_match('/^\s*[=+@-]|^[\t\r]/u',$s)?"'".$s:$s;
    foreach($all as $p){
        foreach($p['items'] as $u) fputcsv($out,[$cell($game['name']),$cell($p['name']),$cell($u['name']),$u['id'],$u['completed']?'Completed':'Pending'],',','"','');
        if(!$p['items']) fputcsv($out,[$cell($game['name']),$cell($p['name']),'','',''],',','"','');
    }
    exit;
}
$display=isset($_GET['display'])?'&display=1':'';
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Challenge checklist · BOLTX</title><link rel="icon" href="assets/boltx-icon.svg"><link rel="stylesheet" href="assets/style.css"><script type="module" src="assets/list.js"></script></head>
<body class="admin checklist" data-game="<?=$id?>" data-csrf="<?=h($csrf)?>" data-language="<?=h(settings($game)['language'])?>"><main>
<header class="admin-header"><div><img class="brand" src="assets/boltx-logo.svg" alt="BOLTX"><h1>Challenge checklist</h1><p><bdi><?=h($game['name'])?></bdi></p><p class="print-date"><?=date('Y-m-d')?></p></div>
<nav class="actions"><a href="<?=h(game_url($game).$display)?>">Back to wheel</a><a href="?game=<?=$id?>&amp;csv=1">Download CSV</a><button type="button" id="print-list">Print / Save as PDF</button></nav></header>
<form class="list-filter" method="get"><input type="hidden" name="game" value="<?=$id?>"><?php if($display):?><input type="hidden" name="display" value="1"><?php endif ?>
<label>Player<select name="player"><option value="">All players</option><?php foreach($all as $p): ?><option data-user-text value="<?=$p['id']?>" <?=$filter===$p['id']?'selected':''?>><?=h($p['name'])?></option><?php endforeach ?></select></label><button>Show list</button></form>
<p id="list-status" role="status"></p>
<div class="group">
<?php foreach($shown as $p): $total=count($p['items']); $done=array_sum(array_column($p['items'],'completed')); ?>
<section class="panel list-player"><header class="section-heading"><div class="list-identity">
<?php if($p['photo']): ?><img src="avatar.php?id=<?=$p['id']?>" alt=""><?php endif ?><h2><bdi><?=h($p['name'])?></bdi></h2></div>
<span><strong class="done-count"><?=$done?></strong> / <?=$total?> <span>completed</span></span></header>
<?php if($total): ?><progress max="<?=$total?>" value="<?=$done?>"></progress>
<?php foreach($p['items'] as $u): ?><label class="list-item">
<input type="checkbox" data-unit="<?=$u['id']?>" data-revision="<?=$u['revision']?>" <?=$u['completed']?'checked':''?> <?=$editable?'':'disabled'?>>
<span><bdi><?=h(trim($u['icon'].' '.$u['name']))?></bdi></span></label><?php endforeach ?>
<?php else: ?><p>No assigned items.</p><?php endif ?></section>
<?php endforeach ?>
<?php if(!$shown): ?><p>No players to show.</p><?php endif ?>
</div></main></body></html>
