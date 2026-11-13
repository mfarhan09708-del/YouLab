<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../config/scheduling.php';
require_method('POST');
$userId = require_auth();
require_csrf();
$input = request_data();
$duration = filter_var($input['duration_days'] ?? null, FILTER_VALIDATE_INT);
$fields = [];
if (!in_array($duration, [7,14,21], true)) $fields['duration_days'] = 'Choose 7, 14, or 21 days.';
if (array_key_exists('schedule', $input) && (!in_array($duration, [7,14,21], true) || !valid_schedule($input['schedule'], (int)$duration))) {
    $fields['schedule'] = 'Refresh the schedule preview and try again.';
}
$title = is_string($input['title'] ?? null) ? trim($input['title']) : '';
$description = is_string($input['description'] ?? null) ? trim($input['description']) : '';
$test = is_string($input['test_condition'] ?? null) ? trim($input['test_condition']) : '';
$normal = is_string($input['normal_condition'] ?? null) ? trim($input['normal_condition']) : '';
$outcome = is_string($input['outcome_name'] ?? null) ? trim($input['outcome_name']) : '';
foreach (['title'=>$title,'description'=>$description,'test_condition'=>$test,'normal_condition'=>$normal,'outcome_name'=>$outcome] as $key=>$value) {
    $max = $key === 'title' ? 150 : ($key === 'outcome_name' ? 100 : 4000);
    if ($value === '' || mb_strlen($value) > $max) $fields[$key] = "Enter a value up to {$max} characters.";
}
$templateId = null;
if (isset($input['template_id']) && $input['template_id'] !== '') $templateId = positive_id($input['template_id'], 'template_id');
$start = valid_date_string($input['start_date'] ?? date('Y-m-d'), 'start_date');
if ($start < date('Y-m-d')) $fields['start_date'] = 'Choose today or a future date.';
if ($fields) fail('VALIDATION_ERROR', 'Please check the submitted values.', 422, $fields);
$endDate = (new DateTimeImmutable($start))->modify('+' . ($duration - 1) . ' days')->format('Y-m-d');
$schedule = array_key_exists('schedule', $input) ? $input['schedule'] : make_schedule((int)$duration);
$pdo = db();
if ($templateId !== null) {
    $check = $pdo->prepare('SELECT id FROM templates WHERE id = ? AND is_active = 1 AND (owner_user_id IS NULL OR owner_user_id = ?)');
    $check->execute([$templateId, $userId]);
    if (!$check->fetchColumn()) fail('NOT_FOUND', 'Template not found.', 404);
}
try {
    $pdo->beginTransaction();
    $status = $start === date('Y-m-d') ? 'active' : 'scheduled';
    $stmt = $pdo->prepare('INSERT INTO experiments (user_id,template_id,title,description,test_condition,normal_condition,outcome_name,duration_days,start_date,end_date,status) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    $stmt->execute([$userId,$templateId,$title,$description,$test,$normal,$outcome,$duration,$start,$endDate,$status]);
    $experimentId = (int)$pdo->lastInsertId();
    $dayInsert = $pdo->prepare('INSERT INTO experiment_days (experiment_id,day_number,scheduled_date,condition_type) VALUES (?,?,?,?)');
    $cursor = new DateTimeImmutable($start);
    foreach ($schedule as $index=>$condition) $dayInsert->execute([$experimentId,$index+1,$cursor->modify('+' . $index . ' days')->format('Y-m-d'),$condition]);
    $pdo->commit();
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $exception;
}
success(['experiment_id'=>$experimentId,'title'=>$title,'start_date'=>$start,'end_date'=>$endDate,'duration_days'=>$duration,'status'=>$status,'schedule'=>array_map(static fn($i,$condition)=>['day_number'=>$i+1,'scheduled_date'=>(new DateTimeImmutable($start))->modify('+' . $i . ' days')->format('Y-m-d'),'condition_type'=>$condition],array_keys($schedule),$schedule)], 'Experiment created.', 201);
