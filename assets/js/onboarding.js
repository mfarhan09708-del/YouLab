(() => {
  const form = document.querySelector('[data-onboarding-form]');
  if (!form) return;
  const groups = [...form.querySelectorAll('[data-choice-group]')];
  const title = document.querySelector('[data-title]');
  const intro = document.querySelector('[data-intro]');
  const count = document.querySelector('[data-step-count]');
  const nextLabel = document.querySelector('[data-next-label]');
  const actions = document.querySelector('[data-actions]');
  const finish = document.querySelector('.onboarding-finish');
  const message = document.querySelector('[data-onboarding-message]');
  const progress = [...document.querySelectorAll('[data-progress]')];
  let step = 0;
  let csrf = sessionStorage.getItem('youlab_csrf') || '';

  if (window.lucide) window.lucide.createIcons();
  const endpoint = (path) => new URL(`api/${path}`, document.baseURI);

  function showError(text) {
    message.textContent = text;
    message.hidden = false;
  }

  function setStep(next) {
    step = next;
    groups.forEach((group, index) => { group.hidden = index !== step; });
    progress.forEach((bar, index) => bar.classList.toggle('is-current', index === step));
    if (step === 0) {
      title.textContent = 'What would you like to work on?';
      intro.textContent = 'Choose a goal that feels useful to you right now. You can change it later.';
      count.textContent = 'STEP 1 OF 2';
      nextLabel.textContent = 'Continue';
    } else {
      title.textContent = 'How familiar are you with tracking habits?';
      intro.textContent = 'We’ll use this to make your first steps feel comfortable.';
      count.textContent = 'STEP 2 OF 2';
      nextLabel.textContent = 'Save and continue';
    }
    message.hidden = true;
  }

  async function loadUser() {
    try {
      const response = await fetch(endpoint('auth/me.php'), { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      const result = await response.json();
      if (!response.ok || !result.ok) { window.location.replace('login.html'); return; }
      csrf = result.data.csrf_token || csrf;
      sessionStorage.setItem('youlab_csrf', csrf);
      const user = result.data.user;
      if (user.onboarding_complete) { window.location.replace('dashboard.html'); return; }
      if (user.goal_preference) form.elements.goal_preference.value = user.goal_preference;
      if (user.experience_level) form.elements.experience_level.value = user.experience_level;
    } catch {
      showError('We could not reach YouLab. Check that Apache and MySQL are running, then refresh this page.');
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const group = groups[step];
    const selected = group.querySelector('input:checked');
    if (!selected) { showError(step === 0 ? 'Choose a goal to continue.' : 'Choose the option that feels closest to you.'); return; }
    message.hidden = true;
    if (step === 0) {
      progress[0].classList.remove('is-current');
      progress[0].classList.add('is-done');
      setStep(1);
      return;
    }

    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    nextLabel.textContent = 'Saving…';
    const data = {
      goal_preference: form.elements.goal_preference.value,
      experience_level: form.elements.experience_level.value,
    };
    try {
      const response = await fetch(endpoint('settings/update.php'), {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        showError(result?.error?.message || 'Your preferences could not be saved. Please try again.');
        return;
      }
      groups.forEach((item) => { item.hidden = true; });
      actions.hidden = true;
      finish.hidden = false;
      title.textContent = `You’re all set, ${result.data.user.name}.`;
      intro.textContent = 'A thoughtful start, made for you.';
      count.textContent = 'SETUP COMPLETE';
      progress[1].classList.remove('is-current');
      progress[1].classList.add('is-done');
      progress[2].classList.add('is-current');
      if (window.lucide) window.lucide.createIcons();
    } catch {
      showError('We could not reach YouLab. Check that Apache and MySQL are running, then try again.');
    } finally {
      submit.disabled = false;
      nextLabel.textContent = 'Save and continue';
    }
  });

  document.querySelector('[data-logout]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await fetch(endpoint('auth/logout.php'), { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': csrf } });
    } finally {
      sessionStorage.removeItem('youlab_csrf');
      window.location.assign('login.html');
    }
  });

  loadUser();
})();
