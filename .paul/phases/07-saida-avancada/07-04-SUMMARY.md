---
phase: 07-saida-avancada
plan: 04
subsystem: saida-avancada
tags: [gestos, resolume, shift, alt, ctrl, giro, zoom]

requires:
  - phase: 07-saida-avancada
    provides: medidas do Resolume (07-03, linhas 1 a 13)
provides:
  - arrastar e redimensionar em pixels inteiros; Ctrl solta o inteiro e o ímã
  - Shift prende o eixo (corpo) e mantém a proporção (canto)
  - Alt duplica (corpo) e redimensiona pelo centro (canto)
  - anel do canto gira slice (entrada e saída) e máscara
  - roda do mouse dá zoom de 5% por passo; o campo mostra a porcentagem
  - tools/ao-gestos-check.mjs (64 verificações)
affects: [07-05 painéis, desenho do 3D]

key-files:
  created: [tools/ao-gestos-check.mjs]
  modified: [app/ao.js, app/style.css, tools/compare/sondas/ao_resolume.py]

key-decisions:
  - "Arredondar sempre (menos com Ctrl), em vez de só com o ímã ligado como no Resolume: fração de pixel não serve a ninguém e o ímã do OpenLuz nasce desligado"
  - "Giro com Shift de 15 em 15 graus: escolha minha, não medida"

duration: 2026-11-15
started: 2026-11-15
completed: 2026-11-15
description: "Gestos da Saída avançada como no Resolume: inteiros, Shift, Ctrl, Alt, anel de giro e roda do mouse"
type: Summary
about: "OpenLuz"
---

# Fase 7 Plano 04: gestos da Saída avançada — Resumo

**Shift, Ctrl, Alt, o anel de giro e a roda do mouse respondem como na Advanced Output do Resolume. O Felipe aprovou
sem testar na mão ("Tou fora do PC aprova tudo aí", 2026-11-15): a prova é a bateria, não o uso dele.**

## Critérios de aceite

| AC | Resultado |
|----|-----------|
| AC-1 inteiros e Ctrl | Passou (máscara e slice, corpo, canto e lado) |
| AC-2 Shift | Passou (eixo horizontal e vertical; proporção no canto; também na aba de entrada) |
| AC-3 Alt | Passou (cópia com nome novo, um Ctrl+Z desfaz; canto pelo centro) |
| AC-4 anel de giro | Passou (slice na saída e na entrada, máscara) |
| AC-5 roda | Passou (5% por passo; campo com a porcentagem; Ajustar volta) |
| AC-6 nada quebra | Passou — ao-gestos 64/64 (59 reprovavam antes), ao-check 20, ao-menu 42, ao-mesh, soft 42, loteb 9, selftest e 30 baterias em três partes |

## Medido no Resolume nesta rodada

- Shift+seta = 10 px (o teste do 07-03 tinha dado 1 porque a seta ia sem a marca de tecla estendida e o Windows soltava o Shift).
- Os pixels inteiros vêm do ímã ligado; com ele desligado o Resolume deixa fração.
- Roda: cerca de 5% por evento (35 → 37 → 39 → 37).

## Desvios

- O código foi escrito antes da bateria; a reprovação no código antigo (59 falhas) foi provada depois, com git stash.
- Com o segundo monitor ligado, o menu Output do Resolume tem mais linhas: o clique em "Advanced" caiu em "Display 1" e uma saída preta cobriu a tela principal por uns dois minutos. Fechado o Arena, posição corrigida (y = 257 com dois monitores), XML restaurado. Antes de clicar num menu do Resolume, fotografar o menu.
- modelo3d falhou a primeira tentativa na regressão ("1 quadros em 1 s") e passou a segunda: tempo, não os gestos.

## Não conferido

- Uso na mão pelo Felipe.
- Passo do giro com Shift e ponto âncora do zoom no Resolume.
- Arrasto de pontos, alças de bezier e degradês: fora do plano.

## Pendências

- Decidir se o ímã passa a nascer ligado e a mandar no arredondamento, como no Resolume.
- 07-05 em diante: painéis, origens da entrada, presets, menu da grade; polígono e SVG por último.
