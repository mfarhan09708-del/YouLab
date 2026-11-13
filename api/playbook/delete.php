<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
require_method('POST');$userId=require_auth();require_csrf();$input=request_data();$entryId=positive_id($input['entry_id']??null,'entry_id');
$stmt=db()->prepare('DELETE FROM playbook_entries WHERE id=? AND user_id=?');$stmt->execute([$entryId,$userId]);
if(!$stmt->rowCount())fail('NOT_FOUND','Playbook entry not found.',404);
success(['entry_id'=>$entryId],'Playbook entry removed.');
