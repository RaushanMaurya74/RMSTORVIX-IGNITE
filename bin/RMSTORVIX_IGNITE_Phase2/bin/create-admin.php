<?php
declare(strict_types=1);
require_once __DIR__.'/../app/bootstrap.php';
if(PHP_SAPI!=='cli'){http_response_code(403);exit("CLI only\n");}
echo "RMSTORVIX IGNITE — create first platform super-admin\n";
$email=strtolower(trim((string)readline('Admin email: ')));$name=trim((string)readline('Admin full name: '));$pw=(string)readline('Admin password (12+ chars): ');
if(!filter_var($email,FILTER_VALIDATE_EMAIL)||$name===''||strlen($pw)<12||!preg_match('/[A-Za-z]/',$pw)||!preg_match('/[0-9]/',$pw)){fwrite(STDERR,"Invalid input. Use a valid email, name, and 12+ character password with letters and numbers.\n");exit(1);}
$s=db()->prepare('SELECT id FROM users WHERE email=?');$s->execute([$email]);if($s->fetch()){fwrite(STDERR,"Email already exists; no changes made.\n");exit(1);}
$s=db()->prepare("INSERT INTO users(public_id,business_id,full_name,email,password_hash,platform_role,account_status) VALUES(?,NULL,?,?,?,'SUPER_ADMIN','ACTIVE')");$s->execute([bin2hex(random_bytes(16)),$name,$email,password_hash($pw,PASSWORD_DEFAULT)]);
echo "Super-admin created. Sign in at /login. Keep credentials private.\n";
