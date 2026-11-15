---
description: "Is Key e Black BG do slice na Advanced Output do Resolume 7.28.1, medidos na saída pelo Spout (07-07)"
type: Findings
about: "OpenLuz"
---

# 07-07 — Is Key e Black BG, medidos

Resolume Arena 7.28.1, tela "Screen 1" com saída em Spout (nada foi para os projetores), em 2026-11-15. Dois slices:
"Fundo" (a composição inteira, embaixo) e "Cima" (960×540 no centro, na frente). No ar: "barras" na camada 2 (imagem meio
transparente) e "Lines" na camada 1; a camada 3 vazia. Capturas em `tools/compare/saida/ao-resolume/kb/` (fora do git),
feitas com `tools/compare/capture.py`; caixas clicadas com `tools/compare/sondas/ao_resolume.py`.

Pixels lidos na linha y = 540, em x = 500, 960 e 1400 (dentro do "Cima"), e em (100, 100) (fora dele).

| Caso | Dentro do "Cima" | Fora | Leitura |
|------|------------------|------|---------|
| base: "Cima" lendo a composição | (63,140,0) (0,140,140) (95,0,255) | (255,76,0) | — |
| "Cima" lendo a camada 3 (vazia) | igual à base | igual | conteúdo transparente deixa ver o slice de baixo |
| camada 3 + Is Key | igual à base | igual | sem conteúdo, a chave não desenha nada |
| camada 3 + Black BG | (0,0,0) nos três | igual | preto opaco na forma do slice |
| camada 3 + Is Key + Black BG | (0,0,0) nos três | igual | preto |
| "Cima" lendo a camada 2, caixas desligadas | igual à base (três capturas seguidas) | igual | — |
| camada 2 + Is Key | (159,197,127) (127,197,197) (175,127,255) | igual | 127 + metade do de baixo: branco na medida da transparência (0,5), por cima do slice de baixo |
| camada 2 + Is Key + Black BG | (127,127,127) nos três | igual | a transparência em cinza, sobre preto |

## O que cada caixa faz

- **Black BG:** desenha preto opaco na forma do slice, por baixo da imagem dele. Onde a imagem é transparente não aparece
  o que está atrás.
- **Is Key:** troca a cor da imagem do slice por branco, mantendo a transparência (o sinal de recorte). Continua sendo
  misturado por cima do que está atrás; com Black BG sai a transparência pura em tons de cinza.

## Tropeços e o que não foi medido

- Uma captura saiu escura por inteiro (15% do brilho): era a marca d'água da versão de demonstração do Resolume. Repeti
  o caso três vezes com sete segundos de intervalo.
- Com o slice lendo uma camada, o painel do Resolume ganha duas linhas, "Input Opacity" e "Input Bypass/Solo", que
  empurram as outras para baixo; os primeiros cliques caíram no lugar errado e foram descartados. Essas duas opções não
  existem no OpenLuz e não foram medidas.
- Não medi: Black BG com Soft Edge ou com máscara de entrada no mesmo slice; Is Key com brilho, contraste e cor do slice.
- A camada 1 ("Lines") lida sozinha saiu preta e opaca: o gerador tem fundo preto, não transparente.
