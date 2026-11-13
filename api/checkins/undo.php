<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
require_method('POST');
$userId=require_auth();
require_csrf();
$input=request_data();
$dayId=positive_id($input['experiment_day_id']??null,'experiment_day_id');
$stmt=db()->prepare("DELETE c FROM checkins c JOIN experiment_days d ON d.id=c.experiment_day_id JOIN experiments e ON e.id=d.experiment_id WHERE d.id=? AND e.user_id=? AND e.status IN ('active','completed')");
$stmt->execute([$dayId,$userId]);
if (!$stmt->rowCount()) fail('NOT_FOUND','Check-in not found or cannot be changed.',404);
success(['experiment_day_id'=>$dayId],'Check-in removed.');
