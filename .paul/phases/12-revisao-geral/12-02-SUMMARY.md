---
phase: 12-revisao-geral
plan: 02
subsystem: ui
tags: [laco-de-quadros, beat-snap, saida-avancada, telas, fechar, gpu, editor-de-texto]

requires:
  - phase: 12-revisao-geral
    provides: achados 1, 34, 35, 51, 52, 80 e a linha de base das baterias (12-01)
provides:
  - laço de quadros que sobrevive a um erro num quadro
  - telas com identidade estável (uid) no retrato da Saída avançada
  - X com saída garantida e limite na reabertura por queda da placa
  - tools/trava-check.mjs
affects: [12-03, 12-04, 07-saida-avancada]

tech-stack:
  added: []
  patterns:
    - "frame() dentro de try/catch; loopErro registra uma vez por mensagem a cada 10 s e avisa uma vez por minuto"
    - "Fila do Beat Snap guarda a camada (objeto); o índice é refeito por prunePending()"
    - "Tela tem uid que vai no serialize; setScreens/swapScreens casam por uid e, no que sobra, pela ordem"

key-files:
  created: [tools/trava-check.mjs]
  modified: [app/app.js, app/ao.js, app/screens.js, app/text-editor.js, app/preload.js, main.js, tools/grade-check.mjs, tools/ui-check.mjs]

key-decisions:
  - "O que sobra sem par de uid casa pela ordem, para a saída continuar no ar ao abrir outra composição ou arquivo antigo"
  - "A confirmação do pedido de fechar sai do preload (app:closeAck); sem ela em 2 s o processo principal pergunta"

patterns-established:
  - "Bateria nova reprova no código antigo antes do conserto e passa depois; o caso que não reprova no antigo é dito no resumo"

duration: 90min
started: 2026-11-11T09:55:00-03:00
completed: 2026-11-11T11:30:00-03:00
description: "O programa não congela por erro num quadro, a saída do projetor não cai nem fica órfã ao mexer nas telas, o X sempre fecha e a queda repetida da placa não reabre sem fim; beta.66"
type: Summary
about: "OpenLuz"
---

# Fase 12 Plano 02: Trava e saída que cai — Resumo

**Seis achados da revisão consertados e provados (1, 34, 35, 51, 52, 80), entregues na beta.66 (commit `ee6ee5a`); a
beta.67 instalada depois leva os mesmos consertos.**

## Critérios de aceite

| Critério | Resultado | Notas |
|---|---|---|
| AC-1: erro num quadro não congela | Passa | Antes: 0 quadros em 2 s depois da batida. Depois: 57. Exceção injetada em todo quadro por 2 s: a imagem volta sozinha, 1 linha no registro, aviso na tela |
| AC-2: saída não cai nem fica órfã | Passa | Antes: a saída da Tela B caía no Ctrl+Z e no Cancelar depois de duplicar a Tela A (reproduzido). Depois: as mesmas janelas; ✕ fecha a janela e o Ctrl+Z reabre |
| AC-3: o X sempre tem saída | Passa | Aviso com diálogo aberto; com a janela travada o principal registra em 2 s e abre o diálogo nativo (janela `#32770` vista na enumeração no teste da placa; no teste do X conferi a linha do registro) |
| AC-4: queda repetida da placa | Passa | Duas quedas provocadas com taskkill no `--type=gpu-process`: a 1ª reabre com outro processo, a 2ª não reabre e mostra o aviso nativo |
| AC-5: editor de texto único | Passa, com ressalva | Dois cliques reais com 30 ms passam também no código antigo nesta máquina; a corrida só aparece com dois pedidos ao mesmo tempo (2 editores no antigo, 1 depois), e é isso que a bateria cobre |
| AC-6: nada regrediu | Passa | selftest 75/75 e 24 baterias aprovadas; grade-check e ui-check limpos (B1, B2); webcam-check reprova igual à linha de base (lote 12-05) |

## Verificação

- `node tools/trava-check.mjs`: 25/25 no desenvolvimento e na beta.66 instalada.
- Composição gravada antes do conserto (telas sem uid) abre igual.
- Checkpoint humano: o Felipe respondeu em 2026-11-11 "Continua fazendo aí que eu tô dando ok aqui. Pode ir." — tomado
  como o aprovado; ele não relatou problema na beta.66/67.

## Arquivos

| Arquivo | Mudança |
|---|---|
| `app/app.js` | `loop()` chama `frame()` em try/catch; `loopErro`; `prunePending`; `casarTelas`, `fecharSaida`, `setScreens(list, abrir)`, `swapScreens`; `askClose` avisa com diálogo aberto |
| `app/screens.js` | `newUid`; `uid` em `mkScreen`, `serialize`, `deserialize` |
| `app/ao.js` | `removeScreen` fecha a janela; `fechadas`; `restore`/`hide` reabrem; Duplicar ganha uid novo |
| `main.js` | fechar com confirmação e diálogo nativo; `placa-caiu.txt` e o limite de 60 s |
| `app/preload.js` | `app:closeAck` |
| `app/text-editor.js` | `abrindo` |
| `tools/trava-check.mjs` | bateria nova (laco, telas, fechar, editor; `fechar-travado` só a pedido) |
| `tools/grade-check.mjs`, `tools/ui-check.mjs` | B1 e B2 |

## Desvios

- `app/preload.js` entrou (previsto no plano como possível).
- `swapScreens` (desfazer geral) também passou a casar por uid: tinha o mesmo defeito de posição.
- A fila do Beat Snap passou a guardar a camada em vez de ajustar índices em cada função que mexe na ordem (há seis
  lugares que reordenam camadas; guardar o objeto cobre todos).
- Fora do plano, a pedido do Felipe na mesma sessão: beta.67 com os Cue Points marcados (`a0a8552`).

## Para o próximo plano

- **Atenção:** `PROJ_USERDATA` numa pasta vazia recebe a cópia dos dados antigos do OpenLume (migração do renome);
  apagar as pastas de teste no fim.
- **Aberto:** o diálogo nativo do X travado fica na tela até alguém responder; se a página voltar a responder nesse
  meio-tempo, a pergunta do programa aparece por baixo. Não vi problema, não testei a fundo.
- **Bloqueios:** nenhum.

---
*Fase: 12-revisao-geral, Plano: 02*
*Concluído: 2026-11-11*
