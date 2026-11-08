<?php
require dirname(__DIR__,2).'/config.php';
security(); session_open();
if(!isset($_SESSION['admin'])) {
    $create=isset($_GET['create']) && in_array($_GET['tab']??null,['wheel','boxes'],true)?'?create='.$_GET['tab']:'';
    header('Location: ../auth/login.php'.$create); exit;
}
$csrf=token(); session_write_close();
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Control room · BOLTX</title><link rel="icon" type="image/svg+xml" href="../assets/boltx-icon.svg"><link rel="stylesheet" href="../assets/style.css?v=game-sets"><script type="module" src="../assets/admin.js?v=game-sets"></script></head>
<body class="admin" data-csrf="<?=h($csrf)?>">
<main><header class="admin-header"><div><img class="brand" src="../assets/boltx-logo.svg" alt="BOLTX"><h1>Control room</h1></div>
<nav class="actions" aria-label="Account">
<form action="../auth/logout.php" method="post"><input type="hidden" name="csrf" value="<?=h($csrf)?>"><button>Sign out</button></form></nav></header>
<nav class="tabs" role="tablist" aria-label="Dashboard sections"><button type="button" role="tab" id="tab-wheel" data-tab="wheel" aria-selected="true" aria-controls="panel">Spin Wheel</button><button type="button" role="tab" id="tab-boxes" data-tab="boxes" aria-selected="false" aria-controls="panel">Mystery Boxes</button><button type="button" role="tab" id="tab-settings" data-tab="settings" aria-selected="false" aria-controls="panel">Challenges</button></nav>
<p id="admin-status" class="admin-status" role="status"></p><div id="panel" role="tabpanel" aria-labelledby="tab-wheel"></div></main>
<dialog id="editor" class="admin-editor" aria-labelledby="editor-title">
<button id="editor-close" class="close" type="button" aria-label="Close">×</button>
<h2 id="editor-title"></h2><p id="editor-error" role="alert"></p><div id="editor-body"></div>
</dialog>
</body></html>
