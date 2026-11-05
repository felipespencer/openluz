---
phase: 02-efeitos-do-resolume
plan: 04
subsystem: ui
tags: [camadas, decks, crossfader, composição, resolume, cdp]

requires:
  - phase: 02-efeitos-do-resolume
    provides: grade de clipes igual à do Resolume (02-03) e bancada Resolume × OpenLume
provides:
  - painel da camada como no Resolume 7.28 (X, B, S, mistura, faders M/A/V, T/Alph, faixa do nome com A/B e ⏮ ⏭)
  - linha da composição (X, B, M, S, tocar/pausar, |◀ ▶|), crossfader curto e decks ao lado
  - state.compBypass, L.master e L.volume salvos na composição
  - tools/camadas-check.mjs (31 verificações com mouse real)
affects: [APC40, celular, atalhos de teclado]

tech-stack:
  added: []
  patterns: ["Bateria que mexe na grade devolve a grade limpa no fim (as baterias rodam em sequência no mesmo programa)"]

key-files:
  created: [tools/camadas-check.mjs, camadas-decks-mockup.html]
  modified: [app/app.js, app/style.css, app/index.html, app/engine.js, app/composition.js, app/keymap.js, app/audio.js, tools/undo-check.mjs]

key-decisions:
  - "M/A/V da camada são três faders (master, volume do áudio, opacidade), medido no Resolume 7.28; o A só aparece em clipe com som"
  - "Composição tem M (master) e S (velocidade) e não tem solo, como no Resolume"

duration: ~1 dia (maquete e APPLY em 2026-11-03; baterias, beta e checkpoint em 2026-11-05)
started: 2026-11-03T10:00:00-03:00
completed: 2026-11-05T02:10:00-03:00
description: "Camadas e decks iguais aos do Resolume 7.28: painel da camada com faders M/A/V, T/Alph, A/B e ⏮ ⏭ na faixa do nome; linha da composição com X/B/M/S; crossfader curto e decks ao lado"
type: Summary
about: "OpenLume"
---

# Fase 2, Plano 04: Camadas e decks

**O painel de cada camada, a linha da composição, o crossfader e as abas dos decks ficaram como os do Resolume 7.28,
conferidos com mouse real e aprovados pelo Felipe na beta.49 instalada ("aprovado", 2026-11-05).**

## Performance

| Métrica | Valor |
|---------|-------|
| Duração | ~1 dia, em duas sessões |
| Tarefas | 3 de 3 automáticas + checkpoint aprovado |
| Arquivos mexidos | 11 (3 fora da lista do plano) |

## Acceptance Criteria Results

| Critério | Status | Notas |
|----------|--------|-------|
| AC-1: Painel da camada | Pass | camadas-check: nome seleciona e fica verde-água, A/B do bus (clicar de novo tira), ⏭ põe o próximo clipe, fader a 0,5 bate com o painel Camada |
| AC-2: Composição, crossfader e decks | Pass | X tira tudo do ar, B some a composição da saída sem tirar do ar e volta, decks trocam com clipes e seleção |
| AC-3: M, A, V e T/Alph | Pass, com mudança de spec | Medido no Resolume (API REST + tela): são faders, não botões; T/Alph = duração e modo da transição. A maquete aprovada tinha um fader só e S de composição como botão |
| AC-4: Nada mais quebra | Pass | Todas as baterias em sequência; composição antiga abre igual; 30 qps |

## Verificação

- selftest 75, camadas-check 31, grade-check, ui-check 18, undo-check 11, keymap-check, ao-check 20, soft-check 42: todos
  aprovados em sequência no mesmo programa (2026-11-05)
- Composição sem `master`, `volume` e `compBypass` (como as de antes do 02-04): bus B/A, opacidade 0,4 e 2 decks voltam
  iguais; os campos novos entram no padrão (1, 1, falso)
- 30,0 qps com duas camadas no ar
- beta.49 (MSI) instalada no CAIOPRADO; camadas-check 31/31 no instalado; versão de desenvolvimento fechada antes de entregar

## Task Commits

| Tarefa | Commit | Descrição |
|--------|--------|-----------|
| Tarefas 1 e 2: painel da camada, composição, crossfader e decks | `f81e8b7` | layout novo e camadas-check |
| Tarefa 3: M, A, V e T/Alph | `75f0995` | faders e composição M/S, medidos no Resolume |
| Correção de teste | `4ab2431` | camadas-check limpa a grade no fim |
| Versão | `1e3fafc` | 0.2.0-beta.49 |

## Deviations from Plan

| Tipo | Qtde | Impacto |
|------|------|---------|
| Mudança de spec pela medida | 2 | M/A/V viraram três faders; composição ganhou M e S e não tem solo |
| Lugar diferente da maquete | 1 | \|◀ ▶\| da composição ficou na linha da composição, não no crossfader |
| Arquivos fora da lista | 4 | composition.js (salvar campos novos), keymap.js e audio.js (volume da camada), undo-check.mjs (seletores novos) |
| Faltou | 1 | Master e Volume não ganharam linha no painel Camada (panels.js estava fora da lista) |
| Correção de teste | 1 | ui-check falhava no "Test Card desliga" porque o camadas-check deixava a Camada 2 no ar; agora ele limpa a grade |

**Impacto total:** a medida no Resolume corrigiu a maquete; nada de recurso a mais.

## Issues Encountered

| Problema | Solução |
|----------|---------|
| "Monitor preto" do Resolume na manhã de 2026-11-03 | Era só a saída dele sem nada no ar |
| ui-check reprovado só quando rodava depois do camadas-check | Bateria de camadas devolve a grade limpa (4ab2431) |

## Next Phase Readiness

**Pronto:**
- A grade, as camadas e a composição batem com o Resolume; dá para comparar efeitos lado a lado sem diferença de interface

**Pendente:**
- Master e Volume no painel Camada (linha própria), para quem não usa os faders da grade
- Tag e release da beta.49 no GitHub (não feitas)
- Pedidos novos de 2026-11-05: botão direito na Saída avançada igual ao Resolume; Texto com IA (maquete
  `texto-ia-mockup.html` aprovada "por enquanto")

**Bloqueios:** nenhum

---
*Fase: 02-efeitos-do-resolume, Plano: 04*
*Concluído: 2026-11-05*
