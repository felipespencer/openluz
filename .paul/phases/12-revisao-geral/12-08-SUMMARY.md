---
phase: 12-revisao-geral
plan: 08
subsystem: testing
tags: [pente-fino, uso, cdp, achados]

requires:
  - phase: 12-revisao-geral
    provides: lista de 85 achados (12-01) e os seis lotes de consertos (12-02 a 12-07)
provides:
  - tools/show-passada.mjs (show de mentira com eventos reais, repetível)
  - 12-08-PASSADA.md (7 achados novos e lista única em lotes A–F)
affects: [12-09 em diante (consertos por lote)]

key-files:
  created: [tools/show-passada.mjs, .paul/phases/12-revisao-geral/12-08-PASSADA.md]
  modified: []

key-decisions:
  - "2026-11-14 (Felipe): seguir os lotes na ordem recomendada: A, depois C1, depois B2; E e F esperam"
  - "2026-11-14 (Felipe): ao trocar de deck, o que está no ar continua tocando, como no Resolume (N3)"
  - "2026-11-14 (Felipe): o diálogo Projetores aparece só na primeira vez, não a cada abertura (N5)"

patterns-established:
  - "Arrastar e soltar de verdade pelo CDP: Input.setInterceptDrags + Input.dragIntercepted + Input.dispatchDragEvent"
  - "Clicar pelo texto escolhe o BOTÃO primeiro: a caixa de Ajuda repete o nome do controle sob o mouse"
  - "O #toast guarda o texto antigo depois de sumir: não serve de prova de aviso"

duration: ~5h
started: 2026-11-13T19:30:00-03:00
completed: 2026-11-14T00:50:00-03:00
description: "Show de mentira com mouse real: 15 passos sem falha, 7 achados novos e a lista única dos 61 itens em lotes"
type: Summary
about: "OpenLuz"
---

# Fase 12 Plano 08: pente fino por uso — Resumo

**Roteiro de uso com eventos reais (15 passos, nenhum falhou) e lista única: 7 achados novos + os 54 que sobraram do 12-01, em lotes A–F.**

## Critérios de aceite

| Critério | Resultado | Notas |
|---|---|---|
| AC-1: Show de mentira completo | Passa em parte | Grade, disparo, camadas, efeitos, painel Clipe, crossfader, decks, BPM, Saída avançada (cantos, Ctrl+Z, abas), gravar, salvar, reabrir, desfazer: feitos. **Fora**: câmera de mentira, texto, autopilot, máscara e soft edge. Rodada inteira do zero uma vez, não duas |
| AC-2: Estranhezas anotadas com prova | Passa | N1–N5 e N7 repetidos; N6 visto uma vez e marcado assim; suspeitas separadas |
| AC-3: Lista única para escolher | Passa em parte | Lista em lotes A–F feita. **Dos 54 antigos só o 27 foi provocado no uso**; os outros seguem com a prova do 12-01 |
| AC-4: O programa não muda | Passa | Só `tools/show-passada.mjs` e os arquivos do PAUL; nada aberto |

## Checkpoint

Felipe, 2026-11-14: "lotes, e sim pras duas perguntas" (deck mantém no ar; Projetores só na primeira vez).

## Desvios

- Cobertura menor que a planejada (ver AC-1 e AC-3).
- Três alarmes falsos meus, corrigidos no roteiro antes de anotar: vírgula no valor (funciona), "Cancelar não fecha" (eu clicava no
  título da Ajuda) e "desfazer não devolve igual" (comparação de texto em vez de estrutura).

## Próximo

12-09: lote A (o que derruba um show): 27/N4, 49, 24, 22, 21, 75, 5, 16.

---
*Fase: 12-revisao-geral, Plano: 08 — fechado em 2026-11-14*
