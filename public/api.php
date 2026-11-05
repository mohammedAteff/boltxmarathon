<?php
require dirname(__DIR__).'/game.php';
security();
header('Content-Type: application/json; charset=utf-8');
try {
    if($_SERVER['REQUEST_METHOD']==='GET') {
        $view=$_GET['view']??'wheel';
        need(in_array($view,['admin','wheel','boxes'],true),'Unknown view.');
        if($view==='admin') {
            session_open();
            if(!isset($_SESSION['admin'])) { http_response_code(401); throw new Rule('Sign in to continue.'); }
            session_write_close();
        }
        $out=state($view,number($_GET['since']??-1,-1,PHP_INT_MAX));
    } elseif($_SERVER['REQUEST_METHOD']==='POST') {
        session_open();
        if(!isset($_SESSION['admin'])) { http_response_code(401); throw new Rule('Sign in to operate the games.'); }
        if(!valid_token($_SERVER['HTTP_X_CSRF_TOKEN']??null)) { http_response_code(403); throw new Rule('Refresh the page and try again.'); }
        session_write_close();
        if(!empty($_FILES)) {
            $d=$_POST; $file=$_FILES['image']??null;
            need(is_array($file) && $file['error']===UPLOAD_ERR_OK && $file['size']<=4*1024*1024 && is_uploaded_file($file['tmp_name']),'Choose a JPEG, PNG or WebP image under 4 MB.');
            $info=@getimagesize($file['tmp_name']);
            need($info && in_array($info['mime'],['image/jpeg','image/png','image/webp'],true) && $info[0]*$info[1]<=16000000,'Choose a valid image under 16 megapixels.');
            $img=@imagecreatefromstring(file_get_contents($file['tmp_name']));
            need($img!==false,'The image could not be decoded.');
            $size=min($info[0],$info[1]); $dst=imagecreatetruecolor(256,256);
            imagecopyresampled($dst,$img,(int)0,(int)0,intdiv($info[0]-$size,2),intdiv($info[1]-$size,2),256,256,$size,$size);
            ob_start(); imagejpeg($dst,null,88); $d['image']=ob_get_clean();
            $d['action']='avatar';
        } else {
            $d=json_decode(file_get_contents('php://input',false,null,0,65536),true,32,JSON_THROW_ON_ERROR);
            need(is_array($d),'Invalid request.');
            unset($d['image']);
        }
        $a=label($d['action']??'',32);
        $source=($d['source']??'')==='presenter'?'presenter':'dashboard';
        if($source==='presenter') need(in_array($a,['spin','undo','box_open'],true) || ($a==='unit' && ($d['mode']??'')==='return'),'This action belongs in the dashboard.');
        $out=['version'=>action($a,$d,$source)];
    } else { http_response_code(405); throw new Rule('Method not allowed.'); }
    echo json_encode($out,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
} catch(Rule|JsonException $e) {
    if(http_response_code()<400) http_response_code(409);
    echo json_encode(['error'=>$e->getMessage()]);
} catch(Throwable $e) {
    error_log((string)$e); http_response_code(500); echo '{"error":"The game service is unavailable. Check the database connection."}';
}
