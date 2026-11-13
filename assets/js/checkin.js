(() => {
  const api = (path) => new URL(`api/${path}`, document.baseURI);
  const content = document.querySelector('[data-checkin-content]');
  const message = document.querySelector('[data-checkin-message]');
  const params = new URLSearchParams(window.location.search);
  const experimentId = params.get('experiment_id');
  const requestedDayId = params.get('day_id');
  let csrf = '';
  let experiment = null;
  let day = null;

  if (window.lucide) window.lucide.createIcons();
  const localDate = () => {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  };
  async function request(path, options = {}) {
    const response = await fetch(api(path), { credentials: 'same-origin', headers: { Accept: 'application/json', ...(options.headers || {}) }, ...options });
    const result = response.status === 204 ? null : await response.json();
    if (response.status === 401) { window.location.replace('login.html'); throw new Error('Please sign in to continue.'); }
    if (!response.ok || (result && !result.ok)) throw new Error(result?.error?.message || 'YouLab could not complete that request.');
    return result?.data || {};
  }
  function formatDate(value) { return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${value}T12:00:00`)); }
  function showError(text) { message.textContent = text; message.hidden = false; }

  function renderForm() {
    const checked = Boolean(day.checkin_id);
    const today = localDate();
    const available = ['active', 'completed'].includes(experiment.status) && day.scheduled_date <= today;
    document.querySelector('[data-back-link]').href = `experiment-detail.html?id=${experiment.id}`;
    const card = document.createElement('section'); card.className = 'checkin-card';
    const header = document.createElement('div'); header.className = 'checkin-header';
    const titleBlock = document.createElement('div');
    const eyebrow = document.createElement('p'); eyebrow.className = 'eyebrow'; eyebrow.innerHTML = '<span></span> A MOMENT FOR YOURSELF';
    const title = document.createElement('h1'); title.textContent = checked ? 'Want to adjust your check-in?' : 'How did today feel?';
    const subtitle = document.createElement('p'); subtitle.textContent = `${experiment.title} · ${formatDate(day.scheduled_date)}`;
    titleBlock.append(eyebrow, title, subtitle);
    const pill = document.createElement('span'); pill.className = 'checkin-day-pill'; pill.textContent = `DAY ${day.day_number} · ${day.condition_type === 'test' ? 'TEST' : 'USUAL'}`;
    header.append(titleBlock, pill);

    const banner = document.createElement('div'); banner.className = `condition-banner ${day.condition_type === 'test' ? 'test' : ''}`;
    const icon = document.createElement('span'); icon.innerHTML = `<i data-lucide="${day.condition_type === 'test' ? 'sparkles' : 'repeat-2'}"></i>`;
    const bannerCopy = document.createElement('div');
    const label = document.createElement('small'); label.textContent = day.condition_type === 'test' ? 'TODAY’S TEST PLAN' : 'YOUR USUAL ROUTINE';
    const condition = document.createElement('b'); condition.textContent = day.condition_type === 'test' ? experiment.test_condition : experiment.normal_condition;
    bannerCopy.append(label, condition); banner.append(icon, bannerCopy);

    if (!available) {
      const unavailable = document.createElement('div'); unavailable.className = 'checkin-unavailable';
      const mark = document.createElement('span'); mark.className = 'success-icon'; mark.innerHTML = '<i data-lucide="calendar-clock"></i>';
      const heading = document.createElement('h1'); heading.textContent = 'This day is not open for check-in.';
      const copy = document.createElement('p'); copy.textContent = experiment.status === 'paused' ? 'Your experiment is paused. Resume it from the experiment page when you are ready.' : 'You can check in on or after the scheduled date while your experiment is active.';
      const link = document.createElement('a'); link.className = 'btn btn-primary'; link.href = `experiment-detail.html?id=${experiment.id}`; link.textContent = 'Back to experiment';
      unavailable.append(mark, heading, copy, link); card.append(header, banner, unavailable); content.replaceChildren(card); return;
    }

    const form = document.createElement('form'); form.id = 'daily-checkin-form';
    const ratingSection = document.createElement('fieldset'); ratingSection.className = 'checkin-section';
    const ratingTitle = document.createElement('legend'); ratingTitle.className = 'visually-hidden'; ratingTitle.textContent = `Rate your ${experiment.outcome_name}`;
    const ratingHeading = document.createElement('h2'); ratingHeading.textContent = `Rate your ${experiment.outcome_name.toLowerCase()}`;
    const ratingHelp = document.createElement('p'); ratingHelp.textContent = 'Choose the number that feels closest today.';
    const ratings = document.createElement('div'); ratings.className = 'rating-grid';
    const ratingLabels = ['Very low', 'Low', 'Okay', 'Good', 'Great'];
    const ratingFaces = ['😟', '😕', '😐', '🙂', '😄'];
    for (let value = 1; value <= 5; value++) {
      const labelChoice = document.createElement('label'); labelChoice.className = 'rating-choice';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'rating'; input.value = String(value); input.required = true; input.setAttribute('aria-label', `${value}: ${ratingLabels[value - 1]}`);
      if (day.rating === value) input.checked = true;
      const face = document.createElement('span'); face.className = 'rating-emoji'; face.textContent = ratingFaces[value - 1];
      const text = document.createElement('small'); text.textContent = ratingLabels[value - 1];
      labelChoice.append(input, face, text); ratings.append(labelChoice);
    }
    ratingSection.append(ratingTitle, ratingHeading, ratingHelp, ratings);

    const followedSection = document.createElement('fieldset'); followedSection.className = 'checkin-section';
    const followedTitle = document.createElement('legend'); followedTitle.className = 'visually-hidden'; followedTitle.textContent = 'Did you follow your plan?';
    const followedHeading = document.createElement('h2'); followedHeading.textContent = 'Did you follow your plan?';
    const followedHelp = document.createElement('p'); followedHelp.textContent = 'A no is useful information too.';
    const yesno = document.createElement('div'); yesno.className = 'yesno-group';
    [['yes', 'Yes', 'I followed my plan'], ['no', 'No', 'Plans changed today']].forEach(([value, labelText, helper]) => {
      const labelChoice = document.createElement('label'); labelChoice.className = 'yesno-choice';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'followed_plan'; input.value = value; input.required = true;
      const oldValue = day.followed_plan === null ? null : (day.followed_plan ? 'yes' : 'no');
      if (oldValue === value) input.checked = true;
      const bold = document.createElement('b'); bold.textContent = labelText;
      const small = document.createElement('small'); small.textContent = helper;
      labelChoice.append(input, bold, small); yesno.append(labelChoice);
    });
    followedSection.append(followedTitle, followedHeading, followedHelp, yesno);

    const tagsSection = document.createElement('section'); tagsSection.className = 'checkin-section';
    const tagsHeading = document.createElement('h2'); tagsHeading.textContent = 'Anything unusual today?';
    const tagsHelp = document.createElement('p'); tagsHelp.textContent = 'Optional. Select any that might have affected how you felt.';
    const tags = document.createElement('div'); tags.className = 'tag-grid';
    const tagLabels = [['sick','Sick'],['travel','Travel'],['exam','Exam or deadline'],['bad_sleep','Bad sleep'],['unusual_day','Unusual day']];
    tagLabels.forEach(([value, labelText]) => {
      const labelChoice = document.createElement('label'); labelChoice.className = 'tag-choice';
      const input = document.createElement('input'); input.type = 'checkbox'; input.name = 'context_tags'; input.value = value;
      input.checked = Array.isArray(day.context_tags) && day.context_tags.includes(value);
      const text = document.createElement('span'); text.textContent = labelText;
      labelChoice.append(input, text); tags.append(labelChoice);
    });
    tagsSection.append(tagsHeading, tagsHelp, tags);

    const noteSection = document.createElement('section'); noteSection.className = 'checkin-section';
    const noteHeading = document.createElement('h2'); noteHeading.textContent = 'Anything else you want to remember?';
    const noteHelp = document.createElement('p'); noteHelp.textContent = 'Optional · Keep it short, up to 500 characters.';
    const note = document.createElement('textarea'); note.id = 'checkin-note'; note.className = 'note-field'; note.name = 'note'; note.maxLength = 500; note.placeholder = 'A quick note to your future self…'; note.value = day.note || '';
    note.setAttribute('aria-label', 'Optional note');
    const charCount = document.createElement('div'); charCount.className = 'note-count'; charCount.textContent = `${note.value.length}/500`;
    note.addEventListener('input', () => { charCount.textContent = `${note.value.length}/500`; });
    noteSection.append(noteHeading, noteHelp, note, charCount);

    const actions = document.createElement('div'); actions.className = 'checkin-actions';
    if (checked) {
      const undo = document.createElement('button'); undo.className = 'undo-button'; undo.type = 'button'; undo.textContent = 'Undo this check-in'; undo.addEventListener('click', undoCheckin); actions.append(undo);
    } else {
      const spacer = document.createElement('span'); actions.append(spacer);
    }
    const submit = document.createElement('button'); submit.className = 'btn btn-primary'; submit.type = 'submit'; submit.textContent = checked ? 'Save correction' : 'Save check-in';
    actions.append(submit);
    form.append(ratingSection, followedSection, tagsSection, noteSection, actions);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      submit.disabled = true; submit.textContent = 'Saving…'; message.hidden = true;
      const payload = {
        experiment_day_id: day.experiment_day_id,
        rating: Number(form.querySelector('[name="rating"]:checked')?.value),
        followed_plan: form.querySelector('[name="followed_plan"]:checked')?.value === 'yes',
        context_tags: [...form.querySelectorAll('[name="context_tags"]:checked')].map((input) => input.value),
        note: note.value.trim(),
      };
      try {
        const result = await request('checkins/submit.php', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify(payload) });
        renderSuccess(result);
      } catch (error) {
        showError(error.message || 'Your check-in could not be saved. Try again.');
        submit.disabled = false; submit.textContent = checked ? 'Save correction' : 'Save check-in';
      }
    });
    card.append(header, banner, form);
    content.replaceChildren(card);
    if (window.lucide) window.lucide.createIcons();
  }

  function renderSuccess(result) {
    const card = document.createElement('section'); card.className = 'checkin-card checkin-success';
    const icon = document.createElement('span'); icon.className = 'success-icon'; icon.innerHTML = '<i data-lucide="circle-check"></i>';
    const title = document.createElement('h1'); title.textContent = 'Check-in saved.';
    const copy = document.createElement('p'); copy.textContent = `You have ${result.completed_days} of ${result.total_days} check-ins saved. Thanks for making a moment for yourself.`;
    const link = document.createElement('a'); link.className = 'btn btn-primary'; link.href = `experiment-detail.html?id=${experiment.id}`; link.innerHTML = 'Back to your experiment <i data-lucide="arrow-right"></i>';
    const edit = document.createElement('a'); edit.className = 'back-link'; edit.href = `checkin.html?experiment_id=${experiment.id}&day_id=${day.experiment_day_id}`; edit.textContent = 'Edit this check-in'; edit.style.display = 'flex'; edit.style.justifyContent = 'center'; edit.style.marginTop = '12px';
    const undo = document.createElement('button'); undo.type = 'button'; undo.className = 'undo-button'; undo.textContent = 'Undo this check-in'; undo.style.marginTop = '10px'; undo.addEventListener('click', undoCheckin);
    card.append(icon, title, copy, link, edit, undo); content.replaceChildren(card);
    if (window.lucide) window.lucide.createIcons();
  }

  async function undoCheckin() {
    if (!window.confirm('Undo this check-in? You can enter it again later.')) return;
    try {
      await request('checkins/undo.php', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify({ experiment_day_id: day.experiment_day_id }) });
      window.location.assign(`experiment-detail.html?id=${experiment.id}`);
    } catch (error) { showError(error.message || 'That check-in could not be undone.'); }
  }

  async function initialize() {
    if (!experimentId || !/^\d+$/.test(experimentId)) { showError('Choose a scheduled day from an experiment to check in.'); content.replaceChildren(); return; }
    try {
      const session = await request('auth/me.php'); csrf = session.csrf_token || sessionStorage.getItem('youlab_csrf') || ''; sessionStorage.setItem('youlab_csrf', csrf);
      document.querySelector('[data-user-initials]').textContent = session.user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
      if (!session.user.onboarding_complete) { window.location.replace('onboarding.html'); return; }
      const data = await request(`experiments/details.php?id=${encodeURIComponent(experimentId)}`);
      experiment = data.experiment;
      if (requestedDayId && !/^\d+$/.test(requestedDayId)) throw new Error('That scheduled day could not be found.');
      day = requestedDayId ? data.days.find((item) => String(item.experiment_day_id) === requestedDayId) : data.days.find((item) => item.scheduled_date <= localDate() && !item.checkin_id);
      if (!day) throw new Error(requestedDayId ? 'That scheduled day could not be found for this experiment.' : 'There are no open days to check in for this experiment.');
      message.hidden = true;
      renderForm();
    } catch (error) {
      if (error.message !== 'Please sign in to continue.') showError(error.message || 'We could not prepare your check-in.');
    }
  }

  document.querySelector('[data-logout]').addEventListener('click', async () => {
    try { await request('auth/logout.php', { method: 'POST', headers: { 'X-CSRF-Token': csrf } }); }
    finally { sessionStorage.removeItem('youlab_csrf'); window.location.assign('login.html'); }
  });
  initialize();
})();
