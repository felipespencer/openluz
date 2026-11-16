---
phase: 07-saida-avancada
plan: 16
subsystem: saida-avancada
tags: [origem-da-entrada, previa, tela-como-fonte]

requires:
  - phase: 07-saida-avancada
    provides: fontes do slice e como o motor as resolve (07-09)
provides:
  - fontes novas do slice e do polígono: Prévia e cada outra tela (a saída pronta dela)
  - ao-origem-check com 31 verificações
affects: [14 Saída 3D]

key-files:
  created: []
  modified: [app/engine.js, app/app.js, app/ao.js, tools/ao-origem-check.mjs, COMO-USAR.md, docs/notas-0.3.0-beta.3-rascunho.md]

key-decisions:
  - "Nada disto foi medido no Resolume (o Arena não abriu os menus): Prévia = o clipe do quadro Prévia; tela = a saída pronta dela"
  - "A textura de outra tela entra esticada no quadro da composição; o recorte do slice continua em pixels da composição"
  - "Fonte que não existe (Prévia vazia, tela apagada ou desligada): o slice não desenha nada, nem o Fundo preto"
  - "Result do crossfader não entrou: seria igual à Composição"

duration: 2026-11-16
started: 2026-11-16
completed: 2026-11-16
description: "Prévia e outra tela como fonte do slice na Saída avançada"
type: Summary
about: "OpenLuz"
---

# Fase 7 Plano 16: Prévia e outra tela como fonte — Resumo

**A linha Fonte do slice e do polígono ganhou "Prévia" e um grupo "Telas" com as outras telas. A linha 23 do
07-03-DIFERENCAS.md está fechada e, com ela, a lista do 07-03 terminou** (ficam de fora, por decisão, DMX e o Result do
crossfader).

## Critérios de aceite

| AC | Resultado |
|----|-----------|
| AC-1 Prévia como fonte | Passou — com o clipe fora do ar, a composição apaga e o slice mostra a Prévia; Prévia vazia, o slice não desenha |
| AC-2 outra tela como fonte | Passou — 36 pontos do slice iguais aos da saída da Tela 2 (em pé, 1080×1920, com máscara em janela num canto), com a janela dela fechada; a própria tela não aparece na lista; apagada a Tela 2, o slice deixa de desenhar e nada quebra |
| AC-3 salvar, polígono e nada quebra | Passou — preset guarda a fonte; polígono com as mesmas fontes; ao-origem 31/31 (reprova no código anterior), onze baterias da Saída avançada e de projetor, selftest e as 30 baterias, todas na primeira rodada; nada aberto |

## O que foi feito

- `app/engine.js`: `neededLayers` anota se alguém pede a Prévia e quais telas (pelo uid); `sourceTex` devolve a Prévia
  (só se desenhada neste quadro) ou a saída guardada da tela; `renderScreen` repete o passe final numa textura própria
  (`screenOut`) quando a tela é pedida.
- `app/app.js`: com um slice pedindo a Prévia, ela é desenhada todo quadro, mesmo com o quadro Prévia fora da vista;
  telas pedidas vão primeiro e são desenhadas mesmo fechadas, sem cópia para janela.
- `app/ao.js`: `fontes()` monta a lista para slice e polígono.

## Medido

- 29,9 quadros por segundo sem as fontes novas, com a Prévia, e com Prévia mais uma tela — sem janela de saída aberta.

## Não conferido

- O comportamento no Resolume (Preview, Screens e Result como Input Source).
- Quadros por segundo com saídas abertas nos projetores.
- Duas telas que se pedem uma à outra (o desenho usa o quadro anterior; não rodado).
- A cena no olho: só pixels lidos da placa.
- Composição salva em arquivo e reaberta com tela como fonte (o preset, que usa o mesmo salvar das telas, guarda).

## Pendências

- A lista da Saída avançada acabou. O que resta da Fase 7 depende do Felipe: usar com os projetores e dizer o que falta.
