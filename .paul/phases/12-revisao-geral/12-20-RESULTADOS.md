# 12-20 — Arestas com os dois projetores ligados

Feito em 2026-11-20, com três telas ligadas: 24G50F 1920×1080 (principal, 0,0), SAMSUNG 1920×1080 (−479,−1080) e
23MP55 1080×1920 em pé (−1080,0). Escala 100%. Branch `efeitos-resolume`.

## 1. Seletor que perdia o foco — consertado (af88b2f)

- **Causa:** a troca de um `<select>` do painel chama `refresh()`, que refaz o painel inteiro e joga fora o seletor
  que tinha o foco. A 2ª seta caía no BODY. Valia para todos os seletores feitos com `K.pselect` (Saída avançada,
  laser, painéis do clipe, Configurações da composição).
- **Conserto:** `app/panel.js`. Se o seletor tinha o foco, depois do `refresh()` o foco vai para o seletor novo de
  mesmo rótulo e mesma posição dentro do mesmo painel.
- **Prova:** `tools/redondo-check.mjs`, teclado real (CDP `Input.dispatchKeyEvent`), com ↓ ↓ ↑ ↑ na Fonte do slice e
  ↓ ↑ no Dispositivo da tela. No código de antes deu **2 OK e 6 falhas** (foco no BODY); no novo, **8 de 8**.
  ao-check 20, ao-menu 42, ao-painel 24 e ao-origem 31 seguem aprovadas.

## 2. Composição esticada no projetor em pé — igual ao Resolume, nada mudou

- O `Preferences/AdvancedOutput.xml` do Resolume 7.28.1 guarda a slice de fábrica com `InputRect` = a composição
  inteira (0,0–1920,1080) e `OutputRect` = a tela inteira. Toda tela nova nasce com uma slice do tamanho dela, como diz
  o fórum deles (resolume.com/forum/viewtopic.php?p=88578, "Vertical output"). Então uma composição 16:9 numa tela
  1080×1920 sai esticada também no Resolume. Quem quer outra coisa ajusta a slice, ou faz a composição em pé.
- **Não medido:** a troca de dispositivo com o Resolume aberto (o Arena congela com facilidade). A conclusão vem do
  arquivo dele e do fórum.
- O OpenLuz faz o mesmo (slice "Composição inteira" enchendo a tela). Programa intocado.

## 3. Queda de quadros com três efeitos — sem causa, nada mexido

Os três vídeos de Downloads usados no 12-19 não estão mais no disco. A cena foi refeita com os mais pesados que
sobraram, todos HEVC: 1080p HEVC (PROJETEMOS), 4K HEVC 30 qps (army) e drone 4K HEVC 60 qps, nas duas saídas,
misturas add50, lighten50 e normal. Não é a mesma cena do 12-19.

| Rodada | cena b (três camadas) | cena c (+ Blur, Bloom, Kaleidoscope) | pior intervalo nas saídas |
|--------|------|------|------|
| 1 | 28,4 | **29,7** | 33 ms |
| 2 | 28,4 | **29,1** | 33 ms |
| 3 | 28,4 | **28,8** | 17 ms |

Motor segundo a segundo, de antes do primeiro efeito até 30 s depois do último (efeitos aos 2, 4 e 6 s): os pontos
baixos (26,8–27,8) aparecem espalhados (aos 4, 14, 17 e 23 s), sem relação com a entrada dos efeitos. É a oscilação da
decodificação de três vídeos pesados, não um tropeço na compilação dos efeitos. A série completa está em
`tools/compare/saida/bat/run-1219-serie{1,2,3}.txt` (fora do git). Cena c a 28 qps ou mais em 3 de 3.
Os 117 ms do 12-19 não voltaram: o pior foi 33 ms (mas os vídeos são outros).

## 4. Baterias que reprovavam só na 1ª rodada

- ao-gestos-check: **5 de 5** e nativos-check: **5 de 5**, cada uma num programa recém-aberto.
- O `Cannot read properties of null (reading 'split')` do ao-gestos vem da própria bateria: ela lia o `viewBox` do palco
  800 ms depois de clicar em Saída avançada; com a máquina carregada (no meio da regressão) o palco ainda não estava
  montado. A bateria agora espera o `viewBox` (até 5 s). Defeito da bateria, não do programa.
- nativos ("1 quadros em 1,5 s" no 12-18): não reproduziu em 5 rodadas. É um instante de máquina parada no meio da
  regressão, não investigado mais.

## 5. Regressão

Programa de desenvolvimento com o conserto, três telas ligadas, cada bateria num programa recém-aberto
(`tools/compare/saida/bat/baterias.mjs` com ISOLADO e `extras.mjs`, fora do git).

| Grupo | Resultado |
|-------|-----------|
| selftest 75 e as outras 29 | 27 aprovadas na 1ª rodada; **editor** (arrasto da caixa caiu em outro ponto) e **rosto** (recorte tremeu com a pessoa parada) reprovaram a 1ª e aprovaram a 2ª |
| modelo3d | não rodou: o arquivo de teste (`Downloads/c8062a65….glb`) sumiu do disco. Com um GLB gerado agora (`tools/compare/clips/esfera-300k.glb`, esfera de 211.848 triângulos, fora do git): **13/13** |
| Saída avançada e lotes (ao-presets 30, ao-chave 12, ao-guia 16, ao-origem 31, ao-pontos 15, ao-poligono 41, ao-gestos 64, loteb1 9, lotea 9, loteb 9, acordado 7, testcard 4, clique 15, nova 10, redondo 8) | aprovadas na 1ª |
| ao-painel | reprovou a 1ª (a máscara do menu "+" não ficou selecionada; era a 1ª bateria logo depois de abrir, em 3 s) e aprovou a 2ª 24/24 |

Nenhuma das três que oscilaram passa pelo `pselect` (arrasto no editor, detector de rosto, menu "+"). São as
oscilações de sempre na 1ª rodada, não investigadas aqui.
