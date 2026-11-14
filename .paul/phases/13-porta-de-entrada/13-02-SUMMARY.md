---
phase: 13-porta-de-entrada
plan: 02
subsystem: ui
tags: [primeira-vez, grade, ajuda]

requires:
  - phase: 13-porta-de-entrada
    provides: a primeira abertura medida (13-01)
provides:
  - convite na grade vazia
  - aviso de que falta clicar para pôr no ar, até a primeira vez
  - tools/primeira-vez.mjs --ajuda (13 verificações)
affects: [beta.3, página de primeiros passos]

key-files:
  created: []
  modified: [app/app.js, app/style.css, tools/primeira-vez.mjs, PRIMEIROS-PASSOS.md]

key-decisions:
  - "O aviso diz 'Clique na miniatura do clipe', não 'numa casa': clicar no nome só abre a prévia"
  - "Nada de pôr clipe no ar sozinho"

duration: 2026-11-14 (noite)
started: 2026-11-14
completed: 2026-11-14
description: "Convite na grade vazia e aviso de que falta clicar na miniatura para pôr no ar, só na janela de controle"
type: Summary
about: "OpenLuz"
---

# Fase 13 Plano 02: o programa ajuda quem abre pela primeira vez — Resumo

**A grade sem clipe mostra um convite; com clipe na grade e nada no ar, o quadro Composição avisa para clicar na
miniatura. O Felipe aprovou os textos ("os textos tão bons").**

## Critérios de aceite

| AC | Resultado |
|----|-----------|
| AC-1 a grade vazia convida | Passou — texto, não recebe o mouse, o clique no meio cai numa casa, some com o primeiro clipe |
| AC-2 falta clicar | Passou — aparece com clipe e nada no ar, some no ar; a janela de saída não tem o texto |
| AC-3 não incomoda quem já usa | Passou — não volta depois da primeira vez; `airedOnce` nas preferências |
| AC-4 nada mais quebra | Passou — primeira-vez --ajuda 13/13, show-passada 16 passos e 0 falhas, lotes A 9, C1 10, B2 9, selftest e as 30 baterias |

## O que foi feito

- `app/app.js`: `gridHint` (filho absoluto da grade, sem eventos do mouse) e `airHint` (sobre o quadro Composição, fora do canvas do motor); `firstHints()` no fim do `render`; `airedOnce` lido das preferências na abertura e gravado na primeira vez que há camada no ar.
- `app/style.css`: estilo dos dois; `#grid` e `.mon .scr` com `position:relative`.
- `tools/primeira-vez.mjs --ajuda`: 13 verificações com mouse real; 4 reprovavam no código antigo (conferido com git stash).

## Desvios

- Texto do aviso: "Clique na miniatura do clipe para pôr no ar" em vez de "clique numa casa". A mesma frase foi corrigida no `PRIMEIROS-PASSOS.md` (fora da lista de arquivos do plano).
- A regressão rodou em duas partes: a primeira rodada foi interrompida pelo sistema por falta de memória depois de 25 itens; os cinco que faltavam (nativos, rede, gravar, lote2, lote3) rodaram depois, com o "roda" do Felipe.
- O código foi escrito antes das verificações; a reprovação no código antigo foi provada depois, guardando a mudança.

## Não conferido

- O aviso com gravação em andamento e com a webcam virtual: ele é um elemento da página, fora do canvas, e a janela de saída foi conferida; gravação e webcam não foram fotografadas.
- Abrir uma composição salva com clipes no ar conta como "já pôs no ar".

## Pendências

- beta.3 com isto: o Felipe ainda não respondeu.
- Commits locais (1acc7ae e os do PAUL); nada enviado. A página de primeiros passos segue esperando "publicar".
