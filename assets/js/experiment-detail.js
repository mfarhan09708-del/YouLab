(() => {
  const api = (path) => new URL(`api/${path}`, document.baseURI);
  const content = document.querySelector('[data-detail-content]');
  const message = document.querySelector('[data-detail-message]');
  const params = new URLSearchParams(window.location.search);
  const experimentId = params.get('id');
  let csrf = '';

  if (window.lucide) window.lucide.createIcons();
  const todayDate = () => {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  };
  async function request(path, options = {}) {
    const response = await fetch(api(path), { credentials: 'same-origin', headers: { Accept: 'application/json', ...(options.headers || {}) }, ...options });
    const result = response.status === 204 ? null : await response.json();
    if (response.status === 401) { window.location.replace('login.html'); throw new Error('Please sign in to continue.'); }
    if (!response.ok || (result && !result.ok)) throw new Error(result?.error?.message || 'We could not load this experiment.');
    return result?.data || {};
  }
  function setError(text) { message.textContent = text; message.hidden = false; }
  function formatDate(value, options = { month: 'long', day: 'numeric', year: 'numeric' }) {
    return new Intl.DateTimeFormat(undefined, options).format(new Date(`${value}T12:00:00`));
  }
  function initials(name) { return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }

  function render(experiment, days) {
    const today = todayDate();
    const activeDay = days.find((day) => day.scheduled_date === today);
    const nextDay = days.find((day) => day.scheduled_date >= today && !day.checkin_id);
    const nextEligible = days.find((day) => day.scheduled_date <= today && !day.checkin_id);
    const canCheckinStatus = ['active', 'completed'].includes(experiment.status);
    const status = document.createElement('span');
    status.className = `status-chip ${experiment.status}`;
    status.textContent = experiment.status;

    const hero = document.createElement('section');
    hero.className = 'detail-hero';
    const top = document.createElement('div');
    top.className = 'detail-hero-top';
    const copy = document.createElement('div');
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.innerHTML = '<span></span> YOUR EXPERIMENT';
    const heading = document.createElement('h1');
    heading.textContent = experiment.title;
    const description = document.createElement('p');
    description.className = 'detail-description';
    description.textContent = experiment.description;
    const meta = document.createElement('div');
    meta.className = 'detail-meta';
    [`${formatDate(experiment.start_date)} – ${formatDate(experiment.end_date)}`, `${experiment.duration_days} days`, `${experiment.completed_days} check-ins`].forEach((text) => {
      const pill = document.createElement('span'); pill.textContent = text; meta.append(pill);
    });
    copy.append(eyebrow, heading, description, meta);
    const actions = document.createElement('div');
    actions.className = 'detail-actions';
    if (experiment.status === 'active') {
      actions.append(actionButton('Pause', 'pause', 'pause'));
    } else if (experiment.status === 'paused') {
      actions.append(actionButton('Resume', 'resume', 'play'));
    }
    if (experiment.status === 'completed') {
      const resultsLink = document.createElement('a'); resultsLink.className = 'btn btn-primary'; resultsLink.href = `results.html?experiment_id=${experiment.id}`; resultsLink.textContent = 'View results'; actions.append(resultsLink);
    }
    if (!['completed', 'stopped'].includes(experiment.status)) {
      actions.append(actionButton('Stop', 'stop', 'square', true));
    }
    top.append(copy, actions);
    const progressLine = document.createElement('div');
    progressLine.className = 'detail-progress';
    const progress = document.createElement('div'); progress.className = 'progress-track';
    const progressFill = document.createElement('i'); progressFill.style.width = `${experiment.progress_percent}%`; progress.append(progressFill);
    const progressText = document.createElement('b'); progressText.textContent = `${experiment.progress_percent}% complete`;
    progressLine.append(progress, progressText);
    hero.append(top, progressLine);

    const columns = document.createElement('div');
    columns.className = 'detail-grid';
    const todayPanel = document.createElement('section');
    todayPanel.className = 'detail-panel';
    const todayHeading = document.createElement('h2'); todayHeading.textContent = 'Today’s plan';
    const todayCopy = document.createElement('p'); todayCopy.textContent = `Rate your ${experiment.outcome_name.toLowerCase()} and note how the day went.`;
    todayPanel.append(todayHeading, todayCopy);
    const todayCard = document.createElement('div'); todayCard.className = `condition-card ${activeDay?.condition_type === 'test' ? 'test' : ''}`;
    const condition = activeDay?.condition_type || nextDay?.condition_type;
    const conditionText = document.createElement('small'); conditionText.textContent = activeDay ? 'Today’s condition' : (nextDay ? `Next scheduled day · ${formatDate(nextDay.scheduled_date)}` : 'Experiment condition');
    const conditionValue = document.createElement('b');
    conditionValue.textContent = condition === 'test' ? experiment.test_condition : condition === 'normal' ? experiment.normal_condition : 'Your scheduled days are complete.';
    todayCard.append(conditionText, conditionValue);
    todayPanel.append(todayCard);
    const eligibleDay = nextEligible || (activeDay && !activeDay.checkin_id ? activeDay : null);
    if (canCheckinStatus && eligibleDay) {
      const callout = document.createElement('div'); callout.className = 'today-callout';
      const icon = document.createElement('span'); icon.innerHTML = '<i data-lucide="clipboard-check"></i>';
      const text = document.createElement('div');
      const small = document.createElement('small'); small.textContent = eligibleDay.scheduled_date === today ? 'READY WHEN YOU ARE' : `MISSED DAY ${eligibleDay.day_number} · YOU CAN STILL CHECK IN`;
      const bold = document.createElement('b'); bold.textContent = `Day ${eligibleDay.day_number} · ${formatDate(eligibleDay.scheduled_date)}`;
      const link = document.createElement('a'); link.className = 'btn btn-primary'; link.href = `checkin.html?experiment_id=${experiment.id}&day_id=${eligibleDay.experiment_day_id}`; link.innerHTML = 'Check in <i data-lucide="arrow-right"></i>';
      text.append(small, bold, link); callout.append(icon, text); todayPanel.append(callout);
    } else if (activeDay?.checkin_id && canCheckinStatus) {
      const callout = document.createElement('div'); callout.className = 'today-callout';
      const icon = document.createElement('span'); icon.innerHTML = '<i data-lucide="circle-check"></i>';
      const text = document.createElement('div');
      const small = document.createElement('small'); small.textContent = 'TODAY IS LOGGED';
      const bold = document.createElement('b'); bold.textContent = `You rated it ${activeDay.rating} out of 5.`;
      const link = document.createElement('a'); link.className = 'btn btn-outline-soft'; link.href = `checkin.html?experiment_id=${experiment.id}&day_id=${activeDay.experiment_day_id}`; link.textContent = 'Correct check-in';
      text.append(small, bold, link); callout.append(icon, text); todayPanel.append(callout);
    } else if (experiment.status === 'paused') {
      const paused = document.createElement('div'); paused.className = 'today-callout'; paused.textContent = 'This experiment is paused. Resume it whenever you’re ready.'; todayPanel.append(paused);
    } else if (experiment.status === 'completed') {
      const done = document.createElement('div'); done.className = 'today-callout'; done.textContent = 'Your experiment is complete. You showed up for your plan.'; todayPanel.append(done);
    } else if (experiment.status === 'stopped') {
      const stopped = document.createElement('div'); stopped.className = 'today-callout'; stopped.textContent = 'This experiment has ended. Your check-ins are still saved.'; todayPanel.append(stopped);
    }

    const conditions = document.createElement('section'); conditions.className = 'detail-panel';
    const conditionHeading = document.createElement('h2'); conditionHeading.textContent = 'Your two conditions';
    const testCondition = document.createElement('div'); testCondition.className = 'condition-card test';
    const testLabel = document.createElement('small'); testLabel.textContent = 'Test days';
    const testText = document.createElement('b'); testText.textContent = experiment.test_condition; testCondition.append(testLabel, testText);
    const normalCondition = document.createElement('div'); normalCondition.className = 'condition-card';
    const normalLabel = document.createElement('small'); normalLabel.textContent = 'Usual days';
    const normalText = document.createElement('b'); normalText.textContent = experiment.normal_condition; normalCondition.append(normalLabel, normalText);
    const outcome = document.createElement('p'); outcome.textContent = `Each day, rate: ${experiment.outcome_name}.`;
    conditions.append(conditionHeading, testCondition, normalCondition, outcome);
    columns.append(todayPanel, conditions);

    const schedulePanel = document.createElement('section'); schedulePanel.className = 'detail-panel schedule-panel';
    const scheduleHead = document.createElement('div'); scheduleHead.className = 'workspace-section-heading';
    const scheduleTitleWrap = document.createElement('div');
    const kicker = document.createElement('p'); kicker.className = 'section-kicker'; kicker.textContent = 'YOUR FIXED PLAN';
    const scheduleTitle = document.createElement('h2'); scheduleTitle.textContent = 'Schedule'; scheduleTitleWrap.append(kicker, scheduleTitle);
    const count = document.createElement('span'); count.className = 'count-pill'; count.textContent = `${experiment.completed_days}/${experiment.duration_days}`;
    scheduleHead.append(scheduleTitleWrap, count);
    const dayList = document.createElement('div'); dayList.className = 'day-list';
    days.forEach((day) => dayList.append(renderDay(experiment, day, today, canCheckinStatus)));
    schedulePanel.append(scheduleHead, dayList);
    columns.append(schedulePanel);

    content.replaceChildren(hero, columns);
    if (window.lucide) window.lucide.createIcons();
  }

  function renderDay(experiment, day, today, canCheckinStatus) {
    const row = document.createElement('div'); row.className = 'day-row';
    const number = document.createElement('div'); number.className = 'day-number';
    const dayWord = document.createElement('small'); dayWord.textContent = 'DAY';
    const dayNum = document.createElement('b'); dayNum.textContent = String(day.day_number);
    number.append(dayWord, dayNum);
    const info = document.createElement('div'); info.className = 'day-info';
    const title = document.createElement('b'); title.textContent = day.condition_type === 'test' ? 'Test day' : 'Usual day';
    const date = document.createElement('small'); date.textContent = formatDate(day.scheduled_date, { weekday: 'short', month: 'short', day: 'numeric' });
    info.append(title, date);
    const status = document.createElement('span'); status.className = 'day-status';
    const isPast = day.scheduled_date < today;
    status.textContent = day.checkin_id ? 'Complete' : isPast ? 'Missed' : day.scheduled_date === today ? 'Today' : 'Upcoming';
    if (day.checkin_id) status.classList.add('is-done');
    if (isPast && !day.checkin_id) status.classList.add('is-missed');
    if (day.scheduled_date === today) status.classList.add('is-today');
    const canOpen = canCheckinStatus && day.scheduled_date <= today;
    if (canOpen) {
      const link = document.createElement('a');
      link.href = `checkin.html?experiment_id=${experiment.id}&day_id=${day.experiment_day_id}`;
      link.setAttribute('aria-label', `${day.checkin_id ? 'Correct' : 'Enter'} check-in for day ${day.day_number}`);
      link.innerHTML = `<span>${day.checkin_id ? 'Edit' : 'Check in'}</span><i data-lucide="arrow-right"></i>`;
      row.append(number, info, link);
    } else {
      row.append(number, info, status);
    }
    return row;
  }

  function actionButton(label, action, iconName, danger = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.experimentAction = action;
    if (danger) button.className = 'stop-button';
    button.innerHTML = `<i data-lucide="${iconName}"></i>${label}`;
    button.addEventListener('click', async () => {
      if (action === 'stop' && !window.confirm('Stop this experiment? Your saved check-ins will stay in your workspace.')) return;
      button.disabled = true;
      const old = button.innerHTML;
      button.textContent = action === 'pause' ? 'Pausing…' : action === 'resume' ? 'Resuming…' : 'Stopping…';
      try {
        await request(`experiments/${action}.php`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify({ experiment_id: Number(experimentId) }) });
        await load();
      } catch (error) {
        setError(error.message || 'That change could not be saved.');
        button.disabled = false;
        button.innerHTML = old;
        if (window.lucide) window.lucide.createIcons();
      }
    });
    return button;
  }

  async function load() {
    if (!experimentId || !/^\d+$/.test(experimentId)) { setError('Choose an experiment from your workspace to see its schedule.'); content.replaceChildren(); return; }
    try {
      const session = await request('auth/me.php');
      csrf = session.csrf_token || sessionStorage.getItem('youlab_csrf') || '';
      sessionStorage.setItem('youlab_csrf', csrf);
      document.querySelector('[data-user-initials]').textContent = initials(session.user.name);
      if (!session.user.onboarding_complete) { window.location.replace('onboarding.html'); return; }
      const data = await request(`experiments/details.php?id=${encodeURIComponent(experimentId)}`);
      message.hidden = true;
      render(data.experiment, data.days);
    } catch (error) {
      if (error.message !== 'Please sign in to continue.') setError(error.message || 'We could not load this experiment.');
    }
  }

  document.querySelector('[data-logout]').addEventListener('click', async (event) => {
    const button = event.currentTarget; button.disabled = true;
    try { await request('auth/logout.php', { method: 'POST', headers: { 'X-CSRF-Token': csrf } }); }
    finally { sessionStorage.removeItem('youlab_csrf'); window.location.assign('login.html'); }
  });
  load();
})();
