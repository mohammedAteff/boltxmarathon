<?php
require dirname(__DIR__,2).'/config.php';
security(); session_open();
if(!isset($_SESSION['admin'])) { header('Location: ../auth/login.php'); exit; }
$csrf=token(); session_write_close();
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Control room · BOLTX</title><link rel="icon" type="image/svg+xml" href="../assets/boltx-icon.svg"><link rel="stylesheet" href="../assets/style.css"><script type="module" src="../assets/admin.js"></script></head>
<body class="admin" data-csrf="<?=h($csrf)?>">
<main><header class="admin-header"><div><img class="brand" src="../assets/boltx-logo.svg" alt="BOLTX"><h1>Control room</h1></div>
<nav class="actions" aria-label="Game views"><a href="../wheel.php" target="_blank">Operate wheel ↗</a><a href="../boxes.php" target="_blank">Operate boxes ↗</a><a href="../wheel.php?display" target="_blank">Wheel display ↗</a><a href="../boxes.php?display" target="_blank">Box display ↗</a>
<form action="../auth/logout.php" method="post"><input type="hidden" name="csrf" value="<?=h($csrf)?>"><button>Sign out</button></form></nav></header>
<nav class="tabs" role="tablist" aria-label="Dashboard sections"><button type="button" role="tab" id="tab-wheel" data-tab="wheel" aria-selected="true" aria-controls="panel">Spin Wheel</button><button type="button" role="tab" id="tab-boxes" data-tab="boxes" aria-selected="false" aria-controls="panel">Mystery Boxes</button><button type="button" role="tab" id="tab-settings" data-tab="settings" aria-selected="false" aria-controls="panel">Settings</button></nav>
<p id="admin-status" class="admin-status" role="status"></p><div id="panel" role="tabpanel" aria-labelledby="tab-wheel"></div></main>
</body></html>
