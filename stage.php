<?php
require __DIR__.'/config.php'; security(); session_open();
$operator=isset($_SESSION['admin']) && !isset($_GET['display']);
$csrf=$operator?token():''; session_write_close();
$wheel=$view==='wheel';
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BOLTX <?= $wheel?'Spin Wheel':'Mystery Boxes' ?></title><link rel="icon" type="image/png" href="assets/boltx-icon.png"><link rel="stylesheet" href="assets/style.css">
<script type="module" src="assets/stage.js"></script></head>
<body class="stage <?=$view?>" data-view="<?=$view?>" data-csrf="<?=h($csrf)?>">
<div class="arena-decor" aria-hidden="true">
<i></i><i></i><span class="scenery scenery-left"></span><span class="scenery scenery-right"></span>
<span class="arena-art arena-art-left"></span><span class="arena-art arena-art-right"></span><span class="arena-sparks"></span>
</div>
<main class="stage-main">
<header class="hero">
<a href="./" aria-label="BOLTX home"><img class="brand" src="assets/boltx-logo.svg" alt="BOLTX"></a>
<h1 class="display"><small>BOLTX</small><?= $wheel?'SPIN <em>WHEEL</em>':'MYSTERY <em>BOXES</em>' ?></h1>
<p class="eyebrow"><?= $wheel?'RANDOM CHALLENGE':'OPEN · REVEAL · CHALLENGE' ?></p>
<div class="counter" id="counter" aria-label="Game counters"></div>
</header>
<?php if($wheel): ?>
<div class="wheel-layout">
<aside id="players-left" class="players players-left" aria-label="Players"></aside>
<div class="wheel-area">
<div class="wheel-frame"><div id="rotor"><svg id="segments" viewBox="0 0 500 500" role="img" aria-label="Available wheel items"></svg></div>
<div class="hub"><img src="assets/bolt.svg" alt=""></div>
<svg class="pointer" viewBox="0 0 65 65" aria-hidden="true"><path d="M9 4h47q8 0 4 9L33 61 5 13Q1 4 9 4Z"/><path class="point-bolt" d="M33 11h10l-9 12h7L24 42l5-16h-6Z"/></svg>
</div>
<div class="spin-wrap">
<button id="undo" class="undo" type="button" <?=$operator?'':'hidden'?>>↶ &nbsp; UNDO LAST SPIN</button>
<button id="spin" class="spin" type="button" disabled aria-label="Spin wheel">
<svg viewBox="58 49 224 256" aria-hidden="true">
<defs><linearGradient id="spinfill" x2=".75" y2="1"><stop stop-color="#ad44ff"/><stop offset=".53" stop-color="#6400d4"/><stop offset="1" stop-color="#381074"/></linearGradient></defs>
<path d="M214 57 266 80Q280 86 272 97L194 153 239 174Q257 182 250 199Q248 204 242 209L87 297 150 206 65 168Z"/>
<text x="163" y="179" text-anchor="middle">SPIN</text>
</svg>
</button></div>
</div>
<aside id="players-right" class="players players-right" aria-label="More players"></aside>
</div>
<div id="status-bar" class="status-bar"></div>
<?php else: ?>
<section class="box-grid" id="boxes" aria-label="Mystery boxes"></section>
<?php endif ?>
<p id="notice" class="notice" role="status"></p>
<button id="fullscreen" class="quiet fullscreen" type="button" hidden>Fullscreen</button>
</main>
<dialog id="reveal"><button class="close" type="button" aria-label="Close">×</button><div id="reveal-content"></div></dialog>
</body></html>
