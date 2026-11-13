<?php
declare(strict_types=1);

function change_experiment_status(string $action): void
{
    require_method('POST');
    $userId = require_auth();
    require_csrf();
    $input = request_data();
    $experimentId = positive_id($input['experiment_id'] ?? null, 'experiment_id');
    $pdo = db();
    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare('SELECT * FROM experiments WHERE id=? AND user_id=? FOR UPDATE');
        $stmt->execute([$experimentId, $userId]);
        $experiment = $stmt->fetch();
        if (!$experiment) fail('NOT_FOUND', 'Experiment not found.', 404);

        if ($action === 'pause') {
            if ($experiment['status'] !== 'active') fail('INVALID_STATE', 'Only an active experiment can be paused.', 409);
            $update = $pdo->prepare("UPDATE experiments SET status='paused',paused_at=NOW() WHERE id=?");
            $update->execute([$experimentId]);
        } elseif ($action === 'resume') {
            if ($experiment['status'] !== 'paused') fail('INVALID_STATE', 'Only a paused experiment can be resumed.', 409);
            $pausedDate = substr((string)$experiment['paused_at'], 0, 10);
            $today = date('Y-m-d');
            $shiftDays = max(0, (int)(new DateTimeImmutable($pausedDate))->diff(new DateTimeImmutable($today))->format('%r%a'));
            if ($shiftDays > 0) {
                $shift = $pdo->prepare('UPDATE experiment_days d SET scheduled_date=DATE_ADD(d.scheduled_date, INTERVAL ? DAY) WHERE d.experiment_id=? AND d.scheduled_date>=? AND NOT EXISTS (SELECT 1 FROM checkins c WHERE c.experiment_day_id=d.id)');
                $shift->execute([$shiftDays, $experimentId, $pausedDate]);
            }
            $end = $pdo->prepare('SELECT MAX(scheduled_date) FROM experiment_days WHERE experiment_id=?');
            $end->execute([$experimentId]);
            $newEnd = (string)$end->fetchColumn();
            $update = $pdo->prepare("UPDATE experiments SET status='active',paused_at=NULL,end_date=? WHERE id=?");
            $update->execute([$newEnd, $experimentId]);
        } else {
            if (in_array($experiment['status'], ['completed','stopped'], true)) fail('INVALID_STATE', 'This experiment is already finished.', 409);
            $update = $pdo->prepare("UPDATE experiments SET status='stopped',stopped_at=NOW() WHERE id=?");
            $update->execute([$experimentId]);
        }
        $pdo->commit();
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $exception;
    }
    success(['experiment_id'=>$experimentId,'status'=>$action==='pause'?'paused':($action==='resume'?'active':'stopped')], 'Experiment ' . ($action==='pause'?'paused':($action==='resume'?'resumed':'stopped')) . '.');
}
