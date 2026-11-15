---
phase: 07-saida-avancada
plan: 03
subsystem: saida-avancada
tags: [medicao, resolume, gestos]

requires:
  - phase: 07-saida-avancada
    provides: como abrir e fotografar a Advanced Output do Resolume (07-02)
provides:
  - 07-03-DIFERENCAS.md (28 linhas, por área, com tipo e tamanho)
  - tools/compare/sondas/ao_resolume.py (mouse real com arrasto, modificadores e roda)
affects: [07-04 gestos, planos seguintes da Saída avançada, desenho do 3D]

key-files:
  created: [tools/compare/sondas/ao_resolume.py, .paul/phases/07-saida-avancada/07-03-DIFERENCAS.md]
  modified: []

key-decisions:
  - "Felipe, 2026-11-15: tudo, começa pelos gestos — todas as linhas de falta e diferença viram trabalho, na ordem da tabela"

duration: 2026-11-14 (noite) a 2026-11-15
started: 2026-11-14
completed: 2026-11-15
description: "Saída avançada medida contra a Advanced Output do Resolume 7.28.1; 28 diferenças listadas; decisão: igualar tudo, começando pelos gestos"
type: Summary
about: "OpenLuz"
---

# Fase 7 Plano 03: Saída avançada × Resolume — Resumo

**A Saída avançada não está igual à do Resolume, sobretudo nos gestos (Shift, Ctrl, Alt, roda, pixels inteiros). A lista
está em 07-03-DIFERENCAS.md e o Felipe mandou igualar tudo, começando pelos gestos.**

## Critérios de aceite

| AC | Resultado |
|----|-----------|
| AC-1 as duas janelas percorridas | Parcial — barra, menus, lista, painéis de slice, tela e máscara, Soft Edge e gestos em Transformar medidos; pontos/bezier, aba de entrada, mão e polígono não |
| AC-2 lista que dá para decidir | Passou — 28 linhas com tipo, tamanho e foto; o que não foi medido está marcado |
| AC-3 nada muda e nada fica aberto | Passou — programa intocado; XML do Resolume restaurado byte a byte; Resolume e OpenLuz fechados |

## Desvios

- A primeira rodada de gestos no Resolume saiu errada (Ctrl+Z pelo teclado não desfez e os cliques pegaram o slice de baixo); refeita cancelando a janela e desfazendo pelo botão.
- O painel da tela do nosso lado não foi fotografado (o clique não selecionou a tela); a linha 26 foi escrita lendo o código.
- Os dois roteiros do nosso lado ficaram em `tools/compare/saida/ao-nosso/` (fora do git).
- Correção à linha 9 da tabela: o anel de giro do OpenLuz é só desenho; não existe arrasto de giro no código (`ao.js` não tem esse tipo de arrasto).

## Pendências

- Shift+seta no Resolume (1 ou 10 px) e ímã × arredondamento: medir no 07-04 antes de mexer.
- Linhas 14 a 26 em planos seguintes; slice polígono e exportar SVG são os grandes.
