---
phase: 12-revisao-geral
plan: 18
description: "Baterias com os monitores ligados e a 0.3.0-beta.3 instalada projetando de verdade"
type: Summary
about: "OpenLuz"
---

# Fase 12 Plano 18 — Resumo

Plano só de teste, em 2026-11-17, com três telas ligadas (24G50F principal, SAMSUNG 1920×1080 acima, 23MP55 1080×1920 em pé). O programa não mudou. Detalhe em `12-18-RESULTADOS.md`.

## Critérios

- **AC-1, cumprido:** selftest, rosto e modelo3d firmes, 3 de 3 cada (e mais uma vez na regressão). O programa roda a 60,3 quadros por segundo com os monitores ligados; desligados eram 30–31. As oscilações de 15 e 16/11 eram do ambiente.
- **AC-2, cumprido com ressalva:** todas as baterias aprovadas; nativos e ao-gestos reprovaram a primeira rodada e passaram na repetição, sem investigação. lotec --projetores e show-passada reprovaram no meu rodador novo e passaram quando rodadas pelo `abre-dev.mjs`, como pedem.
- **AC-3, cumprido:** a 0.3.0-beta.3 instalada abre a saída em tela cheia nos dois projetores, 60,3 quadros por segundo, com imagem que muda (lido por CDP na janela de saída); oito baterias aprovadas no instalado. Ninguém olhou a parede.
- **AC-4, cumprido:** nada aberto no fim; só o `.paul` mudou. Uma sobra da show-passada (programa que ela reabre) foi fechada à mão.

## Desvios

- A sessão caiu no meio da Tarefa 2 e foi retomada no mesmo dia ("continua o openluz, ta com os dois projetores ligados").
- No SAMSUNG a troca de monitor foi pelo evento `change`, não por tecla: a seta troca uma opção e o seletor perde o foco.

## Para depois (não viraram plano)

- nativos e ao-gestos: uma falha em duas rodadas cada; rodar várias vezes para saber se é oscilação da bateria ou do programa.
- Seletor de monitor da lista Telas perde o foco a cada seta do teclado.
- Composição 16:9 sai esticada no projetor em pé; conferir o que o Resolume faz.
- Itens 36 (cabo) e 41 (escala) do 12-12 seguem com o Felipe.
