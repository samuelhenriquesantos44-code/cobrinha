/* Identidade sem login: token aleatório mantido apenas neste navegador. */
const RankingClient = (() => {
  const API = "https://cobrinha-ranking-samuel44.jauntyanole17.chatgpt.site";
  const $ = id => document.getElementById(id);
  const profileKey = 'cobrinha:player:v1';
  const pendingKey = 'cobrinha:pending-score:v2';
  const labels = {easy:'Tranquilo',normal:'Clássico',hard:'Acelerado'};
  const moveCode = {LEFT:'L',RIGHT:'R',UP:'U',DOWN:'D'};
  let currentProfile;
  let publicId;
  let pending = [];
  let loading = 0;
  let saving = false;
  let latestRound;
  try { currentProfile = JSON.parse(localStorage.getItem(profileKey)); } catch {}
  if (!currentProfile || !/^[a-f0-9-]{36}$/.test(currentProfile.token)) currentProfile = {nickname:'',token:crypto.randomUUID()};
  $('nickname').value = currentProfile.nickname || '';
  try { const saved = JSON.parse(localStorage.getItem(pendingKey)); if (Array.isArray(saved)) pending = saved; } catch {}
  // Não usa HTML vindo de apelidos; todos os nomes são escritos como texto.
  function remember(key, value) { try { localStorage.setItem(key,JSON.stringify(value)); } catch {} }
  function clearPending(id) { pending = pending.filter(item => item.runId !== id); remember(pendingKey,pending); }
  async function request(path, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(API+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:controller.signal});
      const data = await response.json();
      if (!response.ok) { const error = Error(data.error || 'Não foi possível acessar o ranking.'); error.status = response.status; throw error; }
      return data;
    } finally { clearTimeout(timer); }
  }
  async function identify() {
    const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(currentProfile.token)));
    publicId = Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('').slice(0,16);
  }
  function profile(value) {
    const nickname = value.trim().normalize('NFC').replace(/ +/g,' ');
    if (!/^[\p{L}\p{N}_ -]{3,20}$/u.test(nickname)) throw Error('Use de 3 a 20 letras, números, espaços, _ ou - no apelido.');
    currentProfile.nickname = nickname;
    remember(profileKey,currentProfile);
    $('nickname').value = nickname;
    return {...currentProfile};
  }
  async function refresh() {
    const version = ++loading;
    const difficulty = $('difficulty').value;
    $('rankingLevel').textContent = labels[difficulty];
    $('rankingStatus').textContent = 'Carregando ranking…';
    $('rankingList').replaceChildren();
    $('personalRank').textContent = '';
    try {
      if (!publicId) await identify();
      const data = await request(`/ranking?difficulty=${difficulty}&player=${publicId}`);
      if (version !== loading) return;
      $('rankingStatus').textContent = data.entries.length ? 'Melhor pontuação de cada jogador' : 'O ranking está começando. Faça o primeiro ponto!';
      for (const entry of data.entries) {
        const row = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = entry.nickname + (entry.id === publicId ? ' (você)' : '');
        const points = document.createElement('strong');
        points.textContent = `${entry.score} pts`;
        if (entry.id === publicId) row.classList.add('mine');
        row.append(name,points);
        $('rankingList').append(row);
      }
      $('personalRank').textContent = data.personal ? `Sua posição: ${data.personal.position}º · ${data.personal.score} pontos` : 'Seu melhor resultado aparece aqui após uma partida com pontos.';
    } catch {
      if (version === loading) $('rankingStatus').textContent = 'Ranking sem conexão. Você pode jogar e manter seu recorde neste aparelho.';
    }
  }
  async function startRound(difficulty) {
    try { return await request('/sessions',{difficulty}); }
    catch { return null; }
  }
  async function retry() {
    if (!pending.length || saving) return;
    saving = true;
    const attempt = pending[0];
    const roundId = attempt.runId;
    const message = text => { if (latestRound === roundId || !latestRound) $('saveStatus').textContent = text; };
    message('Salvando resultado no ranking…');
    $('retryScore').hidden = true;
    try {
      await request('/scores',attempt);
      clearPending(roundId);
      message('Resultado salvo no ranking online!');
      await refresh();
    } catch(error) {
      if (error.status && error.status < 500 && error.status !== 429) {
        clearPending(roundId);
        message(error.status === 409 ? 'Resultado já enviado ou partida expirada. Seu recorde continua neste aparelho.' : error.message);
      } else {
        message('Não foi possível salvar online. Seu recorde local foi mantido; tente novamente.');
        $('retryScore').hidden = false;
      }
    } finally { saving = false; }
    if (pending.length && pending[0].runId !== roundId) retry();
  }
  function finish(context, score) {
    latestRound = context.round?.id || 'offline';
    if (!score) { $('saveStatus').textContent = 'Faça pelo menos 1 ponto para entrar no ranking.'; return; }
    if (!context.round) { $('saveStatus').textContent = 'Partida offline: recorde salvo apenas neste aparelho.'; return; }
    if (context.moves.length > 24000) { $('saveStatus').textContent = 'Partida longa demais para o ranking. Recorde salvo neste aparelho.'; return; }
    pending.push({runId:context.round.id,playerToken:context.profile.token,nickname:context.profile.nickname,moves:context.moves.map(move=>moveCode[move]).join('')});
    remember(pendingKey,pending);
    retry();
  }
  $('refreshRanking').addEventListener('click',refresh);
  $('difficulty').addEventListener('change',refresh);
  $('retryScore').addEventListener('click',retry);
  $('back').addEventListener('click',refresh);
  window.addEventListener('online',() => { refresh(); retry(); });
  refresh();
  if (pending.length) retry();
  return {profile,startRound,finish,refresh,begin:round => { latestRound = round?.id || 'offline'; }};
})();
