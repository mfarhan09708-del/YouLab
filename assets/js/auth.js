(() => {
  const form = document.querySelector('[data-auth-form]');
  if (!form) return;

  const message = document.querySelector('[data-auth-message]');
  const submit = form.querySelector('[type="submit"]');
  const submitLabel = form.querySelector('[data-submit-label]');
  const originalLabel = submitLabel?.textContent || 'Continue';
  const endpoint = (name) => new URL(`api/auth/${name}.php`, document.baseURI);

  if (window.lucide) window.lucide.createIcons();

  document.querySelectorAll('[data-password-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = button.closest('.password-wrap')?.querySelector('input');
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(show));
      button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      button.innerHTML = `<i data-lucide="${show ? 'eye-off' : 'eye'}"></i>`;
      if (window.lucide) window.lucide.createIcons();
    });
  });

  function showMessage(text, isSuccess = false, fields = {}) {
    message.replaceChildren(document.createTextNode(text));
    const entries = Object.values(fields).filter((value) => typeof value === 'string' && value);
    if (entries.length) {
      const list = document.createElement('ul');
      entries.forEach((entry) => {
        const item = document.createElement('li');
        item.textContent = entry;
        list.append(item);
      });
      message.append(list);
    }
    message.classList.toggle('is-success', isSuccess);
    message.hidden = false;
  }

  form.addEventListener('input', () => { message.hidden = true; });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.hidden = true;
    if (!form.reportValidity()) return;

    const mode = form.dataset.authForm;
    const data = Object.fromEntries(new FormData(form).entries());
    if (mode === 'login') delete data.name;
    submit.disabled = true;
    if (submitLabel) submitLabel.textContent = mode === 'signup' ? 'Creating your account…' : 'Signing you in…';

    try {
      const response = await fetch(endpoint(mode), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(data),
      });
      const result = response.status === 204 ? null : await response.json();
      if (!response.ok || !result?.ok) {
        const error = result?.error || {};
        showMessage(error.message || 'We could not sign you in just now. Please try again.', false, error.fields || {});
        const field = Object.keys(error.fields || {})[0];
        if (field) form.elements.namedItem(field)?.focus();
        return;
      }

      sessionStorage.setItem('youlab_csrf', result.data.csrf_token || '');
      localStorage.setItem('youlab_theme', result.data.user?.theme || 'system');
      showMessage(mode === 'signup' ? 'Your account is ready. Let’s set up your preferences.' : 'You’re signed in. Opening your workspace…', true);
      window.setTimeout(() => {
        const user = result.data.user;
        window.location.assign(user?.onboarding_complete ? 'dashboard.html' : 'onboarding.html');
      }, 450);
    } catch {
      showMessage('YouLab could not reach the server. Check that Apache and MySQL are running, then try again.');
    } finally {
      submit.disabled = false;
      if (submitLabel) submitLabel.textContent = originalLabel;
    }
  });

  document.querySelector('[data-demo-login]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.innerHTML = '<i data-lucide="loader-circle"></i> Opening the demo…';
    try {
      const response = await fetch(endpoint('demo'), { method: 'POST', headers: { Accept: 'application/json' }, credentials: 'same-origin' });
      const result = await response.json();
      if (!response.ok || !result?.ok) throw new Error(result?.error?.message || 'The demo workspace could not be opened.');
      sessionStorage.setItem('youlab_csrf', result.data.csrf_token || '');
      localStorage.setItem('youlab_theme', result.data.user?.theme || 'system');
      window.location.assign('dashboard.html');
    } catch (error) {
      button.disabled = false;
      button.innerHTML = '<i data-lucide="play"></i> Explore the demo workspace';
      showMessage(error.message || 'The demo workspace could not be opened.');
      if (window.lucide) window.lucide.createIcons();
    }
  });
})();
