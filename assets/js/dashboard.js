(() => {
  const api = (path) => new URL(`api/${path}`, document.baseURI);
  const name = document.querySelector('[data-user-name]');
  const initials = document.querySelector('[data-user-initials]');
  const date = document.querySelector('[data-today]');
  const list = document.querySelector('[data-experiment-list]');
  const count = document.querySelector('[data-experiment-count]');
  const templateList = document.querySelector('[data-template-list]');
  const alert = document.querySelector('[data-workspace-message]');
  let csrf = '';

  if (window.lucide) window.lucide.createIcons();
  date.dateTime = new Date().toISOString().slice(0, 10);
  date.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'long', day: 'numeric' }).format(new Date());

  async function getJson(path) {
    const response = await fetch(api(path), { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    const data = await response.json();
    if (response.status === 401) { window.location.replace('login.html'); throw new Error('Please sign in to continue.'); }
    if (!response.ok || !data.ok) throw new Error(data?.error?.message || 'We could not load your workspace.');
    return data.data;
  }

  function showError(text) { alert.textContent = text; alert.hidden = false; }

  function renderExperiments(items) {
    count.textContent = String(items.length);
    if (!items.length) {
      list.innerHTML = '<div class="empty-card"><span><i data-lucide="flask-conical"></i></span><div><b>No experiments yet.</b><br>Your first one can be small and simple. Pick a question you already have and build from there.</div></div>';
      return;
    }
    list.replaceChildren(...items.map((item) => {
      const article = document.createElement('article');
      article.className = 'experiment-row';
      const info = document.createElement('div');
      const titleLine = document.createElement('div');
      titleLine.className = 'experiment-title-line';
      const titleLink = document.createElement('a');
      titleLink.href = `experiment-detail.html?id=${encodeURIComponent(item.id)}`;
      titleLink.setAttribute('aria-label', `Open ${item.title}`);
      const heading = document.createElement('h3');
      heading.textContent = item.title;
      titleLink.append(heading);
      const status = document.createElement('span');
      status.className = `status-chip ${item.status}`;
      status.textContent = item.status;
      titleLine.append(titleLink, status);
      const description = document.createElement('p');
      description.textContent = `${item.completed_days} of ${item.duration_days} check-ins · ${item.start_date} to ${item.end_date}`;
      info.append(titleLine, description);
      const progress = document.createElement('div');
      progress.className = 'experiment-progress';
      const label = document.createElement('span');
      const done = document.createElement('b');
      done.textContent = `${item.progress_percent}%`;
      label.append(document.createTextNode('Progress'), done);
      const track = document.createElement('div');
      track.className = 'progress-track';
      const fill = document.createElement('i');
      fill.style.width = `${Math.max(0, Math.min(100, item.progress_percent))}%`;
      track.append(fill);
      progress.append(label, track);
      article.append(info, progress);
      return article;
    }));
  }

  function renderTemplates(templates) {
    templateList.replaceChildren(...templates.slice(0, 3).map((template) => {
      const item = document.createElement('a');
      item.className = 'template-item';
      item.href = `experiment.html?template_id=${encodeURIComponent(template.id)}`;
      item.setAttribute('aria-label', `Start ${template.title}`);
      const icon = document.createElement('span');
      icon.innerHTML = '<i data-lucide="sparkles"></i>';
      const copy = document.createElement('div');
      const title = document.createElement('b');
      title.textContent = template.title;
      const desc = document.createElement('small');
      desc.textContent = template.description;
      copy.append(title, desc);
      item.append(icon, copy);
      return item;
    }));
    if (window.lucide) window.lucide.createIcons();
  }

  async function init() {
    try {
      const userData = await getJson('auth/me.php');
      const user = userData.user;
      if (user.is_demo) document.querySelector('[data-demo-tools]').hidden = false;
      csrf = userData.csrf_token || '';
      sessionStorage.setItem('youlab_csrf', csrf);
      if (!user.onboarding_complete) { window.location.replace('onboarding.html'); return; }
      name.textContent = user.name.split(' ')[0];
      initials.textContent = user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
      const [experiments, templates] = await Promise.all([
        getJson('experiments/list.php'),
        getJson('experiments/templates.php'),
      ]);
      renderExperiments(experiments.experiments);
      if (user.is_demo) {
        const demoButton = document.querySelector('[data-fast-forward]');
        demoButton.addEventListener('click', async () => {
          demoButton.disabled = true; demoButton.textContent = 'Adding a sample day…';
          try {
            const response = await fetch(api('demo/fast_forward.php'), { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: '{}' });
            const result = await response.json();
            if (!response.ok || !result.ok) throw new Error(result?.error?.message || 'Could not update the demo.');
            if (result.data.status === 'completed') await getJson(`analysis/calculate.php?experiment_id=${encodeURIComponent(result.data.experiment_id)}`);
            showError(result.data.status === 'completed' ? 'Demo experiment complete. Open it to see the results.' : `Demo advanced to day ${result.data.day_number}.`);
            const refreshed = await getJson('experiments/list.php');
            renderExperiments(refreshed.experiments);
            if (result.data.status === 'completed') {
              const row = refreshed.experiments.find((item) => Number(item.id) === Number(result.data.experiment_id));
              if (row) showError(`“${row.title}” is complete. Open it to see your results.`);
            }
            demoButton.disabled = false; demoButton.textContent = 'Complete next sample day';
          } catch (error) { showError(error.message || 'Could not update the demo.'); demoButton.disabled = false; demoButton.textContent = 'Complete next sample day'; }
        });
      }
      renderTemplates(templates.templates);
      if (!experiments.experiments.length) list.setAttribute('aria-label', 'No experiments yet');
      if (window.lucide) window.lucide.createIcons();
    } catch (error) {
      if (error.message !== 'Please sign in to continue.') showError(error.message || 'We could not load your workspace.');
    }
  }

  document.querySelector('[data-logout]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await fetch(api('auth/logout.php'), { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': csrf || sessionStorage.getItem('youlab_csrf') || '' } });
    } finally {
      sessionStorage.removeItem('youlab_csrf');
      window.location.assign('login.html');
    }
  });

  init();
})();
