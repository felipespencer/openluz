---
phase: 07-saida-avancada
plan: 11
subsystem: saida-avancada
tags: [editar-pontos, selecao, ctrl, resolume]

requires:
  - phase: 07-saida-avancada
    provides: gestos do Transformar (07-04) e a sonda de mouse real
provides:
  - seleção de vários pontos do slice com Ctrl+clique; as setas movem todos
  - 07-11-MEDIDAS.md (gestos do Edit Points do Resolume)
  - tools/ao-pontos-check.mjs (15 verificações)
affects: []

key-files:
  created: [tools/ao-pontos-check.mjs, .paul/phases/07-saida-avancada/07-11-MEDIDAS.md]
  modified: [app/ao.js, tools/compare/slices-resolume.py]

key-decisions:
  - "O arrasto de ponto NÃO foi mexido: no Resolume ele também é livre e com fração, e Shift não prende o eixo. O que eu supunha diferente era igual"
  - "A seleção de vários pontos vale só para os pontos do slice; máscara e alças de bezier ficam como estavam (não medidos)"

duration: 2026-11-16
started: 2026-11-16
completed: 2026-11-16
description: "Editar pontos medido no Resolume: o arrasto já era igual; entrou a seleção de vários pontos com Ctrl+clique"
type: Summary
about: "OpenLuz"
---

# Fase 7 Plano 11: Editar pontos — Resumo

**Medi os gestos do Edit Points do Resolume. O arrasto do ponto e as setas do OpenLuz já eram iguais (livre, com fração,
1 e 10 px). A diferença era a seleção de vários pontos: Ctrl+clique soma ou tira pontos, e as setas movem todos.**

## Critérios de aceite

| AC | Resultado |
|----|-----------|
| AC-1 medido no Resolume | Passou (07-11-MEDIDAS.md), só cantos em modo Linear |
| AC-2 igual no OpenLuz | Passou — 15 verificações com mouse e teclado reais, incluindo o que já era igual |
| AC-3 nada quebra | Com as ressalvas de sempre — onze baterias da Saída avançada e as demais aprovadas; selftest 74/75 (captura de página web); `modelo3d` e `rosto` falharam a primeira tentativa e passaram a segunda |

## Desvios

- No código anterior a bateria para na primeira leitura (o campo novo não existe): reprova por isso, não caso a caso.

## Não conferido

- Bezier, subdivisões, máscara e aba de entrada (não medidos no Resolume).
- Arrastar uma caixa em volta de vários pontos (não sei se o Resolume tem).

## Pendências

- Slice polígono e Exportar SVG (pedem maquete); Prévia e outra tela como entrada.
- Estabilidade das três baterias que oscilam.
