---
description: "Imagem de guia e Show in Output na Advanced Output do Resolume 7.28.1, medidos no palco e na saída pelo Spout (07-08)"
type: Findings
about: "OpenLuz"
---

# 07-08 — Guia e Show in Output, medidos

Resolume Arena 7.28.1, tela "Screen 1" em Spout, dois slices ("Esq" e "Dir"), "barras" no ar, em 2026-11-15/16. Fotos e
capturas em `tools/compare/saida/ao-resolume/guia/` (fora do git). O arquivo da guia foi escolhido no diálogo do Windows
com `tools/compare/sondas/dialogo_arquivo.py`.

## Imagem de guia

- Com a tela selecionada, o painel tem **Input Guide** na aba Input Selection e **Output Guide** na aba Output
  Transformation: botão "Load…" e o texto "Drop image file here.". O diálogo aceita jpg, jpeg, png, tif e tiff.
- Carregada, a seção mostra a miniatura, o nome do arquivo, o tamanho em pixels ("1920x1080"), um "X" que tira a guia, um
  "…" que troca a imagem e a linha **Opacity**, que nasce em **25 %**.
- A guia é desenhada por cima da imagem do palco daquela aba, esticada no palco inteiro, por baixo das alças dos slices.
- **Não vai para a saída:** com a guia de saída carregada, duas capturas pelo Spout saíram iguais à base, pixel por pixel.
  (A captura com a guia de entrada saiu a 78% do brilho uma vez só; leitura minha: marca d'água da demonstração. Não repeti.)

## Menu da grade

| Opções ligadas | Palco | Saída pelo Spout |
|----------------|-------|------------------|
| Show Slice Grid | grade 5×5 no slice selecionado e o nome dele | igual à base (uma captura em duas veio com a marca d'água) |
| Show Slice Grid + Show in Output | idem | diferente da base em 749 777 pixels, igual nas duas capturas: aparecem a guia de saída (25%), a grade do slice e os quadradinhos das alças |

**Show in Output** manda para a saída o que o palco de saída desenha por cima da imagem: guia, grade, nome e alças.

## Não medido

- Show 8x8 LED Grid e Identify Slices na saída, com e sem Show in Output.
- A cruz vermelha do cursor na saída (o texto de ajuda do Resolume fala nela).
- Se a guia de entrada entra na saída com Show in Output.
- O estado de fábrica do Show in Output (no Resolume do Felipe estava desligado).
