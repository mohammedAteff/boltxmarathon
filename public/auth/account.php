<?php
require dirname(__DIR__,2).'/google.php';
session_open();
$create=creation_intent($_GET['create']??($_SESSION['create_intent']??''));
if($create!=='') $_SESSION['create_intent']=$create;
$mode=in_array($_GET['mode']??null,['login','register','forgot','reset','verify','settings'],true)?$_GET['mode']:'login';
$account=current_account();
$google=google_client_id();
$googleMode=$google!=='' && in_array($mode,['login','register','settings'],true);
security($googleMode);
if($account && in_array($mode,['login','register'],true)){
    unset($_SESSION['create_intent']);
    header('Location: '.my_challenges_url($create),true,303); exit;
}
if($mode==='settings' && !$account){header('Location: account.php',true,303);exit;}

$append=$create!==''?'&create='.$create:'';
$secret=is_string($_GET['token']??null)?$_GET['token']:'';
$error=''; $message='';
$email=''; $name='';
if($_SERVER['REQUEST_METHOD']==='POST'){
    try{
        need(valid_token($_POST['csrf']??null),'Refresh this page and try again.');
        $ip=$_SERVER['REMOTE_ADDR']??'unknown';
        $operation=$_POST['operation']??$mode;
        if($operation==='google'){
            account_rate('google-ip',$ip,25);
            $flow=$_SESSION['google_flow']??null;
            unset($_SESSION['google_flow']);
            need($google!=='' && $flow && $flow['until']>=time() && $flow['mode']===$mode,'Refresh this page and try again.');
            $credential=label($_POST['credential']??'',12000);
            $claims=google_claims($google,$credential,$flow['nonce']);
            if($mode==='settings') need($account!==null && $flow['account']===$account['id'] && time()-($_SESSION['authenticated_at']??0)<=600,'Sign in again before linking Google.');
            $user=google_account($claims,$mode==='settings'?$account:null);
            account_login($user);
            unset($_SESSION['create_intent']);
            header('Location: '.($mode==='settings'?'account.php?mode=settings':my_challenges_url($flow['create'])),true,303); exit;
        }
        need($operation===$mode,'Invalid account request.');
        if($mode==='register'){
            account_rate('register-ip',$ip,8,3600);
            $name=label($_POST['name']??'',80);
            $email=account_email($_POST['email']??null);
            $hash=new_password($_POST['password']??null,$_POST['confirm_password']??null);
            need(!one('SELECT id FROM user_accounts WHERE email=?',[$email]),'An account already uses this email. Sign in or reset your password.');
            sql("INSERT INTO user_accounts(display_name,email,password_hash,role) VALUES (?,?,?,'user')",[$name,$email,$hash]);
            $user=one('SELECT * FROM user_accounts WHERE id=?',[db()->lastInsertId()]);
            if(mail_ready()){
                $message=send_account_token($user,'verify')?'Check your email to verify your account.':'Your account was created. Request a new verification email from the sign-in page.';
            }else{
                account_login($user);
                unset($_SESSION['create_intent']);
                header('Location: '.my_challenges_url($create),true,303); exit;
            }
        }elseif($mode==='login'){
            account_rate('login-ip',$ip,30);
            $email=account_email($_POST['email']??null);
            account_rate('login-email',$email,8);
            $password=$_POST['password']??null;
            $user=one('SELECT * FROM user_accounts WHERE email=?',[$email]);
            $valid=is_string($password) && strlen($password)<=72 && !str_contains($password,"\0")
                && password_verify($password,$user['password_hash']??'$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.');
            need($valid && $user && !$user['disabled'] && $user['password_hash'],'Incorrect email or password.');
            if(mail_ready() && !$user['verified_at']){
                account_rate('verify-email',$email,3,3600);
                send_account_token($user,'verify');
                throw new Rule('Verify your email to sign in. Check your inbox for a verification link.');
            }
            account_login($user);
            unset($_SESSION['create_intent']);
            header('Location: '.my_challenges_url($create),true,303); exit;
        }elseif($mode==='forgot'){
            need(mail_ready(),'Password reset email is currently unavailable.');
            account_rate('reset-ip',$ip,10,3600);
            $email=account_email($_POST['email']??null);
            account_rate('reset-email',$email,3,3600);
            $user=one('SELECT * FROM user_accounts WHERE email=? AND disabled=0 AND password_hash IS NOT NULL',[$email]);
            if($user) send_account_token($user,'reset');
            $message='If an eligible account exists, a reset link has been sent.';
        }elseif($mode==='verify' || $mode==='reset'){
            account_rate('consume-ip',$ip,25);
            $hash=$mode==='reset'?new_password($_POST['password']??null,$_POST['confirm_password']??null):null;
            consume_account_token($secret,$mode,$hash);
            $message=$mode==='reset'?'Password updated. You can now sign in.':'Email verified. You can now sign in.';
            $mode='done';
        }elseif($mode==='settings'){
            need($account && $account['email'] && time()-($_SESSION['authenticated_at']??0)<=600,'Sign in again before changing your password.');
            $hash=new_password($_POST['password']??null,$_POST['confirm_password']??null);
            $db=db(); $db->beginTransaction();
            try{
                $updated=sql('UPDATE user_accounts SET password_hash=?,auth_version=auth_version+1 WHERE id=? AND disabled=0 AND auth_version=?',
                    [$hash,$account['id'],$account['auth_version']]);
                need($updated->rowCount()===1,'Sign in again before changing your password.');
                sql('DELETE FROM account_tokens WHERE user_id=? AND purpose=?',[$account['id'],'reset']);
                $db->commit();
            }catch(Throwable $e){$db->rollBack();throw $e;}
            $user=one('SELECT * FROM user_accounts WHERE id=?',[$account['id']]);
            account_login($user);
            $message='Password updated.';
        }
    }catch(Rule $e){$error=$e->getMessage();}
    catch(PDOException $e){
        if($e->getCode()==='23000') $error='This email or Google identity is already in use.';
        else{error_log('BOLTX account database operation failed: '.$e->getCode());$error='Account service is temporarily unavailable.';}
    }catch(Throwable $e){error_log('BOLTX account operation failed: '.get_class($e));$error='Account service is temporarily unavailable.';}
}
$recent=$account && $account['email'] && time()-($_SESSION['authenticated_at']??0)<=600;
$showGoogle=$googleMode && ($mode!=='settings'||$recent);
if($showGoogle){
    $nonce=bin2hex(random_bytes(24));
    $_SESSION['google_flow']=['nonce'=>$nonce,'until'=>time()+600,'mode'=>$mode,'create'=>$create,'account'=>$account['id']??null];
}
$headings=['login'=>'Sign in','register'=>'Create your account','forgot'=>'Reset your password','reset'=>'Choose a new password','verify'=>'Verify your email','settings'=>'Account settings','done'=>'You’re ready'];
$formUrl='?mode='.$mode.$append.($secret!==''?'&token='.rawurlencode($secret):'');
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title><?=h($headings[$mode])?> · BOLTX</title><link rel="icon" href="../assets/boltx-icon.svg">
<link rel="stylesheet" href="../assets/style.css?v=accounts"><script type="module" src="../assets/locale.js?v=accounts"></script>
<?php if($showGoogle): ?><script src="https://accounts.google.com/gsi/client" defer></script><script type="module" src="../assets/google-login.js?v=locale"></script><?php endif ?>
</head><body class="portal account-portal"><main class="login panel account-card">
<a href="../"><img class="brand" src="../assets/boltx-logo.svg" alt="BOLTX"></a>
<p class="account-kicker">YOUR BOLTX ACCOUNT</p>
<h1><?=h($headings[$mode])?></h1>
<?php if($create!=='' && in_array($mode,['login','register'],true)): ?><p><?=$create==='wheel'?'Sign in to create a wheel.':'Sign in to create mystery boxes.'?></p><?php endif ?>
<?php if($error!==''): ?><p class="account-feedback error" role="alert"><?=h($error)?></p><?php endif ?>
<?php if($message!==''): ?><p class="account-feedback" role="status"><?=h($message)?></p><?php endif ?>
<?php if($showGoogle): ?>
<div id="google-button" data-client="<?=h($google)?>" data-nonce="<?=h($nonce)?>"></div>
<p id="google-status" role="status"></p>
<form id="google-form" method="post" action="<?=h($formUrl)?>" hidden>
<input type="hidden" name="operation" value="google"><input type="hidden" name="csrf" value="<?=h(token())?>"><input type="hidden" name="credential">
</form>
<?php if($mode!=='settings'): ?><div class="account-divider"><span>OR</span></div><?php endif ?>
<?php endif ?>
<?php if($mode==='settings'): ?><p><bdi><?=h($account['display_name'])?></bdi> · <bdi><?=h($account['email']??'')?></bdi></p>
<?php if($showGoogle): ?><p>Use the Google button to link your verified Google identity to this account.</p><?php endif ?>
<?php if(!$recent): ?><p>Sign in again before changing your password or linking Google.</p><?php endif ?>
<?php endif ?>
<?php if($mode!=='done' && ($mode!=='settings'||$recent) && ($mode!=='forgot'||mail_ready())): ?>
<form method="post" action="<?=h($formUrl)?>">
<input type="hidden" name="csrf" value="<?=h(token())?>">
<?php if($mode==='register'): ?><label>Display name<input name="name" value="<?=h($name)?>" maxlength="80" autocomplete="name" dir="auto" required></label><?php endif ?>
<?php if(in_array($mode,['login','register','forgot'],true)): ?><label>Email address<input name="email" type="email" value="<?=h($email)?>" maxlength="254" autocomplete="email" dir="ltr" required></label><?php endif ?>
<?php if(in_array($mode,['login','register','reset','settings'],true)): ?>
<label>Password<input name="password" type="password" autocomplete="<?=$mode==='login'?'current-password':'new-password'?>" <?=$mode!=='login'?'minlength="12"':''?> maxlength="72" required></label>
<?php if($mode!=='login'): ?><label>Confirm password<input name="confirm_password" type="password" minlength="12" maxlength="72" autocomplete="new-password" required></label><?php endif ?>
<?php endif ?>
<button class="primary"><?=h(['login'=>'Sign in','register'=>'Create account','forgot'=>'Send reset link','reset'=>'Save password','verify'=>'Verify email','settings'=>'Save password'][$mode])?></button>
</form>
<?php elseif($mode==='forgot'): ?><p>Password reset email is currently unavailable.</p><?php endif ?>
<nav class="account-links" aria-label="Account links">
<?php if($mode==='login'): ?><a href="?mode=register<?=h($append)?>">Create account</a><a href="?mode=forgot<?=h($append)?>">Forgot password?</a>
<?php elseif($mode==='settings'): ?><a href="../my/">My Challenges</a>
<?php else: ?><a href="?mode=login<?=h($append)?>">Sign in</a><?php endif ?>
<a href="../">Back to games</a></nav></main></body></html>
