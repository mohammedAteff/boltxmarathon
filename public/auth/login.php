<?php
require dirname(__DIR__,2).'/accounts.php';
security(); session_open();
$create=in_array($_GET['create']??null,['wheel','boxes'],true)?$_GET['create']:'';
$destination='../admin/'.($create?'?tab='.$create.'&create=1':'');
if(is_admin(current_account())) { header('Location: '.$destination); exit; }
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
        $user=one("SELECT a.*,u.hash FROM admins u JOIN user_accounts a ON a.legacy_admin_id=u.id WHERE u.username=? AND a.role='admin' AND a.disabled=0",[$name]);
        $valid=password_verify($password,$user['hash']??'$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.');
        need($valid && $user!==null,'Incorrect username or password.');
        sql('DELETE FROM login_attempts WHERE ip=?',[$ip]);
        account_login($user);
        header('Location: '.$destination,true,303); exit;
    } catch(Rule $e) { $error=$e->getMessage(); }
    catch(Throwable $e) { error_log((string)$e); $error='Sign-in is unavailable. Check the database connection.'; }
}
?>
<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign in · BOLTX</title><link rel="icon" type="image/svg+xml" href="../assets/boltx-icon.svg"><link rel="stylesheet" href="../assets/style.css?v=2"><script type="module" src="../assets/locale.js?v=2"></script>
<body class="portal"><main class="login panel"><img class="brand" src="../assets/boltx-logo.svg" alt="BOLTX">
<h1>Control room</h1><p>Sign in to operate both games.</p>
<form method="post"><input type="hidden" name="csrf" value="<?=h(token())?>">
<label>Username<input name="username" autocomplete="username" required></label>
<label>Password<input type="password" name="password" autocomplete="current-password" required></label>
<?php if($error): ?><p role="alert"><?=h($error)?></p><?php endif ?>
<button class="primary">Sign in</button></form><a href="account.php">Sign in with email or Google</a> · <a href="../">Back to games</a></main></body></html>
