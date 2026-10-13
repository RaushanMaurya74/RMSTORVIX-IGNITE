<?php
declare(strict_types=1);
require_once __DIR__.'/../app/bootstrap.php';
$path=parse_url($_SERVER['REQUEST_URI']??'/',PHP_URL_PATH)?:'/';
$routes=['/'=>'dashboard','/dashboard'=>'dashboard','/login'=>'login.php','/signup'=>'signup.php','/pending'=>'pending.php','/admin'=>'admin.php','/logout'=>'logout.php','/forgot-password'=>'forgot-password.php','/reset-password'=>'reset-password.php'];
if (!isset($routes[$path])) { http_response_code(404); page('Not found','<p>This page is not implemented yet.</p><a href="/login">Sign in</a>'); exit; }
$r=$routes[$path];
if (str_ends_with($r,'.php')) { require __DIR__.'/'.$r; exit; }
$u=login_required();
if ($u['platform_role']==='BUSINESS_USER' && $u['approval_status']!=='APPROVED') go('/pending');
page('Business dashboard','<div class="alert info">DEMO ENVIRONMENT — figures are not connected to real business transactions.</div><h3>Welcome, '.e($u['full_name']).'</h3><div class="cards"><article><small>Sales this month · SAMPLE</small><strong>₹ 2,84,650</strong></article><article><small>Receivables · SAMPLE</small><strong>₹ 68,420</strong></article><article><small>Stock items · SAMPLE</small><strong>1,248</strong></article></div><p>Phase 2 authentication foundation is active. Billing and accounting workflows are not implemented yet.</p><nav><a href="/logout" onclick="event.preventDefault();document.getElementById(\'logoutForm\').submit()">Sign out</a></nav><form id="logoutForm" method="post" action="/logout">'.csrf().'</form>');
