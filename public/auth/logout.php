<?php
require dirname(__DIR__,2).'/config.php';
security(); session_open();
if($_SERVER['REQUEST_METHOD']!=='POST' || !valid_token($_POST['csrf']??null)) { http_response_code(403); exit; }
$_SESSION=[]; session_destroy();
setcookie(session_name(),'', ['expires'=>1,'path'=>'/','httponly'=>true,'samesite'=>'Strict','secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off']);
header('Location: ../',true,303);
