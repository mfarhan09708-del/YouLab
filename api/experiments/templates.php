<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
require_method('GET');
$userId=require_auth();
$stmt=db()->prepare('SELECT id,slug,title,icon,description,test_condition,normal_condition,suggested_duration,outcome_name,instructions FROM templates WHERE is_active=1 AND (owner_user_id IS NULL OR owner_user_id=?) ORDER BY owner_user_id IS NOT NULL,title');
$stmt->execute([$userId]);$templates=$stmt->fetchAll();
foreach($templates as &$template){$template['id']=(int)$template['id'];$template['suggested_duration']=(int)$template['suggested_duration'];}unset($template);
success(['templates'=>$templates]);
