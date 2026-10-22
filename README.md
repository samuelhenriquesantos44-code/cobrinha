# 🐍 Cobrinha

Jogo de navegador em HTML, CSS e JavaScript. Versão atual: **1.6.0**.

[Jogar online](https://samuelhenriquesantos44-code.github.io/cobrinha/) · [Código e histórico](https://github.com/samuelhenriquesantos44-code/cobrinha)

## Jogar e desenvolver

Com Node.js 18 ou superior instalado, execute:

```sh
npm start
```

Abra http://127.0.0.1:8080. Não precisa instalar dependências.
Também é possível abrir `index.html` diretamente no navegador.

- Setas, WASD ou botões na tela: mover.
- Espaço, Esc ou botão Pausar: pausar/continuar.
- As bordas levam ao lado oposto. Bater no corpo encerra a partida.
- Complete as 400 casas para vencer.
- Três ritmos de jogo e recorde local separado por nível.
- Trocar de aba ou janela pausa a partida. Continue manualmente ao voltar.

## Verificar

```sh
npm test
```

Os testes verificam comida, crescimento, pontuação, bordas, colisões, cauda, vitória,
pausa, navegação da interface, teclado e persistência dos recordes.

## Organização

- `js/engine.js`: estado e regras, sem dependência do navegador.
- `js/renderer.js`: desenho do canvas e efeitos visuais.
- `js/game.js`: controles, telas, relógio e recordes.
- `css/style.css`: layout adaptável a celular.
- `tests/`: testes das regras.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie a branch `main`.
2. Em Settings → Pages → Build and deployment, escolha **GitHub Actions**.
3. Execute o workflow “Testar e publicar Cobrinha” ou envie um novo commit.
4. O workflow testa o jogo e publica apenas `index.html`, `css/` e `js/`.

Neste repositório, a publicação por GitHub Actions já está configurada.
Cada envio para `main` executa os testes e publica a versão aprovada.
O endereço público também aparece no resultado do job de publicação.

## Próximas melhorias

- Modo com paredes.
- Sons opcionais.
- Controles por gesto e testes em aparelhos reais.
- Ranking compartilhado, se desejado (exige serviço e validação de pontuações).
