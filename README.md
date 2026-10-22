# 🐍 Cobrinha

Jogo de navegador em HTML, CSS e JavaScript. Versão atual: **1.8.0**.

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

- Setas, WASD ou botões na tela: mover.
- Espaço, Esc ou botão Pausar: pausar/continuar.
- A contagem 3, 2, 1 aparece ao iniciar, reiniciar e retomar; a cobra só anda depois dela.
- Sair da aba ou janela durante a contagem pausa o jogo.
- Bater nas paredes ou no corpo encerra a partida.
- Complete as 400 casas para vencer.
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

O serviço [Ranking Cobrinha](https://cobrinha-ranking-samuel44.jauntyanole17.chatgpt.site)
usa banco persistente D1. O servidor recebe os movimentos e recalcula a pontuação.
Apenas a melhor partida de cada identidade por dificuldade fica no ranking.
Empates são ordenados pela data em que a pontuação foi alcançada.

As regras com paredes usam recordes novos, separados da versão que atravessava
as bordas. Os recordes antigos permanecem no armazenamento do navegador.

O workflow do GitHub publica o jogo. Alterações no serviço em `ranking-service/`
precisam também ser publicadas pelo fluxo do Sites; não são implantadas pelo Pages.
O endereço da API está definido em `js/ranking.js`. Consulte o README do serviço.

## Próximas melhorias

- Sons opcionais.
- Controles por gesto e testes em aparelhos reais.
- Salas privadas e recuperação de identidade por login, se desejado.
