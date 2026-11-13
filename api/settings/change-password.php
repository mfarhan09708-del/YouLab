<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
require_method('POST');$userId=require_auth();require_csrf();$input=request_data();
$current=$input['current_password']??'';$next=$input['new_password']??'';
if(!is_string($current)||!is_string($next)||strlen($next)<10||strlen($next)>72)fail('VALIDATION_ERROR','Please check the submitted values.',422,['new_password'=>'Use a password between 10 and 72 characters.']);
$pdo=db();$stmt=$pdo->prepare('SELECT password_hash FROM users WHERE id=?');$stmt->execute([$userId]);$hash=$stmt->fetchColumn();
if(!$hash||!password_verify($current,(string)$hash))fail('CURRENT_PASSWORD_INVALID','Current password was not recognized.',422,['current_password'=>'Check your current password.']);
$update=$pdo->prepare('UPDATE users SET password_hash=? WHERE id=?');$update->execute([password_hash($next,PASSWORD_DEFAULT),$userId]);
session_regenerate_id(true);success([],'Password changed.');
