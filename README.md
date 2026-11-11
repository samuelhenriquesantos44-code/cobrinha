# 🐍 Cobrinha

Jogo de navegador em HTML, CSS e JavaScript. Versão atual: **1.10.1**.

[Jogar online](https://samuelhenriquesantos44-code.github.io/cobrinha/) · [Código e histórico](https://github.com/samuelhenriquesantos44-code/cobrinha)

Ao abrir, o jogo mostra os créditos de Samuel Henrique, o canal para sugestões e
relatos de bugs e as notas da versão. O botão “Sobre o jogo e notas da versão”
permite consultar essas informações novamente no menu.

## Jogar e desenvolver

Com Node.js 22 ou superior instalado, execute:

```sh
npm start
```

Abra http://127.0.0.1:8080. Não precisa instalar dependências.
Também é possível abrir `index.html` diretamente no navegador.

- Setas, WASD, botões na tela ou deslize no tabuleiro: mover.
- Cada deslize muda uma direção. Curvas rápidas são guardadas em sequência, com até duas direções pendentes.
- As setas respondem ao encostar, e você pode preparar a direção durante a contagem.
- Espaço, Esc ou botão Pausar: pausar/continuar.
- A contagem 3, 2, 1 aparece ao iniciar, reiniciar e retomar; a cobra só anda depois dela.
- Sair da aba ou janela durante a contagem pausa o jogo.
- Bater nas paredes ou no corpo encerra a partida.
- Complete as 400 casas para vencer.
- No celular, o menu e o botão “Ocultar setas” permitem priorizar o deslize e ampliar o tabuleiro. A preferência é lembrada.
- Em “Minha cobrinha”, acompanhe quatro conquistas e escolha as cores desbloqueadas. Faça 10 pontos (azul), 25 pontos (violeta), termine 5 partidas superando seu recorde local (dourada) ou 10 partidas com pontos (coral).
- Conquistas são salvas neste navegador. Recordes anteriores contam para as metas de pontos; partidas antigas não são contadas retroativamente. Reiniciar ou sair antes do fim não soma partidas nem recordes superados.
- Sons curtos e vibração opcional no menu, com preferências salvas. O som também pode ser desligado durante a partida. Vibração depende do suporte do aparelho/navegador.
- Novo recorde pessoal do aparelho recebe destaque visual uma vez por partida.
- Ao terminar, veja a posição do seu melhor resultado online e a meta para ultrapassar o próximo rival, inclusive fora do Top 10.
- Três ritmos de jogo, recorde local por nível e ranking online por dificuldade.
- Escolha um apelido de 3 a 20 caracteres. Complete uma partida com pelo menos 1 ponto para aparecer no ranking.
- O apelido e os pontos são públicos. Apelidos não são exclusivos; cada aparelho mantém sua própria identidade aleatória, sem login.
- A mesma identidade é lembrada neste navegador; limpar os dados ou mudar de aparelho cria outra.
- Partidas iniciadas sem conexão não entram no ranking. Falhas no envio de partidas conectadas podem ser tentadas novamente por até 2 horas.
- Trocar de aba ou janela pausa a partida. Continue manualmente ao voltar.

## Verificar

```sh
npm test
```

Os testes verificam comida, crescimento, pontuação, bordas, colisões, cauda, vitória,
pausa, navegação da interface, teclado, persistência, reenvio e validação das partidas no ranking.

## Organização

- `js/engine.js`: estado e regras, sem dependência do navegador.
- `js/renderer.js`: desenho do canvas e efeitos visuais.
- `js/feedback.js`: sons sintetizados, vibração opcional e preferências locais.
- `js/progression.js`: metas e regras das conquistas locais.
- `js/customization.js`: cores, conquistas e persistência do progresso.
- `js/layout.js`: preferência de controles e espaço de jogo.
- `js/game.js`: controles, telas, relógio e recordes.
- `css/style.css`: layout adaptável a celular.
- `js/ranking.js`: identidade local, top 10, posição pessoal e envio das partidas.
- `ranking-service/`: Worker ESM e migrações D1 publicados pelo Sites.
- `tests/`: regras, interface, identidade e API do ranking com banco SQLite temporário.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie a branch `main`.
2. Em Settings → Pages → Build and deployment, escolha **GitHub Actions**.
3. Execute o workflow “Testar e publicar Cobrinha” ou envie um novo commit.
4. O workflow testa o jogo e publica apenas `index.html`, `css/` e `js/`.

Neste repositório, a publicação por GitHub Actions já está configurada.
Cada envio para `main` executa os testes e publica a versão aprovada.
O endereço público também aparece no resultado do job de publicação.

## Ranking online

O serviço [Ranking Cobrinha](https://cobrinha-ranking-samuel44.samfrs19.chatgpt.site)
usa banco persistente D1. O servidor recebe os movimentos e recalcula a pontuação.
Apenas a melhor partida de cada identidade por dificuldade fica no ranking.
Empates são ordenados pela data em que a pontuação foi alcançada.

As regras com paredes usam recordes novos, separados da versão que atravessava
as bordas. Os recordes antigos permanecem no armazenamento do navegador.

O workflow do GitHub publica o jogo. Alterações no serviço em `ranking-service/`
precisam também ser publicadas pelo fluxo do Sites; não são implantadas pelo Pages.
O endereço da API está definido em `js/ranking.js`. Consulte o README do serviço.

## Próximas melhorias

- Mais opções visuais e desafios diários.
- Mais testes em aparelhos reais.
- Compartilhamento do resultado com amigos.
