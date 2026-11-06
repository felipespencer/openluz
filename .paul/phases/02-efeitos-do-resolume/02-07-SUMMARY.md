---
phase: 02-efeitos-do-resolume
plan: 07
subsystem: efeitos
tags: [grid-cloner, searchlight, warpspeed, lut, resolume, bancada]

requires:
  - phase: 02-efeitos-do-resolume
    provides: bancada lado a lado (02-01) e lote 2 (02-02)
provides:
  - "Grid Cloner, SearchLight, WarpSpeed e LUT com os controles e a imagem do Resolume 7.28"
  - "motor: fila de quadros por efeito (def.hist, textura em camadas), uniformes em lista (def.uniforms), LUT 3D (def.lut)"
  - "app/lut.js: leitor de .cube e oito LUTs próprias do OpenLume"
  - "bancada: tools/compare/casos.mjs (listas de casos em JSON) e tools/compare/lote3-check.mjs (mouse real)"
affects: [efeitos, motor, bancada]

key-files:
  created: [app/lut.js, tools/compare/casos.mjs, tools/compare/lote3-check.mjs, tools/compare/casos/*.json]
  modified: [app/effects2.js, app/engine.js, app/panels.js, app/style.css, tools/compare/compare.mjs, package.json]

key-decisions:
  - "Nenhum .cube do Resolume vai no programa (licença IWLTBAP proíbe redistribuir): só na bancada; o OpenLume traz oito LUTs calculadas"
  - "Random Shift do Grid Cloner e o caminho do SearchLight são sorteio no Resolume e não se repetem: aproximados (mesmo alcance e velocidade)"
  - "Ordem Centro: empate por fileira crescente e coluna decrescente (exato em 2×2, 3×2, 5×3)"

duration: 2026-11-05 a 2026-11-06
started: 2026-11-05
completed: 2026-11-06
description: "Lote 3 do Resolume 7.28: Grid Cloner, SearchLight, WarpSpeed e LUT medidos lado a lado; beta.53"
type: Summary
about: "OpenLume"
---

# Fase 2 Plano 07: Grid Cloner, SearchLight, WarpSpeed e LUT — Resumo

**Os quatro efeitos do Resolume 7.28 que faltavam neste lote estão no OpenLume, com os mesmos controles e a imagem
medida contra o Resolume na bancada.**

## Desempenho

| Métrica | Valor |
|---------|-------|
| Início / fim | 2026-11-05 a 2026-11-06 |
| Ok do Felipe | "Continua" e depois "Aprova lá aquele" (2026-11-06); checkpoint testado por mim na beta.53 instalada |
| Tarefas | 2 auto + 1 checkpoint |
| Beta | 0.2.0-beta.53 (commit d9242d0) |

## Critérios de aceite

| Critério | Resultado |
|----------|-----------|
| AC-1 Grid Cloner | Passou: gc1 e gc3 iguais (0), os outros determinísticos ≤ 0,16; Random Shift aproximado |
| AC-2 SearchLight | Passou: raios em 95/50/5 % iguais a até 4 px nos 4 casos |
| AC-3 WarpSpeed | Passou: diferença média 1,5 a 4,9 nos 6 casos |
| AC-4 LUT | Passou: três .cube do Resolume com diferença máxima 1; oito LUTs próprias, nenhum arquivo de terceiros |
| AC-5 bateria, baterias de sempre, beta | Passou: lote3-check no dev e na instalada; 13 baterias de sempre; selftest 75/75 |

## Desvios do plano

- Plano escrito durante a execução (Felipe fora de casa: "adianta mais coisa, testa tudo").
- Motor ganhou três recursos genéricos (fila de quadros, uniformes em lista, LUT 3D) em vez de código por efeito.
- Armadilha do WebGL: texImage3D com UNPACK_FLIP_Y ligado falha calado (LUT preta); desligado em volta do envio.
- O lote3-check limpa a casa no fim: o clipe de prova no ar reprovava o Test Card do ui-check.

## Fica para depois

- O Felipe aprovou sem ver na tela: conferir no uso o Grid Cloner com Atraso num vídeo e o WarpSpeed.
- Ordem Centro com 4 fileiras ainda difere um pouco (média ~3,7) no empate.
- Lote seguinte: Strokes, Slice Delay e os seis Depth.
