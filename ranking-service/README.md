# Serviço do ranking Cobrinha

Worker ESM com banco D1, publicado pelo Sites. O jogo continua no GitHub Pages.

- `POST /sessions`: inicia uma partida com dificuldade e semente aleatória.
- `POST /scores`: recebe identidade aleatória do aparelho, apelido e movimentos; recalcula os pontos com as regras do jogo.
- `GET /ranking?difficulty=normal&player=<id público>`: top 10, posição pessoal e rival imediatamente acima (inclusive fora do top 10).
- `GET /health`: verifica o banco.

As tabelas são criadas pela migração SQL em `drizzle/`, aplicada na publicação.
O Worker não altera o esquema durante requisições. A migração inicial e seu diário
ficam versionados; alterações posteriores devem criar novas migrações.

`worker/engine.js` é uma cópia de `../js/engine.js`, verificada nos testes.
Para empacotar no checkout do Sites: `node scripts/build.mjs`, seguido de
`node scripts/validate-artifact.mjs` e do helper de publicação do Sites.
O manifesto `.openai/hosting.json` contém a identidade do serviço e o binding DB.

A identidade não é uma conta: depende do token aleatório salvo no navegador.
O apelido não é exclusivo, e limpar o armazenamento ou usar outro aparelho cria
outra identidade. O ranking publica apenas apelido, pontos, posição e ID público.
Não é um sistema antifraude para prêmios: a validação de replay impede enviar
uma pontuação arbitrária, mas não impede automação ou múltiplas identidades.
As sessões expiram após 2 horas; o limite é 24 mil movimentos por partida.

## Reinício de 11/11/2026

A migração `0001_restart_rankings` arquiva as tabelas anteriores como
`scores_archive_20261111` e `runs_archive_20261111` e cria tabelas atuais vazias.
Os três ritmos começam do zero. Sessões anteriores deixam de ser aceitas para
que resultados pendentes não reponham pontuações antigas no novo ranking.
Os arquivos não são expostos pela API pública. Recordes e conquistas locais
permanecem nos aparelhos. O diário aplica o reinício uma única vez; republicar
o serviço não deve reiniciar o ranking novamente.
