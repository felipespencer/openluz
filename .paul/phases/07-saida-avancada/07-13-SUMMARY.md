---
phase: 07-saida-avancada
plan: 13
subsystem: saida-avancada
tags: [poligono, slice, triangulacao, resolume]

requires:
  - phase: 07-saida-avancada
    provides: medidas e proposta do polígono (07-12); gestos, máscara com caixa e giro, É chave, fontes (07-04 a 07-09)
provides:
  - slice polígono (tipo `poly`): pontos de entrada e de saída independentes, imagem esticada por triângulos
  - "+" › Polígono (triângulo), Transformar e Editar pontos nas duas abas, painel, botão direito, duplicar, preset
  - `triangulate` e `tessellatePoly` em warp.js
  - tools/ao-poligono-check.mjs (28 verificações, com pixels da composição e da tela)
affects: [07-14 lápis e pontos, 14 Saída 3D]

key-files:
  created: [tools/ao-poligono-check.mjs]
  modified: [app/screens.js, app/warp.js, app/engine.js, app/ao.js, app/style.css]

key-decisions:
  - "No polígono, `pts` e `rot` respondem pela aba que o editor informa (M.setPolyTab): o editor trata o polígono com o mesmo código da máscara; o motor usa inPts e outPts"
  - "Mesmo shader e mesmo laço dos slices: o polígono leva a composição inteira como recorte e os pontos de entrada nos vértices"
  - "Construído antes da resposta do Felipe à pergunta de ordem do 07-12, pelo 'tudo' da lista e o 'não pare'"

duration: 2026-11-16
started: 2026-11-16
completed: 2026-11-16
description: "Slice polígono na Saída avançada, como o Polygon do Resolume: triângulo pelo menu, pontos de entrada e saída independentes, Transformar e Editar pontos nas duas abas"
type: Summary
about: "OpenLuz"
---

# Fase 7 Plano 13: slice polígono — Resumo

**O OpenLuz ganhou o slice polígono medido no Resolume: nasce como um triângulo da altura inteira, os pontos da entrada e
os da saída são independentes e a imagem é esticada triângulo a triângulo. Era o item "Slices em polígono" do PROJECT.md.**

## Critérios de aceite

| AC | Resultado |
|----|-----------|
| AC-1 nasce como no Resolume | Passou — (960, 0), (336,46, 1080), (1583,54, 1080), igual na entrada e na saída; imagem dentro, preto fora |
| AC-2 entrada e saída independentes, imagem esticada | Passou — o centro do polígono de saída mostra a cor do centro do polígono de entrada, antes e depois de mover pontos de um lado e do outro |
| AC-3 editor | Passou — Editar pontos e Transformar nas duas abas, setas, anel, painel, É chave, Alt duplica, preset, apagar, Ctrl+Z |
| AC-4 nada quebra | Passou — quinze baterias da Saída avançada e de projetor, show-passada e as 30 baterias; selftest 74/75 (captura de página web, monitores desligados) |

## Não conferido

- Polígono com mais de três pontos no editor (só o triângulo nasce pelo menu; a divisão em triângulos de formas com reentrância foi conferida à parte, por área).
- Fonte diferente de Composição no polígono (o código é o mesmo do slice; não foi rodado).
- Composição salva em arquivo com polígono e reaberta (o preset, que usa o mesmo salvar e abrir das telas, foi).
- Mudar o tamanho da tela com polígono; Automape e Identificar com polígono na tela.
- A imagem num projetor de verdade.

## Desvios

- O arrasto do corpo arredonda a caixa, não cada ponto: como a base do triângulo nasce em 336,46, os pontos seguem com fração. No Resolume a caixa também nasce com fração (1247,08).

## Pendências

- 07-14: lápis (desenhar o polígono clicando) e acrescentar/apagar pontos, mantendo entrada e saída casadas.
- A pergunta de ordem do 07-12 (polígono antes ou depois do 3D) ficou respondida pela prática; o Felipe pode discordar.
