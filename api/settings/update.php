<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
require_method('POST');$userId=require_auth();require_csrf();$input=request_data();
$allowed=['name','goal_preference','experience_level','reminder_time','theme'];$unknown=array_diff(array_keys($input),$allowed);if($unknown)fail('VALIDATION_ERROR','One or more fields cannot be changed here.',422);
$set=[];$values=[];$fields=[];
if(array_key_exists('name',$input)){$value=trim((string)$input['name']);if($value===''||mb_strlen($value)>100)$fields['name']='Enter a name up to 100 characters.';else{$set[]='name=?';$values[]=$value;}}
if(array_key_exists('goal_preference',$input)){$value=$input['goal_preference'];if($value!==null&&!in_array($value,['energy','better_sleep','strength','focus','stress_management'],true))$fields['goal_preference']='Choose an available goal.';else{$set[]='goal_preference=?';$values[]=$value;}}
if(array_key_exists('experience_level',$input)){$value=$input['experience_level'];if($value!==null&&!in_array($value,['beginner','intermediate','advanced'],true))$fields['experience_level']='Choose an available experience level.';else{$set[]='experience_level=?';$values[]=$value;}}
if(array_key_exists('reminder_time',$input)){$value=$input['reminder_time'];if($value!==null&&(!is_string($value)||!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/',$value)))$fields['reminder_time']='Use a valid 24-hour time.';else{$set[]='reminder_time=?';$values[]=$value;}}
if(array_key_exists('theme',$input)){$value=$input['theme'];if(!in_array($value,['light','dark','system'],true))$fields['theme']='Choose light, dark, or system.';else{$set[]='theme=?';$values[]=$value;}}
if($fields)fail('VALIDATION_ERROR','Please check the submitted values.',422,$fields);
if(!$set)fail('VALIDATION_ERROR','Choose at least one preference to update.',422);
if(array_key_exists('goal_preference',$input)&&array_key_exists('experience_level',$input))$set[]='onboarding_complete=1';
$values[]=$userId;$stmt=db()->prepare('UPDATE users SET '.implode(',',$set).' WHERE id=?');$stmt->execute($values);
$read=db()->prepare('SELECT id,name,email,goal_preference,experience_level,reminder_time,theme,is_demo,onboarding_complete FROM users WHERE id=?');$read->execute([$userId]);
success(['user'=>public_user($read->fetch())],'Preferences updated.');
