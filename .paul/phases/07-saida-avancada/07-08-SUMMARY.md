---
phase: 07-saida-avancada
plan: 08
subsystem: saida-avancada
tags: [guia, mostrar-na-saida, grade, resolume]

requires:
  - phase: 07-saida-avancada
    provides: lista de diferenças (07-03, linhas 17 e 26)
provides:
  - guia de entrada e guia de saída por tela (carregar, soltar arquivo, trocar, tirar, opacidade), salvas com a saída
  - "Mostrar na saída" no menu da grade
  - 07-08-MEDIDAS.md
  - tools/ao-guia-check.mjs (16 verificações), tools/compare/sondas/dialogo_arquivo.py
affects: [07-09 em diante]

key-files:
  created: [tools/ao-guia-check.mjs, tools/compare/sondas/dialogo_arquivo.py, .paul/phases/07-saida-avancada/07-08-MEDIDAS.md]
  modified: [app/ao.js, app/screens.js, app/app.js, app/style.css, app/output.html]

key-decisions:
  - "\"Mostrar na saída\" nasce LIGADO: é o comportamento que o OpenLuz já tinha (grade e cruz do cursor no projetor); no Resolume do Felipe estava desligado"
  - "A guia é guardada dentro da saída como cópia reduzida (até 1280 px, JPEG), não como caminho de arquivo: o preset e a composição abrem em outro computador com a guia"
  - "Com \"Mostrar na saída\", vão para o projetor a guia de saída, o contorno e o nome do slice e a cruz do cursor; as alças não vão"

duration: 2026-11-15 a 2026-11-16
started: 2026-11-15
completed: 2026-11-16
description: "Imagem de guia por tela e \"Mostrar na saída\" na Saída avançada, medidos no Resolume"
type: Summary
about: "OpenLuz"
---

# Fase 7 Plano 08: guia e Mostrar na saída — Resumo

**A tela ganhou guia de entrada e guia de saída (imagem de referência por cima do palco, 25% ao carregar), e o menu da
grade ganhou "Mostrar na saída", que decide se a grade, a cruz e a guia de saída vão também para o projetor.**

## Critérios de aceite

| AC | Resultado |
|----|-----------|
| AC-1 medido no Resolume | Passou, com lacunas anotadas (07-08-MEDIDAS.md, "Não medido") |
| AC-2 igual no OpenLuz | Passou — carregar pelo diálogo do sistema, opacidade, cada aba com a sua guia, tirar, Ctrl+Z, preset; na janela de saída a guia aparece com "Mostrar na saída" e some sem ele. **Soltar o arquivo no painel não foi testado** (só o botão) |
| AC-3 nada quebra | Com ressalva — ao-guia 16/16 (reprovava antes), dez baterias da Saída avançada e de projetor, 30 baterias. **O selftest reprovou em 1 de 75** ("fonte Captura: página web num navegador escondido"), igual no código anterior: ambiente, com os monitores desligados pelo Felipe. `rosto` falhou a primeira e passou a segunda |

## Achado no caminho

- Desfazer, Novo, abrir preset e Cancelar trocavam as telas sem levar a guia (o `setScreens` do app copia campo por campo). Corrigido em `app/app.js`.

## Desvios

- `main.js` e `app/preload.js` estavam na lista do plano e não precisaram mudar; `app/output.html` não estava e mudou (desenha a guia na saída).
- A guia entra também no arquivo da composição, que salva as telas: algumas dezenas a centenas de KB a mais por guia.

## Não conferido

- Soltar arquivo no painel; imagens tif (o Resolume aceita; aqui vale o que o navegador abre).
- A guia num projetor de verdade.
- O que ficou em "Não medido" no 07-08-MEDIDAS.md.

## Pendências

- Decidir se "Mostrar na saída" nasce ligado (hoje) ou desligado.
- Rodar o selftest de novo com os monitores ligados.
- 07-09 em diante: origens da entrada (com Input Opacity e Bypass/Solo), Inverter padrão; polígono e SVG por último.
