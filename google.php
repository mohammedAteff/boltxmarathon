<?php
require_once __DIR__.'/accounts.php';

function google_client_id(): string {
    $id=app_setting('BOLTX_GOOGLE_CLIENT_ID','google_client_id');
    return is_file(__DIR__.'/vendor/autoload.php') && preg_match('/^[a-z0-9.-]+\.apps\.googleusercontent\.com$/Di',$id)?$id:'';
}

function google_claims(string $client,string $credential,string $nonce,?Google\Auth\AccessToken $verifier=null): array {
    require_once __DIR__.'/vendor/autoload.php';
    try{
        $claims=($verifier??new Google\Auth\AccessToken())->verify($credential,['audience'=>$client]);
    }catch(Throwable $e){
        // The library exception may contain token data.
        throw new Rule('Google sign-in could not be verified. Try again or use email.');
    }
    need(is_array($claims)
        && ($claims['aud']??null)===$client
        && in_array($claims['iss']??null,['https://accounts.google.com','accounts.google.com'],true)
        && is_int($claims['exp']??null) && $claims['exp']>time()
        && is_string($claims['nonce']??null) && hash_equals($nonce,$claims['nonce'])
        && is_string($claims['sub']??null) && preg_match('/^[\x21-\x7e]{1,255}$/D',$claims['sub'])
        && in_array($claims['email_verified']??false,[true,'true'],true),
        'Google sign-in could not be verified. Try again or use email.');
    return $claims;
}

function google_account(array $claims,?array $linkAccount): array {
    $email=account_email($claims['email']??null);
    $subject=$claims['sub'];
    $photo=$claims['picture']??null;
    if(!is_string($photo) || strlen($photo)>1024 || !str_starts_with($photo,'https://') || !filter_var($photo,FILTER_VALIDATE_URL)) $photo=null;
    if($linkAccount){
        need($linkAccount['email']===$email,'Use the Google account with the same email address.');
        sql('UPDATE user_accounts SET google_sub=?,photo_url=?,verified_at=COALESCE(verified_at,CURRENT_TIMESTAMP)
            WHERE id=? AND disabled=0 AND auth_version=? AND (google_sub IS NULL OR google_sub=?)',
            [$subject,$photo,$linkAccount['id'],$linkAccount['auth_version'],$subject]);
        $linked=one('SELECT * FROM user_accounts WHERE id=? AND google_sub=? AND disabled=0 AND auth_version=?',
            [$linkAccount['id'],$subject,$linkAccount['auth_version']]);
        need($linked!==null,'This account already has a different Google identity or the session has changed.');
        return $linked;
    }
    if($existing=one('SELECT * FROM user_accounts WHERE google_sub=?',[$subject])) return $existing;
    need(!one('SELECT id FROM user_accounts WHERE email=?',[$email]),'An account already uses this email. Sign in with email and link Google from Account settings.');
    $name=$claims['name']??'';
    $name=is_string($name)?trim(mb_substr($name,0,80)):'';
    sql("INSERT INTO user_accounts(display_name,email,google_sub,photo_url,verified_at,role) VALUES (?,?,?,?,CURRENT_TIMESTAMP,'user')",
        [$name!==''?$name:mb_substr(explode('@',$email)[0],0,80),$email,$subject,$photo]);
    return one('SELECT * FROM user_accounts WHERE id=?',[db()->lastInsertId()]);
}
