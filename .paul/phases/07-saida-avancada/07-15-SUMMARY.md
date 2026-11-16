---
phase: 07-saida-avancada
plan: 15
subsystem: saida-avancada
tags: [presets, svg, exportar]

requires:
  - phase: 07-saida-avancada
    provides: menu Presets (07-06) e slice polígono (07-13, 07-14)
provides:
  - Presets › Exportar SVG…: escolhe uma pasta, grava Input.svg e um Output<N>_<tela>.svg por tela, abre a pasta
  - pergunta antes de gravar por cima de arquivos que já existam na pasta
  - 07-15-MEDIDAS.md com o formato do Export to SVG do Resolume 7.28.1
  - ao-presets-check com 30 verificações
affects: [14 Saída 3D]

key-files:
  created: [.paul/phases/07-saida-avancada/07-15-MEDIDAS.md]
  modified: [app/ao.js, main.js, app/preload.js, tools/ao-presets-check.mjs, COMO-USAR.md, docs/notas-0.3.0-beta.3-rascunho.md]

key-decisions:
  - "Pasta, não nome de arquivo: é assim no Resolume (o plano falava em dar um nome)"
  - "viewBox no lugar do viewport que o Resolume escreve: é o nome que os programas de desenho leem"
  - "Não medido e decidido aqui: Input.svg com um grupo por tela; slice de malha como caminho do contorno; máscara de entrada fora"
  - "Pergunta antes de gravar por cima: o Resolume não foi medido nisso; entrou depois de um arquivo de teste cair numa pasta do Felipe"

duration: 2026-11-16
started: 2026-11-16
completed: 2026-11-16
description: "Exportar SVG no menu Presets da Saída avançada, no formato medido no Resolume"
type: Summary
about: "OpenLuz"
---

# Fase 7 Plano 15: Exportar SVG — Resumo

**O menu Presets da Saída avançada ganhou "Exportar SVG…": numa pasta escolhida saem `Input.svg` (os recortes na
composição) e um `Output<N>_<nome da tela>.svg` por tela (as formas na saída), cada item com o nome dele, em pixels.
A linha 14 do 07-03-DIFERENCAS.md está fechada.**

## Critérios de aceite

| AC | Resultado |
|----|-----------|
| AC-1 medido no Resolume | Passou em parte — uma tela com slice, slice deformado, polígono e máscara redonda foi exportada e lida; duas telas, subdivisões, entrada girada, máscara de entrada e máscara reta ficaram sem medir (escrito no 07-15-MEDIDAS.md) |
| AC-2 Exportar SVG no OpenLuz | Passou — ao-presets-check 30/30 (reprova no código anterior); a janela de pasta do Windows foi usada de verdade uma vez: gravou, abriu a pasta e avisou |
| AC-3 nada quebra | Passou — onze baterias da Saída avançada e de projetor, selftest e as 30 baterias, todas na primeira rodada; nada aberto |

## Desvios do plano

- O plano dizia "dou um nome e confirmo": no Resolume é uma pasta, e ficou assim.
- Entrou a pergunta "Gravar por cima?" quando a pasta já tem arquivos com os mesmos nomes (não estava no plano).
- O aviso de erro tira o prefixo técnico do Electron ("Error invoking remote method…").

## Tropeços

- **Arquivos numa pasta do Felipe.** Ao provar a janela de pasta com o teclado, o Enter confirmou a pasta em que a janela
  abriu (`SUPLICY 2026\_identidade\_marcas`) e o programa gravou ali `Input.svg` e `Output1_Projetor.svg`. Conferidos
  como os do teste e apagados; nada mais da pasta foi tocado. A sonda `dialogo_arquivo.py` funciona na janela do
  Resolume (o campo Pasta nasce com o foco) e NÃO na do Electron: não usar de novo sem clicar antes no campo.
- **Resolume.** Depois da primeira exportação o campo Presets passou a abrir em modo de nome ("untitled") e o clique em
  Export to SVG… zerou a saída de prova três vezes; em seguida o Arena congelou e, reaberto, não abriu mais menus.
  Fechado à força duas vezes. AdvancedOutput.xml igual ao de antes; nenhum preset gravado. O aviso da versão 7.29
  apareceu e foi dispensado com "Lembre-me mais tarde".
- Um script de edição passado por heredoc perdeu as barras invertidas e pôs um byte nulo no main.js; consertado antes de
  qualquer execução (sintaxe conferida, sem byte nulo).
- O Edit do STATE.md trocou nove fins de linha CRLF soltos por LF.

## Não conferido

- A caixa "Gravar por cima?" com clique de verdade (a bateria confere que nada é gravado; a caixa nativa não foi clicada).
- Os arquivos abertos no Illustrator ou no Inkscape (só o leitor de XML do navegador).
- O que ficou sem medir no Resolume (acima).

## Pendências

- 07-16: Prévia e outra tela como entrada do slice. Com isso a lista do 07-03 termina.
