<?php
require dirname(__DIR__,2).'/accounts.php';
security(); session_open();
$personal=$personal??false;
$account=current_account();
if(!$account){
    $intent=isset($_GET['create'])?creation_intent($_GET['tab']??null):'';
    header('Location: ../auth/'.($personal?'account.php':'login.php').($intent!==''?'?create='.$intent:''),true,303);
    exit;
}
if(!$personal && !is_admin($account)){
    http_response_code(403); exit('Administrator access is required.');
}
$csrf=token(); session_write_close();
$title=$personal?'My Challenges':'Control room';
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title><?=h($title)?> · BOLTX</title><link rel="icon" type="image/svg+xml" href="../assets/boltx-icon.svg"><link rel="stylesheet" href="../assets/style.css?v=accounts"><script type="module" src="../assets/admin.js?v=accounts"></script></head>
<body class="admin<?=$personal?' personal':''?>" data-csrf="<?=h($csrf)?>" data-dashboard="<?=$personal?'mine':'admin'?>">
<main><header class="admin-header"><div><a href="../"><img class="brand" src="../assets/boltx-logo.svg" alt="BOLTX"></a><h1><?=h($title)?></h1><?php if($personal): ?><p class="muted"><bdi><?=h($account['display_name'])?></bdi></p><?php endif ?></div>
<nav class="actions" aria-label="Account">
<?php if($personal): ?>
<a href="../auth/account.php?mode=settings">Account settings</a>
<?php if(is_admin($account)): ?><a href="../admin/">Operator control room</a><?php endif ?>
<?php else: ?><a href="../my/">My Challenges</a><a href="users.php">Users and platform settings</a><?php endif ?>
<form action="../auth/logout.php" method="post"><input type="hidden" name="csrf" value="<?=h($csrf)?>"><button>Sign out</button></form></nav></header>
<nav class="tabs" role="tablist" aria-label="Dashboard sections"><button type="button" role="tab" id="tab-settings" data-tab="settings" aria-selected="<?=$personal?'true':'false'?>" aria-controls="panel">All Challenges</button><button type="button" role="tab" id="tab-wheel" data-tab="wheel" aria-selected="<?=$personal?'false':'true'?>" aria-controls="panel"><?=$personal?'My Wheels':'Spin Wheel'?></button><button type="button" role="tab" id="tab-boxes" data-tab="boxes" aria-selected="false" aria-controls="panel"><?=$personal?'My Mystery Boxes':'Mystery Boxes'?></button></nav>
<p id="admin-status" class="admin-status" role="status"></p><div id="panel" role="tabpanel" aria-labelledby="tab-wheel"></div></main>
<dialog id="editor" class="admin-editor" aria-labelledby="editor-title">
<button id="editor-close" class="close" type="button" aria-label="Close">×</button>
<h2 id="editor-title"></h2><p id="editor-error" role="alert"></p><div id="editor-body"></div>
</dialog>
</body></html>
