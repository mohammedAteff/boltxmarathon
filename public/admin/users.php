<?php
require dirname(__DIR__,2).'/accounts.php';
security(); session_open();
$actor=current_account();
if(!is_admin($actor)){http_response_code(403);exit('Administrator access is required.');}
$error=''; $message='';
$limits=['default_limit'=>[0,500],'spin_ms'=>[500,12000],'result_ms'=>[0,60000],'box_ms'=>[150,8000],'intensity'=>[0,100]];
if($_SERVER['REQUEST_METHOD']==='POST'){
    try{
        need(valid_token($_POST['csrf']??null),'Refresh this page and try again.');
        $db=db(); $db->beginTransaction();
        try{
            // Serialize permission changes with challenge management and platform settings.
            one('SELECT id FROM settings WHERE id=1 FOR UPDATE');
            $fresh=one('SELECT role,disabled,auth_version FROM user_accounts WHERE id=? FOR UPDATE',[$actor['id']]);
            need(is_admin($fresh) && !$fresh['disabled'] && $fresh['auth_version']===$actor['auth_version'],'Administrator access is required.');
            if(($_POST['operation']??'')==='defaults'){
                $values=[];
                foreach($limits as $field=>[$min,$max]) $values[]=number($_POST[$field]??null,$min,$max);
                foreach(['motion','sound','fullscreen'] as $field) $values[]=flag($_POST[$field]??0);
                sql('UPDATE settings SET default_limit=?,spin_ms=?,result_ms=?,box_ms=?,intensity=?,motion=?,sound=?,fullscreen=?,version=version+1 WHERE id=1',$values);
            }else{
                $id=number($_POST['user_id']??null);
                $role=$_POST['role']??null;
                $disabled=flag($_POST['disabled']??0);
                need(in_array($role,['admin','user'],true),'Invalid account role.');
                $user=one('SELECT * FROM user_accounts WHERE id=? FOR UPDATE',[$id]);
                need($user && $id!==$actor['id'] && $user['legacy_admin_id']===null,'This operator account is protected.');
                if($role==='admin' && $user['role']!=='admin') need($user['verified_at']!==null,'Verify this account’s email before granting administrator access.');
                if($user['role']!==$role || $user['disabled']!==$disabled){
                    sql('UPDATE user_accounts SET role=?,disabled=?,auth_version=auth_version+1 WHERE id=?',[$role,$disabled,$id]);
                    sql('DELETE FROM account_tokens WHERE user_id=?',[$id]);
                }
            }
            $db->commit();
            $message='Saved.';
        }catch(Throwable $e){$db->rollBack();throw $e;}
    }catch(Rule $e){$error=$e->getMessage();}
    catch(Throwable $e){error_log('BOLTX operator settings update failed: '.get_class($e));$error='Account service is temporarily unavailable.';}
}
$page=filter_var($_GET['page']??1,FILTER_VALIDATE_INT,['options'=>['min_range'=>1,'max_range'=>100000]])?:1;
$users=rows('SELECT id,display_name,email,role,disabled,legacy_admin_id,created_at,verified_at FROM user_accounts ORDER BY id LIMIT 51 OFFSET '.(($page-1)*50));
$defaults=one('SELECT * FROM settings WHERE id=1');
$names=['default_limit'=>'Default player limit (0 = unlimited)','spin_ms'=>'Spin duration (ms)','result_ms'=>'Result popup duration (ms)','box_ms'=>'Box opening duration (ms)','intensity'=>'Effects (0–100)','motion'=>'Animation','sound'=>'Sound','fullscreen'=>'Fullscreen control'];
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Users and platform settings · BOLTX</title><link rel="icon" href="../assets/boltx-icon.svg"><link rel="stylesheet" href="../assets/style.css?v=accounts"><script type="module" src="../assets/locale.js?v=accounts"></script></head>
<body class="admin"><main><header class="admin-header"><div><img class="brand" src="../assets/boltx-logo.svg" alt="BOLTX"><h1>Users and platform settings</h1></div><a href="./">Back to control room</a></header>
<?php if($error): ?><p role="alert"><?=h($error)?></p><?php endif ?><?php if($message): ?><p role="status"><?=h($message)?></p><?php endif ?>
<div class="group"><section class="panel"><h2>Registered users</h2><div class="table-scroll"><table>
<thead><tr><th>Display name</th><th>Email address</th><th>Created</th><th>Permissions</th></tr></thead><tbody>
<?php foreach(array_slice($users,0,50) as $user): ?><tr><td><bdi><?=h($user['display_name'])?></bdi></td><td><bdi><?=h($user['email']??'—')?></bdi></td><td><?=h($user['created_at'])?></td>
<td><?php if($user['legacy_admin_id']!==null || $user['id']===$actor['id']): ?><span>Protected administrator</span>
<?php else: ?><form method="post" class="actions"><input type="hidden" name="csrf" value="<?=h(token())?>"><input type="hidden" name="user_id" value="<?=$user['id']?>">
<label>Role<select name="role"><option value="user" <?=$user['role']==='user'?'selected':''?>>User</option><option value="admin" <?=$user['role']==='admin'?'selected':''?>>Administrator</option></select></label>
<label>Account status<select name="disabled"><option value="0" <?=!$user['disabled']?'selected':''?>>Active</option><option value="1" <?=$user['disabled']?'selected':''?>>Suspended</option></select></label>
<button>Save permissions</button></form><?php endif ?></td></tr><?php endforeach ?>
</tbody></table></div><nav class="actions"><?php if($page>1): ?><a href="?page=<?=$page-1?>">Previous</a><?php endif ?><?php if(count($users)>50): ?><a href="?page=<?=$page+1?>">Next</a><?php endif ?></nav></section>
<section class="panel"><h2>Platform defaults</h2><p class="muted">These settings apply to newly created challenges.</p>
<form method="post" class="actions"><input type="hidden" name="csrf" value="<?=h(token())?>"><input type="hidden" name="operation" value="defaults">
<?php foreach($limits as $field=>[$min,$max]): ?><label><?=h($names[$field])?><input type="number" name="<?=$field?>" min="<?=$min?>" max="<?=$max?>" value="<?=$defaults[$field]?>" required></label><?php endforeach ?>
<?php foreach(['motion','sound','fullscreen'] as $field): ?><label><?=h($names[$field])?><select name="<?=$field?>"><option value="1" <?=$defaults[$field]?'selected':''?>>On</option><option value="0" <?=!$defaults[$field]?'selected':''?>>Off</option></select></label><?php endforeach ?>
<button class="primary">Save defaults</button></form></section></div></main></body></html>
