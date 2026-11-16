---
phase: 07-saida-avancada
plan: 09
subsystem: saida-avancada
tags: [origem-da-entrada, bus, crossfader, grupo, camada-selecionada, resolume]

requires:
  - phase: 07-saida-avancada
    provides: lista de diferenças (07-03, linha 23) e o achado do 07-07 (Input Opacity, Input Bypass/Solo)
provides:
  - fontes novas do slice: Camada selecionada, Grupo selecionado, Bus A, Bus B
  - "Opacidade da camada" e "Bypass/Solo da camada" no slice que lê uma camada
  - 07-09-MEDIDAS.md
  - tools/ao-origem-check.mjs (20 verificações lendo os pixels da tela)
affects: [07-10 em diante]

key-files:
  created: [tools/ao-origem-check.mjs, .paul/phases/07-saida-avancada/07-09-MEDIDAS.md]
  modified: [app/engine.js, app/ao.js, app/screens.js, app/app.js]

key-decisions:
  - "Bus A e Bus B mostram só o que está no bus, sem o fator do crossfader: escolha minha, não medida no Resolume (a API recusou o crossfader)"
  - "Grupo selecionado entra com os efeitos, a transformação e a opacidade do grupo, sem o fator do crossfader: não medido"
  - "Prévia, Result e outra tela como fonte ficam de fora"

duration: 2026-11-16
started: 2026-11-16
completed: 2026-11-16
description: "Origens da entrada do slice: camada e grupo selecionados, Bus A e B, e as opções de opacidade e bypass/solo da camada"
type: Summary
about: "OpenLuz"
---

# Fase 7 Plano 09: origens da entrada — Resumo

**A linha Fonte do slice ganhou Camada selecionada, Grupo selecionado, Bus A e Bus B; e o slice que lê uma camada pode
ignorar a opacidade ou o bypass/solo dela, como o Input Opacity e o Input Bypass/Solo medidos no Resolume.**

## Critérios de aceite

| AC | Resultado |
|----|-----------|
| AC-1 medido no Resolume | Parcial — Input Opacity e Input Bypass/Solo medidos; Bus A/B, Selected Layer e Selected Group não |
| AC-2 origens novas | Passou no OpenLuz (pixels da tela): camada selecionada segue a seleção da grade; Bus A independe do crossfader; grupo selecionado segue a opacidade do grupo |
| AC-3 opções da camada | Passou — opacidade a 50%, bypass e solo de outra camada, ligadas e desligadas |
| AC-4 nada quebra | Passou — ao-origem 20/20 (reprovava antes), dez baterias da Saída avançada, selftest 75/75 e as baterias; `rosto` reprovou duas vezes e passou na terceira rodada, com a mesma falha de antes das mudanças ("Rosto < Busto": 166 < 165) |

## O que foi feito

- `app/engine.js`: `neededLayers` passa a guardar em `this.need` as fontes além da camada simples; `renderSliceSources` desenha uma textura por combinação pedida (camada sem opacidade e/ou sem bypass/solo, cada bus, o grupo selecionado); `drawTree` monta camadas e grupos num alvo transparente; `drawLayer` e `busFactor` aceitam os três desvios (`_rawOp`, `_rawBy`, `_noBus`).
- `app/app.js`: informa ao motor a camada e o grupo selecionados a cada quadro.
- `app/screens.js`: `inOpacity` e `inBypass` no slice, salvos e abertos (padrão ligados).
- `app/ao.js`: fontes agrupadas (Composição, Crossfader, Grupos, Camadas) e as duas caixas quando a fonte é uma camada.

## Não conferido

- Tudo o que não foi medido no Resolume (ver 07-09-MEDIDAS.md).
- Composição salva com as fontes novas e reaberta pelo arquivo (a cópia do slice, que passa pelo mesmo salvar e abrir, guarda; o arquivo da composição não foi rodado).
- Custo: cada combinação pedida é um passe a mais por quadro; não medi os quadros por segundo com várias ao mesmo tempo.

## Pendências

- A bateria do rosto oscila no item "Rosto < Busto < Corpo": merece um plano próprio.
- 07-10 em diante: Prévia e outra tela como entrada; Inverter padrão; slice polígono e Exportar SVG.
