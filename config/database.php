<?php
declare(strict_types=1);

/**
 * RMSTORVIX IGNITE — Database Configuration
 * Dual support:
 * 1. Native SQLite (default for local standalone zero-configuration execution)
 * 2. MySQL 8.0+ (production server / cloud deployment)
 */

return [
    'driver' => getenv('DB_CONNECTION') ?: 'sqlite',

    'sqlite' => [
        'database' => __DIR__ . '/../database/rmstorvix_ignite.sqlite',
    ],

    'mysql' => [
        'host' => getenv('DB_HOST') ?: '127.0.0.1',
        'port' => (int)(getenv('DB_PORT') ?: 3306),
        'database' => getenv('DB_DATABASE') ?: 'rmstorvix_ignite',
        'username' => getenv('DB_USERNAME') ?: 'root',
        'password' => getenv('DB_PASSWORD') ?: '',
        'charset' => 'utf8mb4',
        'collation' => 'utf8mb4_unicode_ci',
    ],
];
