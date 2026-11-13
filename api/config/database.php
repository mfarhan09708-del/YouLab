<?php
declare(strict_types=1);

/** Return one PDO connection. Local secrets belong in ignored database.local.php or environment variables. */
function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $production = getenv('YOULAB_ENV') === 'production';
    $localFile = __DIR__ . '/database.local.php';
    $local = !$production && is_file($localFile) ? require $localFile : [];
    $host = (string)($local['host'] ?? getenv('YOULAB_DB_HOST') ?: getenv('TIDB_HOST') ?: '127.0.0.1');
    $name = (string)($local['name'] ?? getenv('YOULAB_DB_NAME') ?: getenv('TIDB_DATABASE') ?: 'youlab');
    $user = (string)($local['user'] ?? getenv('YOULAB_DB_USER') ?: getenv('TIDB_USER') ?: 'root');
    $pass = (string)($local['pass'] ?? getenv('YOULAB_DB_PASS') ?: getenv('TIDB_PASSWORD') ?: '');
    $port = (string)($local['port'] ?? getenv('YOULAB_DB_PORT') ?: getenv('TIDB_PORT') ?: '3306');
    if ($production && ($host === '' || $name === '' || $user === '' || $pass === '')) {
        throw new RuntimeException('Production database environment variables are incomplete.');
    }
    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    $sslCa = getenv('YOULAB_DB_SSL_CA');
    if (is_string($sslCa) && $sslCa !== '' && defined('PDO::MYSQL_ATTR_SSL_CA')) {
        if (str_contains($sslCa, '-----BEGIN CERTIFICATE-----')) {
            $caFile = sys_get_temp_dir() . '/youlab-mysql-ca-' . hash('sha256', $sslCa) . '.pem';
            if (!is_file($caFile)) {
                file_put_contents($caFile, $sslCa, LOCK_EX);
                @chmod($caFile, 0600);
            }
            $sslCa = $caFile;
        }
        $options[PDO::MYSQL_ATTR_SSL_CA] = $sslCa;
        if (defined('PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT')) {
            $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = true;
        }
    }
    $pdo = new PDO($dsn, $user, $pass, $options);
    return $pdo;
}
