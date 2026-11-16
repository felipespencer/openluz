---
description: "Slice polígono da Advanced Output do Resolume 7.28.1, medido, e a proposta de como fazê-lo no OpenLuz (07-12)"
type: Findings
about: "OpenLuz"
---

# 07-12 — Slice polígono: medidas e proposta

Resolume Arena 7.28.1, tela em Spout, "barras" no ar, em 2026-11-16. Mouse real na janela dele; saída capturada pelo
Spout. Fotos em `tools/compare/saida/ao-resolume/poli/` (fora do git). Nada do programa mudou; o XML do Resolume foi
restaurado.

## Como é no Resolume

**Nascer**
- "+" › Polygon tem dois botões: **triângulo** e **lápis**.
- O triângulo cria um item chamado "Polygon", com três pontos: o de cima no meio do topo da tela (960, 0) e os de baixo
  em (336, 1080) e (1583, 1080): um triângulo equilátero da altura da tela (caixa 1247,08 × 1080).
- O lápis leva para a aba Input Selection e mostra a faixa "Click to add points to shape, double click to close, press
  Escape to cancel". Cada clique põe um ponto; o duplo clique fecha. Enter não fecha. O item nasce como "Polygon 1".

**Abas**
- **Entrada:** tem os dois modos, Transform e Edit Points (o slice comum só tem recorte retangular na entrada). Em
  Transform o painel mostra Input Source, X, Y, Left, Top, Width, Height e Rotation da caixa; em Edit Points, só a fonte.
- **Saída:** Transform e Edit Points. O painel em Edit Points mostra Input Source, Brightness, Contrast, Red, Green,
  Blue, Is Key e Black BG e, com um ponto escolhido, **Point** X e Y. **Não tem** Flip, Soft Edge, Warping (modo de
  ponto e subdivisões) nem máscara de entrada.

**Entrada e saída**
- Os pontos da entrada e os da saída são **independentes**: movi um ponto na saída e a forma da entrada não mudou.
- A imagem é **esticada**: o pedaço da composição dentro do polígono de entrada é levado, ponto a ponto, para o polígono
  de saída. Com o ponto de cima do triângulo arrastado para o lado, o degradê das barras saiu inclinado dentro do
  triângulo da saída. No polígono de quatro pontos, a deformação muda de direção de um lado para o outro de uma
  diagonal: a forma é dividida em triângulos.

**Não medido**
- Como acrescentar e tirar pontos depois de fechado (o duplo clique na aresta, na aba de saída, só selecionou o slice
  de baixo).
- A regra exata de divisão em triângulos de um polígono com mais de quatro pontos, e polígono com reentrância.
- O polígono no arquivo salvo.

## Como é o slice do OpenLuz hoje

- Um slice tem um **recorte retangular** na entrada (`in`, com giro) e, na saída, **quatro cantos** (perspectiva) ou uma
  **malha** bezier. O motor transforma isso numa rede de triângulos (`tessellate`, em `warp.js`) em que cada vértice
  carrega a posição na tela e a posição dentro do recorte.
- A **máscara** já é um polígono com pontos que se arrastam, se acrescentam com duplo clique na linha e se apagam com
  duplo clique no ponto; e desde o 07-05 tem caixa, giro e números.

## Proposta

1. **Modelo:** um tipo novo de slice, com `polyIn` (pontos na composição, em pixels) e `polyOut` (pontos na tela), sempre
   com o mesmo número de pontos, mais fonte, cor, É chave e Fundo preto. Sem espelhar, sem soft edge e sem malha, como
   no Resolume.
2. **Motor:** dividir o polígono de entrada em triângulos (corte de orelhas, que aceita reentrância) e desenhar cada
   triângulo com os vértices nas posições de saída. É o mesmo desenho de slice que já existe, só com outra rede de
   triângulos; o shader não muda.
3. **Editor:** reaproveitar o que a máscara já faz. Transformar (caixa, giro, números, gestos do 07-04) e Editar pontos
   (arrastar, Ctrl+clique para vários, duplo clique na linha para acrescentar e no ponto para apagar), nas duas abas.
   Acrescentar ou apagar um ponto numa aba faz o mesmo na outra, para os dois polígonos continuarem casados.
4. **Menu "+":** Polígono com triângulo e lápis, nascendo como medido.

**Fora da primeira versão:** soft edge em polígono (o Resolume também não tem), converter slice comum em polígono e
vice-versa.

**Tamanho (estimativa minha):** dois planos. 07-13: modelo, motor, salvar e abrir, triângulo pelo menu, Transformar.
07-14: lápis, Editar pontos nas duas abas, acrescentar e apagar pontos. Cada um de um a dois dias, com bateria lendo os
pixels da tela.

## Perguntas para você

1. Você usa o Polygon do Resolume? Para quê: triângulos de cenário, recorte de fachada, outra coisa?
2. Faz antes ou depois da aba 3D? A aba 3D, quando gerar slices de faces, vai cobrir parte desse uso com quatro cantos;
   o polígono cobre o que não é quadrilátero.
3. Acrescentar e apagar pontos: do jeito da nossa máscara (duplo clique) está bom, já que não consegui medir o do
   Resolume?
