<?php
declare(strict_types=1);

function db(): PDO {
    static $db;
    if($db) return $db;
    $localFile=__DIR__.'/config.local.php';
    $local=is_file($localFile)?require $localFile:[];
    return $db ??= new PDO(
        getenv('BOLTX_DSN') ?: ($local['dsn'] ?? 'mysql:host=127.0.0.1;dbname=boltx;charset=utf8mb4'),
        getenv('BOLTX_DB_USER') ?: ($local['user'] ?? 'boltx'),
        getenv('BOLTX_DB_PASSWORD') !== false ? getenv('BOLTX_DB_PASSWORD') : ($local['password'] ?? ''),
        [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES=>false]
    );
}
function sql(string $query, array $args=[]): PDOStatement {
    $stmt=db()->prepare($query);
    $stmt->execute($args);
    return $stmt;
}
function rows(string $query,array $args=[]): array { return sql($query,$args)->fetchAll(); }
function one(string $query,array $args=[]): ?array { return sql($query,$args)->fetch() ?: null; }
function h(string $s): string { return htmlspecialchars($s, ENT_QUOTES|ENT_SUBSTITUTE, 'UTF-8'); }
function session_open(): void {
    if(session_status()===PHP_SESSION_ACTIVE) return;
    ini_set('session.use_strict_mode','1');
    session_name('boltx_session');
    session_set_cookie_params(['path'=>'/','httponly'=>true,'secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off','samesite'=>'Strict']);
    session_start();
    if(isset($_SESSION['seen']) && time()-$_SESSION['seen']>28800) { $_SESSION=[]; session_regenerate_id(true); }
    if(isset($_SESSION['admin'])) $_SESSION['seen']=time();
}
function token(): string { return $_SESSION['csrf'] ??= bin2hex(random_bytes(32)); }
function valid_token(mixed $value): bool { return is_string($value) && isset($_SESSION['csrf']) && hash_equals($_SESSION['csrf'],$value); }
function security(): void {
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: no-referrer');
    header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
}
class Rule extends RuntimeException {}
function need(bool $ok,string $message): void { if(!$ok) throw new Rule($message); }
function number(mixed $v,int $min=1,int $max=2147483647): int {
    $n=filter_var($v,FILTER_VALIDATE_INT);
    need($n!==false && $n >= $min && $n <= $max,'Enter a number between '.$min.' and '.$max.'.');
    return $n;
}
function label(mixed $v,int $max,bool $empty=false): string {
    need(is_string($v) && mb_check_encoding($v,'UTF-8'),'Invalid text.');
    $v=trim($v);
    need(($empty || $v!=='') && mb_strlen($v)<=$max,'Enter text up to '.$max.' characters.');
    return $v;
}
function flag(mixed $v): int { return number($v,0,1); }
