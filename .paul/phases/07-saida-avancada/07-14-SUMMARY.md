---
phase: 07-saida-avancada
plan: 14
subsystem: saida-avancada
tags: [poligono, lapis, pontos, duplo-clique]

requires:
  - phase: 07-saida-avancada
    provides: slice polígono (07-13)
provides:
  - lápis do polígono no menu "+": clicar ponto a ponto na aba de entrada, duplo clique fecha, Esc cancela
  - acrescentar (duplo clique na linha) e apagar (duplo clique no ponto) pontos do polígono, nas duas formas ao mesmo tempo
  - duplo clique que fecha qualquer desenho em curso contado no apertar do botão (vale também para a máscara desenhada)
  - ao-poligono-check com 41 verificações
affects: [14 Saída 3D]

key-files:
  created: []
  modified: [app/ao.js, tools/ao-poligono-check.mjs]

key-decisions:
  - "Acrescentar e apagar pontos do jeito da máscara do OpenLuz (duplo clique): o do Resolume não foi medido"
  - "Na outra forma, o ponto novo nasce no meio do lado correspondente"

duration: 2026-11-16
started: 2026-11-16
completed: 2026-11-16
description: "Polígono desenhado com o lápis e com pontos que se acrescentam e apagam, entrada e saída sempre casadas"
type: Summary
about: "OpenLuz"
---

# Fase 7 Plano 14: lápis e pontos do polígono — Resumo

**O polígono agora pode ter qualquer número de pontos: desenhado com o lápis ou editado com duplo clique na linha e no
ponto, sempre com o mesmo número de pontos na entrada e na saída.**

## Critérios de aceite

| AC | Resultado |
|----|-----------|
| AC-1 lápis | Passou — leva para a aba de entrada, quatro cliques e um duplo clique criam cinco pontos iguais nas duas formas, a tela mostra a composição dentro; Esc cancela sem fechar a Saída avançada |
| AC-2 acrescentar e apagar pontos | Passou — nas duas abas; mínimo de três pontos; Ctrl+Z |
| AC-3 nada quebra | Passou — quinze baterias da Saída avançada e de projetor, show-passada e as 30 baterias; selftest 74/75 (captura de página web, monitores desligados) |

## Defeitos achados e consertados no caminho

- **O editor quebrava na aba de entrada com um slice comum e um polígono juntos** (o desenho das emendas lia `soft` de
  todo item, e o polígono não tem). Estava no commit do 07-13 (`d920bf9`); consertado aqui e posto na bateria.
- **O duplo clique não fechava o desenho em curso**: o palco é redesenhado a cada clique e o navegador não gerava o
  `dblclick`. Agora é contado no apertar do botão. Isso valia também para a máscara desenhada à mão, que só fechava com
  Enter.

## Não conferido

- Polígono que se cruza ou com pontos colineares.
- Lápis numa tela de tamanho diferente da composição (a saída nasce na proporção da tela, por conta; não rodado).
- Como o Resolume acrescenta e apaga pontos.

## Pendências

- Exportar SVG; Prévia e outra tela como fonte do slice. Com isso a lista do 07-03 termina.
