# OpenLuz 0.3.0-beta.3 — rascunho das notas

> Rascunho. A versão ainda não foi gerada nem publicada; o número pode mudar. Escrito em 2026-11-16 a partir do que está
> no branch `efeitos-resolume` depois da 0.3.0-beta.2.

## Novidades

**Saída avançada mais perto do Resolume**

- Gestos do modo Transformar: Shift prende o eixo e mantém a proporção, Alt duplica e redimensiona pelo centro, Ctrl
  deixa livre, o anel do canto gira, a roda do mouse dá zoom, e tudo anda em pixels inteiros.
- No modo Editar pontos, Ctrl+clique escolhe vários pontos e as setas movem todos.
- Painel da máscara com posição, tamanho e giro; lista de zoom completa (10% a 300%).
- Menu de presets com Salvar, Salvar como…, Apagar, Renomear…, Novo, Mostrar na pasta e Abrir….
- Slice com "É chave" e "Fundo preto" (Is Key e Black BG).
- Novas fontes para o slice: camada selecionada, grupo selecionado, Bus A e Bus B; e as opções de seguir ou não a
  opacidade e o bypass/solo da camada.
- Imagem de guia por tela (uma foto ou planta por cima do palco) e "Mostrar na saída" no menu da grade.

**Para quem abre pela primeira vez**

- A grade vazia diz o que fazer, e o programa avisa que falta clicar na miniatura para pôr o clipe no ar.

## Consertos

- Cliques na grade não se perdem mais quando o Autopilot troca de clipe (antes, com Autopilot rápido, metade dos
  cliques não entrava).
- O seletor de monitor da lista Telas não fecha mais sozinho.
- Saída › Automático com a saída aberta reabre no mesmo projetor (antes a saída fechava).
- Desligar uma tela na Saída avançada fecha a saída dela (antes ela continuava projetando).
- Com a saída aberta, o Windows não apaga mais a tela por inatividade.
- O programa percebe quando um projetor é ligado ou tirado com ele aberto.

## Muda para quem já usa

- **A máscara de saída nova nasce com Inverter ligado**, como no Resolume: tudo fica preto menos a forma. Para tapar só
  a forma, desligue Inverter. As máscaras já salvas não mudam.

## Ainda não conferido em equipamento

- O aviso de projetor ligado com o programa aberto (falta tirar e pôr o cabo).
- Os gestos novos na mão de quem usa o Resolume todo dia.
- APC40 e laser seguem sem prova no aparelho.

---

# OpenLuz 0.3.0-beta.3 — release notes (draft)

> Draft. Not built or published yet.

## New

**Advanced Output closer to Resolume**

- Transform gestures: Shift constrains the axis and keeps proportions, Alt duplicates and resizes from the centre, Ctrl
  moves freely, the corner ring rotates, the mouse wheel zooms, and everything moves in whole pixels.
- In Edit Points mode, Ctrl+click selects several points and the arrow keys move them together.
- Mask panel with position, size and rotation; full zoom list (10% to 300%).
- Presets menu with Save, Save as…, Remove, Rename…, New, Show in folder and Load….
- Slice options "É chave" (Is Key) and "Fundo preto" (Black BG).
- New slice sources: selected layer, selected group, Bus A and Bus B; and whether to follow the layer's opacity and
  bypass/solo.
- A guide image per screen and "Show in output" in the grid menu.

**First run**

- The empty grid tells you what to do, and the app points out that a clip only goes live when you click its thumbnail.

## Fixes

- Grid clicks are no longer lost while Autopilot is switching clips.
- The monitor selector in the Screens list no longer closes by itself.
- Output › Automatic with the output open now reopens on the same projector.
- Disabling a screen in the Advanced Output closes its output window.
- With an output open, Windows no longer turns the display off for inactivity.
- The app notices when a projector is plugged in or removed while it is open.

## Changes for existing users

- **A new output mask starts with Invert on**, like Resolume: everything is black except the shape. Turn Invert off to
  cover only the shape. Saved masks are unchanged.
