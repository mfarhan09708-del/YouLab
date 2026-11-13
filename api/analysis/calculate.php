<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../config/analysis.php';
require_method('GET');
$userId=require_auth();
$experimentId=positive_id($_GET['experiment_id']??null,'experiment_id');
$experiment=owned_experiment(db(),$userId,$experimentId);
$stmt=db()->prepare('SELECT d.day_number,d.scheduled_date,d.condition_type,c.rating,c.followed_plan,c.context_tags,c.note,c.checked_in_at FROM experiment_days d LEFT JOIN checkins c ON c.experiment_day_id=d.id WHERE d.experiment_id=? ORDER BY d.day_number');
$stmt->execute([$experimentId]);
$rows=$stmt->fetchAll();
$observations=[];$series=[];
foreach($rows as $row){
    if($row['rating']===null)continue;
    $row['rating']=(int)$row['rating'];$row['followed_plan']=(bool)$row['followed_plan'];$row['context_tags']=$row['context_tags']?json_decode($row['context_tags'],true):[];
    $observations[]=$row;
}
$calculation=analyze_observations($observations);
foreach($observations as $row){
    $reason=[];if(!$row['followed_plan'])$reason[]='low_adherence';if($row['context_tags'])$reason[]='flagged_context';
    $series[]=['day_number'=>(int)$row['day_number'],'scheduled_date'=>$row['scheduled_date'],'condition_type'=>$row['condition_type'],'rating'=>$row['rating'],'included'=>!$reason,'exclusion_reasons'=>$reason];
}
$labels=['strong_evidence'=>'Strong evidence','some_evidence'=>'Some evidence','no_clear_difference'=>'No clear difference','not_enough_data'=>'Not enough data yet'];
$validN=$calculation['valid_test_days']+$calculation['valid_normal_days'];
if($calculation['conclusion']==='not_enough_data')$explanation='Add at least five valid check-ins in each condition before YouLab compares the averages. Small personal datasets can still be uncertain.';
else {
    $direction=$calculation['mean_difference']>0?'higher':'lower';
    $amount=number_format(abs($calculation['mean_difference']),1);
    $explanation="Ratings were {$amount} points {$direction} on test days on average. This is a pattern in your recorded days, not proof that the change caused it. {$validN} days were included; {$calculation['excluded_days']} were excluded for flagged context or following the plan less closely. Small datasets remain uncertain.";
}
$save=db()->prepare('INSERT INTO results (experiment_id,conclusion,mean_test,mean_normal,mean_difference,cohens_d,ci_low,ci_high,valid_test_days,valid_normal_days,excluded_days,explanation,calculation_version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
$save->execute([$experimentId,$calculation['conclusion'],$calculation['mean_test'],$calculation['mean_normal'],$calculation['mean_difference'],$calculation['cohens_d'],$calculation['ci_low'],$calculation['ci_high'],$calculation['valid_test_days'],$calculation['valid_normal_days'],$calculation['excluded_days'],$explanation,'bootstrap-v1']);
$calculation['confidence_label']=$labels[$calculation['conclusion']];
$calculation['series']=$series;
$calculation['flagged_days']=count(array_filter($observations,static fn($row)=>count($row['context_tags'])>0));
$calculation['explanation']=$explanation;
unset($calculation['valid_test_values'],$calculation['valid_normal_values'],$calculation['excluded']);
success(['experiment'=>['id'=>$experimentId,'title'=>$experiment['title'],'outcome_name'=>$experiment['outcome_name']],'analysis'=>$calculation,'disclaimer'=>'Personal experiments, not medical advice.']);
