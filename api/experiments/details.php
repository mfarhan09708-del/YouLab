<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
require_method('GET');
$userId=require_auth();$id=positive_id($_GET['id']??null,'id');$pdo=db();refresh_due_experiments($pdo,$userId);$experiment=owned_experiment($pdo,$userId,$id);
$stmt=$pdo->prepare('SELECT d.id AS experiment_day_id,d.day_number,d.scheduled_date,d.condition_type,c.id AS checkin_id,c.rating,c.followed_plan,c.context_tags,c.note,c.checked_in_at FROM experiment_days d LEFT JOIN checkins c ON c.experiment_day_id=d.id WHERE d.experiment_id=? ORDER BY d.day_number');$stmt->execute([$id]);$days=$stmt->fetchAll();
$completed=0;foreach($days as &$day){$day['experiment_day_id']=(int)$day['experiment_day_id'];$day['day_number']=(int)$day['day_number'];if($day['checkin_id']!==null){$day['checkin_id']=(int)$day['checkin_id'];$day['rating']=(int)$day['rating'];$day['followed_plan']=(bool)$day['followed_plan'];$day['context_tags']=$day['context_tags']?json_decode($day['context_tags'],true):[];$completed++;}}unset($day);
$experiment['id']=(int)$experiment['id'];$experiment['duration_days']=(int)$experiment['duration_days'];$experiment['completed_days']=$completed;$experiment['progress_percent']=(int)round(100*$completed/$experiment['duration_days']);
success(['experiment'=>$experiment,'days'=>$days]);
