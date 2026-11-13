<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
require_method('GET');
$userId = require_auth();
$pdo = db();
refresh_due_experiments($pdo, $userId);
$allowed = ['scheduled','active','paused','completed','stopped'];
$status = $_GET['status'] ?? null;
if ($status !== null && !in_array($status, $allowed, true)) fail('VALIDATION_ERROR','Invalid status filter.',422);
$sql = "SELECT e.id,e.title,e.description,e.start_date,e.end_date,e.duration_days,e.status,e.created_at,
  (SELECT COUNT(*) FROM checkins c JOIN experiment_days d ON d.id=c.experiment_day_id WHERE d.experiment_id=e.id) AS completed_days,
  (SELECT d.condition_type FROM experiment_days d LEFT JOIN checkins c ON c.experiment_day_id=d.id WHERE d.experiment_id=e.id AND d.scheduled_date >= CURDATE() AND c.id IS NULL ORDER BY d.scheduled_date LIMIT 1) AS next_condition
  FROM experiments e WHERE e.user_id = ?";
$params = [$userId];
if ($status !== null) { $sql .= ' AND e.status = ?'; $params[] = $status; }
$sql .= ' ORDER BY FIELD(e.status,\'active\',\'paused\',\'scheduled\',\'completed\',\'stopped\'),e.created_at DESC';
$stmt = $pdo->prepare($sql); $stmt->execute($params);
$items = array_map(static function(array $row): array { $row['id']=(int)$row['id'];$row['duration_days']=(int)$row['duration_days'];$row['completed_days']=(int)$row['completed_days'];$row['progress_percent']=(int)round(100*$row['completed_days']/$row['duration_days']);return $row; }, $stmt->fetchAll());
success(['experiments'=>$items]);
