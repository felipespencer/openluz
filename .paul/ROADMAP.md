---
description: "OpenLuz — milestone and phase structure"
type: Roadmap
about: "OpenLuz"
---

# Roadmap: OpenLuz

## Overview

O OpenLuz já nasceu com o grosso do Resolume feito (release 0.1.0 para Windows em 2026-10-15).
Este roadmap começa daí: o próximo marco leva o programa do "funciona no PC do Felipe" ao
"mapeia sozinho, está provado no equipamento real e sai nas três versões". O `ROADMAP.md` da
raiz continua sendo a lista detalhada do que veio do Resolume e do que está feito.

## Current Milestone

**v0.2 Automape e provas no equipamento** (v0.2.0)
Status: In progress
Phases: 1 of 8 complete

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with [INSERTED])

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Automape | 5 | In progress (3/5) | - |
| 2 | Efeitos do Resolume | TBD | In progress (4 fechados) | - |
| 3 | Celular e plugins | TBD | Not started | - |
| 4 | Provas no equipamento (laser e APC40) | TBD | Not started | - |
| 5 | Versão web | TBD | Not started | - |
| 6 | Versão Android | TBD | Not started | - |
| 7 | Saída avançada | 2/2 | Complete | 2026-11-05 |
| 8 | Webcam virtual | 1/1 | ✅ Complete | 2026-11-02 |
| 9 | Editor de texto | 2/3 | In progress (09-03 planejado) | - |
| 10 | Modelos 3D | 0/1 | In progress (10-01 no checkpoint) | - |
| 11 | Câmera que segue o rosto | 1/1 | ✅ Complete | 2026-11-09 |
| 12 | Revisão geral | 2/7 | In progress (12-01 fechado; consertos em seis lotes) | - |

## Phase Details

### Phase 1: Automape

**Goal:** mapear sozinho a partir de uma foto tirada da posição da lente do projetor: o
programa avisa de onde tirar a foto, recebe a foto, fatia a imagem em slices e abre uma caixa
de diálogo junto de Saída › Avançada para a pessoa conferir e aplicar.
**Depends on:** Nothing (Saída avançada já existe)
**Research:** Likely (como detectar as superfícies na foto no navegador: contornos/polígonos
sem biblioteca pesada vs. modelo ONNX; como alinhar a foto ao quadro do projetor)

**Scope:**
- Maquete HTML do fluxo (aviso → foto → diálogo) para aprovação, antes de construir
- Detecção das regiões/superfícies na foto e conversão em slices (entrada + forma de saída)
- Diálogo do Automape integrado à Saída avançada, com ajuste manual depois
- Teste automático e verificação por CDP

**Plans:**
- [x] 01-01: maquete `automape-mockup.html` com o fatiamento da foto funcionando; aprovação do Felipe
- [x] 01-02: REC vira clipe (botão REC na barra; a gravação entra na grade) — pedido de 2026-10-22, feito antes do Automape no programa
- [x] 01-03: `app/automape.js` + Saída › Automape… + botão na Saída avançada + malha projetada + editor + máscaras e slices de verdade; selftest e verificação por CDP
- [ ] 01-04: IA em fotos novas (SAM local em ONNX ou Claude) e MCP do OpenLuz (servidor MCP exposto pelo programa: ler foto, criar slices/máscaras, mexer na composição) para o Claude e outros agentes operarem o programa; o Automape vira uma ferramenta dele (pedido de 2026-10-21, a confirmar)
- [ ] 01-05: IA de profundidade na foto (modelo monocular em ONNX, como o "tirar o fundo"): separar superfícies por profundidade e prévia 3D do mapeamento (pedido de 2026-10-21, a confirmar)

### Phase 2: Efeitos do Resolume

**Goal:** todos os efeitos, fontes e mixers do Resolume no OpenLuz, iguais por fora (mesmo
nome, mesmos controles, mesmas faixas, mesmos presets) e iguais na tela, conferidos lado a lado
com o Resolume com os mesmos valores. Pedido de 2026-10-25 ("não quero efeitos próprios, quero
copiar"): copiar o COMPORTAMENTO, escrevendo cada efeito do zero; nada de shader, patch `.wired`
ou código tirado do Resolume (repo público GPL; risco de remoção do repositório).
**Depends on:** Phase 1 (ordem de prioridade do Felipe: antes de "Celular e plugins")
**Research:** Likely (como capturar o Resolume e o OpenLuz com os mesmos valores e comparar a
imagem automaticamente; licença de cada modelo de `ai-models/` antes de embarcar)

**Scope:**
- Situação em 2026-10-25: `app/effects.js` + `effects2.js` já têm, por nome, quase toda a lista de efeitos de fábrica do catálogo (falta Text Animator); o trabalho é deixar cada um IGUAL na tela e nos controles, e trazer os 23 do Wire (só Background Removal existe)
- Ferramenta de comparação lado a lado (mesma imagem de entrada, mesmos valores, diferença por pixel)
- Efeitos de fábrica igualados em lotes. **1º lote, escolhido pelo Felipe: Delay RGB, Trails, Threshold**, completado com os mais usados do Resolume
- Os 23 do Wire (CRT, Strokes, Tilt Shift, Grid Cloner, Depth…) refeitos pelo resultado e pelos controles, não nó por nó
- Modelos públicos de `ai-models/` (Depth Anything, MiDaS, MODNet, PP-HumanSeg), conferida a licença, para Background Removal e efeitos de profundidade
- Ficha e controles no modelo do Wire: tipo (fonte/efeito/mixer), nome, autor, descrição, identificador, controles em ordem e grupos com mínimo/máximo/unidade/tipo de controle, presets

**Plans:**
- [x] 02-01: bancada lado a lado (REST do Resolume + CDP do OpenLuz + captura + diferença por pixel), fichas de controles pela API, e o 1º lote igualado: Delay RGB, Trails, Threshold — fechado em 2026-10-30; de quebra Background Removal, Shape Mask, YouTube e celular (SUMMARY)
- [x] 02-02: Acuarela, Tilt Shift e CRT — fechado em 2026-11-02 com a beta.44; presets do CRT e outras diferenças abertas no SUMMARY
- [x] 02-03: grade de clipes igual à do Resolume (miniatura no ar, nome na Prévia, ▶/■ de coluna, verde-água) — fechado em 2026-11-03 com a beta.47
- [x] 02-04: camadas e decks como no Resolume — fechado em 2026-11-05 com a beta.49
- [x] 02-05: Text Block e Text Animator iguais ao Resolume — fechado em 2026-11-05 com a beta.51
- [x] 02-06: Texto com IA (✦ Montar com IA; Gemini, Groq, Ollama, Claude) — fechado em 2026-11-05 com a beta.52
- [x] 02-07: Grid Cloner, SearchLight, WarpSpeed, LUT — fechado em 2026-11-06 com a beta.53
- [ ] 02-08: Slice Delay e Strokes
- [ ] 02-09 em diante: os seis Depth (modelos de profundidade, licença antes) e o resto da lista de igualar

### Phase 3: Celular e plugins

**Goal:** o celular vira controle do OpenLuz pela rede (QR code, nada para instalar) com quatro
modos — Desenhar, Toque, Pads e Controle —, em pé e deitado; o desenho do celular é um clipe;
o OpenLuz ganha um sistema de plugins (pasta com `plugin.js`: fonte ou efeito, parâmetros,
toque) e os primeiros quatro plugins são de física em tempo real: Fluido (fogo, fumaça, tinta),
Partículas, Rastro neon e Bolinhas. Pedido de 2026-10-25, a partir de um reel de plugin de
física para o Resolume controlado pelo celular.
**Depends on:** Phase 2 (ordem de prioridade do Felipe: depois do Automape e dos efeitos do Resolume)
**Research:** Likely (servidor no Electron para o celular: WebSocket na rede local e descoberta
por QR; como carregar plugins de uma pasta com segurança; simulação de fluido em WebGL2 dentro do
`engine.js`; na versão web só o mouse, no Android o toque direto na tela)

**Scope:**
- Maquete aprovada antes de construir (feita em 2026-10-25: `plugins-celular-mockup.html`)
- Sistema de plugins: pasta `Documentos/OpenLuz/plugins`, plugin aparece em Fontes/Efeitos, controles no painel Clipe e no celular, ligáveis a MIDI/som/Autopilot
- Celular: página servida pelo programa, QR code em "Conectar celular…", vários celulares e vários dedos
- Modos do celular: Desenhar (cores, espessura, borracha, some aos poucos, novo, limpar), Toque (dedo vira mão no plugin no ar; Explosão, Limpar, Auto), Pads (só os clipes, grandes, uma camada por vez, disparo do começo), Controle (master, opacidade por camada, parâmetros do que está no ar)
- Clipe de desenho: guarda os traços com o tempo; disparar refaz o desenho no ritmo em que foi feito
- Os quatro plugins de física
- Teste automático e verificação com eventos reais por CDP

**Pedido de 2026-11-11 (muda a forma da fase):** o celular deixa de ser uma página só com quatro modos e passa a ser VÁRIAS FONTES em Fontes, uma por papel, e pode haver vários celulares ao mesmo tempo, cada um ligado a uma fonte: **Celular (câmera)** (já existe), **Celular (drumpad)** (pads que disparam clipes), **Celular (controladora)** (sliders e outros controles que o Felipe escolhe e liga ao que quiser) e **Celular (desenho)** (o dedo desenha; o desenho é um clipe, "tem o script lá" na maquete). Palavras dele: "Vão ter vários celulares diferentes em fontes, não só um." A maquete `plugins-celular-mockup.html` precisa ser refeita nesse formato antes de construir. Entra junto o achado 46 da revisão geral: cada celular se liga com um endereço próprio e com chave, e o servidor só aceita quem foi chamado.

**Plans:**
- [ ] 03-01: maquete `plugins-celular-mockup.html` (feita no formato antigo de quatro modos; refazer como várias fontes, pedido de 2026-11-11, e aprovar)
- [ ] 03-02+: a definir em /paul:plan (sistema de plugins; abrir plugins FFGL de terceiros na versão Windows, com teste de desempenho antes; celular pela rede; plugins de física; clipe de desenho)

### Phase 4: Provas no equipamento (laser e APC40)

**Goal:** confirmar no LaserCube real o atraso de cor e os 45 Hz, o mapeamento por âncoras, e
provar a APC40 mkII com a controladora (cores dos pads, SysEx, anéis dos knobs).
**Depends on:** Phase 1 (nada técnico; só ordem de prioridade do Felipe)
**Research:** Unlikely (tudo já implementado; falta a mão dele no aparelho)

**Plans:**
- [ ] 04-01: a definir

### Phase 5: Versão web

**Goal:** o `app/` servido por http abrindo como produto, sem o que depende do Electron, com
o que der para fazer no navegador (File System Access, janela de saída por `window.open`).
**Depends on:** Phase 1
**Research:** Likely (o que substitui `window.projDesktop` no navegador)

**Plans:**
- [ ] 05-01: a definir

### Phase 6: Versão Android

**Goal:** casca Kotlin (reaproveitada de `PROJECIONISTAapp/shell`) rodando o mesmo `app/`,
com `OutputPresentation` para o projetor.
**Depends on:** Phase 5
**Research:** Likely (WebView: WebGL2, WebCodecs, UDP para o laser)

**Plans:**
- [ ] 06-01: a definir

### Phase 7: Saída avançada

**Goal:** a Saída avançada do OpenLuz vai além do Resolume onde o Felipe pede: emendas (soft edge) como
degradês com alça puxados na própria imagem, quatro por slice, seleção sem surpresa na sobreposição, e o
que mais surgir dos testes dele com projetores de verdade.
**Depends on:** nada (executada em 2026-10-30, fora da ordem das fases, porque os pedidos vieram
durante o checkpoint do 02-01; registrada como fase própria em 2026-10-30 — "não quero me perder")
**Research:** Unlikely

**Scope:**
- Já entregue em betas (a registrar no 07-01): emenda só no trecho da sobreposição; degradê com alça
  (A inteiro → B zero, faixa, cantos redondos do lado da projeção); quatro emendas por slice com
  liga/desliga; automático só posiciona; seleção: o selecionado por cima, clique alterna com o de trás
- A fazer: alças também na aba Saída (acompanhando a deformação), e os próximos pedidos do Felipe

**Plans:**
- [x] 07-01: Soft Edge por degradê e seleção na sobreposição (registro do entregue + alças na aba Saída) — ok do Felipe em 2026-11-03
- [x] 07-02: botão direito com o mesmo menu do Resolume 7.28 (pedido de 2026-11-05)

### Phase 8: Webcam virtual

**Goal:** a composição do OpenLuz aparece como câmera no Google Meet e afins, pela câmera virtual do OBS (DLL assinada do OBS, com o OBS fechado). Pedido de 2026-11-02; prova de conceito funcionou no Chromium do Electron (1920×1080, 30 qps).
**Depends on:** nada
**Research:** feita na prova de conceito (formato na memória openluz-webcam-virtual)

**Plans:**
- [x] 08-01: Saída › Webcam virtual, peça nativa no instalador, avisos e testes — fechado em 2026-11-02 com a beta.46; conferido no Meet pelo Felipe

### Phase 9: Editor de texto (reaberta para o 09-03)

**Goal:** clipe de texto bonito sem esforço: ✎ Editar texto no jeito do Canva (várias caixas, estilo por pedaço, efeitos, animação na
batida); a IA vira a fonte "Texto com IA". Pedido de 2026-11-07; maquete `editor-texto-mockup.html` aprovada. Recurso só do OpenLuz.
**Depends on:** nada (usa o Text Block do 02-05, os estilos prontos da beta.55 e a IA do 02-06)

**Plans:**
- [x] 09-01: editor com várias caixas, efeitos e animação; fontes separadas (aprovado 2026-11-09)
- [x] 09-02: fonte ✦ IA generativa (imagens por pedido; aprovado 2026-11-09)
- [ ] 09-03: Higgsfield (SOUL 2) como serviço de imagem, opcional e pago (pedido de 2026-11-09); vídeo do Higgsfield num plano seguinte

### Phase 10: Modelos 3D

**Goal:** abrir modelos 3D como clipe (pedido de 2026-11-07: "quero que ele leia 3d... .glb, mas que aceite mais formatos tipo obj").
Formatos: GLB/GLTF, OBJ (+MTL), FBX, STL, PLY, 3MF, DAE. Desenho por three.js (MIT) num canvas que vira textura, fundo transparente;
girar sozinho, câmera (órbita, zoom), luz pronta, material por cima (cor, arame, só contorno), animações que vêm no GLB/FBX, e ♪ na batida
nos controles (giro, escala). Recurso só do OpenLuz (o Resolume não abre 3D sem o Wire). Maquete antes de construir.
**Depends on:** nada

**Plans:**
- [ ] 10-01: clipe 3D (maquete modelo-3d-mockup.html aprovada 2026-11-09; no checkpoint)

### Phase 11: Câmera que segue o rosto ✓ concluída (2026-11-09)

**Goal:** o clipe de câmera ganha "Seguir rosto": detecção de rosto local (YuNet, MIT) e recorte suave acompanhando a pessoa.
Pedido de 2026-11-09 ("Reconhecimento facial pra controlar câmera com crop, uma opção que aparece no clipe da câmera"). Só detecção, sem identificar quem é. Maquete antes.
**Depends on:** nada

**Plans:**
- [x] 11-01: Seguir rosto no clipe de câmera (YuNet na placa, recorte antes dos efeitos, rosto-check 21/21) — aprovado em 2026-11-09 com a beta.62

### Phase 12: Revisão geral

**Goal:** dar uma geral no código do programa depois de 62 betas: achar o que perde trabalho, trava, sai errado na tela ou
derruba os quadros, e consertar em planos pequenos escolhidos pelo Felipe. Pedido de 2026-11-10 ("quero dar uma geral", com o
modelo novo Fable 5.2). Primeiro só leitura; conserto depois, com as baterias rodando antes e depois.
**Depends on:** nada

**Plans:**
- [x] 12-01: linha de base das baterias, revisão por área (só leitura) e lista priorizada de achados — fechado em 2026-11-11 (85 achados, 7 reproduzidos)
- [x] 12-02: trava e saída que cai (achados 1, 34, 35, 51, 52, 80) — fechado em 2026-11-11 com a beta.66
- [ ] 12-03: salvar, abrir e desfazer (13, 14, 15, 17, 18, 19, 20, 50) — aplicado em 2026-11-11, na beta.69 instalada; falta o aprovado
- [ ] 12-04: teclas e editores que descartam (30, 31, 32, 33, 69, 70) — aplicado em 2026-11-11, na beta.69 instalada; falta o aprovado
- [ ] 12-05: recorte, webcam e nativos (60, 61, 62, 64; o 63 foi retirado: falso alarme do webcam-check rodado sem a imagem de prova) — aplicado em 2026-11-11, na beta.70 instalada; falta o aprovado
- [ ] 12-06: rede e sites (46, 47)
- [ ] 12-07: gravação e Preparar (6, 7, 71)

## Ideias para um marco futuro

- **Domo / planetário com vários projetores** (pedido de 2026-10-29, "quero deixar esse passo pra depois"):
  3 a 6 projetores na borda do domo, sem lente olho de peixe. Três pedaços: (1) conteúdo em domemaster
  (render das camadas numa esfera + conversor de 360° equirretangular); (2) malha de deformação esférica por
  projetor na Saída avançada (a homografia atual só serve para parede plana), calibrada por foto como no
  Automape; (3) soft-edge nas sobreposições. O Resolume não faz domo sozinho (usa Blendy Dome, VIOSO); seria
  recurso só nosso, como o Automape. Entra como fase quando ele pedir.
- **OpenLuz Leve, para computador velho** (pedido de 2026-11-06, "botasse só depois no plano, não precisa fazer agora"):
  versão ultra leve para computador velho; **mínimo 4 GB de RAM** (decisão de 2026-11-06: "2 GB é muito pouco").
  3 a 5 camadas de vídeo no máximo, poucos efeitos, segurar um PNG e um vídeo pequeno, só 2 ou 3 Ctrl+Z.
  Forma proposta (falta o ok do Felipe): **modo Leve dentro do mesmo programa** e do mesmo instalador, ligado sozinho
  com 4 GB ou menos (ou à mão), sem carregar IA, recorte, profundidade, efeitos com fila de quadros e webcam virtual;
  composições abrem nos dois modos. Medir aqui quanto cada parte gasta (memória do processo não depende do total
  do PC); o teste num PC de 4 GB de verdade fica com um amigo do Felipe, que topou testar: a beta do modo Leve deve
  gravar sozinha um relatório (memória, quadros por segundo, travadas) para ele mandar de volta.

---
*Roadmap created: 2026-10-21*
*Last updated: 2026-11-03 (07-01 fechado; Fase 7 Saída avançada concluída); 2026-11-02 (02-02 fechado; Fase 8 Webcam virtual concluída); 2026-10-30 (02-01 fechado; Fase 7 Saída avançada acrescentada); 2026-10-29 (ideia do domo/planetário anotada para depois); 2026-10-25 (inseridas depois do Automape: Fase 2 "Efeitos do Resolume" e Fase 3 "Celular e plugins"; as seguintes renumeradas)*
