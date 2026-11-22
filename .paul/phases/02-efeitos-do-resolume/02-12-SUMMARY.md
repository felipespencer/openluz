---
phase: 02-efeitos-do-resolume
plan: 12
subsystem: efeitos
tags: [strokes, bloom, warpspeed, tunnel, sondas, resolume, presets]

requires:
  - phase: 02-efeitos-do-resolume
    provides: gabarito e sondas (02-09, 02-10); Strokes escrito sem comparação (02-08)
provides:
  - Strokes refeito pelas medidas do Resolume, com os seis presets e o controle Pincel
  - WarpSpeed igual (1,59)
  - Tunnel com Wobble e velocidade medidos (2,94)
  - sondas strokes_*, bloom_liso, bloom_voltas, bloom_densidade, tunnel_veloc
  - tools/strokes-check.mjs
affects: [02-13 (Triangulate, Sphere, Stingy Sphere), Bloom (voltas largas em aberto), 02-08 (fechado no papel)]

key-files:
  created: [tools/compare/sondas/strokes_lib.py, tools/compare/sondas/strokes_cmp.py, tools/compare/sondas/strokes_o.mjs, tools/compare/sondas/strokes_folha.py, tools/compare/clips/gera-strokes.py, tools/strokes-check.mjs]
  modified: [app/engine.js, app/effects2.js, app/effects-r3.js, app/effects-r6.js]

key-decisions:
  - "Strokes: o que estava escrito foi refeito; o modelo novo saiu todo de medida (rodadas, apagamento, luz dura, campo de direção, Variation somada)"
  - "Pincéis: cinco desenhos nossos no shader no lugar dos cinco arquivos dos presets; o logotipo do Resolume não foi copiado"
  - "Bloom: o 'teto' na redução da raiz acerta a carta e estraga o quadradinho; não é a lei deles e não entrou"
  - "Os três de malha (Triangulate, Sphere, Stingy Sphere) ficaram para o 02-13"

patterns-established:
  - "Efeito sorteado e com memória: medir rajadas quadro a quadro (só quadros que mudam) e comparar estatística nos dois programas com a mesma função"
  - "Sempre variar DOIS valores de um controle base antes de dizer que outro controle multiplica (a Variation parecia multiplicar com Size 0,2; soma)"
  - "Preset é teste: os presets usam valores que a varredura de um controle por vez não usa"
  - "Chave de controle não pode ser palavra reservada do GLSL ES 3.0 (resource): vira uniform"
  - "Rajada do Resolume com dezenas de quadros em vez de uns oito = marca d'água; repetir"

duration: ~2h
started: 2026-11-22T00:35:00-03:00
completed: 2026-11-22T02:57:00-03:00
description: "Strokes refeito pelas medidas (33 de 33 medidas na folga, seis presets, controle Pincel); WarpSpeed 2,09 → 1,59; Tunnel 3,63 → 2,94 com Wobble e velocidade medidos; Bloom não melhorou (voltas 4 e 5 em aberto)"
type: Summary
about: "OpenLuz"
---

# Fase 2 Plano 12: Strokes conferido; Bloom, WarpSpeed e Tunnel — Resumo

**O Strokes foi refeito a partir do que o Resolume faz de verdade e bate na estatística e nas folhas; WarpSpeed ficou igual; o Tunnel
ganhou o Wobble e a velocidade medidos; o Bloom largo não foi decifrado.**

## Critérios de aceite

| Critério | Resultado | Notas |
|---|---|---|
| AC-1: Strokes igual por estatística e por fora | Passa | `strokes_cmp.py`: 33 medidas, 0 fora da folga. Na grade do critério a maior diferença foi 7 % (cobertura com Size 0,1); comprimento e largura a ≤ 3 %, ângulo a ≤ 2°; Edges Only a 3 pontos; razão claro/escuro a 2 %. Seis presets com os valores da API. Folhas do padrão e dos presets olhadas na carta e na foto |
| AC-2: Bloom com 5 voltas e Knee | Falha | Iterations 5: 14,4 (meta ≤ 6; era 12,9). Knee 0,5: 4,07 (meta ≤ 2). Média 1,69 (era 1,67). Só entrou a borda (fato medido) |
| AC-3: WarpSpeed igual | Passa | 1,59 (era 2,09); pior caso Rotate 1 com 3,11 |
| AC-4: Tunnel, o que ficou aberto | Passa em parte | média 2,94 (≤ 3), padrão 1,24; Wobble 0,75 e 1: 2,2–3,5 (≤ 6); velocidade medida e igual a 1–2 %. Não: Twist 0 e 1 em 5,9 e 6,5 (meta ≤ 4); Kaleidoscope 0,5 + Twist 0,25 em 9,2 (meta ≤ 6); lados do anel não medidos |
| AC-5: Nada quebra, nada fica aberto | Passa, com ressalvas do ambiente | compila 104/0; 29 das 30 baterias aprovadas na 1ª rodada; selftest reprova na "captura de página web" e reprova IGUAL no código anterior (a2ec4a6); modelo3d aprovado com o GLB local (13/13); extras aprovadas, menos `monitores` (10 de 11: pede dois projetores e só havia duas telas) e `ao-painel` na 1ª rodada (aviso de primeira vez, 24/24 na 2ª); `strokes-check` 14/14; fim de linha igual; Arena e OpenLuz de teste fechados |

## O que saiu das sondas

Detalhe em `02-09-LOTES.md`, seção "Plano 02-12". Em resumo, do Strokes:

- rodadas de pinceladas PARADAS (Frequency por segundo, ou por minuto em BPM);
- fundo × raiz(1 − (1 − Feedback)²) por quadro, cor e transparência, em 8 bits;
- a pincelada entra em "luz dura" sobre o fundo (é o que deixa as cores mais vivas que as da imagem);
- direção ao longo da borda, pelo gradiente do brilho Rec. 601 desfocado; **Swirl é o raio desse desfoque** (5 + 101 × Swirl px);
- **Flow empurra o fundo** ao longo das bordas (não move pincelada);
- tamanho 169,5 px × |Size + Variation × sorteio normal|; Size Mode Brightness × (0,1 + 0,9 × maior canal);
- Edges Only esconde onde o campo é liso.

## Commits

| Tarefa | Commit | O quê |
|---|---|---|
| Plano | `a2ec4a6` | 02-12-PLAN, STATE, ROADMAP |
| 1: Strokes | `22eb562` | motor, efeito, sondas, imagens de prova |
| 2: WarpSpeed, Tunnel, Bloom | `c6bafd6` | três efeitos e quatro sondas |
| 3: bateria e notas | `e30030b` | `tools/strokes-check.mjs`, LOTES |

Só locais, branch `efeitos-resolume`; sem push, sem versão nova.

## Arquivos

| Arquivo | Mudança | Para quê |
|---|---|---|
| `app/engine.js` | modificado | `strokesField` (campo de direção), `strokesPass` em camada própria, cinco pincéis, `uFld`/`uStk` no programa do efeito |
| `app/effects2.js` | modificado | Strokes: mistura do quadro, controle Pincel, seis presets; WarpSpeed: cópias em tamanho cheio até 1080 linhas |
| `app/effects-r3.js` | modificado | Bloom: fora da imagem vale a beirada |
| `app/effects-r6.js` | modificado | Tunnel: Wobble em 8π, velocidade 30 × (0,5 − Speed)³ |
| `tools/compare/sondas/strokes_*.py`, `strokes_o.mjs` | criados | medidas do Strokes nos dois programas, tabela, folhas, presets |
| `tools/compare/sondas/bloom_liso.py`, `bloom_voltas.py`, `bloom_densidade.py`, `tunnel_veloc.py` | criados | sondas da Tarefa 2 |
| `tools/compare/clips/gera-strokes.py`, `stk-*.png` | criados | imagens de prova |
| `tools/strokes-check.mjs` | criado | painel do Strokes com mouse e teclado reais |

## Desvios

- **O Strokes foi refeito, não só "acertado".** O plano previa corrigir o que passasse de 10 %; a primeira comparação mostrou que o
  modelo todo estava errado (pinceladas escuras e pequenas, Flow e Swirl com outro sentido). Mexi no motor mais do que o previsto.
- **Controle novo "Pincel"** (o Resource do Resolume) com cinco desenhos nossos: sem ele quatro dos seis presets não tinham como
  existir. Carregar uma imagem própria como pincel fica para quando o motor tiver controle de arquivo por efeito.
- **Bloom**: tentei duas leis para as voltas largas (raiz tirada uma vez só; raiz com teto) e desfiz as duas: nenhuma explica a carta
  e o quadradinho ao mesmo tempo. Ficou só a borda.
- **Tunnel**: não contei os lados do anel; o mapa de posição em 8 bits não tem resolução para o que falta em Twist.
- **Resolume fechado à força**: o aviso "Quit!" não aceitou a tecla por mensagem e encerrei o processo. Antes, um Enter mandado pela
  janela ativa pode ter ido para outro programa que estava na frente (avisei o Felipe). Uma captura de tela pegou essa outra janela
  em vez do aviso; apaguei o arquivo e não usei o conteúdo. A camada 1 do Resolume foi reposta como estava (Transform e Background
  Removal, casa 2 vazia).
- Não copiado no Strokes: o mapa de tamanhos liso do Resolume com Frequency 0; a lei do tamanho em outras alturas de tela (só
  medido em 1080); o apagamento é por quadro desenhado.

## Em aberto

- Bloom: voltas 4 e 5 em imagem cheia (+13 % e +43 % na carta) e Knee 0,5 (4,1). Pede uma sonda nova (fontes não periódicas, Amount
  que não se perca nos 8 bits).
- Tunnel: Twist 0 e 1, Kaleidoscope com Twist, TurnV 0,75. Pede mapa de posição mais fino que 8 bits.
- Bateria `monitores`: rodar de novo com os dois projetores ligados. Selftest "captura de página web": ambiente (telas desligadas).
- 02-08 fechado no papel (02-08-SUMMARY.md): Strokes veio para cá; Slice Delay fora da v0.3.

## Próximo

02-13: Triangulate, Sphere, Stingy Sphere (malha 3D com vértices no motor).

---
*Fase: 02-efeitos-do-resolume, Plano: 12 — fechado em 2026-11-22*
