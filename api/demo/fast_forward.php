<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
require_method('POST');
$userId = require_auth();
require_csrf();
$pdo = db();
$demo = $pdo->prepare('SELECT is_demo FROM users WHERE id=?');
$demo->execute([$userId]);
if (!(bool)$demo->fetchColumn()) fail('FORBIDDEN','Fast-forward is only available in the demo workspace.',403);

try {
    $pdo->beginTransaction();
    $active = $pdo->prepare("SELECT id,duration_days FROM experiments WHERE user_id=? AND status='active' ORDER BY created_at DESC LIMIT 1 FOR UPDATE");
    $active->execute([$userId]);
    $experiment = $active->fetch();
    if (!$experiment) fail('NOT_FOUND','There is no active demo experiment to advance.',404);
    $next = $pdo->prepare('SELECT d.id,d.day_number,d.condition_type,d.scheduled_date FROM experiment_days d WHERE d.experiment_id=? AND NOT EXISTS (SELECT 1 FROM checkins c WHERE c.experiment_day_id=d.id) ORDER BY d.day_number LIMIT 1');
    $next->execute([(int)$experiment['id']]);
    $day = $next->fetch();
    if (!$day) fail('INVALID_STATE','The active demo schedule has no open day.',409);
    $rating = $day['condition_type'] === 'test' ? random_int(4,5) : random_int(3,4);
    $save = $pdo->prepare('INSERT INTO checkins (experiment_day_id,rating,followed_plan,context_tags,note) VALUES (?,?,1,?,?)');
    $save->execute([(int)$day['id'],$rating,'[]','Demo fast-forward check-in.']);
    $count = $pdo->prepare('SELECT COUNT(*) FROM checkins c JOIN experiment_days d ON d.id=c.experiment_day_id WHERE d.experiment_id=?');
    $count->execute([(int)$experiment['id']]);
    $completed = (int)$count->fetchColumn();
    $total = (int)$experiment['duration_days'];
    $status = $completed >= $total ? 'completed' : 'active';
    if ($status === 'completed') {
        $finish = $pdo->prepare("UPDATE experiments SET status='completed',completed_at=COALESCE(completed_at,NOW()) WHERE id=?");
        $finish->execute([(int)$experiment['id']]);
    }
    $pdo->commit();
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $exception;
}
success(['experiment_id'=>(int)$experiment['id'],'day_number'=>(int)$day['day_number'],'scheduled_date'=>$day['scheduled_date'],'condition_type'=>$day['condition_type'],'rating'=>$rating,'completed_days'=>$completed,'total_days'=>$total,'progress_percent'=>(int)round(100*$completed/$total),'status'=>$status],'Demo day advanced.');
