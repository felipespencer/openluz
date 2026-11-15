---
phase: 07-saida-avancada
plan: 07
subsystem: saida-avancada
tags: [is-key, black-bg, slice, saida, resolume]

requires:
  - phase: 07-saida-avancada
    provides: lista de diferenças (07-03, linha 24)
provides:
  - "É chave" e "Fundo preto" no slice (painel, motor, salvar e abrir)
  - 07-07-MEDIDAS.md (o que Is Key e Black BG fazem na saída do Resolume)
  - tools/ao-chave-check.mjs (12 verificações lendo os pixels da tela)
affects: [07-08 em diante]

key-files:
  created: [tools/ao-chave-check.mjs, .paul/phases/07-saida-avancada/07-07-MEDIDAS.md]
  modified: [app/engine.js, app/screens.js, app/ao.js, tools/compare/slices-resolume.py]

key-decisions:
  - "Fundo preto desenha a forma inteira do slice em preto, sem a máscara de entrada nem a emenda: a combinação não foi medida no Resolume"

duration: 2026-11-15
started: 2026-11-15
completed: 2026-11-15
description: "Is Key e Black BG medidos na saída do Resolume e postos no slice do OpenLuz como É chave e Fundo preto"
type: Summary
about: "OpenLuz"
---

# Fase 7 Plano 07: É chave e Fundo preto — Resumo

**O slice ganhou "É chave" e "Fundo preto" na aba Transformação de saída, com o mesmo efeito medido no Resolume:
Fundo preto põe preto opaco por baixo do slice; É chave troca a imagem por branco na medida da transparência.**

## Critérios de aceite

| AC | Resultado |
|----|-----------|
| AC-1 medido no Resolume | Passou — oito casos pelo Spout, em 07-07-MEDIDAS.md |
| AC-2 igual no OpenLuz | Passou para conteúdo transparente e opaco, com Ctrl+Z e cópia. **A imagem meio transparente (127 + metade do de baixo) não foi reproduzida no OpenLuz**: a bateria só usa camada vazia e xadrez opaco |
| AC-3 nada quebra | Passou — ao-chave 12/12 (reprovava antes), oito baterias da Saída avançada, selftest e 30 baterias; XML do Resolume restaurado; nada aberto |

## Desvios

- O desenho ficou em `app/engine.js` (shader do slice), não em `app/app.js` como o plano supunha.
- A bateria no código anterior parou em 5 verificações com 2 falhas (não achou as caixas), em vez de rodar as 12.
- Uma captura do Resolume veio com a marca d'água da demonstração; repetida três vezes.

## Não conferido

- É chave com imagem meio transparente no OpenLuz.
- Fundo preto junto com Soft Edge ou máscara de entrada, nos dois programas.
- As duas opções do Resolume que aparecem quando o slice lê uma camada (Input Opacity, Input Bypass/Solo).
- A saída de verdade num projetor: os pixels foram lidos da tela pelo motor.

## Pendências

- 07-08 em diante: imagem de guia, origens da entrada (com Input Opacity e Bypass/Solo), "Mostrar na saída", Inverter padrão.
