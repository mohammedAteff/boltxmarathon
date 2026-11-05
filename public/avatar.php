<?php
require dirname(__DIR__).'/config.php';
try {
    $id=number($_GET['id']??null);
    $p=one('SELECT avatar FROM players WHERE id=? AND deleted=0',[$id]);
    if(!$p || $p['avatar']===null) { http_response_code(404); exit; }
    header('Content-Type: image/jpeg');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-cache');
    $etag='"'.hash('sha256',$p['avatar']).'"';
    header('ETag: '.$etag);
    if(($_SERVER['HTTP_IF_NONE_MATCH']??'')===$etag) { http_response_code(304); exit; }
    echo $p['avatar'];
} catch(Throwable) { http_response_code(404); }
