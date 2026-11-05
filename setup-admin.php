<?php
require __DIR__.'/config.php';
if(PHP_SAPI!=='cli') exit(1);
$name=$argv[1]??'';
$password=rtrim(fgets(STDIN) ?: '',"\r\n");
if(!preg_match('/^[a-zA-Z0-9_.-]{1,80}$/D',$name) || strlen($password)<12 || strlen($password)>72) {
    fwrite(STDERR,"Supply a username as the first argument and a 12–72 byte password via stdin.\n"); exit(1);
}
sql('INSERT INTO admins(username,hash) VALUES (?,?) ON DUPLICATE KEY UPDATE hash=VALUES(hash)',[$name,password_hash($password,PASSWORD_DEFAULT)]);
echo "Administrator saved.\n";
