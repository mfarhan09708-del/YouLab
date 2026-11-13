<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
require_method('POST');$userId=require_auth();require_csrf();$input=request_data();
$experimentId=positive_id($input['experiment_id']??null,'experiment_id');
$category=valid_enum($input['category']??null,['works_for_me','does_not_seem_to_help','still_unclear'],'category');
$findingInput=$input['key_finding']??null;$finding=is_string($findingInput)?trim($findingInput):'';if($finding===''||mb_strlen($finding)>500)fail('VALIDATION_ERROR','Please check the submitted values.',422,['key_finding'=>'Enter a finding up to 500 characters.']);
$pdo=db();$experiment=owned_experiment($pdo,$userId,$experimentId);
$result=$pdo->prepare('SELECT * FROM results WHERE experiment_id=? ORDER BY calculated_at DESC,id DESC LIMIT 1');$result->execute([$experimentId]);$analysis=$result->fetch();
if(!$analysis)fail('ANALYSIS_REQUIRED','Calculate experiment results before saving a finding.',409);
$labels=['strong_evidence'=>'Strong evidence','some_evidence'=>'Some evidence','no_clear_difference'=>'No clear difference','not_enough_data'=>'Not enough data yet'];
$save=$pdo->prepare('INSERT INTO playbook_entries (user_id,experiment_id,title_snapshot,category,conclusion,key_finding,confidence_label) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE title_snapshot=VALUES(title_snapshot),category=VALUES(category),conclusion=VALUES(conclusion),key_finding=VALUES(key_finding),confidence_label=VALUES(confidence_label),saved_at=CURRENT_TIMESTAMP');
$save->execute([$userId,$experimentId,$experiment['title'],$category,$analysis['conclusion'],$finding,$labels[$analysis['conclusion']]]);
$id=(int)$pdo->lastInsertId();
if($id===0){$find=$pdo->prepare('SELECT id FROM playbook_entries WHERE user_id=? AND experiment_id=?');$find->execute([$userId,$experimentId]);$id=(int)$find->fetchColumn();}
success(['entry_id'=>$id,'experiment_id'=>$experimentId,'category'=>$category,'conclusion'=>$analysis['conclusion'],'confidence_label'=>$labels[$analysis['conclusion']]],'Saved to your Playbook.',201);
