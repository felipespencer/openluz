---
description: "Resultados do plano 12-19: carga com vídeos de verdade e efeitos, duas saídas ao mesmo tempo, dev e 0.3.0-beta.3 instalada"
type: Reference
about: "OpenLuz"
---

# 12-19 — Teste de carga (2026-11-17)

## Veredito

- **Segura.** Três camadas de vídeo de verdade (1080p + 4K h264 + 4K HEVC a 60 qps) misturadas, com cinco efeitos e o
  Background Removal, nas duas saídas ao mesmo tempo: o motor fica entre 27,6 e 30 quadros por segundo (o alvo dele é 30)
  e as duas janelas de saída a 59–60. Nenhuma exceção na página em nenhuma rodada. Igual no dev e na beta.3 instalada.
- **Dez minutos seguidos** na cena mais pesada: motor 29,4 → 28,4 qps, memória 2387 → 2402 MB, as duas saídas abertas e
  com imagem que muda no fim. Não inchou.
- **Troca de clipes:** 58 cliques reais em 2 minutos, os 58 puseram o clipe no ar; motor 29,1 qps.
- **O único ponto abaixo de 28:** a cena (c), medida nos 20 s logo depois de entrarem Blur, Bloom e Kaleidoscope, deu
  27,7 no dev e 27,6 no instalado; repetida no dev deu 29,2 e, com uma saída só, 29,7. A cena (d), mais pesada, deu
  29,4. Leitura minha, não provada: é o assentamento depois de os efeitos entrarem, não o peso da cena.
- **Travadas:** o pior intervalo entre quadros nas saídas ficou entre 17 e 117 ms. 117 ms são uns 3 quadros de vídeo
  perdidos de uma vez; aparece nas cenas com os dois vídeos 4K.
- **A segunda saída custa pouco:** com uma saída a cena (b) dá 29,6; com duas, 28,7 a 29,3.
- **Não medido:** ninguém olhou a parede; áudio, câmera ao vivo, laser e APC40 ficaram fora; os vídeos são os que havia
  na máquina, não o material de um show.

## Ambiente

- Três telas a 100%: 24G50F 1920×1080 (controle), SAMSUNG 1920×1080 em −479,−1080 e 23MP55 1080×1920 em −1080,0 (em pé).
- Código `efeitos-resolume` em `449170b` (programa igual ao `fb90731`, 0.3.0-beta.3). Resolume fechado.
- Rodador `tools/compare/saida/bat/carga.mjs` (fora do git): programa recém-aberto com pasta de dados de teste; a
  segunda tela é criada na Saída avançada com mouse real; cada tela é apontada para um projetor pelo evento `change`
  do seletor; os efeitos entram com duplo clique real na lista; as misturas, pelo evento do seletor da camada.
- Medidas: motor por `P.frames()`; em cada janela de saída, quadros desenhados e o maior intervalo entre dois; memória
  somando os sete processos do programa; capturas pelo CDP a 20%, duas por saída (brilho médio e diferença em 0,5 s).

## Vídeos (só leitura)

| Casa | Vídeo | Formato | Abriu |
|------|-------|---------|-------|
| Camada 5, col. 1 | Brazil Free Stock Video (Downloads) | 1920×1080 h264 30 qps, 17 min 44 s | sim |
| Camada 5, col. 2 | sample 2.mp4 | 1920×1080 h264 42 Mbps 18 qps, 2 min | sim |
| Camada 4, col. 1 | downtown-sao-paulo (stock) | 4096×2304 h264 135 Mbps, 18 s | sim |
| Camada 4, col. 2 | vida.mp4 (exemplo do OpenLuz) | 1280×720 h264, 10 s | sim |
| Camada 3, col. 1 | DJI_20260930192106 (drone) | 3840×2160 HEVC 60 qps 130 Mbps, 31 s | sim |
| Camada 3, col. 2 | fractal.mp4 (exemplo do OpenLuz) | 1280×720 h264, 10 s | sim |

Cada um foi posto no ar sozinho: todos com imagem e andando nas duas saídas, 29,5 a 29,9 qps no motor.

## Cenas, duas saídas ao mesmo tempo (20 s de medida cada)

Misturas: Camada 5 em 50 Add, Camada 4 em 50 Lighten, Camada 3 normal. Efeitos acumulam de uma cena para a outra.

| Cena | Motor dev | Motor instalado | Saídas (dev) | Pior intervalo dev / inst. | Memória dev / inst. |
|------|-----------|-----------------|--------------|----------------------------|---------------------|
| a: um vídeo 1080p, sem efeito | 30,0 | 29,9 | 60 e 60 qps | 17 / 33 ms | 1927 / 1894 MB |
| b: três camadas misturadas | 28,7 (rep. 28,8) | 29,3 | 59,7 e 59,7 | 83 / 117 ms | 2251 / 2284 MB |
| c: + Blur, Bloom, Kaleidoscope | **27,7** (rep. 29,2) | **27,6** | 59,7 e 59,7 | 83 / 50 ms | 2277 / 2259 MB |
| d: + Trails, Delay RGB | 29,4 | 29,4 | 59,9 e 59,9 | 33 / 67 ms | 2248 / 2265 MB |
| e: + Background Removal | 28,5 (rep. 28,7) | 29,4 | 59,3 e 59,3 | 83 / 100 ms | 2420 / 2401 MB |
| f: troca de clipes a cada 2 s, 2 min | 29,1 | não rodada | 59,4 e 59,4 | 83 ms | 2369 MB |

Com uma saída só (dev): b 29,6 e c 29,7, pior intervalo 17 e 67 ms.

Dez minutos na cena (e), dev, duas saídas:

| | Motor | Saídas | Pior intervalo | Memória |
|---|-------|--------|----------------|---------|
| primeiro minuto | 29,4 | 59,8 e 59,8 | 68 ms | 2402 MB |
| último minuto | 28,4 | 59,5 e 59,5 | 83 ms | 2412 MB |

Em todas as medidas as duas saídas estavam em tela cheia no projetor certo, com brilho médio entre 113 e 229 de 255 e
diferença entre duas leituras de 4 a 27 de 255. Capturas em `tools/compare/saida/bat/carga-dev` e `carga-inst`.

## Erros meus no caminho (as duas primeiras rodadas não valem como "três camadas")

- Tomei a camada de índice 0 pela de baixo; é a de cima (Camada 5). Na primeira rodada ela ficou em mistura normal e
  tapou as outras duas. Os números (28,9 a 29,8) são de três vídeos decodificando com um só aparecendo.
- Na segunda pus Add e Screen na de cima com o fader em 100%, e a imagem continuou sendo só ela. Não é defeito: como
  está escrito em `app/mixers.js`, copiado do Resolume, de 50% a 100% a mistura vira "camada normal por cima". Só percebi
  olhando a captura, porque os números eram iguais aos da primeira. A terceira rodada usa 50 Add e 50 Lighten, e as
  capturas mostram as três camadas.
- Registros das três rodadas em `run-1219-dev-rodada1…`, `-rodada2…` e `-rodada3.txt`.

## Observado, não virou plano

- A cena (c) abaixo de 28 logo depois de os efeitos entrarem, em 2 de 3 medidas com duas saídas.
- Intervalos de até 117 ms entre quadros com os dois vídeos 4K no ar.
- No projetor em pé a composição 16:9 sai esticada (já anotado no 12-18).

## Fim

Nenhum OpenLuz, electron nem janela de saída aberto. Nenhum arquivo rastreado mudou fora do `.paul`.
