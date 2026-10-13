<?php
declare(strict_types=1);
require_once __DIR__.'/../app/bootstrap.php';
$error=null;
if ($_SERVER['REQUEST_METHOD']==='POST') {
 check_csrf(); $email=strtolower(trim((string)($_POST['email']??''))); $pass=(string)($_POST['password']??'');
 if (!filter_var($email,FILTER_VALIDATE_EMAIL)) $error='Enter a valid email and password.';
 else {
  $s=db()->prepare('SELECT u.*,b.business_name,b.approval_status FROM users u LEFT JOIN businesses b ON b.id=u.business_id WHERE u.email=? LIMIT 1'); $s->execute([$email]); $u=$s->fetch();
  if (!$u || !password_verify($pass,$u['password_hash'])) { $error='Email or password is incorrect.'; audit('auth.login_failed'); }
  elseif ($u['account_status']!=='ACTIVE') $error='This account is not active.';
  else { session_regenerate_id(true); $_SESSION['user']=['id'=>(int)$u['id'],'full_name'=>$u['full_name'],'email'=>$u['email'],'platform_role'=>$u['platform_role'],'account_status'=>$u['account_status'],'business_id'=>$u['business_id']?(int)$u['business_id']:null,'business_name'=>$u['business_name'],'approval_status'=>$u['approval_status']]; db()->prepare('UPDATE users SET last_login_at=NOW() WHERE id=?')->execute([$u['id']]); audit('auth.login',$u['business_id']?(int)$u['business_id']:null); go(in_array($u['platform_role'],['SUPER_ADMIN','PLATFORM_ADMIN'],true)?'/admin':(($u['approval_status']??'')==='APPROVED'?'/dashboard':'/pending')); }
 }
}
$html='<p class="muted">Sign in to your RMSTORVIX IGNITE workspace.</p>'.($error?'<div class="alert error">'.e($error).'</div>':'').'<form method="post">'.csrf().'<label>Email address<input name="email" type="email" required autocomplete="username" value="'.e($_POST['email']??'').'"></label><label>Password<input name="password" type="password" required autocomplete="current-password"></label><p><a href="/forgot-password">Forgot password?</a></p><button class="primary">Sign in securely →</button></form><p>New business? <a href="/signup">Create account</a></p>';
page('Welcome back',$html);
