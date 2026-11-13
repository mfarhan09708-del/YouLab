-- Public starter templates. Select the target database before importing.
-- Safe to re-run: each slug updates in place.

INSERT INTO templates
  (owner_user_id, slug, title, icon, description, test_condition, normal_condition,
   suggested_duration, outcome_name, instructions, is_active)
VALUES
  (NULL, 'sleep-screen-cutoff', 'Sleep Screen Cutoff', 'moon',
   'Does avoiding screens 60 minutes before bedtime improve morning energy?',
   'Avoid phone, tablet, computer, and TV screens for the 60 minutes before bed.',
   'Follow your usual evening screen routine.', 14, 'Morning energy',
   'Keep bedtime and wake time as steady as practical. Each morning, rate your energy from 1 (very low) to 5 (very high).', 1),
  (NULL, 'caffeine-cutoff', 'Caffeine Cutoff', 'coffee',
   'Does avoiding caffeine after 2 PM improve sleep quality?',
   'Do not have caffeine after 2 PM.',
   'Follow your usual caffeine routine.', 14, 'Sleep quality',
   'Keep your usual morning caffeine routine. Each morning, rate how restorative your sleep felt from 1 to 5.', 1),
  (NULL, 'workout-timing', 'Workout Timing', 'dumbbell',
   'Does morning or evening exercise improve your energy and workout consistency?',
   'On test days, do your planned workout in the morning.',
   'On normal days, do the same planned workout in the evening.', 14, 'Workout energy',
   'Keep the workout type and effort similar across days. Rate your energy during the workout from 1 to 5.', 1),
  (NULL, 'pre-workout-snack', 'Pre-workout Snack', 'apple',
   'Does eating a light snack before exercise improve workout performance?',
   'Have your chosen light snack about 30–60 minutes before exercise.',
   'Do not add a pre-workout snack; follow your usual routine.', 14, 'Workout performance',
   'Choose one familiar snack and keep the workout as similar as practical. Rate your workout performance from 1 to 5.', 1),
  (NULL, 'post-meal-walking', 'Post-meal Walking', 'footprints',
   'Does a 10-minute walk after meals improve your energy?',
   'Take a relaxed 10-minute walk after your main meal.',
   'Follow your usual after-meal routine.', 14, 'Daily energy',
   'Keep the meal timing as steady as practical. Rate your afternoon energy from 1 to 5.', 1),
  (NULL, 'water-intake', 'Water Intake', 'droplet',
   'Does following a consistent hydration target improve your daily energy?',
   'Follow a consistent daily water target that is appropriate for you.',
   'Follow your usual hydration routine.', 14, 'Daily energy',
   'Use a safe, comfortable target that suits your circumstances; do not force excessive water intake. Rate daily energy from 1 to 5.', 1)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  icon = VALUES(icon),
  description = VALUES(description),
  test_condition = VALUES(test_condition),
  normal_condition = VALUES(normal_condition),
  suggested_duration = VALUES(suggested_duration),
  outcome_name = VALUES(outcome_name),
  instructions = VALUES(instructions),
  is_active = VALUES(is_active);
