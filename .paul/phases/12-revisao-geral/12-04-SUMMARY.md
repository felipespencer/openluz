---
phase: 12-revisao-geral
plan: 04
subsystem: ui
tags: [teclado, atalhos, saida-avancada, automape, editor-de-texto, dialogos]

requires:
  - phase: 12-revisao-geral
    provides: achados 30, 31, 32, 33, 69, 70 (12-01)
provides:
  - atalhos da grade fora quando há editor, menu ou diálogo na frente
  - Saída avançada, Automape e editor de texto que não descartam trabalho sem querer
  - tools/teclas-check.mjs
affects: [12-05, 03-celular-e-plugins]

tech-stack:
  added: []
  patterns:
    - "installShortcuts(list, ocupado): com editor de tela inteira aberto só valem os atalhos marcados `sempre`"
    - "A tecla que fecha um diálogo (teclaDoDialogo = e.timeStamp) não vale como atalho"

key-files:
  created: [tools/teclas-check.mjs]
  modified: [app/menus.js, app/app.js, app/ao.js, app/automape.js, app/text-editor.js, tools/ao-check.mjs, tools/soft-check.mjs, tools/trava-check.mjs]

key-decisions:
  - "Esc na Saída avançada pergunta só quando houve mudança; o botão Cancelar continua direto"
  - "Automape: em vez de perguntar ao fechar, guarda o estado e continua de onde parou"

patterns-established:
  - "Baterias no instalado rodam com PROJ_USERDATA de teste e fecham o programa no fim (pedido do Felipe: sem janela inútil aberta)"

duration: 60min
started: 2026-11-11T14:40:00-03:00
completed: 2026-11-11T15:50:00-03:00
description: "Teclas que só agem em quem está na frente e editores que não jogam trabalho fora; beta.69 instalada"
type: Summary
about: "OpenLuz"
---

# Fase 12 Plano 04: Teclas e editores — Resumo

**Seis achados consertados (30, 31, 32, 33, 69, 70) no commit `0d81d20`; beta.69 instalada no CAIOPRADO, levando também o
12-03 e a agulha presa entre a entrada e a saída.**

## Critérios de aceite

| Critério | Resultado | Notas |
|---|---|---|
| AC-1: a tecla é de quem está na frente | Passa | Antes: Esc do menu tirava do ar; Enter do Sobre disparava o clipe; Delete na Saída avançada limpava a grade; Ctrl+N lá zerava a composição; as teclas do Automape mexiam na Saída avançada (desfazer 0→1). Tudo reproduzido antes e consertado |
| AC-2: editores não descartam | Passa | Pergunta no Esc com mudança; Automape continua de onde parou; "criar" entra no desfazer (antes zerava: 2→0); Esc em campo só sai do campo |
| AC-3: nada regrediu | Passa | selftest 75/75 e 26 baterias limpas numa pasta de dados de teste; só o webcam-check reprova (linha de base) |

## Verificação

- `node tools/teclas-check.mjs`: 21/21 no desenvolvimento e na beta.69 instalada; no código antigo reprovava em 13.
- No instalado (beta.69): trava-check 25/25, salvar-check 21/21, teclas-check 21/21, transport-check tudo certo.
- Checkpoint humano: pendente. O Felipe está fora de casa; ponto para ele opinar: a pergunta nova do Esc na Saída avançada.

## Desvios

- O PLAN deste lote foi escrito depois da aplicação (o Felipe deu sinal verde para seguir sem aprovação de plano um a um).
- ao-check, soft-check e trava-check mudaram: depois do Esc com mudanças, confirmam a pergunta com Enter.
- O OpenLuz instalado que eu tinha aberto para o teste do Felipe foi fechado à força a pedido dele ("não deixe janelas
  inúteis abertas"); ele confirmou que não havia nada a salvar.

## Aberto

- O Automape volta no mesmo passo, mas o passo guardado no teste foi o da foto (0); passos adiante, com formas
  editadas, não foram conferidos depois de reabrir.
- O botão Cancelar da Saída avançada continua descartando sem perguntar (é explícito).

---
*Fase: 12-revisao-geral, Plano: 04*
*Concluído: 2026-11-11 (falta o aprovado do Felipe)*
