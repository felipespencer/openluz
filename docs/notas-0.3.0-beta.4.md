# OpenLuz 0.3.0-beta.4

Pré-release. Instale por cima da versão que você já tem: as composições e as configurações ficam.
Pre-release. Install over the version you already have: compositions and settings are kept.

## Novidades

**Projetores na janela principal**

- A coluna à direita da grade ganhou a vista **Projetores**: cada tela aparece com a imagem que sai nela de verdade
  (com slices, máscaras e emendas), na forma dela (deitada ou em pé), da esquerda para a direita como o Windows arruma os
  monitores. Clique num projetor para abrir a Saída avançada nele.
- **Composição** e **Prévia** agora ficam lado a lado e seguem a forma da composição: com a composição em pé
  (1080×1920), os dois quadros ficam em pé, como no Resolume.
- Quando todos os projetores ligados estão em pé e a composição está deitada, a imagem sai esticada (no Resolume também).
  O programa avisa, e o botão **Deixar em pé** troca a composição para 1080×1920. Dá para desfazer com Ctrl+Z.

**Consertos**

- Os seletores (Fonte do slice, Dispositivo da tela, Preset das Configurações e os outros) perdiam o foco a cada seta
  do teclado; agora dá para andar pelas opções com as setas.

## New

- **Projectors** view in the right column: each screen shows what actually goes out to it (slices, masks, soft edges),
  in its own shape, left to right as Windows arranges the displays. Click a projector to open Advanced Output on it.
- **Composition** and **Preview** monitors sit side by side and follow the composition shape (portrait compositions show
  portrait monitors, as in Resolume).
- When every active projector is portrait and the composition is landscape, a hint offers **Make portrait** (undoable).
- Fix: select boxes lost focus on every arrow key press.

## Testado / Tested

Windows 11, três monitores (um principal e dois projetores, um deles em pé), as 30 baterias de sempre e as da Saída
avançada, mais a carga com três vídeos 4K/1080p HEVC e três efeitos nas duas saídas (28,8–29,7 qps no motor).
