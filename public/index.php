<?php
require dirname(__DIR__).'/config.php'; security();
?>
<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BOLTX Challenge Games</title><link rel="icon" type="image/svg+xml" href="assets/boltx-icon.svg"><link rel="stylesheet" href="assets/style.css?v=2"><script type="module" src="assets/locale.js?v=2"></script>
<body class="portal"><main class="launcher"><img class="brand" src="assets/boltx-logo.svg" alt="BOLTX"><p class="eyebrow">THE LIVE CHALLENGE ARENA</p>
<h1 class="display">Pick your <em>challenge</em></h1>
<div class="launch-grid">
<section class="panel"><h2>Spin Wheel</h2><div class="actions"><a class="quiet" href="admin/?tab=wheel&amp;create=1">Create new</a><a class="quiet" href="open.php?kind=wheel">Open existing</a></div></section>
<section class="panel"><h2>Mystery Boxes</h2><div class="actions"><a class="quiet" href="admin/?tab=boxes&amp;create=1">Create new</a><a class="quiet" href="open.php?kind=boxes">Open existing</a></div></section>
</div></main></body></html>
