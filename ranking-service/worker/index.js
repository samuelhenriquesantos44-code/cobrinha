const Engine = globalThis.SnakeEngine;
const SPEEDS = { easy:150, normal:110, hard:75 };
const DIRECTIONS = { L:'LEFT', R:'RIGHT', U:'UP', D:'DOWN' };
const GAME_URL = 'https://samuelhenriquesantos44-code.github.io/cobrinha/';
const EXPIRES = 2 * 60 * 60 * 1000;
const MAX_MOVES = 24000;
const nicknamePattern = /^[\p{L}\p{N}_ -]{3,20}$/u;
const origins = new Set(['https://samuelhenriquesantos44-code.github.io','http://127.0.0.1:8080','http://localhost:8080']);
const ranked = `SELECT substr(player_id,1,16) AS id, nickname, score,
 ROW_NUMBER() OVER (ORDER BY score DESC, achieved_at ASC, player_id ASC) AS position
 FROM scores WHERE difficulty=?`;

export async function hash(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))), b=>b.toString(16).padStart(2,'0')).join('');
}
export function verifyReplay(run, moves, now = Date.now()) {
  if (typeof moves !== 'string' || !/^[LRUD]+$/.test(moves) || moves.length > MAX_MOVES) throw Error('Movimentos inválidos.');
  if (now - run.created_at > EXPIRES) throw Error('A partida expirou. Seu recorde permanece neste aparelho.');
  if (now - run.created_at + 500 < moves.length * SPEEDS[run.difficulty] * 0.9) throw Error('Duração incompatível com a partida.');
  const random = Engine.seededRandom(run.seed);
  const game = Engine.createGame(random);
  for (const move of moves) {
    if (game.status !== 'running') throw Error('Movimentos depois do fim de jogo.');
    Engine.turn(game, DIRECTIONS[move]);
    Engine.step(game, random);
  }
  if (!['won','lost'].includes(game.status) || game.score < 1) throw Error('Finalize uma partida com pelo menos 1 ponto.');
  return game.score;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const allowed = !origin || origins.has(origin) || origin === url.origin;
    const headers = { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'Vary':'Origin', 'X-Content-Type-Options':'nosniff' };
    if (allowed && origin) headers['Access-Control-Allow-Origin'] = origin;
    const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers});
    if (!allowed) return json({error:'Origem não permitida.'},403);
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'3600'}});
    if (url.pathname === '/' && request.method === 'GET') return new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ranking Cobrinha</title><body style="background:#020617;color:#e2e8f0;font:18px system-ui;padding:40px"><h1>🐍 Ranking Cobrinha</h1><p>Recordes compartilhados entre amigos, separados por dificuldade.</p><a style="color:#4ade80" href="${GAME_URL}">Jogar e ver o ranking</a></body></html>`,{headers:{'Content-Type':'text/html; charset=utf-8'}});
    if (url.pathname === '/health' && request.method === 'GET') {
      try { await env.DB.prepare('SELECT 1 AS ok FROM scores LIMIT 1').first(); return json({ok:true,rules:'walls-v2'}); }
      catch { return json({error:'Banco indisponível.'},503); }
    }
    try {
      if (url.pathname === '/ranking' && request.method === 'GET') {
        const level = url.searchParams.get('difficulty');
        if (!Object.hasOwn(SPEEDS,level)) return json({error:'Dificuldade inválida.'},400);
        const personal = url.searchParams.get('player') || '';
        const [top, me] = await Promise.all([
          env.DB.prepare(`SELECT * FROM (${ranked}) LIMIT 10`).bind(level).all(),
          /^[a-f0-9]{16}$/.test(personal) ? env.DB.prepare(`SELECT * FROM (${ranked}) WHERE id=?`).bind(level,personal).first() : null
        ]);
        return json({entries:top.results,personal:me});
      }
      if (request.method !== 'POST' || !['/sessions','/scores'].includes(url.pathname)) return json({error:'Rota não encontrada.'},404);
      if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({error:'Envie JSON.'},415);
      if (Number(request.headers.get('Content-Length')) > 30000) return json({error:'Partida muito longa.'},413);
      const raw = await request.text();
      if (raw.length > 30000) return json({error:'Partida muito longa.'},413);
      let body;
      try { body = JSON.parse(raw); } catch { return json({error:'JSON inválido.'},400); }
      if (!body || typeof body !== 'object') return json({error:'Dados inválidos.'},400);
      const now = Date.now();
      if (url.pathname === '/sessions') {
        if (!Object.hasOwn(SPEEDS,body.difficulty)) return json({error:'Dificuldade inválida.'},400);
        const ipHash = await hash(request.headers.get('CF-Connecting-IP') || 'unknown');
        const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM runs WHERE ip_hash=? AND created_at>?').bind(ipHash,now-60000).first();
        if (count.total >= 20) return json({error:'Muitas partidas. Aguarde um minuto.'},429);
        const id = crypto.randomUUID();
        const seed = crypto.getRandomValues(new Uint32Array(1))[0];
        await env.DB.batch([
          env.DB.prepare('DELETE FROM runs WHERE created_at<?').bind(now-EXPIRES),
          env.DB.prepare('INSERT INTO runs(id,seed,difficulty,created_at,ip_hash) VALUES(?,?,?,?,?)').bind(id,seed,body.difficulty,now,ipHash)
        ]);
        return json({id,seed,rules:'walls-v2'},201);
      }
      const nickname = typeof body.nickname === 'string' ? body.nickname.trim().normalize('NFC').replace(/ +/g,' ') : '';
      if (!nicknamePattern.test(nickname) || typeof body.playerToken !== 'string' || !/^[a-f0-9-]{36}$/.test(body.playerToken) || typeof body.runId !== 'string' || !/^[a-f0-9-]{36}$/.test(body.runId)) return json({error:'Apelido ou jogador inválido.'},400);
      const run = await env.DB.prepare('SELECT * FROM runs WHERE id=?').bind(body.runId).first();
      if (!run || run.used) return json({error:'Partida expirada ou já enviada.'},409);
      let score;
      try { score = verifyReplay(run,body.moves,now); } catch(error) { return json({error:error.message},400); }
      const playerId = await hash(body.playerToken);
      const saved = await env.DB.batch([
        env.DB.prepare(`INSERT INTO scores(player_id,difficulty,nickname,score,achieved_at)
          SELECT ?,?,?,?,? FROM runs WHERE id=? AND used=0
          ON CONFLICT(player_id,difficulty) DO UPDATE SET nickname=excluded.nickname,
          achieved_at=CASE WHEN excluded.score>scores.score THEN excluded.achieved_at ELSE scores.achieved_at END,
          score=MAX(scores.score,excluded.score)`).bind(playerId,run.difficulty,nickname,score,now,run.id),
        env.DB.prepare('UPDATE runs SET used=1 WHERE id=? AND used=0').bind(run.id)
      ]);
      if (!saved[0].meta.changes) return json({error:'Partida já enviada.'},409);
      return json({saved:true,score,playerId:playerId.slice(0,16)});
    } catch { return json({error:'Ranking indisponível. Tente novamente em instantes.'},503); }
  }
};
