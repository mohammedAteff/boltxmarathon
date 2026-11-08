<?php
require dirname(__DIR__).'/access.php';
security(); session_open();
$kind=in_array($_REQUEST['kind']??null,['wheel','boxes'],true)?$_REQUEST['kind']:'wheel';
$error='';
if(isset($_GET['token']) || $_SERVER['REQUEST_METHOD']==='POST'){
    try{
        $display=false;
        if(isset($_GET['token'])){
            $token=label($_GET['token'],48);
            $hash=access_secret($token);
            $game=one('SELECT * FROM game_sets WHERE (link_hash=? OR display_hash=?) AND archived=0 AND (access_expires_at IS NULL OR access_expires_at>CURRENT_TIMESTAMP)',[$hash,$hash]);
            $display=$game && $game['display_hash']===$hash;
        }else{
            need(valid_token($_POST['csrf']??null),'Refresh the page and try again.');
            limit_code_attempts();
            $code=strtoupper(preg_replace('/[\s-]+/','',label($_POST['code']??'',40)));
            $game=one('SELECT * FROM game_sets WHERE code_hash=? AND kind=? AND archived=0 AND (access_expires_at IS NULL OR access_expires_at>CURRENT_TIMESTAMP)',[access_secret($code),$kind]);
        }
        need($game!==null,'This private code or link is invalid or has been revoked.');
        grant_access($game,$display);
        header('Location: '.game_url($game).($display?'&display=1':''),true,303); exit;
    }catch(Rule $e){$error=$e->getMessage(); if(http_response_code()<400) http_response_code(404);}
    catch(Throwable $e){error_log((string)$e); http_response_code(503); $error='The game service is unavailable. Check the database connection.';}
}
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Open a private challenge · BOLTX</title><link rel="icon" href="assets/boltx-icon.svg"><link rel="stylesheet" href="assets/style.css"><script type="module" src="assets/locale.js"></script></head>
<body class="portal"><main class="login panel"><img class="brand" src="assets/boltx-logo.svg" alt="BOLTX">
<h1>Open a private challenge</h1><p>Enter the code shared by your host.</p>
<?php if($error): ?><p role="alert"><?=h($error)?></p><?php endif ?>
<form method="post" action="open.php"><input type="hidden" name="csrf" value="<?=h(token())?>">
<label>Challenge type<select name="kind"><option value="wheel" <?=$kind==='wheel'?'selected':''?>>Spin Wheel</option><option value="boxes" <?=$kind==='boxes'?'selected':''?>>Mystery Boxes</option></select></label>
<label>Access code<input name="code" dir="ltr" maxlength="40" autocomplete="off" required></label><button class="primary">Open challenge</button></form>
<a href="./">Back to games</a></main></body></html>
