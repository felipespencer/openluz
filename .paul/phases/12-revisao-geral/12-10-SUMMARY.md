---
phase: 12-revisao-geral
plan: 10
subsystem: ui
tags: [pente-fino, lote-c1, ajuda, foco, piano, autopilot, deck, projetores]

requires:
  - phase: 12-revisao-geral
    provides: lista em lotes (12-08), lote A e padrões de bateria (12-09)
provides:
  - caixa de Ajuda de altura fixa
  - assistente de Projetores só na primeira abertura
  - listas da grade soltam o foco depois da escolha
  - clipe piano solto ao perder o foco, com Beat Snap e no pad da APC40
  - disparo silencioso do Autopilot (não mexe na seleção) e fila do Beat Snap sem redesenho por quadro
  - casa do clipe remarcada "no ar" ao voltar ao deck
  - tools/lotec-check.mjs
affects: [12-11]

key-files:
  created: [tools/lotec-check.mjs]
  modified: [app/app.js, app/keymap.js, app/apc40.js, app/style.css]

key-decisions:
  - "N3 era engano do 12-08: trocar de deck nunca tirou o clipe do ar (ele segue como ghost); o conserto foi só a marca da casa"
  - "trigger(li, col, now, quiet): disparo que não é da pessoa não muda a seleção"
  - "Felipe, 2026-11-14: 'aprovado, segue pro lote B2' (sem beta.2)"

patterns-established:
  - "Antes de consertar um achado de uso, medir a SAÍDA (brilho do canvas), não só o estado interno: o N3 saiu de um marcador lido errado"
  - "Provar que a bateria reprova: git stash, rodar, git stash pop"
  - "Lista nativa (select) não recebe clique pelo CDP: clique real para abrir e focar, escolha por evento change, tecla real depois"

duration: ~3h (com uma pausa no meio)
started: 2026-11-14T08:50:00-03:00
completed: 2026-11-14T15:10:00-03:00
description: "Lote C1 consertado: 13 pontos da bateria nova aprovam (10 reprovavam), regressão limpa"
type: Summary
about: "OpenLuz"
---

# Fase 12 Plano 10: lote C1 do pente fino — Resumo

**Seis itens que enganavam quem usa consertados; `lotec-check` reprovava em 10 pontos e aprova nos 13; regressão inteira limpa.**

## Critérios de aceite

| Critério | Resultado | Notas |
|---|---|---|
| AC-1: clique pega no item (N1) | Passa | fim da lista 803 → 781 px antes; parado depois; conferido na aba Efeitos (as outras abas usam a mesma caixa, não testadas uma a uma) |
| AC-2: trocar de deck não tira do ar (N3) | Passa, com o critério corrigido | já não tirava (brilho 128/129/128); consertada a marca da casa. "Camada mostra clipe de outro deck no ar" não foi feito |
| AC-3: Projetores só na primeira vez (N5) | Passa | aparece na 1ª abertura, não na 2ª, continua no menu |
| AC-4: teclado volta depois da lista (72) | Passa | foco em SELECT antes, em BODY depois |
| AC-5: piano não fica preso (73) | Passa em parte | foco perdido e Beat Snap provados; **pad da APC40 só escrito, nem MIDI simulado rodou** |
| AC-6: Autopilot (74) | Passa | seleção fica; 2246 → 68 mudanças na grade por segundo |
| AC-7: nada mais quebra | Passa | lotea 9/9, show-passada 15/15, selftest e 30 baterias limpos |

## Commits

`cb36a72` consertos e bateria · `904b390` pausa · `14c121e` regressão. Locais; sem push. **Não entrou em beta instalada.**

## Desvios

- O achado N3 estava descrito errado no 12-08; o plano foi escrito em cima do erro e corrigido na aplicação.
- APC40 sem prova nenhuma além da leitura.
- A escolha na lista é por evento, não por clique real.
- Regressão interrompida uma vez (pausa a pedido do Felipe) e rodada de novo inteira.

---
*Fase: 12-revisao-geral, Plano: 10 — fechado em 2026-11-14*
