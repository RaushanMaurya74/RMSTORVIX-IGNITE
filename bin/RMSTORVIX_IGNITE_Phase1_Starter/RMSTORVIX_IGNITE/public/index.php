<?php
declare(strict_types=1);

session_start();

$config = [
    'app_name' => 'RMSTORVIX IGNITE',
    'environment' => getenv('APP_ENV') ?: 'local',
];

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$allowed = ['/', '/dashboard', '/build-control'];
if (!in_array($path, $allowed, true)) {
    http_response_code(404);
    $pageTitle = 'Page not found';
    $active = '';
    require __DIR__ . '/../resources/views/404.php';
    exit;
}

$pageTitle = match ($path) {
    '/build-control' => 'Build Control Center',
    default => 'Business overview',
};
$active = $path === '/build-control' ? 'build-control' : 'dashboard';

require __DIR__ . '/../resources/views/layout.php';
