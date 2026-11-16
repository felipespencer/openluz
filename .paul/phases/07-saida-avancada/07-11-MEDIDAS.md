---
description: "Gestos do modo Edit Points na Advanced Output do Resolume 7.28.1, medidos pelos números do painel (07-11)"
type: Findings
about: "OpenLuz"
---

# 07-11 — Edit Points, medido

Resolume Arena 7.28.1, um slice "Meio" de 960×540 no centro de uma tela 1920×1080, aba Output Transformation, modo Edit
Points, Point Mode Linear, sem subdivisões, ímã ligado, zoom 35%, em 2026-11-16. Mouse e teclado reais
(`tools/compare/sondas/ao_resolume.py`); cada gesto desfeito pelo botão antes do seguinte. Fotos em
`tools/compare/saida/ao-resolume/pt/` (fora do git).

Com um ponto escolhido, o painel ganha as linhas **X** e **Y** dele, depois de Subdivisions (canto de baixo à direita:
1440 e 810).

| Gesto no ponto (1440, 810) | Resultado |
|----------------------------|-----------|
| arrastar 35 px para a direita e 31 para baixo | 1538,82 e 897,53: livre e **com fração**, mesmo com o ímã ligado |
| o mesmo com Shift (35 e 16 px) | 1538,82 e 855,18: **não prende o eixo** |
| o mesmo com Alt | 1538,82 e 897,53: igual a sem Alt |
| o mesmo com Ctrl, no ponto já escolhido | o ponto não anda e **sai da seleção** (somem X e Y do painel) |
| seta para a direita | 1441: 1 px |
| Shift + seta para a direita | 1450: 10 px |

## Vários pontos

- Clicar num ponto e dar **Ctrl+clique** em outro: os dois ficam acesos e o painel não mostra X e Y.
- Com os dois escolhidos, duas setas para baixo e uma para a direita: lidos depois um a um, os dois estavam em +1 e +2
  ((1441, 272) e (1441, 812)). As setas movem todos os pontos escolhidos.
- Clicar num ponto que já está na seleção mantém a seleção (o painel continua sem X e Y); clicar num ponto de fora
  deixa só ele escolhido.
- Arrastar um ponto da seleção moveu só o ponto arrastado (o outro ficou onde estava).
- Shift+clique em outro ponto: ficou só esse escolhido (não soma).

## Não medido

- Point Mode Bezier e as alças; subdivisões (pontos de dentro da malha); arrastar uma caixa em volta de vários pontos.
- Pontos de máscara e de slice polígono.
- O mesmo na aba Input Selection.
