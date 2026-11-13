<?php
declare(strict_types=1);

/** Pure calculation function shared by the API and the analysis unit tests. */
function analyze_observations(array $observations, int $bootstrapIterations = 2000): array
{
    $test = [];
    $normal = [];
    $excluded = [];
    foreach ($observations as $row) {
        $tags = is_array($row['context_tags'] ?? null) ? $row['context_tags'] : [];
        $reason = [];
        if (!(bool)($row['followed_plan'] ?? false)) $reason[] = 'low_adherence';
        if ($tags !== []) $reason[] = 'flagged_context';
        if ($reason !== []) {
            $row['exclusion_reasons'] = $reason;
            $excluded[] = $row;
            continue;
        }
        $rating = (float)$row['rating'];
        if (($row['condition_type'] ?? '') === 'test') $test[] = $rating;
        elseif (($row['condition_type'] ?? '') === 'normal') $normal[] = $rating;
    }

    $meanTest = mean_value($test);
    $meanNormal = mean_value($normal);
    $difference = $meanTest === null || $meanNormal === null ? null : $meanTest - $meanNormal;
    $effect = null;
    $interval = null;
    $conclusion = 'not_enough_data';
    if (count($test) >= 5 && count($normal) >= 5) {
        $sdTest = sample_sd($test);
        $sdNormal = sample_sd($normal);
        $pooled = sqrt(((count($test)-1)*$sdTest**2 + (count($normal)-1)*$sdNormal**2) / (count($test)+count($normal)-2));
        $effect = $pooled > 0 ? $difference / $pooled : null;
        $interval = bootstrap_mean_difference_ci($test, $normal, max(500, $bootstrapIterations));
        $excludesZero = $interval[0] > 0 || $interval[1] < 0;
        if ($excludesZero && $effect !== null && abs($effect) >= 0.8) $conclusion = 'strong_evidence';
        elseif ($excludesZero) $conclusion = 'some_evidence';
        else $conclusion = 'no_clear_difference';
    }
    return [
        'conclusion'=>$conclusion,
        'mean_test'=>$meanTest,
        'mean_normal'=>$meanNormal,
        'mean_difference'=>$difference,
        'cohens_d'=>$effect,
        'ci_low'=>$interval[0]??null,
        'ci_high'=>$interval[1]??null,
        'valid_test_days'=>count($test),
        'valid_normal_days'=>count($normal),
        'excluded_days'=>count($excluded),
        'excluded'=>$excluded,
        'valid_test_values'=>$test,
        'valid_normal_values'=>$normal,
    ];
}

function mean_value(array $values): ?float
{
    return $values === [] ? null : array_sum($values) / count($values);
}

function sample_sd(array $values): float
{
    $n = count($values);
    if ($n < 2) return 0.0;
    $mean = mean_value($values);
    $sum = 0.0;
    foreach ($values as $value) $sum += ((float)$value - $mean) ** 2;
    return sqrt($sum / ($n - 1));
}

/** Percentile bootstrap interval for mean(test) - mean(normal). */
function bootstrap_mean_difference_ci(array $test, array $normal, int $iterations = 2000): array
{
    $testN = count($test);
    $normalN = count($normal);
    if ($testN === 0 || $normalN === 0) return [null, null];
    $seed = 24853;
    foreach (array_merge($test, $normal) as $value) $seed = ($seed * 31 + (int)round($value * 100)) % 2147483647;
    mt_srand($seed);
    $differences = [];
    for ($i=0; $i<$iterations; $i++) {
        $testSum=0.0; $normalSum=0.0;
        for ($j=0; $j<$testN; $j++) $testSum += $test[mt_rand(0,$testN-1)];
        for ($j=0; $j<$normalN; $j++) $normalSum += $normal[mt_rand(0,$normalN-1)];
        $differences[] = $testSum/$testN - $normalSum/$normalN;
    }
    sort($differences, SORT_NUMERIC);
    $last = count($differences)-1;
    return [$differences[(int)floor($last*0.025)], $differences[(int)ceil($last*0.975)]];
}
