<?php
declare(strict_types=1);
if (session_status() !== PHP_SESSION_ACTIVE) {
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || getenv('SESSION_SECURE_COOKIE') === 'true';
    session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>$secure,'httponly'=>true,'samesite'=>'Lax']);
    session_start();
}
function envfile(string $file): void {
    if (!is_readable($file)) return;
    foreach (file($file, FILE_IGNORE_NEW_LINES|FILE_SKIP_EMPTY_LINES) as $line) {
        $line=trim($line); if ($line==='' || $line[0]==='#' || !str_contains($line,'=')) continue;
        [$k,$v]=explode('=',$line,2); if (getenv(trim($k))===false) putenv(trim($k).'='.trim(trim($v), "\"'"));
    }
}
envfile(dirname(__DIR__).'/.env');
function e(?string $s): string { return htmlspecialchars($s ?? '', ENT_QUOTES|ENT_SUBSTITUTE, 'UTF-8'); }
function db(): PDO {
    static $pdo=null; if ($pdo instanceof PDO) return $pdo;
    $pdo=new PDO('mysql:host='.getenv('DB_HOST').';port='.(getenv('DB_PORT')?:'3306').';dbname='.(getenv('DB_DATABASE')?:'rmstorvix_ignite').';charset=utf8mb4', getenv('DB_USERNAME')?:'root', getenv('DB_PASSWORD')?:'', [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
    return $pdo;
}
function go(string $url): never { header('Location: '.$url, true, 303); exit; }
function token(): string { if (empty($_SESSION['_csrf'])) $_SESSION['_csrf']=bin2hex(random_bytes(32)); return $_SESSION['_csrf']; }
function csrf(): string { return '<input type="hidden" name="_csrf" value="'.e(token()).'">'; }
function check_csrf(): void { if (!hash_equals((string)($_SESSION['_csrf']??''),(string)($_POST['_csrf']??''))) { http_response_code(419); exit('Form expired. Refresh and try again.'); } }
function flash(string $type,string $msg): void { $_SESSION['_flash']=['type'=>$type,'msg'=>$msg]; }
function audit(string $action, ?int $businessId=null, array $metadata=[]): void {
    try { $s=db()->prepare('INSERT INTO audit_logs(actor_user_id,business_id,action_key,ip_address,user_agent,metadata) VALUES(?,?,?,?,?,?)'); $u=$_SESSION['user']??null; $s->execute([$u['id']??null,$businessId,$action,substr((string)($_SERVER['REMOTE_ADDR']??''),0,45),substr((string)($_SERVER['HTTP_USER_AGENT']??''),0,500),$metadata?json_encode($metadata):null]); }
    catch(Throwable $ex) { error_log('RMSTORVIX IGNITE audit error: '.$ex->getMessage()); }
}
function user(): ?array { return $_SESSION['user']??null; }
function login_required(): array {
    $u=user(); if (!$u) go('/login');
    $s=db()->prepare('SELECT u.id,u.full_name,u.email,u.platform_role,u.account_status,u.business_id,b.business_name,b.approval_status FROM users u LEFT JOIN businesses b ON b.id=u.business_id WHERE u.id=?'); $s->execute([(int)$u['id']]); $fresh=$s->fetch();
    if (!$fresh || $fresh['account_status']!=='ACTIVE') { unset($_SESSION['user']); go('/login'); }
    if ($fresh['platform_role']==='BUSINESS_USER' && $fresh['approval_status']!=='APPROVED') go('/pending');
    $_SESSION['user']=$fresh; return $fresh;
}
function admin_required(): array { $u=login_required(); if (!in_array($u['platform_role'],['SUPER_ADMIN','PLATFORM_ADMIN'],true)) { http_response_code(403); exit('Forbidden'); } return $u; }
function page(string $title,string $html): void {
    $f=$_SESSION['_flash']??null; unset($_SESSION['_flash']);
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'.e($title).' · RMSTORVIX IGNITE</title><link rel="stylesheet" href="/assets/css/auth.css"></head><body><main class="wrap"><aside class="brand"><div class="mark">R<span>✦</span></div><p class="tag">RMSTORVIX</p><h1>IGNITE</h1><p>Billing, inventory and business control in one workspace.</p><small>SECURE BUSINESS SUITE</small></aside><section class="panel"><div class="wordmark">RMSTORVIX <b>IGNITE</b></div><h2>'.e($title).'</h2>';
    if ($f) echo '<div class="alert '.e($f['type']).'">'.e($f['msg']).'</div>';
    echo $html.'<footer>© '.date('Y').' RMSTORVIX IGNITE</footer></section></main></body></html>';
}
