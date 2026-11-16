---
description: "Input Opacity e Input Bypass/Solo do slice na Advanced Output do Resolume 7.28.1, medidos na saída pelo Spout (07-09)"
type: Findings
about: "OpenLuz"
---

# 07-09 — Opções da camada como fonte do slice, medidas

Resolume Arena 7.28.1, tela em Spout, slices "Fundo" (composição inteira) e "Cima" (960×540 no centro, na frente) lendo
a **camada 2**, com "barras" no ar nela, em 2026-11-16. Opacidade e bypass da camada mudados pela API pública (porta
8080). Cada caso capturado duas vezes com sete segundos de intervalo, ficando a captura mais clara (a marca d'água da
demonstração escurece um quadro em cada tanto). Capturas em `tools/compare/saida/ao-resolume/org/` (fora do git).

Pixels em (500,540), (960,540), (1400,540) dentro do "Cima" e em (100,100) fora.

| Camada 2 | Input Opacity | Input Bypass/Solo | Dentro do "Cima" | Fora |
|----------|---------------|-------------------|------------------|------|
| opacidade 1,0 | ligado | ligado | (63,140,0) (0,140,140) (95,0,255) | (255,76,0) |
| opacidade 0,2 | ligado | ligado | (33,73,0) (0,73,73) (49,0,133) | (102,30,0) |
| opacidade 0,2 | **desligado** | ligado | (63,140,0) (0,140,140) (95,0,255) | (102,30,0) |
| opacidade 1,0 | desligado | ligado | igual à primeira linha | (255,76,0) |
| bypass (opacidade 0,5) | ligado | ligado | (0,0,0) | (0,0,0) |
| bypass (opacidade 0,5) | ligado | **desligado** | (31,70,0) (0,70,70) (47,0,127) | (0,0,0) |

## Leitura

- **Input Opacity** ligado (o padrão): o slice escurece junto com a camada. Desligado: o slice mostra a camada inteira,
  qualquer que seja a opacidade dela, enquanto a composição continua escurecida.
- **Input Bypass/Solo** ligado (o padrão): com a camada em bypass o slice some. Desligado: o slice continua mostrando a
  camada.
- As duas linhas só aparecem no painel quando a fonte é uma camada; com Composition ou Bus A elas somem.

## O que não fecha e o que não foi medido

- A conta exata do brilho não fecha com uma multiplicação simples: a 0,2 de opacidade a composição sai a 40% do brilho
  (102 de 255), e a 0,5 e a 1,0 saem iguais. Não investiguei; o que usei foi só o sentido de cada opção.
- **Bus A e Bus B não foram medidos:** a API recusou pôr a camada num bus (400) e mexer no crossfader (404). Só vi que o
  slice lendo um bus vazio deixa ver o slice de baixo.
- Solo de outra camada, Selected Layer, Selected Group, Preview, Result e Screen como fonte: não medidos.
