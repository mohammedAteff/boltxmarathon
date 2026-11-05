<?php
require dirname(__DIR__,2).'/config.php';
security(); session_open();
if(isset($_SESSION['admin'])) { header('Location: ../admin/'); exit; }
$error='';
if($_SERVER['REQUEST_METHOD']==='POST') {
    try {
        need(valid_token($_POST['csrf']??null),'Refresh this page and try again.');
        $ip=$_SERVER['REMOTE_ADDR']??'unknown'; $now=time();
        // Count attempts before checking credentials, including simultaneous requests.
        sql('INSERT INTO login_attempts(ip,attempts,since_at) VALUES (?,1,?) ON DUPLICATE KEY UPDATE attempts=IF(since_at<?,1,attempts+1), since_at=IF(since_at<?,VALUES(since_at),since_at)',[$ip,$now,$now-900,$now-900]);
        $rate=one('SELECT attempts FROM login_attempts WHERE ip=?',[$ip]);
        need($rate['attempts']<=8,'Too many attempts. Try again in 15 minutes.');
        $name=label($_POST['username']??'',80); $password=$_POST['password']??'';
        need(is_string($password) && strlen($password)<=72,'Incorrect username or password.');
        $user=one('SELECT * FROM admins WHERE username=?',[$name]);
        $valid=password_verify($password,$user['hash']??'$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.');
        need($valid && $user!==null,'Incorrect username or password.');
        sql('DELETE FROM login_attempts WHERE ip=?',[$ip]);
        session_regenerate_id(true); $_SESSION=['admin'=>$user['id'],'seen'=>time()];
        header('Location: ../admin/',true,303); exit;
    } catch(Rule $e) { $error=$e->getMessage(); }
    catch(Throwable $e) { error_log((string)$e); $error='Sign-in is unavailable. Check the database connection.'; }
}
?>
<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign in · BOLTX</title><link rel="icon" type="image/svg+xml" href="../assets/boltx-icon.svg"><link rel="stylesheet" href="../assets/style.css">
<body class="portal"><main class="login panel"><img class="brand" src="../assets/boltx-logo.svg" alt="BOLTX">
<h1>Control room</h1><p>Sign in to operate both games.</p>
<form method="post"><input type="hidden" name="csrf" value="<?=h(token())?>">
<label>Username<input name="username" autocomplete="username" required></label>
<label>Password<input type="password" name="password" autocomplete="current-password" required></label>
<?php if($error): ?><p role="alert"><?=h($error)?></p><?php endif ?>
<button class="primary">Sign in</button></form><a href="../">Back to games</a></main></body></html>
