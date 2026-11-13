<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
require_method('POST');
$input = request_data();
$emailInput = $input['email'] ?? null;
$email = is_string($emailInput) ? strtolower(trim($emailInput)) : '';
$password = $input['password'] ?? '';
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !is_string($password)) fail('VALIDATION_ERROR', 'Enter a valid email and password.', 422);
$stmt = db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();
if (!$user || !password_verify($password, $user['password_hash'])) fail('INVALID_CREDENTIALS', 'Email or password was not recognized.', 401);
start_session();
session_regenerate_id(true);
$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));
success(['user' => public_user($user), 'csrf_token' => csrf_token()], 'Signed in.');
