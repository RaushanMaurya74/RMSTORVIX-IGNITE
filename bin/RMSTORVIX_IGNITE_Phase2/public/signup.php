<?php
declare(strict_types=1);
require_once __DIR__.'/../app/bootstrap.php';
$errors=[]; $old=[];
if ($_SERVER['REQUEST_METHOD']==='POST') {
 check_csrf();
 foreach(['business_name','owner_name','business_type','gstin','mobile','email','address_line','city','state','pin_code'] as $k) $old[$k]=trim((string)($_POST[$k]??''));
 $old['email']=strtolower($old['email']); $pw=(string)($_POST['password']??''); $confirm=(string)($_POST['confirm_password']??'');
 if ($old['business_name']===''||mb_strlen($old['business_name'])>190) $errors[]='Business name is required.';
 if ($old['owner_name']==='') $errors[]='Owner name is required.';
 if (!filter_var($old['email'],FILTER_VALIDATE_EMAIL)) $errors[]='Enter a valid email.';
 if (!preg_match('/^[0-9+\-\s()]{8,20}$/',$old['mobile'])) $errors[]='Enter a valid mobile number.';
 if ($old['gstin']!==''&&!preg_match('/^[0-9A-Z]{15}$/',strtoupper($old['gstin']))) $errors[]='GSTIN must be 15 alphanumeric characters.';
 if (strlen($pw)<12||!preg_match('/[A-Za-z]/',$pw)||!preg_match('/[0-9]/',$pw)) $errors[]='Password must be 12+ characters and contain a letter and number.';
 if ($pw!==$confirm) $errors[]='Passwords do not match.';
 if (empty($_POST['consent'])) $errors[]='Please accept the terms.';
 if (!$errors) {
  try {
   db()->beginTransaction(); $pub=bin2hex(random_bytes(16));
   $s=db()->prepare("INSERT INTO businesses(public_id,business_name,owner_name,business_type,gstin,email,mobile,address_line,city,state,pin_code,approval_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,'PENDING')");
   $s->execute([$pub,$old['business_name'],$old['owner_name'],$old['business_type']?:null,strtoupper($old['gstin'])?:null,$old['email'],$old['mobile'],$old['address_line']?:null,$old['city']?:null,$old['state']?:null,$old['pin_code']?:null]); $bid=(int)db()->lastInsertId();
   $s=db()->prepare("INSERT INTO users(public_id,business_id,full_name,email,mobile,password_hash,platform_role,account_status) VALUES(?,?,?,?,?,?,'BUSINESS_USER','ACTIVE')");
   $s->execute([bin2hex(random_bytes(16)),$bid,$old['owner_name'],$old['email'],$old['mobile'],password_hash($pw,PASSWORD_DEFAULT)]); $uid=(int)db()->lastInsertId();
   $s=db()->prepare('SELECT id FROM roles WHERE role_key=?'); $s->execute(['business_owner']); $rid=$s->fetchColumn();
   if ($rid) db()->prepare('INSERT INTO user_roles(user_id,role_id,business_id) VALUES(?,?,?)')->execute([$uid,(int)$rid,$bid]);
   db()->commit(); audit('business.registration_submitted',$bid,['approval_status'=>'PENDING']); flash('success','Registration received. Your workspace stays locked until admin approval.'); go('/login');
  } catch(Throwable $ex) { if(db()->inTransaction())db()->rollBack(); error_log('Signup error: '.$ex->getMessage()); $errors[]='Registration failed. Check database setup or whether this email already exists.'; }
 }
}
$html='<p class="muted">Submit your business details. Access remains pending until an administrator approves the account.</p>';
if($errors){$html.='<div class="alert error"><ul>';foreach($errors as $x)$html.='<li>'.e($x).'</li>';$html.='</ul></div>';}
$html.='<form method="post">'.csrf().'<div class="grid">';
$fields=[['business_name','Business / shop name *','text'],['owner_name','Owner name *','text'],['business_type','Business type','text'],['gstin','GSTIN (optional)','text'],['mobile','Mobile number *','tel'],['email','Email address *','email'],['address_line','Address','text'],['city','City','text'],['state','State','text'],['pin_code','PIN code','text']];
foreach($fields as [$key,$label,$type]) $html.='<label>'.e($label).'<input name="'.e($key).'" type="'.$type.'" '.(str_contains($label,'*')?'required':'').' value="'.e($old[$key]??'').'"></label>';
$html.='<label>Password *<input name="password" type="password" required minlength="12" autocomplete="new-password"></label><label>Confirm password *<input name="confirm_password" type="password" required minlength="12" autocomplete="new-password"></label></div><label class="check"><input type="checkbox" name="consent" value="1" required> I confirm these details are accurate and accept the terms.</label><button class="primary">Submit for approval →</button></form><p>Already registered? <a href="/login">Sign in</a></p>';
page('Create business account',$html);
