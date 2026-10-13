<?php
declare(strict_types=1);
require_once __DIR__.'/../app/bootstrap.php';
$msg=null;if($_SERVER['REQUEST_METHOD']==='POST'){check_csrf();$email=strtolower(trim((string)($_POST['email']??'')));if(filter_var($email,FILTER_VALIDATE_EMAIL)){$s=db()->prepare('SELECT id FROM users WHERE email=?');$s->execute([$email]);if($u=$s->fetch()){$token=bin2hex(random_bytes(32));db()->prepare('INSERT INTO password_resets(user_id,token_hash,expires_at) VALUES(?,?,DATE_ADD(NOW(),INTERVAL 30 MINUTE))')->execute([$u['id'],hash('sha256',$token)]);error_log('RMSTORVIX IGNITE: password reset token generated; mail delivery is not configured.');}$msg='If the account exists, reset instructions can be sent once mail delivery is configured.';}else $msg='Enter a valid email address.';}
$html='<p class="muted">Enter the email for your account. This page does not disclose whether an account exists.</p>'.($msg?'<div class="alert info">'.e($msg).'</div>':'').'<form method="post">'.csrf().'<label>Email address<input type="email" name="email" required></label><button class="primary">Request reset</button></form><p><a href="/login">Back to sign in</a></p>';
page('Forgot password',$html);
