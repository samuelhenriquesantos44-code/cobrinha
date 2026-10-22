(() => {
  const dialog = document.getElementById('welcomeDialog');
  const openButton = document.getElementById('openWelcome');
  const scroller = dialog.querySelector('.welcome-scroll');
  const tabs = [document.getElementById('aboutTab'), document.getElementById('updatesTab')];
  let returnFocus = document.getElementById('nickname');
  function selectTab(selected) {
    for (const tab of tabs) {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    }
    scroller.scrollTop = 0;
  }
  for (const tab of tabs) {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[1] : tabs[1 - tabs.indexOf(tab)];
      selectTab(next);
      next.focus();
    });
  }
  document.getElementById('viewUpdates').addEventListener('click', () => { selectTab(tabs[1]); tabs[1].focus(); });
  function openWelcome() {
    if (dialog.open) return;
    returnFocus = document.activeElement === openButton ? openButton : document.getElementById('nickname');
    selectTab(tabs[0]);
    dialog.showModal();
    document.body.classList.add('welcome-open');
    document.getElementById('welcomeTitle').focus({preventScroll:true});
  }
  openButton.addEventListener('click', openWelcome);
  document.getElementById('closeWelcome').addEventListener('click', () => dialog.close());
  document.getElementById('enterGame').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.classList.remove('welcome-open');
    returnFocus.focus({preventScroll:true});
  });
  openWelcome();
})();
