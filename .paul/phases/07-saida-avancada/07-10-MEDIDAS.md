---
description: "Invert da máscara de saída na Advanced Output do Resolume 7.28.1, medido na saída pelo Spout (07-10)"
type: Findings
about: "OpenLuz"
---

# 07-10 — Invert da máscara de saída, medido

Resolume Arena 7.28.1, tela em Spout, um slice com a composição inteira, "barras" no ar com a camada a 100%, em
2026-11-16. Máscara retangular criada pelo menu "+" (756×756 no centro). Cada caso capturado duas vezes, ficando a mais
clara. Capturas em `tools/compare/saida/ao-resolume/inv/` (fora do git).

| Caso | Dentro da máscara (960,540) e (700,300) | Fora (100,100), (1800,1000), (300,540) |
|------|------------------------------------------|------------------------------------------|
| como nasce (**Invert ligado**) | (0,140,140) (0,255,44): a imagem | (0,0,0) nos três: preto |
| Invert desligado | (0,0,0) nos dois: preto | (255,76,0) (255,0,95) (255,235,0): a imagem |

## Leitura

- A máscara de saída do Resolume nasce como uma **janela**: a imagem aparece só dentro da forma.
- Com Invert desligado ela vira um **furo**: a forma fica preta e o resto aparece.
- No OpenLuz a caixa Inverter já tinha o mesmo sentido (o selftest confere: desligada, o centro fica preto; ligada, só o
  centro aparece). A diferença era só o estado de fábrica: a nossa nascia desligada.

## Não medido

- Máscara desenhada à mão e as outras formas (círculo, triângulo, hexágono): só a retangular foi medida.
- Duas máscaras juntas na mesma tela.
