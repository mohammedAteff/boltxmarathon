<?php
require __DIR__.'/google.php';
if(PHP_SAPI!=='cli' || !preg_match('/(?:^|;)dbname=[a-zA-Z0-9_]+_test(?:;|$)/',getenv('BOLTX_DSN')?:'')){
    fwrite(STDERR,"Use a disposable database whose name ends in _test.\n"); exit(1);
}
require __DIR__.'/vendor/autoload.php';
function check(bool $ok,string $message): void { if(!$ok) throw new RuntimeException($message); }
function rejected(callable $f): void {
    try{ $f(); }catch(Rule){ return; }
    throw new RuntimeException('Expected identity request to be rejected.');
}
$rsa=openssl_pkey_new(['private_key_type'=>OPENSSL_KEYTYPE_RSA,'private_key_bits'=>2048]);
$public=openssl_pkey_get_details($rsa)['rsa'];
$url64=fn(string $s)=>rtrim(strtr(base64_encode($s),'+/','-_'),'=');
$jwk=['keys'=>[['kty'=>'RSA','alg'=>'RS256','kid'=>'fixture','n'=>$url64($public['n']),'e'=>$url64($public['e'])]]];
$verifier=new Google\Auth\AccessToken(function($request) use($jwk){
    check((string)$request->getUri()===Google\Auth\AccessToken::FEDERATED_SIGNON_CERT_URL,'Expected Google cert endpoint');
    return new GuzzleHttp\Psr7\Response(200,['Cache-Control'=>'max-age=600'],json_encode($jwk));
});
$client='fixture.apps.googleusercontent.com';
$suffix=bin2hex(random_bytes(5));
$nonce=bin2hex(random_bytes(24));
$claims=['sub'=>'google-'.$suffix,'iss'=>'https://accounts.google.com','aud'=>$client,'exp'=>time()+300,'iat'=>time()-5,'nonce'=>$nonce,
    'email'=>'google-'.$suffix.'@example.test','email_verified'=>true,'name'=>'Google Fixture','picture'=>'https://example.test/avatar.png'];
$encode=fn(array $data,$key=null)=>Firebase\JWT\JWT::encode($data,$key??$rsa,'RS256','fixture');
$verify=fn(string $jwt)=>google_claims($client,$jwt,$nonce,$verifier);
foreach(['exp'=>time()-10,'aud'=>'wrong','iss'=>'https://example.test','nonce'=>'wrong','email_verified'=>false] as $field=>$invalid){
    rejected(fn()=>$verify($encode(array_replace($claims,[$field=>$invalid]))));
}
$otherKey=openssl_pkey_new(['private_key_type'=>OPENSSL_KEYTYPE_RSA,'private_key_bits'=>2048]);
rejected(fn()=>$verify($encode($claims,$otherKey)));
$google=google_account($verify($encode($claims)),null);
check($google['role']==='user' && $google['password_hash']===null && $google['photo_url']===$claims['picture'],'Google creates a regular account with no password');
check(google_account(array_replace($claims,['email'=>'updated@example.test']),null)['id']===$google['id'],'Returning Google account is identified by subject');

$password='secure-fixture-password';
$email='email-'.$suffix.'@example.test';
sql('INSERT INTO user_accounts(display_name,email,password_hash) VALUES (?,?,?)',['Email Fixture',$email,new_password($password,$password)]);
$id=(int)db()->lastInsertId();
$local=one('SELECT * FROM user_accounts WHERE id=?',[$id]);
$link=array_replace($claims,['sub'=>'linked-'.$suffix,'email'=>$email]);
rejected(fn()=>google_account($link,null));
rejected(fn()=>google_account($link,$google));
check(google_account($link,$local)['id']===$id && google_account($link,null)['id']===$id,'Explicit linking retains the original account');

function fixture_token(int $id,string $purpose,int $minutes=5): string {
    $secret=bin2hex(random_bytes(32));
    sql('INSERT INTO account_tokens(token_hash,user_id,purpose,expires_at) VALUES (?,?,?,TIMESTAMPADD(MINUTE,?,CURRENT_TIMESTAMP))',
        [hash('sha256',$secret),$id,$purpose,$minutes]);
    return $secret;
}
$verifyEmail=fixture_token($id,'verify');
consume_account_token($verifyEmail,'verify');
rejected(fn()=>consume_account_token($verifyEmail,'verify'));
$expired=fixture_token($id,'reset',-5);
rejected(fn()=>consume_account_token($expired,'reset'));
$reset=fixture_token($id,'reset');
$replacement='replacement-fixture-password';
consume_account_token($reset,'reset',new_password($replacement,$replacement));
rejected(fn()=>consume_account_token($reset,'reset'));
$after=one('SELECT * FROM user_accounts WHERE id=?',[$id]);
check(password_verify($replacement,$after['password_hash']) && $after['auth_version']===$local['auth_version']+1,'Reset changed password and invalidated prior sessions');
session_open();
account_login($after);
$_SESSION['seen']=time()-28801;
session_write_close();
session_open();
check(current_account()===null,'Idle session expired');
echo "Passed Google signature and claim validation, account linking, verification, password reset and idle expiration.\n";
