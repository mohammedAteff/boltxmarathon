<?php
require dirname(__DIR__).'/accounts.php'; security(); session_open();
$account=current_account(); session_write_close();
?>
<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BOLTX Challenge Games</title><link rel="icon" type="image/svg+xml" href="assets/boltx-icon.svg"><link rel="stylesheet" href="assets/style.css?v=accounts"><script type="module" src="assets/locale.js?v=accounts"></script>
<body class="portal"><header class="portal-account"><a class="quiet" href="<?=$account?'my/':'auth/account.php'?>"><?=$account?'My Challenges':'Login / Register'?></a></header>
<main class="launcher"><img class="brand" src="assets/boltx-logo.svg" alt="BOLTX"><p class="eyebrow">THE LIVE CHALLENGE ARENA</p>
<h1 class="display">Pick your <em>challenge</em></h1>
<div class="launch-grid">
<section class="panel"><h2>Spin Wheel</h2><div class="actions"><a class="quiet" href="<?=$account?'my/?tab=wheel&amp;create=1':'auth/account.php?create=wheel'?>">Create new</a><a class="quiet" href="open.php?kind=wheel">Open existing</a></div></section>
<section class="panel"><h2>Mystery Boxes</h2><div class="actions"><a class="quiet" href="<?=$account?'my/?tab=boxes&amp;create=1':'auth/account.php?create=boxes'?>">Create new</a><a class="quiet" href="open.php?kind=boxes">Open existing</a></div></section>
</div></main></body></html>
