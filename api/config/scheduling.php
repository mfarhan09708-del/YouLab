<?php
declare(strict_types=1);

/** Balanced random allocation with no perfectly alternating sequence or run longer than three. */
function make_schedule(int $duration): array
{
    $testCount = intdiv($duration, 2) + ($duration % 2);
    $normalCount = $duration - $testCount;
    $conditions = array_merge(array_fill(0, $testCount, 'test'), array_fill(0, $normalCount, 'normal'));
    for ($attempt = 0; $attempt < 1000; $attempt++) {
        shuffle($conditions);
        $longestRun = 1;
        $run = 1;
        $alternates = true;
        for ($i = 1; $i < $duration; $i++) {
            if ($conditions[$i] === $conditions[$i - 1]) {
                $run++;
                $alternates = false;
                $longestRun = max($longestRun, $run);
            } else {
                $run = 1;
            }
        }
        if (!$alternates && $longestRun <= 3) return $conditions;
    }
    throw new RuntimeException('Could not generate an acceptable balanced schedule.');
}

/** Accept a reviewed client preview only when it preserves the same allocation rules. */
function valid_schedule(mixed $schedule, int $duration): bool
{
    if (!is_array($schedule) || count($schedule) !== $duration) return false;
    $testCount = 0;
    $normalCount = 0;
    $longestRun = 1;
    $run = 1;
    $alternates = true;
    $previous = null;
    $expectedIndex = 0;
    foreach ($schedule as $index => $condition) {
        if ($index !== $expectedIndex++) return false;
        if ($condition !== 'test' && $condition !== 'normal') return false;
        if ($condition === 'test') $testCount++; else $normalCount++;
        if ($previous !== null) {
            if ($condition === $previous) {
                $run++;
                $alternates = false;
                $longestRun = max($longestRun, $run);
            } else {
                $run = 1;
            }
        }
        $previous = $condition;
    }
    $expectedTest = intdiv($duration, 2) + ($duration % 2);
    return $testCount === $expectedTest && $normalCount === $duration - $expectedTest
        && !$alternates && $longestRun <= 3;
}

function valid_date_string(mixed $value, string $field): string
{
    if (!is_string($value)) fail('VALIDATION_ERROR', 'Please check the submitted values.', 422, [$field => 'Enter a date in YYYY-MM-DD format.']);
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    if (!$date || $date->format('Y-m-d') !== $value) fail('VALIDATION_ERROR', 'Please check the submitted values.', 422, [$field => 'Enter a valid date in YYYY-MM-DD format.']);
    return $value;
}
