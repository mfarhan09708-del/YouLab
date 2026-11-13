(() => {
  const api = (path) => new URL(`api/${path}`, document.baseURI);
  const templateGrid = document.querySelector('[data-template-grid]');
  const customChoice = document.querySelector('[data-custom-choice]');
  const customFields = document.querySelector('[data-custom-fields]');
  const steps = [...document.querySelectorAll('[data-setup-step]')];
  const bars = [...document.querySelectorAll('[data-progress]')];
  const message = document.querySelector('[data-setup-message]');
  const secondMessage = document.querySelector('[data-setup-message-two]');
  const scheduleGrid = document.querySelector('[data-schedule-grid]');
  const scheduleCount = document.querySelector('[data-schedule-count]');
  const reviewBox = document.querySelector('[data-review-box]');
  const success = document.querySelector('[data-setup-success]');
  const dateInput = document.querySelector('#start-date');
  const durationInputs = [...document.querySelectorAll('[name="duration_days"]')];
  let user = null;
  let csrf = '';
  let templates = [];
  let selectedTemplate = null;
  let selectedCustom = false;
  let schedule = [];

  if (window.lucide) window.lucide.createIcons();
  const today = new Date();
  const localDate = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  dateInput.min = localDate;
  dateInput.value = localDate;

  async function request(path, options = {}) {
    const response = await fetch(api(path), { credentials: 'same-origin', headers: { Accept: 'application/json', ...(options.headers || {}) }, ...options });
    const result = response.status === 204 ? null : await response.json();
    if (response.status === 401) { window.location.replace('login.html'); throw new Error('Please sign in to continue.'); }
    if (!response.ok || (result && !result.ok)) throw new Error(result?.error?.message || 'YouLab could not complete that request.');
    return result?.data || {};
  }

  function setMessage(target, text) { target.textContent = text; target.hidden = false; }
  function clearMessages() { message.hidden = true; secondMessage.hidden = true; }

  function makeSchedule(length) {
    const testCount = Math.floor(length / 2) + (length % 2);
    const usualCount = length - testCount;
    const values = [...Array(testCount).fill('test'), ...Array(usualCount).fill('normal')];
    for (let attempt = 0; attempt < 1000; attempt++) {
      const shuffled = [...values];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      let run = 1;
      let longest = 1;
      let repeats = false;
      for (let i = 1; i < shuffled.length; i++) {
        if (shuffled[i] === shuffled[i - 1]) { run++; repeats = true; longest = Math.max(longest, run); }
        else run = 1;
      }
      if (repeats && longest <= 3) return shuffled;
    }
    const fallback = [];
    let remainingTest = testCount;
    let remainingUsual = usualCount;
    while (remainingTest || remainingUsual) {
      if (remainingTest) { fallback.push('test'); remainingTest--; }
      if (remainingTest) { fallback.push('test'); remainingTest--; }
      if (remainingUsual) { fallback.push('normal'); remainingUsual--; }
      if (remainingUsual) { fallback.push('normal'); remainingUsual--; }
    }
    return fallback;
  }

  function dateAtOffset(start, offset) {
    const date = new Date(`${start}T12:00:00`);
    date.setDate(date.getDate() + offset);
    return date;
  }

  function currentDuration() { return Number(durationInputs.find((input) => input.checked)?.value || 14); }

  function selectedData() {
    if (selectedTemplate) return {
      template_id: selectedTemplate.id,
      title: selectedTemplate.title,
      description: selectedTemplate.description,
      test_condition: selectedTemplate.test_condition,
      normal_condition: selectedTemplate.normal_condition,
      outcome_name: selectedTemplate.outcome_name,
    };
    return {
      title: document.querySelector('#custom-title').value.trim(),
      description: document.querySelector('#custom-description').value.trim(),
      test_condition: document.querySelector('#custom-test').value.trim(),
      normal_condition: document.querySelector('#custom-normal').value.trim(),
      outcome_name: document.querySelector('#custom-outcome').value.trim(),
    };
  }

  function renderTemplates() {
    const cards = templates.map((template) => {
      const button = document.createElement('button');
      button.className = 'template-card';
      button.type = 'button';
      button.dataset.templateId = String(template.id);
      button.setAttribute('aria-pressed', 'false');
      const icon = document.createElement('span');
      icon.className = 'template-icon';
      const iconName = ({ moon: 'moon', coffee: 'coffee', dumbbell: 'dumbbell', apple: 'apple', footprints: 'footprints', droplet: 'droplets' })[template.icon] || 'sparkles';
      icon.innerHTML = `<i data-lucide="${iconName}"></i>`;
      const copy = document.createElement('span');
      copy.className = 'template-copy';
      const title = document.createElement('b');
      title.textContent = template.title;
      const description = document.createElement('small');
      description.textContent = template.description;
      copy.append(title, description);
      const selected = document.createElement('i');
      selected.className = 'template-selected';
      selected.dataset.lucide = 'circle-check';
      button.append(icon, copy, selected);
      button.addEventListener('click', () => {
        selectedTemplate = template;
        selectedCustom = false;
        customChoice.classList.remove('is-selected');
        customChoice.setAttribute('aria-pressed', 'false');
        customFields.hidden = true;
        templateGrid.querySelectorAll('.template-card').forEach((card) => {
          const active = card === button;
          card.classList.toggle('is-selected', active);
          card.setAttribute('aria-pressed', String(active));
        });
        clearMessages();
      });
      return button;
    });
    templateGrid.replaceChildren(...cards);
    if (window.lucide) window.lucide.createIcons();
  }

  function setStep(index) {
    steps.forEach((step, stepIndex) => { step.hidden = stepIndex !== index; });
    bars.forEach((bar, barIndex) => bar.classList.toggle('is-active', barIndex === index));
    clearMessages();
    if (index === 1) renderPreview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderPreview() {
    const length = currentDuration();
    schedule = makeSchedule(length);
    const start = dateInput.value || localDate;
    scheduleGrid.replaceChildren(...schedule.map((condition, index) => {
      const day = document.createElement('div');
      day.className = `schedule-day ${condition === 'normal' ? 'is-normal' : ''}`;
      const date = dateAtOffset(start, index);
      const dayLabel = document.createElement('small');
      dayLabel.textContent = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
      const number = document.createElement('b');
      number.textContent = `Day ${index + 1}`;
      const conditionLabel = document.createElement('span');
      conditionLabel.className = 'day-condition';
      conditionLabel.textContent = condition === 'test' ? 'TEST' : 'USUAL';
      day.append(dayLabel, number, conditionLabel);
      return day;
    }));
    const testDays = schedule.filter((item) => item === 'test').length;
    scheduleCount.textContent = `${testDays} test · ${length - testDays} usual`;
    const details = selectedData();
    const endDate = dateAtOffset(start, length - 1);
    const items = [
      ['Your question', details.title],
      ['What you’ll rate', details.outcome_name],
      ['Test days', details.test_condition],
      ['Usual days', details.normal_condition],
      ['Start date', new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(dateAtOffset(start, 0))],
      ['Finish date', new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(endDate)],
    ];
    reviewBox.replaceChildren(...items.map(([label, value]) => {
      const item = document.createElement('div');
      item.className = 'review-item';
      const small = document.createElement('small');
      small.textContent = label;
      const strong = document.createElement('b');
      strong.textContent = value;
      item.append(small, strong);
      return item;
    }));
  }

  function validateSelected() {
    if (!selectedTemplate && !selectedCustom) { setMessage(message, 'Choose a starter idea or create a custom experiment.'); return false; }
    if (selectedCustom) {
      const data = selectedData();
      const empty = Object.entries(data).find(([, value]) => !value);
      if (empty) {
        const fieldIds = { title: 'custom-title', description: 'custom-description', test_condition: 'custom-test', normal_condition: 'custom-normal', outcome_name: 'custom-outcome' };
        setMessage(message, 'Fill in each part of your custom experiment to continue.');
        document.getElementById(fieldIds[empty[0]])?.focus();
        return false;
      }
    }
    return true;
  }

  async function initialize() {
    try {
      const session = await request('auth/me.php');
      user = session.user;
      csrf = session.csrf_token || sessionStorage.getItem('youlab_csrf') || '';
      sessionStorage.setItem('youlab_csrf', csrf);
      if (!user.onboarding_complete) { window.location.replace('onboarding.html'); return; }
      const loaded = await request('experiments/templates.php');
      templates = loaded.templates || [];
      renderTemplates();
      const templateId = new URLSearchParams(window.location.search).get('template_id');
      if (templateId) templateGrid.querySelector(`[data-template-id="${CSS.escape(templateId)}"]`)?.click();
    } catch (error) {
      if (error.message !== 'Please sign in to continue.') setMessage(message, error.message || 'We could not load starter ideas. Please refresh and try again.');
    }
  }

  customChoice.addEventListener('click', () => {
    selectedTemplate = null;
    selectedCustom = true;
    customChoice.classList.add('is-selected');
    customChoice.setAttribute('aria-pressed', 'true');
    templateGrid.querySelectorAll('.template-card').forEach((card) => { card.classList.remove('is-selected'); card.setAttribute('aria-pressed', 'false'); });
    customFields.hidden = false;
    clearMessages();
  });
  document.querySelector('[data-continue]').addEventListener('click', () => {
    if (!validateSelected()) return;
    setStep(1);
  });
  document.querySelector('[data-back]').addEventListener('click', () => setStep(0));
  durationInputs.forEach((input) => input.addEventListener('change', () => {
    durationInputs.forEach((option) => option.closest('.duration-option').classList.toggle('is-selected', option.checked));
    renderPreview();
  }));
  dateInput.addEventListener('change', renderPreview);

  document.querySelector('[data-start]').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    if (!dateInput.value || dateInput.value < localDate) { setMessage(secondMessage, 'Choose today or a future start date.'); dateInput.focus(); return; }
    const plan = selectedData();
    if (Object.values(plan).some((value) => !value)) { setMessage(secondMessage, 'Review your experiment details before starting.'); setStep(0); return; }
    button.disabled = true;
    button.innerHTML = '<span>Starting your experiment…</span>';
    try {
      const result = await request('experiments/create.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ ...plan, duration_days: currentDuration(), start_date: dateInput.value, schedule }),
      });
      showSuccess(result);
    } catch (error) {
      setMessage(secondMessage, error.message || 'We could not start this experiment. Please try again.');
      button.disabled = false;
      button.innerHTML = 'Start experiment <i data-lucide="arrow-right"></i>';
      if (window.lucide) window.lucide.createIcons();
    }
  });

  function showSuccess(result) {
    steps.forEach((step) => { step.hidden = true; });
    bars.forEach((bar) => { bar.classList.remove('is-active'); bar.classList.add('is-done'); });
    const end = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(dateAtOffset(result.start_date, result.duration_days - 1));
    const start = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(dateAtOffset(result.start_date, 0));
    success.hidden = false;
    const icon = document.createElement('span');
    icon.className = 'success-icon';
    icon.innerHTML = '<i data-lucide="circle-check"></i>';
    const heading = document.createElement('h1');
    heading.textContent = 'Your experiment is ready.';
    const copy = document.createElement('p');
    copy.textContent = 'Your days are balanced and shuffled. Follow the plan as it fits your life; missed days are okay.';
    const summary = document.createElement('div');
    summary.className = 'success-summary';
    [`${result.duration_days} days`, `${start} – ${end}`, `${result.status}`].forEach((text) => { const pill = document.createElement('span'); pill.textContent = text; summary.append(pill); });
    const calendar = document.createElement('div');
    calendar.className = 'success-calendar';
    const dayCells = (result.schedule || []).map((item) => {
      const day = document.createElement('div');
      day.className = `schedule-day ${item.condition_type === 'normal' ? 'is-normal' : ''}`;
      const date = document.createElement('small');
      date.textContent = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(dateAtOffset(item.scheduled_date, 0));
      const number = document.createElement('b');
      number.textContent = `Day ${item.day_number}`;
      const condition = document.createElement('span');
      condition.className = 'day-condition';
      condition.textContent = item.condition_type === 'test' ? 'TEST' : 'USUAL';
      day.append(date, number, condition);
      return day;
    });
    const grid = document.createElement('div');
    grid.className = 'schedule-grid';
    grid.append(...dayCells);
    calendar.append(grid);
    const link = document.createElement('a');
    link.className = 'btn btn-primary';
    link.href = 'dashboard.html';
    link.innerHTML = 'Go to your workspace <i data-lucide="arrow-right"></i>';
    success.replaceChildren(icon, heading, copy, summary, calendar, link);
    if (window.lucide) window.lucide.createIcons();
  }

  initialize();
})();
