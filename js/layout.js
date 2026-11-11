const GameLayout = (() => {
  const $ = id => document.getElementById(id);
  const key = 'cobrinha:hide-arrows:v1';
  let hideArrows = false, active = false;
  try { hideArrows = localStorage.getItem(key)==='true'; } catch {}
  function render() {
    $('hideArrows').checked = hideArrows;
    $('controls').hidden = !active || hideArrows;
    $('gameArea').dataset.arrows = hideArrows ? 'hidden' : 'visible';
    $('toggleControls').textContent = hideArrows ? 'Mostrar setas' : 'Ocultar setas';
    $('toggleControls').setAttribute('aria-expanded',String(!hideArrows));
    $('toggleControls').disabled = !active;
    $('gameHint').textContent = hideArrows ? 'Deslize no tabuleiro para virar.' : 'Deslize no tabuleiro ou toque nas setas.';
  }
  function change(value) {
    hideArrows=value;
    try { localStorage.setItem(key,String(value)); } catch {}
    render();
  }
  $('hideArrows').addEventListener('change',event=>change(event.target.checked));
  $('toggleControls').addEventListener('click',()=>change(!hideArrows));
  render();
  return {setActive(value) { active=value; render(); }};
})();
