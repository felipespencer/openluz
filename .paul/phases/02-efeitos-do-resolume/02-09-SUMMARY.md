---
phase: 02-efeitos-do-resolume
plan: 09
subsystem: efeitos
tags: [gabarito, resolume, sondas, sem-plano]

requires:
  - phase: 02-efeitos-do-resolume
    provides: bancada lado a lado (02-01)
provides:
  - gabarito em disco do Resolume 7.28.1 (tools/compare/gabarito.py, gabarito2.py, confere.mjs, confere-tudo.mjs, compila.mjs)
  - efeitos como dados em app/effects-r1.js … effects-r6.js
  - sondas com imagem de teste (tools/compare/sondas/)
  - passagem intermediária com mipmap no motor (stageMip)
affects: [02-10, 02-11]

key-files:
  created: [app/effects-r1.js … app/effects-r6.js, tools/compare/gabarito.py, tools/compare/gabarito2.py, tools/compare/confere.mjs, tools/compare/confere.py, tools/compare/confere-tudo.mjs, tools/compare/compila.mjs, tools/compare/abre-dev.mjs, tools/compare/sondas/bloom_psf.py, bloom_lin.py, radial_quant.py]
  modified: [app/engine.js, app/effects.js]

key-decisions:
  - "Efeito refeito carrega v: 2; composição antiga volta ao padrão nesses efeitos"
  - "Número por pixel não serve para efeito sorteado ou de traço fino: esses ficam 'a olho'"
---

# 02-09: gabarito dos efeitos e três rodadas de igualar — REGISTRO DE TRABALHO FEITO SEM PLANO

**Este trabalho não teve PLAN.md.** Começou em 2026-11-12 com o pedido "bora pra v0.3, deixa igual ao resolume" e seguiu
com "Segue nos efeitos" só com notas em `02-09-LOTES.md`. Em 2026-11-13 o Felipe cobrou ("sempre que for mexer no openluz vc
tem que abrir o paul:plan, sempre!!!"); este resumo foi escrito depois, dentro do plano 02-10, para o PAUL não ficar com um
buraco. O número 02-09 estava reservado no ROADMAP para os efeitos Depth; eles passam para o 02-11 em diante.

## O que foi feito
- **Gabarito**: `gabarito.py` fotografa cada efeito do Resolume (padrão + cada controle em 5 valores) em
  `tools/compare/saida/ref/<efeito>/` (fora do git); `gabarito2.py` acrescenta casos `x_…` (dois controles juntos, valores
  finos, clipe com alfa, efeito recolocado a cada foto, mediana contra a marca d'água); `confere.mjs` mede o OpenLuz de
  desenvolvimento contra as fotos sem o Resolume aberto; `compila.mjs` acusa shader que não compila.
- **Primeira rodada** (af630a2, 2ae1cc1, 1a952ce, 819b39e): 89 efeitos reescritos como dados em `effects-r1…r6.js`, com os
  nomes, controles e faixas do Resolume.
- **Segunda rodada** (88676cd, 5eec676, 6964241, 68b7f15): nova medição; Transform, Shift RGB, Meta Shape, Mirror, Displace,
  Saturation, Recolor, Hatched, Point Grid, Drop Shadow acertados; Wave Warp e Tunnel com fotos paradas.
- **Terceira rodada** (9d3250c, 772e0be, 35f129e, 50043b4, 6ad4f3d): sondas com imagem de teste própria. RadialBlur 4,9 → 0,21;
  Polkadot 3,08 → 0,86; Bloom 4,98 → 1,67 (com `stageMip` no motor); ChromaKey 4,99 → 0,63.

## Placar no fim do 02-09 (113 efeitos; detalhe e armadilhas em 02-09-LOTES.md)
igual 69 · perto 6 · longe 15 · mexem sozinhos 14 · sem medição 9 (antes da terceira rodada; ela tirou quatro de "perto").

## Verificação que houve
- `confere.mjs` por efeito a cada mudança; `compila.mjs` sem erro.
- Depois da mudança no motor (`stageMip`): selftest e 30 baterias; 29 limpas. **A do rosto reprovou duas vezes dentro da
  rodada completa** (recorte variou 1,58 % com a pessoa parada; limite 0,5 %) **e passou três vezes rodada sozinha**. Não foi
  investigado; o código do rosto não foi tocado.

## O que ficou em aberto (passou para o 02-10 e o 02-11)
Distortion, Tunnel, CRT (02-10) · Bloom com Iterations 5 e Knee, Triangulate, Sphere, Stingy Sphere, Snowy, WarpSpeed, Cube
Tiles, Fragment, Grid Cloner, Meta Shape, Noisy, Reveal, Snow, Stripper, Background Removal, os seis Depth, Slice Delay.

## Desvios
- Sem plano, sem critérios de aceite escritos antes, sem checkpoint do Felipe: nada disso foi aprovado por ele olhando.
- Nenhum push, nenhuma versão nova: tudo só no branch local `efeitos-resolume`.
