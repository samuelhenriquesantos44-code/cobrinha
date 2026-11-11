/* Efeitos curtos, sem arquivos de áudio ou dependências. */
const GameFeedback = (() => {
  const $ = id => document.getElementById(id);
  const key = 'cobrinha:feedback:v1';
  let settings = {sound:true,vibration:false}, audio;
  const active = new Set();
  try { const saved = JSON.parse(localStorage.getItem(key));
    for (const name of ['sound','vibration']) if (typeof saved?.[name] === 'boolean') settings[name] = saved[name];
  } catch {}
  const canVibrate = typeof navigator.vibrate === 'function';
  const canSound = !!(window.AudioContext || window.webkitAudioContext);
  function sync() {
    $('soundToggle').checked = settings.sound;
    $('vibrationToggle').checked = settings.vibration;
    $('soundToggle').disabled = !canSound;
    $('vibrationToggle').disabled = !canVibrate;
    $('feedbackHint').textContent = !canVibrate ? 'Vibração indisponível neste navegador.' : 'Vibração depende do aparelho e do navegador.';
    $('muteSound').textContent = settings.sound ? 'Som ligado' : 'Som desligado';
    $('muteSound').setAttribute('aria-pressed', String(settings.sound));
    $('muteSound').disabled = !canSound;
  }
  function unlock() {
    if (!settings.sound || !canSound) return;
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume()?.catch(()=>{}); } catch {}
  }
  function stop() {
    for (const oscillator of active) { try { oscillator.stop(); } catch {} }
    active.clear();
    try { if (canVibrate) navigator.vibrate(0); } catch {}
  }
  function change(name,value) {
    settings[name] = value;
    try { localStorage.setItem(key,JSON.stringify(settings)); } catch {}
    stop(); sync(); unlock();
  }
  function play(kind) {
    const notes = {eat:[660],record:[523,659,784,1047],lost:[220,147],won:[523,659,784,1047]}[kind] || [];
    if (settings.sound && audio?.state === 'running') {
      try { notes.forEach((frequency,index) => {
        const oscillator = audio.createOscillator(), gain = audio.createGain();
        const start = audio.currentTime + index * .09;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0,start);
        gain.gain.linearRampToValueAtTime(.045,start+.01);
        gain.gain.exponentialRampToValueAtTime(.001,start+.085);
        oscillator.connect(gain); gain.connect(audio.destination); active.add(oscillator);
        oscillator.onended = () => { active.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(start); oscillator.stop(start+.09);
      }); } catch {}
    }
    try { if (settings.vibration && canVibrate) navigator.vibrate(kind === 'eat' ? 15 : kind === 'lost' ? [60,40,60] : [25,40,25]); } catch {}
  }
  $('soundToggle').addEventListener('change',event=>change('sound',event.target.checked));
  $('vibrationToggle').addEventListener('change',event=>change('vibration',event.target.checked));
  $('muteSound').addEventListener('click',()=>change('sound',!settings.sound));
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) stop(); });
  window.addEventListener('blur',stop);
  sync();
  return {unlock,stop,play};
})();
