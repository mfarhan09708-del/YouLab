<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
require_method('GET');
$userId = require_auth();
$stmt = db()->prepare('SELECT id,name,email,goal_preference,experience_level,reminder_time,theme,is_demo,onboarding_complete FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();
if (!$user) fail('UNAUTHENTICATED', 'Please sign in to continue.', 401);
success(['user' => public_user($user), 'csrf_token' => csrf_token()]);
