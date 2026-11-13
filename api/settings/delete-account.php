<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
require_method('POST');$userId=require_auth();require_csrf();$input=request_data();$password=$input['password']??'';
if(!is_string($password))fail('VALIDATION_ERROR','Enter your password to confirm deletion.',422,['password'=>'Password is required.']);
$pdo=db();$stmt=$pdo->prepare('SELECT password_hash FROM users WHERE id=?');$stmt->execute([$userId]);$hash=$stmt->fetchColumn();
if(!$hash||!password_verify($password,(string)$hash))fail('CURRENT_PASSWORD_INVALID','Password was not recognized.',422,['password'=>'Check your password.']);
$pdo->beginTransaction();$delete=$pdo->prepare('DELETE FROM users WHERE id=?');$delete->execute([$userId]);$pdo->commit();
$_SESSION=[];if(ini_get('session.use_cookies')){$params=session_get_cookie_params();setcookie(session_name(),'',time()-42000,$params['path'],$params['domain'],$params['secure'],$params['httponly']);}session_destroy();
success([],'Account and personal data deleted.');
