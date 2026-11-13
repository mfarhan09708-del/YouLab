<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../config/experiment_actions.php';
change_experiment_status('pause');
