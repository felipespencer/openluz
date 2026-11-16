---
phase: 12-revisao-geral
plan: 14
subsystem: saida
tags: [energia, tela, show, power-save-blocker]

requires: []
provides:
  - com uma janela de saída aberta, o sistema não apaga a tela nem dorme por inatividade; fechada a última, volta ao normal
  - tools/acordado-check.mjs (7 verificações)
affects: []

key-files:
  created: [tools/acordado-check.mjs]
  modified: [main.js, app/preload.js]

key-decisions:
  - "Bloquear só enquanto há saída aberta: com o programa esquecido aberto, sem saída, o computador dorme como sempre"

duration: 2026-11-16
started: 2026-11-16
completed: 2026-11-16
description: "Com a saída aberta o OpenLuz impede o Windows de apagar a tela por inatividade"
type: Summary
about: "OpenLuz"
---

# Fase 12 Plano 14: tela acordada — Resumo

**O programa não tinha nenhum bloqueio de economia de energia: quem tocasse um show só pela APC40 ou pelo MIDI, sem mexer
no mouse, podia ter o projetor apagado pelo Windows. Agora, com a saída aberta, a tela não apaga.**

## Critérios de aceite

| AC | Resultado |
|----|-----------|
| AC-1 saída aberta segura a tela | Passou — liga ao abrir, sai ao fechar, três vezes seguidas |
| AC-2 sem saída, normal | Passou |
| AC-3 nada quebra | Com as ressalvas de sempre — loteb1, lotea, show-passada, ao-guia e as baterias aprovadas; selftest 74/75 (captura de página web) e `rosto` reprovado nas duas tentativas desta rodada, os dois por causa dos monitores desligados (ver memória openluz-baterias-monitor-desligado) |

## Não conferido

- **A tela deixando de apagar de verdade.** A prova é o estado do bloqueio do Electron; conferir no sistema (`powercfg /requests`) pede administrador, e esperar o tempo de inatividade mexeria nas configurações do Felipe.
- Gravação sem saída aberta: o computador ainda pode dormir no meio.
- Proteção de tela e bloqueio por senha da empresa: o bloqueio do Electron não cobre tudo.

## Achado da noite, fora do plano

- Com os monitores desligados no botão o programa roda a 30–31 quadros por segundo (medido), e três baterias de tempo oscilam. Não é defeito das mudanças. Num show os monitores estão ligados; fica o aviso de rodar a regressão com eles ligados.
