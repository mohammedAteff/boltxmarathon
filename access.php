<?php
require_once __DIR__.'/accounts.php';

function role_for(array $game): ?string {
    if(!empty($game['deleted_at'])) return null;
    $account=current_account();
    if(can_manage($account,$game)) return is_admin($account)?'admin':'owner';
    if($game['archived'] || !empty($game['access_expired'])) return null;
    $grant=$_SESSION['boltx_access'][$game['id']]??null;
    if(!is_array($grant) || $grant['version']!==$game['access_version']) return null;
    return $grant['role']==='play' && $game['share_role']==='play'?'play':'view';
}
function share_key(): ?string {
    $key=app_setting('BOLTX_SHARE_KEY','share_key');
    if($key==='' || !extension_loaded('openssl')) return null;
    return preg_match('/^[a-f0-9]{64}$/Di',$key)?hex2bin($key):null;
}
function share_credentials(array $game): ?array {
    $key=share_key();
    if(!$key || empty($game['share_envelope'])) return null;
    $payload=base64_decode($game['share_envelope'],true);
    if(!$payload || strlen($payload)<=28) return null;
    $plain=openssl_decrypt(substr($payload,28),'aes-256-gcm',$key,OPENSSL_RAW_DATA,substr($payload,0,12),substr($payload,12,16),(string)$game['id']);
    if($plain===false) return null;
    $data=json_decode($plain,true,16,JSON_THROW_ON_ERROR);
    return $data['game']===$game['id'] && hash_equals($game['link_hash']??'',access_secret($data['token']))?$data:null;
}
function authorized_game(int $id,?string $kind=null): array {
    $g=one('SELECT *,access_expires_at IS NOT NULL AND access_expires_at<=CURRENT_TIMESTAMP AS access_expired FROM game_sets WHERE id=?',[$id]);
    if(!$g || ($kind!==null && $g['kind']!==$kind) || !role_for($g)) {
        http_response_code(404);
        throw new Rule('Challenge unavailable. Open it with a valid private code or link.');
    }
    return $g;
}
function grant_access(array $game,bool $display=false): void {
    session_regenerate_id(true);
    $_SESSION['boltx_access'][$game['id']]=['version'=>$game['access_version'],'role'=>$display?'view':$game['share_role']];
    if(count($_SESSION['boltx_access'])>40) $_SESSION['boltx_access']=array_slice($_SESSION['boltx_access'],-40,null,true);
}
function game_url(array $game): string {
    return ($game['kind']==='wheel'?'wheel.php':'boxes.php').'?game='.$game['id'];
}
function access_secret(string $secret): string { return hash('sha256',$secret); }
function issue_access(int $game,string $role,int $days=0): array {
    need(in_array($role,['view','play'],true),'Choose a sharing permission.');
    $code=strtoupper(bin2hex(random_bytes(8)));
    $link=bin2hex(random_bytes(24));
    $display=bin2hex(random_bytes(24));
    $credentials=['code'=>$code,'token'=>$link,'display'=>$display,'game'=>$game,'role'=>$role];
    $envelope=null;
    if($key=share_key()){
        $nonce=random_bytes(12);
        $encrypted=openssl_encrypt(json_encode($credentials,JSON_THROW_ON_ERROR),'aes-256-gcm',$key,OPENSSL_RAW_DATA,$nonce,$tag,(string)$game);
        if($encrypted===false) throw new RuntimeException('Could not store challenge credentials.');
        $envelope=base64_encode($nonce.$tag.$encrypted);
    }
    sql('UPDATE game_sets SET code_hash=?,link_hash=?,display_hash=?,share_envelope=?,access_version=access_version+1,share_role=?,
        access_expires_at=IF(?=0,NULL,TIMESTAMPADD(DAY,?,CURRENT_TIMESTAMP)) WHERE id=?',
        [access_secret($code),access_secret($link),access_secret($display),$envelope,$role,$days,$days,$game]);
    return $credentials;
}
function limit_code_attempts(): void {
    $key=hash('sha256',$_SERVER['REMOTE_ADDR']??'local');
    $now=time();
    sql('INSERT INTO challenge_access_attempts(ip_hash,attempts,window_start) VALUES (?,1,?)
        ON DUPLICATE KEY UPDATE attempts=IF(window_start<?,1,attempts+1),window_start=IF(window_start<?,VALUES(window_start),window_start)',
        [$key,$now,$now-600,$now-600]);
    if(one('SELECT attempts FROM challenge_access_attempts WHERE ip_hash=?',[$key])['attempts']>12){
        http_response_code(429);
        throw new Rule('Too many attempts. Try again in ten minutes.');
    }
}
