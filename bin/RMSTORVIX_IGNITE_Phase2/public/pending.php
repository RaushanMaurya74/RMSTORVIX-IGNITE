<?php
declare(strict_types=1);
require_once __DIR__.'/../app/bootstrap.php';
$u=user(); if(!$u)go('/login');
$s=db()->prepare('SELECT u.id,u.full_name,u.email,u.platform_role,u.account_status,b.business_name,b.approval_status FROM users u LEFT JOIN businesses b ON b.id=u.business_id WHERE u.id=?');$s->execute([$u['id']]);$u=$s->fetch();
if(!$u)go('/login'); if(in_array($u['platform_role'],['SUPER_ADMIN','PLATFORM_ADMIN'],true))go('/admin');
$status=$u['approval_status']??'PENDING';$title=match($status){'REJECTED'=>'Application not approved','SUSPENDED'=>'Workspace suspended',default=>'Workspace awaiting approval'};
$html='<div class="alert info">STATUS: '.e($status).'</div><p>Your registration has been received. Business tools remain unavailable until an authorized platform administrator approves your account.</p><div class="details"><small>Business</small><b>'.e($u['business_name']??'Business').'</b><small>Email</small><b>'.e($u['email']).'</b></div><form method="post" action="/logout">'.csrf().'<button class="secondary">Sign out</button></form>';
page($title,$html);
