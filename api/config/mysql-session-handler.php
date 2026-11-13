<?php
declare(strict_types=1);

/** Stores PHP sessions in the shared database for serverless/container deployments. */
final class YouLabMySqlSessionHandler implements SessionHandlerInterface
{
    public function __construct(private readonly PDO $pdo) {}

    public function open(string $path, string $name): bool { return true; }
    public function close(): bool { return true; }

    public function read(string $id): string|false
    {
        $query = $this->pdo->prepare('SELECT session_data FROM app_sessions WHERE session_id=? AND expires_at>UTC_TIMESTAMP()');
        $query->execute([$id]);
        $data = $query->fetchColumn();
        return $data === false ? '' : (string)$data;
    }

    public function write(string $id, string $data): bool
    {
        $lifetime = (int)ini_get('session.gc_maxlifetime');
        $query = $this->pdo->prepare('INSERT INTO app_sessions (session_id,session_data,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND)) ON DUPLICATE KEY UPDATE session_data=VALUES(session_data),expires_at=VALUES(expires_at)');
        return $query->execute([$id, $data, $lifetime]);
    }

    public function destroy(string $id): bool
    {
        $query = $this->pdo->prepare('DELETE FROM app_sessions WHERE session_id=?');
        return $query->execute([$id]);
    }

    public function gc(int $max_lifetime): int|false
    {
        $query = $this->pdo->prepare('DELETE FROM app_sessions WHERE expires_at<=UTC_TIMESTAMP()');
        return $query->execute() ? $query->rowCount() : false;
    }
}
