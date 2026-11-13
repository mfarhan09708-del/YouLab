<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
require_method('GET');
$userId = require_auth();
$experimentId = positive_id($_GET['experiment_id'] ?? null, 'experiment_id');
owned_experiment(db(),$userId,$experimentId);
$stmt = db()->prepare('SELECT d.id AS experiment_day_id,d.day_number,d.scheduled_date,d.condition_type,c.rating,c.followed_plan,c.context_tags,c.note,c.checked_in_at,c.updated_at FROM experiment_days d LEFT JOIN checkins c ON c.experiment_day_id=d.id WHERE d.experiment_id=? ORDER BY d.day_number');
$stmt->execute([$experimentId]);
$days = $stmt->fetchAll();
foreach ($days as &$day) {
    $day['experiment_day_id']=(int)$day['experiment_day_id'];
    $day['day_number']=(int)$day['day_number'];
    $day['rating']=$day['rating']===null?null:(int)$day['rating'];
    $day['followed_plan']=$day['followed_plan']===null?null:(bool)$day['followed_plan'];
    $day['context_tags']=$day['context_tags']?json_decode($day['context_tags'],true):[];
}
unset($day);
success(['checkins'=>$days]);
