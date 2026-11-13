(() => {
  const toggle = document.querySelector('.nav-toggle');
  const panel = document.querySelector('#primaryNav');
  if (window.lucide) window.lucide.createIcons();

  toggle?.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
    panel?.classList.toggle('is-open', !isOpen);
  });
  panel?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    panel.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', 'Open navigation');
  }));
  document.querySelectorAll('[data-dialog]').forEach((button) => button.addEventListener('click', (event) => {
    const dialog = document.getElementById(button.dataset.dialog);
    if (dialog && typeof dialog.showModal === 'function') { event.preventDefault(); dialog.showModal(); }
  }));
  document.querySelectorAll('[data-close-dialog]').forEach((element) => element.addEventListener('click', () => element.closest('dialog')?.close()));
  document.querySelectorAll('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); }));
})();
