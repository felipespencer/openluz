---
phase: 12-revisao-geral
plan: 13
subsystem: grade
tags: [clique, autopilot, grade, sobra]

requires: []
provides:
  - clique na grade (casa, nome do clipe, botões da linha) que vale mesmo com a grade refeita entre apertar e soltar
  - tools/clique-check.mjs (15 verificações)
affects: [lotec item 74]

key-files:
  created: [tools/clique-check.mjs]
  modified: [app/app.js]

key-decisions:
  - "Repor o clique só quando o elemento apertado foi trocado e o que está debaixo do mouse tem a mesma identidade; se não foi trocado, o clique nativo vale e nada é feito"
  - "Não refazer a grade por partes (o conserto de fundo): fica como ideia"

duration: 2026-11-16
started: 2026-11-16
completed: 2026-11-16
description: "Clique na grade não se perde mais quando o Autopilot refaz a grade entre apertar e soltar o botão"
type: Summary
about: "OpenLuz"
---

# Fase 12 Plano 13: clique perdido na grade — Resumo

**Com o Autopilot trocando de clipe a cada 0,15 s, só 15 de 30 cliques seguidos entravam; agora entram os 30. A causa: o
`render()` troca todos os elementos da grade, e um elemento trocado entre o apertar e o soltar não gera clique.**

## Critérios de aceite

| AC | Resultado |
|----|-----------|
| AC-1 o clique vale com a grade refeita no meio | Passou — casa, nome do clipe (Prévia), B, S e ✕ da camada |
| AC-2 sem clique dobrado nem fantasma | Passou — clique comum uma vez só; soltar em outra casa não dispara; clipe de estilo alternar sai do ar uma vez. **Arrastar um clipe não foi testado** (o arrasto zera o estado no `dragstart`, por leitura) |
| AC-3 nada quebra | Com ressalvas — clique-check 15/15 (6 reprovavam antes); lotec 5 de 5 (o item 74 falhava em metade das rodadas); show-passada, lotea, loteb; 30 baterias. Selftest 74/75 (captura de página web, que oscila com os monitores desligados). `modelo3d` e `rosto` reprovaram duas vezes na rodada cheia; `modelo3d` passou sozinho no código anterior e no novo (a máquina estava a 19 quadros por segundo na hora); `rosto` segue oscilando |

## Não conferido

- Arrastar e soltar clipes depois da mudança (só por leitura).
- Cabeçalhos de coluna e outros alvos da grade que não são casa nem botão.
- Toque (tela sensível) e APC40: não passam por este caminho.

## Pendências

- Três baterias oscilam com os monitores desligados ou a máquina lenta: selftest (captura de página web), `rosto` ("Rosto < Busto") e `modelo3d` (quadros por segundo). Merecem um plano de estabilidade dos testes.
