<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
require_method('POST');
$pdo = db();

try {
    $pdo->beginTransaction();
    $find = $pdo->prepare('SELECT id FROM users WHERE is_demo=1 ORDER BY id LIMIT 1 FOR UPDATE');
    $find->execute();
    $demoId = (int)($find->fetchColumn() ?: 0);
    if ($demoId === 0) {
        $create = $pdo->prepare('INSERT INTO users (name,email,password_hash,goal_preference,experience_level,is_demo,onboarding_complete) VALUES (?,?,?,?,?,1,1)');
        $create->execute(['Demo Explorer','demo@youlab.local',password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT),'energy','beginner']);
        $demoId = (int)$pdo->lastInsertId();
    }

    $count = $pdo->prepare('SELECT COUNT(*) FROM experiments WHERE user_id=?');
    $count->execute([$demoId]);
    if ((int)$count->fetchColumn() === 0) {
        $template = $pdo->prepare('SELECT id FROM templates WHERE slug=? LIMIT 1');
        $template->execute(['sleep-screen-cutoff']);
        $sleepTemplate = $template->fetchColumn();
        $template->execute(['caffeine-cutoff']);
        $caffeineTemplate = $template->fetchColumn();

        $insertExperiment = $pdo->prepare('INSERT INTO experiments (user_id,template_id,title,description,test_condition,normal_condition,outcome_name,duration_days,start_date,end_date,status,completed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
        $insertDay = $pdo->prepare('INSERT INTO experiment_days (experiment_id,day_number,scheduled_date,condition_type) VALUES (?,?,?,?)');
        $insertCheckin = $pdo->prepare('INSERT INTO checkins (experiment_day_id,rating,followed_plan,context_tags,note) VALUES (?,?,?,?,?)');
        $schedule = ['test','test','normal','normal','test','normal','normal','test','test','normal','test','normal','normal','test'];
        $ratingTest = [4,5,4,4,5,4,4];
        $ratingNormal = [3,3,4,2,4,3,3];
        $start = new DateTimeImmutable('today -14 days');
        $end = $start->modify('+13 days');
        $insertExperiment->execute([$demoId,$sleepTemplate ?: null,'Sleep Screen Cutoff','Does avoiding screens before bed improve morning energy?','Avoid screens for the 60 minutes before bed.','Follow your usual evening screen routine.','Morning energy',14,$start->format('Y-m-d'),$end->format('Y-m-d'),'completed',(new DateTimeImmutable('today'))->format('Y-m-d H:i:s')]);
        $completedId = (int)$pdo->lastInsertId();
        $testIndex = 0; $normalIndex = 0;
        foreach ($schedule as $index => $condition) {
            $scheduled = $start->modify('+' . $index . ' days');
            $insertDay->execute([$completedId,$index+1,$scheduled->format('Y-m-d'),$condition]);
            $dayId = (int)$pdo->lastInsertId();
            $rating = $condition === 'test' ? $ratingTest[$testIndex++] : $ratingNormal[$normalIndex++];
            $followed = !($index === 4);
            $tags = $index === 2 ? ['travel'] : [];
            $insertCheckin->execute([$dayId,$rating,$followed,json_encode($tags),$index === 4 ? 'A late night made this one harder to follow.' : null]);
        }

        $activeStart = new DateTimeImmutable('today -5 days');
        $activeEnd = $activeStart->modify('+13 days');
        $insertExperiment->execute([$demoId,$caffeineTemplate ?: null,'Caffeine Cutoff','Does an earlier last cup help sleep feel more restorative?','Avoid caffeine after 2 PM.','Follow your usual caffeine routine.','Sleep quality',14,$activeStart->format('Y-m-d'),$activeEnd->format('Y-m-d'),'active',null]);
        $activeId = (int)$pdo->lastInsertId();
        foreach (array_slice($schedule,0,5) as $index => $condition) {
            $scheduled = $activeStart->modify('+' . $index . ' days');
            $insertDay->execute([$activeId,$index+1,$scheduled->format('Y-m-d'),$condition]);
            $dayId = (int)$pdo->lastInsertId();
            $rating = $condition === 'test' ? [4,5,4][$index === 4 ? 2 : ($index === 1 ? 1 : 0)] : 3;
            $insertCheckin->execute([$dayId,$rating,1,'[]',null]);
        }

        $playbook = $pdo->prepare('INSERT INTO playbook_entries (user_id,experiment_id,title_snapshot,category,conclusion,key_finding,confidence_label) VALUES (?,?,?,?,?,?,?)');
        $playbook->execute([$demoId,$completedId,'Sleep Screen Cutoff','works_for_me','some_evidence','My morning energy ratings were higher on screen-free test days in this small sample.','Some evidence']);
    }
    $pdo->commit();
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $exception;
}

start_session();
session_regenerate_id(true);
$_SESSION['user_id'] = $demoId;
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));
$user = $pdo->prepare('SELECT id,name,email,goal_preference,experience_level,reminder_time,theme,is_demo,onboarding_complete FROM users WHERE id=?');
$user->execute([$demoId]);
success(['user'=>public_user($user->fetch()),'csrf_token'=>csrf_token()],'Demo workspace ready.');
