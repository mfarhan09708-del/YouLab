<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
require_method('GET');
$userId=require_auth();
$allowed=['works_for_me','does_not_seem_to_help','still_unclear'];
$category=$_GET['category']??null;
if($category!==null&&!in_array($category,$allowed,true))fail('VALIDATION_ERROR','Invalid Playbook category.',422);
$sql='SELECT p.*,e.start_date FROM playbook_entries p LEFT JOIN experiments e ON e.id=p.experiment_id WHERE p.user_id=?';$args=[$userId];
if($category!==null){$sql.=' AND p.category=?';$args[]=$category;}$sql.=' ORDER BY p.saved_at DESC';
$stmt=db()->prepare($sql);$stmt->execute($args);$entries=$stmt->fetchAll();
foreach($entries as &$entry){$entry['id']=(int)$entry['id'];$entry['experiment_id']=$entry['experiment_id']===null?null:(int)$entry['experiment_id'];}unset($entry);
success(['entries'=>$entries]);
