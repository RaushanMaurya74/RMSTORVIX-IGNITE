(() => {
  const menu = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  if (menu && sidebar) menu.addEventListener('click', () => sidebar.classList.toggle('open'));

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      themeToggle.setAttribute('aria-pressed', document.body.classList.contains('dark') ? 'true' : 'false');
    });
  }

  const search = document.getElementById('globalSearch');
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (search) search.focus();
    }
    if (event.key === 'Escape' && sidebar) sidebar.classList.remove('open');
  });

  const showDemoNotice = (task) => {
    window.alert(`${task}\n\nThis is a Phase 1 UI preview. The workflow will become functional in a later implementation phase.`);
  };
  document.getElementById('createInvoice')?.addEventListener('click', () => showDemoNotice('Create invoice'));
  document.getElementById('dateRange')?.addEventListener('click', () => showDemoNotice('Date range filter'));
  document.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', () => showDemoNotice(button.dataset.action || 'Quick action'));
  });
})();
