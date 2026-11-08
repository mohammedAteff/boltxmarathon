<?php
require_once __DIR__.'/config.php';

function current_account(): ?array {
    static $read=false,$account=null;
    if($read) return $account;
    $read=true;
    if(isset($_SESSION['account_id'])){
        $account=one('SELECT id,display_name,email,role,auth_version,disabled,legacy_admin_id FROM user_accounts WHERE id=?',[$_SESSION['account_id']]);
        if(!$account || $account['disabled'] || $account['auth_version']!==($_SESSION['auth_version']??null)) $account=null;
    }elseif(isset($_SESSION['admin'])){
        // Sessions issued before the accounts migration use the legacy administrator ID.
        $account=one("SELECT id,display_name,email,role,auth_version,disabled,legacy_admin_id FROM user_accounts
            WHERE legacy_admin_id=? AND role='admin' AND disabled=0 AND auth_version=0",[$_SESSION['admin']]);
    }
    if(!$account) unset($_SESSION['account_id'],$_SESSION['auth_version'],$_SESSION['admin'],$_SESSION['authenticated_at']);
    return $account;
}

function account_login(array $account): void {
    need(!$account['disabled'],'This account is unavailable.');
    session_regenerate_id(true);
    unset($_SESSION['admin'],$_SESSION['csrf'],$_SESSION['google_flow']);
    $_SESSION['account_id']=$account['id'];
    $_SESSION['auth_version']=$account['auth_version'];
    $_SESSION['seen']=$_SESSION['authenticated_at']=time();
}

function is_admin(?array $account): bool { return ($account['role']??null)==='admin'; }
function can_manage(?array $account,array $game): bool {
    return $account!==null && (is_admin($account) || $account['id']===$game['owner_user_id']);
}
function require_account(): array {
    $account=current_account();
    if(!$account){http_response_code(401);throw new Rule('Sign in to continue.');}
    return $account;
}
function creation_intent(mixed $value): string {
    return in_array($value,['wheel','boxes'],true)?$value:'';
}
function my_challenges_url(string $create=''): string {
    return '../my/'.($create!==''?'?tab='.$create.'&create=1':'');
}

function account_rate(string $purpose,string $identifier,int $limit,int $seconds=900): void {
    $bucket=hash('sha256',$purpose."\0".$identifier);
    $now=time();
    sql('INSERT INTO account_attempts(bucket,attempts,window_start) VALUES (?,1,?)
        ON DUPLICATE KEY UPDATE attempts=IF(window_start<=?,1,attempts+1),window_start=IF(window_start<=?,VALUES(window_start),window_start)',
        [$bucket,$now,$now-$seconds,$now-$seconds]);
    if(one('SELECT attempts FROM account_attempts WHERE bucket=?',[$bucket])['attempts']>$limit){
        http_response_code(429); throw new Rule('Too many attempts. Try again later.');
    }
    if(random_int(1,100)===1) sql('DELETE FROM account_attempts WHERE window_start<?',[$now-86400]);
}

function account_email(mixed $value): string {
    need(is_string($value),'Enter a valid email address.');
    $email=strtolower(trim($value));
    need(strlen($email)<=254 && filter_var($email,FILTER_VALIDATE_EMAIL)!==false,'Enter a valid email address.');
    return $email;
}

function new_password(mixed $password,mixed $confirmation): string {
    need(is_string($password) && strlen($password)>=12 && strlen($password)<=72 && !str_contains($password,"\0"),'Use a password between 12 and 72 bytes.');
    need($password===$confirmation,'Passwords do not match.');
    return password_hash($password,PASSWORD_DEFAULT);
}

function mail_ready(): bool {
    return filter_var(app_setting('BOLTX_MAIL_FROM','mail_from'),FILTER_VALIDATE_EMAIL)!==false
        && str_starts_with(app_setting('BOLTX_BASE_URL','base_url'),'https://');
}

function send_account_token(array $account,string $purpose): bool {
    if(!mail_ready()) return false;
    $secret=bin2hex(random_bytes(32));
    $db=db(); $db->beginTransaction();
    try{
        one('SELECT id FROM user_accounts WHERE id=? FOR UPDATE',[$account['id']]);
        sql('DELETE FROM account_tokens WHERE user_id=? AND purpose=?',[$account['id'],$purpose]);
        sql('INSERT INTO account_tokens(token_hash,user_id,purpose,expires_at) VALUES (?,?,?,TIMESTAMPADD(MINUTE,?,CURRENT_TIMESTAMP))',
            [hash('sha256',$secret),$account['id'],$purpose,$purpose==='reset'?30:1440]);
        $db->commit();
    }catch(Throwable $e){$db->rollBack();throw $e;}
    $url=rtrim(app_setting('BOLTX_BASE_URL','base_url'),'/').'/auth/account.php?mode='.$purpose.'&token='.$secret;
    $subject=$purpose==='reset'?'Reset your BOLTX password':'Verify your BOLTX email';
    return mail($account['email'],$subject,$subject.":\n\n".$url."\n\nIf you did not request this, you can ignore this email.",
        'From: BOLTX <'.app_setting('BOLTX_MAIL_FROM','mail_from').">\r\nContent-Type: text/plain; charset=UTF-8");
}

function consume_account_token(string $secret,string $purpose,?string $hash=null): void {
    need((bool)preg_match('/^[a-f0-9]{64}$/D',$secret),'This link is invalid or expired.');
    $db=db(); $db->beginTransaction();
    try{
        $digest=hash('sha256',$secret);
        $link=one('SELECT t.user_id FROM account_tokens t WHERE t.token_hash=? AND t.purpose=? AND t.expires_at>CURRENT_TIMESTAMP',[$digest,$purpose]);
        need($link!==null,'This link is invalid or expired.');
        $account=one('SELECT id,disabled FROM user_accounts WHERE id=? FOR UPDATE',[$link['user_id']]);
        $link=one('SELECT user_id FROM account_tokens WHERE token_hash=? AND purpose=? AND expires_at>CURRENT_TIMESTAMP FOR UPDATE',[$digest,$purpose]);
        need($link!==null && $account && !$account['disabled'],'This link is invalid or expired.');
        if($purpose==='reset'){
            sql('UPDATE user_accounts SET password_hash=?,verified_at=COALESCE(verified_at,CURRENT_TIMESTAMP),auth_version=auth_version+1 WHERE id=?',[$hash,$account['id']]);
            sql('DELETE FROM account_tokens WHERE user_id=?',[$account['id']]);
        }else{
            sql('UPDATE user_accounts SET verified_at=CURRENT_TIMESTAMP WHERE id=?',[$account['id']]);
            sql('DELETE FROM account_tokens WHERE token_hash=?',[$digest]);
        }
        $db->commit();
    }catch(Throwable $e){$db->rollBack();throw $e;}
}
