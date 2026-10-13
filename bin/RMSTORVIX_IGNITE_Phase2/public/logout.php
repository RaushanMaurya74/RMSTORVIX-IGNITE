<?php
declare(strict_types=1);
require_once __DIR__.'/../app/bootstrap.php';
if($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);exit('Method not allowed');}
check_csrf();$u=user();if($u)audit('auth.logout',$u['business_id']?(int)$u['business_id']:null);
$_SESSION=[];if(ini_get('session.use_cookies')){$p=session_get_cookie_params();setcookie(session_name(),'',time()-42000,$p['path'],$p['domain'],$p['secure'],$p['httponly']);}session_destroy();go('/login');
