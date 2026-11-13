<?php
declare(strict_types=1);

require_once __DIR__ . '/database.php';

set_exception_handler(static function (Throwable $exception): void {
    error_log('YouLab API error: ' . $exception->getMessage());
    fail('SERVER_ERROR', 'Something went wrong. Please try again.', 500);
});

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $https = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('youlab_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    if (getenv('YOULAB_SESSION_DRIVER') === 'mysql') {
        require_once __DIR__ . '/mysql-session-handler.php';
        session_set_save_handler(new YouLabMySqlSessionHandler(db()), true);
    }
    session_start();
}

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function success(array $data = [], string $message = '', int $status = 200): void
{
    $response = ['ok' => true, 'data' => $data];
    if ($message !== '') {
        $response['message'] = $message;
    }
    json_response($response, $status);
}

function fail(string $code, string $message, int $status = 400, array $fields = []): void
{
    $error = ['code' => $code, 'message' => $message];
    if ($fields !== []) {
        $error['fields'] = $fields;
    }
    json_response(['ok' => false, 'error' => $error], $status);
}

function require_method(string $method): void
{
    if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== strtoupper($method)) {
        header('Allow: ' . strtoupper($method));
        fail('METHOD_NOT_ALLOWED', 'Use the ' . strtoupper($method) . ' method.', 405);
    }
}

function request_data(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        fail('INVALID_JSON', 'Send a valid JSON object.', 400);
    }
    return $data;
}

function require_auth(): int
{
    start_session();
    $id = $_SESSION['user_id'] ?? null;
    if (!is_int($id) && !(is_string($id) && ctype_digit($id))) {
        fail('UNAUTHENTICATED', 'Please sign in to continue.', 401);
    }
    return (int)$id;
}

function csrf_token(): string
{
    start_session();
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return (string)$_SESSION['csrf_token'];
}

function require_csrf(): void
{
    start_session();
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($sent) || $sent === '' || !hash_equals((string)($_SESSION['csrf_token'] ?? ''), $sent)) {
        fail('CSRF_INVALID', 'Refresh the page and try again.', 403);
    }
}

function public_user(array $user): array
{
    return [
        'id' => (int)$user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'goal_preference' => $user['goal_preference'],
        'experience_level' => $user['experience_level'],
        'reminder_time' => $user['reminder_time'],
        'theme' => $user['theme'],
        'is_demo' => (bool)$user['is_demo'],
        'onboarding_complete' => (bool)$user['onboarding_complete'],
    ];
}

function owned_experiment(PDO $pdo, int $userId, int $experimentId): array
{
    $stmt = $pdo->prepare('SELECT * FROM experiments WHERE id = ? AND user_id = ?');
    $stmt->execute([$experimentId, $userId]);
    $experiment = $stmt->fetch();
    if (!$experiment) {
        fail('NOT_FOUND', 'Experiment not found.', 404);
    }
    return $experiment;
}

function refresh_due_experiments(PDO $pdo, int $userId): void
{
    $stmt = $pdo->prepare("UPDATE experiments SET status='active' WHERE user_id=? AND status='scheduled' AND start_date<=CURDATE()");
    $stmt->execute([$userId]);
}

function positive_id(mixed $value, string $field = 'id'): int
{
    if (!(is_int($value) || (is_string($value) && ctype_digit($value))) || (int)$value < 1) {
        fail('VALIDATION_ERROR', 'Please provide a valid ' . $field . '.', 422, [$field => 'Must be a positive integer.']);
    }
    return (int)$value;
}

function valid_enum(mixed $value, array $allowed, string $field): string
{
    if (!is_string($value) || !in_array($value, $allowed, true)) {
        fail('VALIDATION_ERROR', 'Please check the submitted values.', 422, [$field => 'Choose one of the available options.']);
    }
    return $value;
}
