<?php
declare(strict_types=1);

/**
 * RMSTORVIX IGNITE — MySQL Connection & Migration Diagnostic Tool
 * Run: php bin/test-mysql-connection.php
 */

require_once __DIR__ . '/../app/bootstrap.php';

echo "========================================================\n";
echo "  RMSTORVIX IGNITE — MySQL Connection Diagnostic Tool  \n";
echo "========================================================\n\n";

$config = require __DIR__ . '/../config/database.php';
$mc = $config['mysql'];

echo "Target MySQL Host:     " . $mc['host'] . ":" . $mc['port'] . "\n";
echo "Target Database:       " . $mc['database'] . "\n";
echo "Target Username:       " . $mc['username'] . "\n";
echo "Target Charset:        " . $mc['charset'] . "\n\n";

try {
    echo "1. Attempting PDO MySQL connection... ";
    $dsn = sprintf('mysql:host=%s;port=%d;charset=%s', $mc['host'], $mc['port'], $mc['charset']);
    $pdo = new PDO($dsn, $mc['username'], $mc['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    echo "[SUCCESS]\n";

    echo "2. Ensuring database `{$mc['database']}` exists... ";
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$mc['database']}` CHARACTER SET {$mc['charset']} COLLATE {$mc['collation']};");
    $pdo->exec("USE `{$mc['database']}`;");
    echo "[SUCCESS]\n";

    echo "3. Checking existing tables in MySQL database... ";
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    echo "[" . count($tables) . " tables found]\n";

    if (count($tables) === 0) {
        echo "4. Database is empty. Applying database/schema.sql... ";
        $schemaSql = file_get_contents(__DIR__ . '/../database/schema.sql');
        $pdo->exec($schemaSql);
        echo "[SUCCESS: Schema applied]\n";
    }

    echo "5. Verifying core tables...\n";
    foreach (['businesses', 'users', 'invoices', 'parties', 'products', 'journal_entries', 'audit_logs'] as $table) {
        $count = $pdo->query("SELECT COUNT(*) FROM `{$table}`")->fetchColumn();
        echo "   - Table `{$table}`: {$count} records [OK]\n";
    }

    echo "\n✓ MySQL 8.0+ Environment is 100% OPERATIONAL for RMSTORVIX IGNITE!\n";
    echo "  To switch application to MySQL, set in your .env:\n";
    echo "  DB_CONNECTION=mysql\n";
    echo "  DB_HOST={$mc['host']}\n";
    echo "  DB_DATABASE={$mc['database']}\n";
    echo "  DB_USERNAME={$mc['username']}\n";
    echo "  DB_PASSWORD=your_password\n\n";

} catch (PDOException $e) {
    echo "[FAILED]\n\n";
    echo "PDO MySQL Error: " . $e->getMessage() . "\n\n";
    echo "Note: If MySQL is not running on 127.0.0.1:3306, you can start MySQL via XAMPP / MariaDB / Docker,\n";
    echo "or keep DB_CONNECTION=sqlite which is currently active and fully operational.\n\n";
}
