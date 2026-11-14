---
phase: 02-efeitos-do-resolume
plan: 10
subsystem: efeitos
tags: [distortion, tunnel, crt, sondas, resolume]

requires:
  - phase: 02-efeitos-do-resolume
    provides: gabarito e sondas (02-09)
provides:
  - Distortion igual ao Resolume
  - Tunnel refeito (malha de 30 anéis, Kaleidoscope, Wobble, fundo escuro)
  - sondas dist_mapa.py e tunnel_mapa.py
  - 02-09-SUMMARY.md (registro do trabalho sem plano)
affects: [02-11 (CRT)]

key-files:
  created: [tools/compare/sondas/dist_mapa.py, tools/compare/sondas/tunnel_mapa.py, .paul/phases/02-efeitos-do-resolume/02-09-SUMMARY.md]
  modified: [app/effects-r4.js, app/effects-r6.js]

key-decisions:
  - "2026-11-13 (Felipe): os seis Depth e o Slice Delay saem da v0.3"
  - "CRT sai deste plano e ganha plano próprio (02-11)"
  - "Sorteados (Snowy, Snow, Noisy, Cube Tiles, Fragment, Stripper, Reveal, Grid Cloner, Meta Shape): aprovação a olho, sem perseguir número (proposta minha; o Felipe não respondeu a este ponto)"

patterns-established:
  - "Sonda de mapa: imagem em que cada pixel carrega a própria posição (vermelho = x, verde = y, azul = 128) dá o mapa tela → imagem de um efeito de geometria numa foto só"
  - "Colunas de cinza sorteado dizem exatamente qual coluna um efeito leu"
  - "Antes de afinar constante na carta, conferir o modelo contra a sonda: se bate lá e não na carta, o que falta é estrutura (malha, filtro), não constante"

duration: ~5h
started: 2026-11-13T12:00:00-03:00
completed: 2026-11-13T17:30:00-03:00
description: "Distortion 3,52 → 0,00 e Tunnel 21,6 → 3,63 pelas sondas; CRT não feito (28,86 medido); rodada sem plano registrada"
type: Summary
about: "OpenLuz"
---

# Fase 2 Plano 10: Distortion, Tunnel e CRT — Resumo

**Distortion ficou igual (0,00) e o Tunnel foi refeito como a malha do Resolume (21,6 → 3,63); o CRT não foi feito.**

## Critérios de aceite

| Critério | Resultado | Notas |
|---|---|---|
| AC-1: Distortion igual | Passa | média 0,00, pior caso 0,01, 18 casos |
| AC-2: Tunnel com Kaleidoscope e Wobble | Passa em parte | padrão 1,24 (≤ 2); Kaleidoscope 2,6–5,8 (≤ 6); Wobble 4,6–8,0: só até 0,5 fica ≤ 6. Twist 0 e 1 em ~6; Kaleidoscope 0,5 + Twist 0,25 em 9,2 |
| AC-3: CRT controle a controle | Falha | não feito; só o ponto de partida: 28,86 em 97 casos |
| AC-4: Nada quebra, nada aberto | Passa | compila 104/0; selftest e 30 baterias limpos na primeira rodada; 0 CRLF; Resolume e OpenLuz fechados |
| AC-5: Rodada sem plano registrada | Passa | 02-09-SUMMARY.md; STATE e ROADMAP atualizados |

## O que saiu das sondas

- **Distortion**: o brilho que desliza cada linha é lido na diagonal da imagem (linha r lê a coluna na fração (r + 0,5)/1088),
  média simples de R, G e B, deslize para a direita dando a volta; Radius = 2 × (Radius − 0,5).
- **Tunnel**: malha em perspectiva (z = d/(1 − d), raio 0,0935/z) com um anel a cada 1/32 de fundura, 30 anéis, parede reta
  entre anéis, o da frente tapa o de trás; centro do anel 3,905 × d × (Turn − 0,5) − 0,327 × raio × sen(24 × Wobble × d);
  Twist 4 × (0,5 − valor) × d por anel; Kaleidoscope 2/4/8/16 gomos com volta nos últimos 11,25°; escurece 2 × (1,002 − d).
  Contra a sonda o modelo bate em ~0,001 (limite dos 8 bits).

## Commits

| Tarefa | Commit | O quê |
|---|---|---|
| 1: Distortion | `31b50a3` | shader, sonda, plano |
| 2: Tunnel | `edf5466` | shader, sonda, notas |
| 3: registro | `24ffdaa` | 02-09-SUMMARY, LOTES, STATE, ROADMAP |

Só locais, branch `efeitos-resolume`; sem push, sem versão.

## Desvios

- **CRT não feito** (Tarefa 3, AC-3): 97 casos, 30 controles; a 960×540 a grade de fósforo vira moiré na conta por pixel e há
  diferença de estrutura (média da célula, células em pares de colunas). Não mexi pela metade. Vai para o 02-11.
- Fotos de referência do Tunnel não foram refeitas: os casos `x_` já tinham a fase zerada.
- Constante do Twist: tentei um zero deslocado (0,497) que estragou o padrão; desfeito na hora.
- O rodador de baterias foi copiado da pasta temporária antiga para `tools/compare/saida/bat/` (fora do git).
- Antes do plano existir eu já tinha escrito e rodado metade da sonda do Distortion; o Felipe interrompeu e cobrou o plano.

## Checkpoint

Felipe, 2026-11-13: "aprovado, pode cortar os depth e segue pro CRT" (com as folhas de Distortion e Tunnel na mão).

## Em aberto para depois

- Tunnel: Wobble acima de 0,5, Twist 0/1, Kaleidoscope com Twist; número de lados do anel não medido; Speed ≠ 0,5 é palpite.
- A bateria do rosto passou desta vez; a oscilação de ontem segue sem explicação.

---
*Fase: 02-efeitos-do-resolume, Plano: 10 — fechado em 2026-11-13*
