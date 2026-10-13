<?php
declare(strict_types=1);
require_once __DIR__.'/../app/bootstrap.php';
$admin=admin_required();$error=null;
if($_SERVER['REQUEST_METHOD']==='POST'){
 check_csrf();$bid=filter_var($_POST['business_id']??null,FILTER_VALIDATE_INT);$action=(string)($_POST['action']??'');$reason=trim((string)($_POST['reason']??''));
 if(!$bid||!in_array($action,['approve','reject','suspend','reactivate'],true))$error='Invalid action.';
 elseif(in_array($action,['reject','suspend'],true)&&mb_strlen($reason)<5)$error='Enter a reason of at least 5 characters.';
 else try{
  db()->beginTransaction();$s=db()->prepare('SELECT * FROM businesses WHERE id=? FOR UPDATE');$s->execute([$bid]);$b=$s->fetch();if(!$b)throw new RuntimeException('Not found');
  $status=['approve'=>'APPROVED','reject'=>'REJECTED','suspend'=>'SUSPENDED','reactivate'=>'APPROVED'][$action];
  db()->prepare('UPDATE businesses SET approval_status=?,approved_by=?,approved_at=IF(?="APPROVED",NOW(),approved_at),rejection_reason=? WHERE id=?')->execute([$status,$admin['id'],$status,in_array($action,['reject','suspend'],true)?$reason:null,$bid]);
  if($action==='suspend')db()->prepare("UPDATE users SET account_status='DISABLED' WHERE business_id=?")->execute([$bid]);
  elseif(in_array($action,['approve','reactivate'],true))db()->prepare("UPDATE users SET account_status='ACTIVE' WHERE business_id=?")->execute([$bid]);
  db()->commit();audit('admin.business_'.$action,$bid,['from'=>$b['approval_status'],'to'=>$status,'reason'=>$reason]);flash('success','Business status updated: '.$status);go('/admin');
 }catch(Throwable $ex){if(db()->inTransaction())db()->rollBack();error_log('Admin action failed: '.$ex->getMessage());$error='Action failed. Review server logs.';}
}
$filter=(string)($_GET['status']??'PENDING');if(!in_array($filter,['PENDING','APPROVED','REJECTED','SUSPENDED','ALL'],true))$filter='PENDING';
$sql='SELECT * FROM businesses'.($filter==='ALL'?'':' WHERE approval_status=?').' ORDER BY created_at DESC LIMIT 200';$s=db()->prepare($sql);$s->execute($filter==='ALL'?[]:[$filter]);$rows=$s->fetchAll();
$counts=[];foreach(db()->query('SELECT approval_status,COUNT(*) total FROM businesses GROUP BY approval_status')->fetchAll() as $c)$counts[$c['approval_status']]=$c['total'];
$html='<div class="admin-head"><p>Signed in as '.e($admin['email']).'</p><form method="post" action="/logout">'.csrf().'<button class="secondary">Sign out</button></form></div><div class="cards">';
foreach(['PENDING'=>'Pending','APPROVED'=>'Approved','REJECTED'=>'Rejected','SUSPENDED'=>'Suspended'] as $k=>$v)$html.='<article><small>'.e($v).'</small><strong>'.(int)($counts[$k]??0).'</strong></article>';
$html.='</div>'.($error?'<div class="alert error">'.e($error).'</div>':'').'<div class="filters">';
foreach(['PENDING','APPROVED','REJECTED','SUSPENDED','ALL'] as $f)$html.='<a class="'.($filter===$f?'selected':'').'" href="/admin?status='.$f.'">'.ucfirst(strtolower($f)).'</a>';
$html.='</div>';
if(!$rows)$html.='<p>No business accounts in this filter.</p>';
foreach($rows as $b){
 $html.='<article class="business"><div class="admin-head"><div><h3>'.e($b['business_name']).'</h3><p>'.e($b['owner_name']).' · '.e($b['created_at']).'</p></div><span class="status">'.e($b['approval_status']).'</span></div><div class="details"><small>Email</small><b>'.e($b['email']).'</b><small>Mobile</small><b>'.e($b['mobile']).'</b><small>GSTIN</small><b>'.e($b['gstin']?:'Not provided').'</b><small>Location</small><b>'.e(implode(', ',array_filter([$b['city'],$b['state'],$b['pin_code']]))).'</b></div><div class="actions">';
 $acts=$b['approval_status']==='PENDING'?['approve'=>'Approve','reject'=>'Reject']:($b['approval_status']==='APPROVED'?['suspend'=>'Suspend']:['reactivate'=>'Reactivate']);
 foreach($acts as $a=>$label){$danger=in_array($a,['reject','suspend'],true);$html.='<form method="post">'.csrf().'<input type="hidden" name="business_id" value="'.(int)$b['id'].'"><input type="hidden" name="action" value="'.$a.'">'.($danger?'<input name="reason" minlength="5" required placeholder="Reason (required)">':'').'<button class="'.($danger?'danger':'primary').'">'.e($label).'</button></form>';}
 $html.='</div></article>';
}
page('Platform admin — activation',$html);
