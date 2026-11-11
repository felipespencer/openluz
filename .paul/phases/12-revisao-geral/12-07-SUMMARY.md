---
phase: 12-revisao-geral
plan: 07
subsystem: media
tags: [gravacao, webm, preparar, duracao]

requires:
  - phase: 12-revisao-geral
    provides: achados 6, 7, 71 (12-01)
provides:
  - gravação em pedaços direto para o disco
  - duração medida para vídeo sem duração escrita
  - tools/gravar-check.mjs
affects: [01-automape (REC vira clipe)]

tech-stack:
  added: []
  patterns:
    - "rec:begin / rec:chunk / rec:end: o gravador manda cada segundo ao disco, em ordem, por uma fila de promessas"
    - "Vídeo com duration Infinity: currentTime = 1e101 e espera o durationchange antes de tirar a miniatura"

key-files:
  created: [tools/gravar-check.mjs]
  modified: [main.js, app/preload.js, app/record.js, app/app.js, app/clips.js]

key-decisions:
  - "A tela que está sendo gravada é desenhada mesmo com a saída fechada (em vez de recusar a gravação)"

patterns-established:
  - "Selftest que reprova depois de uma mudança: rodar com o arquivo suspeito guardado (git stash) antes de teorizar"

duration: 75min
started: 2026-11-11T18:20:00-03:00
completed: 2026-11-11T19:40:00-03:00
description: "Gravação direto para o disco, tela gravada com a saída fechada, clipe gravado com duração e Preparar que não grava por cima; na 0.2.0"
type: Summary
about: "OpenLuz"
---

# Fase 12 Plano 07: Gravação e Preparar — Resumo

**Achados 6, 7 e 71 consertados (commit `ef83f15`); último lote dos consertos graves; na 0.2.0 instalada.**

## Critérios de aceite

| Critério | Resultado | Notas |
|---|---|---|
| AC-1: gravação vai para o disco | Passa | Antes: nenhum arquivo até parar. Depois: 74 KB no disco aos 4 s; ao parar, 131 quadros |
| AC-2: tela com a saída fechada | Passa | Antes: arquivo de 0 bytes. Depois: 133 quadros em ~4,5 s |
| AC-3: a gravação que vira clipe toca | Passa | Duração 1,95 s numa gravação de 2 s; toca no ar |
| AC-4: Preparar onde o clipe está | Passa | Antes: gravou por cima do quadA.png posto na casa antiga e deixou o original na casa nova. Depois: `quadA.png \| - \| - \| preparar.proj.mp4` |
| AC-5: nada regrediu | Passa | selftest 75/75 e 29 baterias, todas na primeira rodada |

## Verificação

- `node tools/gravar-check.mjs`: 8/8 no desenvolvimento e na 0.2.0 instalada; no código antigo reprovava em 3.
- Gravação longa (30 min ou mais) não foi feita: o que foi provado é que o arquivo cresce durante a gravação.

## Desvios

- **Regressão achada pelo selftest e consertada na raiz.** Com a gravação em pedaços, o clipe gravado passou a nascer
  com duração zero e ficava parado depois de um Ctrl+Z. O WebM do MediaRecorder não traz a duração escrita; antes o
  Chromium acertava por acaso na primeira leitura. O carregamento de vídeo agora mede a duração quando ela vem
  "infinita" (`app/clips.js`), o que vale para qualquer WebM sem duração que a pessoa soltar na grade.
- O gravador também passou a soltar o microfone e a captura no fim e a não começar duas vezes.

## Aberto

- Fechar a janela de saída no meio de uma gravação de tela ainda troca o canvas (a gravação segue, mas não foi testado).

---
*Fase: 12-revisao-geral, Plano: 07*
*Concluído: 2026-11-11 (falta o aprovado do Felipe)*
