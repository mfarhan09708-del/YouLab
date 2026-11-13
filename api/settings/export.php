<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
require_method('GET');$userId=require_auth();
$stmt=db()->prepare('SELECT e.title,e.description,e.start_date,e.end_date,e.status,d.day_number,d.scheduled_date,d.condition_type,c.rating,c.followed_plan,c.context_tags,c.note,c.checked_in_at FROM experiments e JOIN experiment_days d ON d.experiment_id=e.id LEFT JOIN checkins c ON c.experiment_day_id=d.id WHERE e.user_id=? ORDER BY e.start_date,e.id,d.day_number');
$stmt->execute([$userId]);
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="youlab-data-' . date('Y-m-d') . '.csv"');
header('Cache-Control: no-store');
$out=fopen('php://output','wb');
fputcsv($out,['experiment','description','start_date','end_date','status','day_number','scheduled_date','condition','rating','followed_plan','context_tags','note','checked_in_at'],',','"','\\');
while($row=$stmt->fetch()){
    foreach($row as &$value){
        if(is_string($value)&&preg_match('/^[=+@\\-\\t\\r]/',$value))$value="'".$value;
    }
    unset($value);
    fputcsv($out,$row,',','"','\\');
}
fclose($out);exit;
