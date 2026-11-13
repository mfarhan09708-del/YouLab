<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
require_method('POST');
$input = request_data();
$nameInput = $input['name'] ?? null;
$emailInput = $input['email'] ?? null;
$name = is_string($nameInput) ? trim($nameInput) : '';
$email = is_string($emailInput) ? strtolower(trim($emailInput)) : '';
$password = $input['password'] ?? '';
$fields = [];
if ($name === '' || mb_strlen($name) > 100) $fields['name'] = 'Enter a name up to 100 characters.';
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) $fields['email'] = 'Enter a valid email address.';
if (!is_string($password) || strlen($password) < 10 || strlen($password) > 72) $fields['password'] = 'Use a password between 10 and 72 characters.';
if ($fields) fail('VALIDATION_ERROR', 'Please check the submitted values.', 422, $fields);

$pdo = db();
$stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
try {
    $stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
} catch (PDOException $exception) {
    if ($exception->getCode() === '23000') fail('EMAIL_EXISTS', 'An account already uses that email address.', 409, ['email' => 'Choose another email or sign in.']);
    throw $exception;
}
$userId = (int)$pdo->lastInsertId();
start_session();
session_regenerate_id(true);
$_SESSION['user_id'] = $userId;
success(['user' => public_user(['id'=>$userId,'name'=>$name,'email'=>$email,'goal_preference'=>null,'experience_level'=>null,'reminder_time'=>null,'theme'=>'system','is_demo'=>0,'onboarding_complete'=>0]), 'csrf_token' => csrf_token()], 'Account created.', 201);
