---
phase: 02-efeitos-do-resolume
plan: 08
completed: 2026-11-22T02:57:00-03:00
duration: fechado no papel
description: "Lote 4 fechado sem os dois efeitos prontos nele: o Strokes foi refeito e conferido no 02-12; o Slice Delay saiu da v0.3"
type: Summary
about: "OpenLuz"
---

# Fase 2 Plano 08: Slice Delay e Strokes — Resumo

**O plano ficou no meio do APPLY desde 2026-11-10 e fecha aqui no papel: nenhum dos dois efeitos terminou dentro dele.**

## Critérios de aceite

| Critério | Resultado | Notas |
|---|---|---|
| AC-1: Slice Delay | Não feito | Fora da v0.3 por decisão do Felipe (2026-11-13). Travou em 2026-11-06: as slices só entram no campo "Slice In" arrastando da janela da Saída avançada; não está na API e o arrasto simulado não pegou |
| AC-2: Strokes | Feito no 02-12 | O que foi escrito aqui (5419fc9) estava longe do Resolume e foi refeito pelas medidas: ver `02-12-SUMMARY.md` |
| AC-3: bateria, baterias de sempre, beta instalada | Feito no 02-12, sem beta | `tools/strokes-check.mjs` (14/14) e a regressão do 02-12; nenhuma versão nova |

## O que fica deste plano

- Bancada do Slice Delay: `tools/compare/slices-resolume.py`, `clips/gera-contador.py`, `sondas/slicedelay.py`.
- `sondas/strokes.py` (medida parada, antiga); as sondas novas são as `strokes_*` do 02-12.

---
*Fase: 02-efeitos-do-resolume, Plano: 08 — fechado no papel em 2026-11-22*
