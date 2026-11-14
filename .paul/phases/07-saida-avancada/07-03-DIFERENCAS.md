---
description: "Saída avançada do OpenLuz contra a Advanced Output do Resolume 7.28.1: o que falta, o que é diferente e o que não foi medido (07-03)"
type: Findings
about: "OpenLuz"
---

# 07-03 — Saída avançada × Advanced Output do Resolume

Medido em 2026-11-14. Resolume Arena 7.28.1 com mouse e teclado reais na janela dele (`tools/compare/sondas/ao_resolume.py`);
OpenLuz de desenvolvimento (commit `1acc7ae`) com mouse e teclado reais pelo CDP. Caso dos dois lados: uma tela 1920×1080,
dois slices e uma máscara de saída retangular. Nada do programa foi mudado; o `AdvancedOutput.xml` do Resolume foi
restaurado byte a byte e os dois programas fechados.

Fotos (fora do git): Resolume em `tools/compare/saida/ao-resolume/` (`01`…`21`, gestos em `g/folha*.png`); OpenLuz em
`tools/compare/saida/ao-nosso/` (junto com os dois roteiros usados, `ao-nosso.mjs` e `ao-gestos.mjs`).

**Tipo:** F = falta · D = diferente · N = só nosso, de propósito. **Tamanho do conserto:** P (horas), M (um dia), G (vários dias).

## 1. Gestos do mouse e do teclado (é aqui que mais se sente a diferença)

| # | Gesto | Resolume | OpenLuz | Tipo | Tam. | Foto |
|---|-------|----------|---------|------|------|------|
| 1 | Arrastar o corpo | anda em pixels inteiros (960 → 1158) | anda com fração (672 → 802,74) | D | P | g/folha.png |
| 2 | Shift + arrastar o corpo | prende no eixo (só X mudou) | não prende (X e Y mudam) | F | P | g/folha.png |
| 3 | Ctrl + arrastar | solta o inteiro e o encaixe (1157,65) | igual a sem Ctrl | F | P | g/folha2.png |
| 4 | Alt + arrastar o corpo | duplica o item e arrasta a cópia (desfazer leva a seleção para a tela) | só move; não duplica | F | M | g/folha2.png |
| 5 | Arrastar um canto | redimensiona livre, canto oposto fixo, inteiros | redimensiona livre, canto oposto fixo, com fração | D | P | g/folha2.png |
| 6 | Shift + canto | mantém a proporção (756×756 → 826×826) | não mantém (641×462) | F | P | g/folha2.png |
| 7 | Alt + canto | redimensiona a partir do centro (X e Y do centro não mudam) | igual a sem Alt | F | P | g/folha2.png |
| 8 | Alça do meio do lado | só a largura | só a largura | igual | — | g/folha2.png |
| 9 | Anel em volta do canto | gira em volta do centro (−11,5° no teste) | o anel é desenhado; arrastando 9 px fora do canto pegou o slice de baixo. **Giro pelo anel não confirmado do nosso lado** | não medido | P–M | g/folha3.png |
| 10 | Seta | 1 px | 1 px | igual | — | g/folha2.png |
| 11 | Shift + seta | 1 px no teste (**não confirmado**: o Shift pode não ter chegado ao Resolume) | 10 px | não medido | — | g/folha2.png |
| 12 | Roda do mouse no palco | muda o zoom (35% → 37% em 3 cliques) | não faz nada | F | P | g/folha3.png |
| 13 | Ctrl + roda | igual à roda | não faz nada | F | P | g/folha3.png |

## 2. Barra de cima e menus

| # | Área | Resolume | OpenLuz | Tipo | Tam. | Foto |
|---|------|----------|---------|------|------|------|
| 14 | Menu Presets | Save, Save as…, Remove, Rename…, New, Show in Explorer, Load…, Export to SVG…, e a lista | Salvar preset, Apagar preset e a lista | F | M (sem o SVG) · G (com exportar SVG) | 02-presets |
| 15 | Menu "+" | Screen, Slice, Polygon (triângulo e lápis), Output Mask (retângulo, círculo, triângulo, hexágono, lápis), DMX Lumiverse, DMX Fixture | Tela, Slice, Máscara de saída (as mesmas cinco formas) | F | G (slice polígono) · DMX fora do escopo | 03-mais |
| 16 | Zoom | Fit, 10%, 25%, 50%, 100%, 150%, 200%, 300%; o campo mostra a porcentagem real (35%) | Ajustar, 25%, 50%, 100%, 200%; o campo mostra "Ajustar" | D | P | 04-zoom |
| 17 | Menu da grade | Show Slice Grid, Show 8x8 LED Grid, Identify Slices, Show in Output | os três primeiros; sem "Mostrar na saída" | F | P–M | 05-grade |
| 18 | Botão Automape na barra | não tem | tem | N | — | 11-editpoints |
| 19 | Desfazer pelo teclado | Ctrl+Z não desfez no teste (pode ser foco); o botão desfaz | Ctrl+Z e o botão desfazem | não medido | — | — |

## 3. Lista de telas e slices

| # | Área | Resolume | OpenLuz | Tipo | Tam. | Foto |
|---|------|----------|---------|------|------|------|
| 20 | Slice novo | não medido | entra com metade do tamanho, no centro, com o nome em cima do nome do slice de baixo | D (nomes sobrepostos já anotados no pente fino) | P | 11-editpoints |
| 21 | Máscara nova | quadrado 756×756 no centro, **Invert ligado** | retângulo 576×432 no centro, Inverter desligado | D | P | 15-mascara |
| 22 | Apagar | "X" só no item selecionado | "✕" em todos os itens e botão "Apagar" no painel | D | P | 06, 15 |

## 4. Painel de propriedades

| # | Área | Resolume | OpenLuz | Tipo | Tam. | Foto |
|---|------|----------|---------|------|------|------|
| 23 | Origem da entrada do slice | Screens (outra tela), Composition, Preview, CrossFader (Result, Bus A, Bus B), Selected Group, Selected Layer, cada camada | Composição e cada camada | F | M (prévia, bus A/B, camada e grupo selecionados) · G (tela como entrada) | 07-input-source |
| 24 | Slice na saída | Flip, **Is Key**, **Black BG**, Brightness, Contrast, Red, Green, Blue, Soft Edge, Black Level Compensation | Espelhar, Brilho, Contraste, Vermelho, Verde, Azul, Soft Edge; sem Is Key e Black BG | F | M | 09, 10 |
| 25 | Máscara | X, Y, Left, Top, Width, Height, Rotation, Invert e as formas | só Inverter, Pontos e Apagar: **sem números de posição, tamanho e giro** | F | M | 15-mascara |
| 26 | Tela | Device, Width, Height, Opacity, Brightness, Contrast, Red, Green, Blue, **Input Guide / Output Guide** (imagem de guia) | Dispositivo, tamanho, Opacidade e cores (lido no código; o painel da tela não foi fotografado do nosso lado); sem imagem de guia | F | M | 14-tela-saida |
| 27 | Soft Edge | caixa por slice com Gamma Red/Green/Blue, Gamma, Luminance, Power | por degradê com alça, até oito por slice | N (07-01) | — | 08-softedge |
| 28 | Editar pontos | Point Mode Linear/Bezier, Subdivisions X/Y | Modo de ponto Reta/Bezier, Divisões X/Y, mais "Zerar os pontos" | igual (+N) | — | 11, 13 |

## 5. O que não foi medido

- Arrastar pontos no modo Editar pontos, alças do Bezier e a malha com subdivisões, dos dois lados.
- Gestos na aba Input Selection (só a aba de saída foi medida).
- Slice polígono e máscara desenhada à mão no Resolume.
- Botão direito: já medido e igualado no 07-02; não foi repetido.
- Mão (arrastar a vista) e barra de espaço.
- Encaixe do ímã: os valores inteiros do Resolume podem vir do ímã ligado; não separei ímã de arredondamento.
- Fixture/DMX, NDI e saídas em rede: fora do escopo, sem equipamento.
- A imagem que sai no projetor com os mesmos números (só a janela de edição foi comparada).

## 6. Do pente fino, na mesma área (lote B1, ainda aberto)

36 projetor ligado depois de abrir não aparece · 37 "Automático" com a saída aberta reabre janela pequena · 38 desligar
uma tela tira os slices dela da emenda · 41 escala do Windows diferente de 100% no projetor · 43 a lista Telas se refaz a
cada segundo e fecha o seletor.

## 7. Leitura

O "não está igual" aparece sobretudo na mão: Shift, Ctrl, Alt, a roda do mouse e os pixels inteiros (linhas 1 a 13) são
onze diferenças pequenas que se sentem a cada arrasto. Depois vêm os painéis (23 a 26) e o menu de presets (14). Slice
polígono e exportar SVG são os únicos itens grandes. Soma do que é falta ou diferente, sem polígono, SVG e DMX: cerca de
uma semana de trabalho com as baterias; isso é estimativa minha, não medida.
