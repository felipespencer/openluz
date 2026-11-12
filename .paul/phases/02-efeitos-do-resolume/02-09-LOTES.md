# 02-09: os 92 efeitos "só de nome" refeitos pelo gabarito — resultado por lote (2026-11-12)

Método em `tools/compare/LOTES.md`. Média = diferença por pixel (0–255) do `confere.mjs` contra as fotos do Resolume.
igual ≤ 2 · perto ≤ 6 · longe > 6. "Estimado" = controle escrito sem foto que o confirme.

## Lote 1 (piloto) — `app/effects-r1.js`
Add Subtract 0 · Bright.Contrast 0 · Auto Mask 1,08 (só bordas).

## Lote 2, cor — `app/effects-r2.js` (18)
Igual: Colorize 0,05 · Color Pass 0 · Exposure 0,1 · Hue Rotate 0 · Invert RGB 0,11 · Levels 0 · Posterize 0 · Saturation 0,05 ·
Tint 0,16 · Vibrance 0,5 · Recolor 0,82 · Solid Color 0,25 · Heat 1,07 · Dither 0,2 · Shift RGB 0 (só Shift X provado) ·
Sharpen 0,04 · Vignette 0,49. Perto: ChromaKey 3,3 (pior 9,51).
- Sem efeito ainda: ChromaKey Edge Shrink e Edge Blur; Recolor Use Alpha.
- Estimado: Levels Base (inclinação); Shift RGB Shift Y, Rotate X/Y/Z, Zoom, Black BG; Recolor Cycle Speed e paletas entre
  os cinco pontos; Colorize GreysTolerance; Vibrance positivo; Exposure e Saturation acima de 0,5; Dither 8x (quais pontos).
- Medir de novo: Levels Base 0,45/0,48/0,52/0,55; Shift RGB cada Mode com R = 0,25 e Distance 0,5; Recolor Palette de 0,05 em
  0,05 e Use Alpha com clipe com alfa; Colorize GreysKeep com Tolerance 0/0,6/1; ChromaKey White/Black com Edge 0; Exposure,
  Saturation, Vibrance em 0,6–0,9; Dither 8x em resolução cheia.
- Armadilha: chave de controle vira uniform; não pode ter nome de função GLSL (`floor` quebrou).

## Lote 4, geometria — `app/effects-r4.js` (18)
Igual: Flip 0 · Mirror 0 · Mirror Quad 0 · Crop 0 · Transform 0,02 · Slide 0 · Tile 0 · Kaleidoscope 0,01 · PolarKaleido 0,04 ·
Bendoscope 0,04 · Fish Eye 0 · Twisted 0 · Ripples 0,68 · Displace 0,03 · Blow 0 · Suckr 0,1.
Distortion 3,52 (pior 11,94: o "mapa" de brilho que move cada linha não saiu). Wave Warp mexe sozinho (a olho).
- Sem efeito ainda: Mirror Flip X/Y; Displace Smooth, Threshold, Invert; Distortion Radius; Wave Warp Pin edges?.
- Estimado: Black BG em vários; Displace Mode Wrap/Transparent; Mirror In/Out com X,Y; Transform Rotation X/Y em ângulo
  intermediário; Wave Warp Speed; Tile/Kaleidoscope contam a altura como 1088.
- Medir de novo: Mirror Flip com X,Y ≠ 0; Displace com fator ≠ 0,5; Distortion Radius com Distort > 0 e carta simples;
  **Wave Warp inteiro: as fotos da varredura parecem atrasadas um passo** (esperar mais depois de cada valor);
  Transform Rotation X/Y em 30° e 45°.

## Lote 5, máscaras e formas — `app/effects-r5.js` (16)
Igual: Keystone 0,45 (a conta é bilinear) · Keystone Crop 0,06 · Keystone Mask 0,05 · Shaper 0,16 · Circles 0 · Grid 0,01 ·
Radar 0,06 · Point Grid 1,8 (pior 9,35, borda dos pontos). Perto: Polkadot 3,11.
Só passam a imagem: Mask (falta controle de arquivo de imagem no motor) e Slice Transform (faltam as fatias da Saída avançada).
Longe: Meta Shape 19,27 (a olho) · Reveal 40,7 e Stripper 68,73 e Fragment 48,97 (sorteados; só aparência).
Shift Glitch mexe sozinho (aparência no padrão).
- Medir de novo: Stripper e Fragment com poucas cópias e várias fotos por valor (duas do Fragment têm marca d'água);
  Point Grid Rotate em ângulo intermediário; Meta Shape sobre cinzas lisos; Polkadot Dot Size 0 em resolução cheia.
- Motor: controle de arquivo de imagem (Mask); fatias no efeito (Slice Transform, Slice Delay); nível de som no shader (Reveal Seed Audio).

## Lote 7, tempo e sorteio — `app/effects-r7.js` (10)
Controles da ficha nos 10. Igual por estatística: Static, Noisy (menos Noise = 1). Perto na aparência: Strobe, Snow, Snowy,
Sparkles, Particle System (simulação em JS, até 256 partículas). Sem prova de imagem (gabarito de imagem parada, um controle
por vez): Freeze, Stop Motion, Twitch.
- Sem efeito ainda: Stop Motion Frame Count; Spawn Mode Manual (Sparkles, Particle System).
- Medir de novo: clipe em movimento para Freeze e Stop Motion; Twitch com Max e Frequency juntos; sequência com tempo
  conhecido para Strobe, Snow, Snowy, Sparkles; Particle System em regime (esperar um Lifetime).
- Motor: `feedback` e `hist` não funcionam juntos; fila com captura sob comando para Stop Motion; estado do Particle System
  é do módulo (um jato só mesmo com o efeito em duas camadas); desempenho do laço de 256 não medido.

## Lote 3, borrão e filtros — `app/effects-r3.js` (14)
Igual: Blur 0,31 · Pixel Blur 0,87 · Pixel High Pass 0 · Edge Detection 0,22 · Dilate 0,14 · Kuwahara 1,01 · Hatched 0,93
(menos cor semitransparente, 6,7) · Dot Screen 0 · LoRez 0,49. Perto: Bloom 4,89 (pior 19,81 em Iterations ≥ 4 e Size ≥ 0,75) ·
RadialBlur 4,65 (pior 9,84: Rotation e Steps altos). Raster: 22,65 no confere, mas é da medição (o Resolume zera só o alfa e
deixa o RGB; multiplicando a foto pelo alfa todos os casos ficam ≤ 0,21). Goo mexe sozinho (aparência).
Drop Shadow: sem prova (a carta é opaca e cobre o quadro; a sombra nunca aparece); os cinco controles são dedução.
- Sem efeito ainda: RadialBlur High Quality e Black BG.
- Estimado: Edge Detection Color/Amount; Dilate Triangle e Threshold no Dark; Goo MaxDistortionZ e Black BG; LoRez Dither.
- Medir de novo: Drop Shadow com clipe com transparência; Edge Detection com Use Color; Dilate Triangle/Circle (marca d'água)
  e Threshold 0,25; RadialBlur Rotation, Steps, Distance 0; Hatched Density 3/5/7; Bloom Size ≥ 0,5; Blur Quality com distância grande.
- Motor: Bloom pede passe encadeado por Iteration (até 5) em buffer float; o `stage` é desenhado duas vezes (desperdício no Blur).
- Bancada: o `confere` compara o RGB cru da foto contra a tela opaca; efeito que mexe só no alfa aparece longe sem estar.

## Lote 6 (cloners e 3D)
(a preencher quando voltar)

### Lote 6, cloners e 3D — `app/effects-r6.js` (12)
Igual: Linear Cloner 0,26 · Radial Cloner 0,31 · VideoWall 1,89 (menos SubscreenMode 0,75 e 1, sorteados) · Iterate (93 de 96 casos
≤ 0,49; os 3 ruins têm marca d'água no gabarito) · UV Map 0 (sai vazio como no Resolume sem arquivo de mapa).
Longe / aproximação: Stingy Sphere 6,65 · Tunnel (padrão 6,39; fotos com a fase andada) · Cube Tiles 39,5 (sorteado; com o cubo cheio 0,47) ·
Triangulate 28,6 (regra dos níveis não decifrada) · Sphere 36,85 · Infinite Zoom 31,25 · Terrain 69,41 (malhas 3D no Resolume; aqui marcha de raio).
- Sem efeito ainda: Delay dos dois cloners (daria com `hist`); Cube Tiles Randomize; Iterate TranslateZ/DTranslateZ; UV Map inteiro;
  Stingy Sphere FFT/Input/Fallback/Gain; Infinite Zoom Reset.
- Medir de novo: Tunnel com a fase zerada; VideoWall Subscreen com mais telas; Iterate com carta escura; Cube Tiles Num Cubes;
  Triangulate em carta simples.
- Motor: controle de arquivo por efeito (UV Map, Mask); malha 3D com vértices (Sphere, Stingy Sphere, Terrain); som por efeito;
  semente guardada por botão (Randomize, Reset).
- Armadilha: `input` é palavra reservada do GLSL; como chave de controle derruba o shader sem aviso (a imagem passa direto).

## Conferência geral dos 113 (2026-11-12, `confere-tudo.mjs`, resultado em `tools/compare/saida/conf/_tudo.json`)
Parados e medidos 90: igual 68 · perto 6 (Bloom 4,89, ChromaKey 3,26, Distortion 3,52, Polkadot 3,08, RadialBlur 4,65, Snowy 5,09;
WarpSpeed 2,09 no limite) · longe 16. Mexem sozinhos 14. Sem medição 9 (seis Depth e Slice Delay não existem; Text Block e
Text Animator não passam pelo confere).
- Longe só por sorteio ou pela medição, sem defeito conhecido: Grid Cloner (só Random Shift), Cube Tiles, Fragment, Reveal,
  Stripper, Snow, Background Removal (o modelo ainda não tinha respondido na foto do padrão; com a foto 0,64), Iterate (3 fotos
  com marca d'água), Tunnel (fotos com a fase andada; refazer o gabarito com a fase zerada).
- Longe de verdade: CRT 28,9 (presets), Meta Shape 19,2, Noisy 19,1 (só Noise = 1), Triangulate 28,6, Sphere 36,9, Stingy Sphere 6,7.
- Threshold: era 11,07; o brilho é Rec. 601 (não 709), meia-largura da rampa 0,5 × Smoothness, no limiar exato fica a Cor 2 → 1,33.
  Em aberto: Smoothness acima de 0,5 (a curva do Resolume fica mais reta; pior caso 13,4).
- Composição antiga: os efeitos refeitos têm `v: 2`; instância gravada sem essa versão volta ao padrão no `cloneFx` (o Crop
  antigo com r = 0 ficaria preto). Ken Burns e Loop na batida (imagem por IA) passaram a usar as chaves novas do Transform.
- Baterias: selftest 75/75 e as 30 baterias aprovadas depois de acertar três testes que usavam chaves antigas e a espera do Preparar.
