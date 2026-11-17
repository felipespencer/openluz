---
description: "Resultados do plano 12-18: baterias com os monitores ligados e a 0.3.0-beta.3 instalada com saída de verdade"
type: Reference
about: "OpenLuz"
---

# 12-18 — Resultados (2026-11-17)

## Veredito

- **Era o ambiente, não defeito:** as três baterias que oscilavam em 15 e 16/11 (selftest na captura de página web,
  rosto, modelo3d) passam firmes com os monitores ligados: 4 rodadas limpas de cada uma (3 da Tarefa 1 e 1 da regressão).
  Com os monitores desligados o programa rodava a 30–31 quadros por segundo; ligados, 60,3. As ressalvas do 07-08, 07-10,
  12-13 e 12-14 saem.
- **A 0.3.0-beta.3 instalada projeta de verdade:** saída em tela cheia no SAMSUNG (1920×1080) e no 23MP55 (1080×1920, em
  pé), 60,3 quadros por segundo, quadro lido por CDP com imagem e mudando; oito baterias aprovadas no instalado.
- **Oscilaram uma vez e passaram na repetição, sem investigação:** nativos (4 falhas de 9 na primeira rodada; o programa
  parou de andar por um instante: "1 quadros em 1,5 s") e ao-gestos (parou no primeiro passo em 2 s com
  "Cannot read properties of null (reading 'split')"; na repetição 64/64).
- **Observado, não é reprovação:** (1) no seletor de monitor da lista Telas, a seta do teclado troca uma opção e o
  seletor perde o foco (a lista é refeita); para andar duas opções é preciso focar de novo. Com o mouse não aparece.
  (2) No projetor em pé a composição 1920×1080 sai esticada para 1080×1920 (o quadrado vira retângulo alto); é o slice
  "Composição inteira" enchendo a tela, não conferido contra o Resolume.
- **Continuam dependendo do Felipe:** tirar e pôr o cabo (item 36) e escala diferente de 100% (item 41).

## Ambiente

- Três telas ligadas, escala 100%: DISPLAY1 1920×1080 (principal, 0,0), DISPLAY2 1920×1080 (acima, −479,−1080),
  DISPLAY3 1080×1920 (em pé, −1080,0).
- Código: branch `efeitos-resolume` em `fb90731` (0.3.0-beta.3), sem mudança nenhuma.
- Resolume fechado. Nenhum OpenLuz aberto antes de começar.
- Cada bateria roda num programa recém-aberto, com pasta de dados de teste (rodadores em `tools/compare/saida/bat`,
  fora do git: `baterias.mjs` e `extras.mjs`).

## Tarefa 1 — as três que oscilavam

Quadros por segundo do programa de desenvolvimento (rAF contado em 3 s): **60,3 em repouso; 60,3 na janela de controle
e 60,3 na janela de saída com uma saída aberta** em DISPLAY2 (janela em −479,−1080, 1920×1080). Com os monitores
desligados, em 16/11, eram 30–31.

| Bateria | Rodada 1 | Rodada 2 | Rodada 3 | Veredito |
|---------|----------|----------|----------|----------|
| selftest (75) | aprovado, 112 s | aprovado, 88 s | aprovado, 88 s | firme |
| modelo3d (13) | aprovado | aprovado | aprovado | firme |
| rosto (21) | aprovado | aprovado | aprovado | firme |

Nenhuma falha em nove rodadas. O item "fonte Captura: página web num navegador escondido" do selftest, o "Rosto < Busto
< Corpo" do rosto e o "redesenhado a cada quadro" do modelo3d passaram todas as vezes.

## Tarefa 2 — regressão inteira com as telas ligadas

Programa de desenvolvimento, primeira rodada de cada bateria; o que reprovou rodou mais uma vez sozinho.

| Grupo | Baterias | Resultado |
|-------|----------|-----------|
| As 30 de sempre | selftest, ui 18, undo 11, keymap, transform, camadas 31, grade, soft 42, ao 20, ao-menu 42, ao-mesh, automape, texto 18, editor 23, ia 13, iagen 17, modelo3d 13, rosto 21, presets 27, transport, webcam 10, engrenagem, trava 25, salvar 21, teclas 21, rede 14, gravar 8, lote2 (29,9 qps), lote3 (30,2 qps) | 29 aprovadas na primeira |
| | nativos 9 | **reprovou a primeira** (4 falhas), aprovou a segunda |
| Saída avançada (as que não estão nas 30) | ao-painel 24, ao-presets 30, ao-chave 12, ao-guia 16, ao-origem 31, ao-pontos 15, ao-poligono 41 | aprovadas na primeira |
| | ao-gestos 64 | **reprovou a primeira** (parou em 2 s), aprovou a segunda 64/64 |
| Lotes e uso | loteb1 9, lotea 9, loteb 9, acordado 7, testcard 4, clique 15, nova 10 | aprovadas na primeira |
| | lotec --projetores 3, show-passada 16 passos | aprovadas, ver nota |

Mensagens exatas das duas que reprovaram a primeira rodada:

- nativos: "só com a reserva (WebGPU): ... 4 máscara(s) em 4 s, carga de 9.0 s"; "processo nativo morto: as máscaras
  continuam chegando (30 ou mais em 8 s) — 7 máscara(s)"; "a imagem do programa continua andando — 1 quadros em 1,5 s";
  "ligar de novo funciona ... 1 quadros em 1 s". Segunda rodada: 9/9.
- ao-gestos: "PAROU: TypeError: Cannot read properties of null (reading 'split')", 1 verificação, 2 s. Segunda: 64/64.

Nota (erro meu de rodador, não do programa): lotec --projetores e show-passada reprovaram duas vezes dentro do
`extras.mjs` (N5 "na primeira abertura o assistente de Projetores aparece"; show-passada 6 de 16 passos sem achar o GIF
e o WebM na pasta). As duas contam com a pasta de dados do `abre-dev.mjs` (a lotec fecha e reabre o programa por ele; a
passada usa a pasta de arquivos lembrada lá). Rodadas do jeito que pedem (`abre-dev.mjs 9333`, bateria, `fecha`):
lotec 3/3 e show-passada 16 passos, 0 falharam, 0 erros na página. Os registros das duas formas estão em
`tools/compare/saida/bat/logs-1218-dev`. A show-passada deixou um programa aberto (o que ela mesma reabre); fechado.

## Tarefa 3 — a 0.3.0-beta.3 instalada com saída de verdade

Instalado em `%LOCALAPPDATA%\Programs\OpenLuz`, aberto com pasta de dados de teste marcada com `.migrado-de-openlume`
(`tools/compare/saida/bat/saida-inst.mjs`, fora do git). O Sobre diz `0.3.0-beta.3`, instalado. O diálogo Projetores da
primeira vez foi fechado com clique em Pular. Clipe `andando.mp4` no ar na camada 1.

| Monitor | Janela de saída (lida dentro dela) | Quadros/s | Brilho médio | Diferença em 0,7 s |
|---------|-----------------------------------|-----------|--------------|--------------------|
| SAMSUNG 1920×1080 em −479,−1080 | −479,−1080, 1920×1080, tela cheia | 60,3 | 4,9/255 | 9,84/255 |
| 23MP55 1080×1920 em −1080,0 (em pé) | −1080,0, 1080×1920, tela cheia | 60,3 | 5,0/255 | 9,77/255 |

O brilho é baixo porque o clipe é um quadrado branco andando sobre preto; as duas capturas (pelo CDP, a 20%) mostram o
quadrado em lugares diferentes: `inst-saida-1920x1080.png` e `inst-saida-1080x1920.png` na pasta da bancada. 15
verificações, 0 falha. A troca de monitor no SAMSUNG foi pelo evento `change` do seletor, não por tecla (ver o veredito);
no 23MP55 foi por seta de verdade. Ninguém olhou a parede: a conferência é do quadro que o programa entrega à janela.

Baterias no instalado, todas aprovadas na primeira rodada: ao-origem 31, ao-poligono 41, ao-presets 30, ao-guia 16,
ao-chave 12, loteb1 9, acordado 7, testcard 4.

## Fim

Nenhum OpenLuz, electron nem janela de saída aberto. Nenhum arquivo rastreado mudou fora do `.paul`.
