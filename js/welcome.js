(() => {
  const dialog = document.getElementById('welcomeDialog');
  const openButton = document.getElementById('openWelcome');
  let returnFocus = document.getElementById('nickname');
  function openWelcome() {
    if (dialog.open) return;
    returnFocus = document.activeElement === openButton ? openButton : document.getElementById('nickname');
    dialog.showModal();
    dialog.scrollTop = 0;
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
