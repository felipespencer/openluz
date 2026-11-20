---
description: "Software livre de projeção mapeada de nível profissional, feito por projecionistas de rua e de palco"
type: Project
about: "OpenLuz"
---

# OpenLuz

## What This Is

Software livre (GPL-3.0) de VJ, performance visual ao vivo e projeção mapeada, inspirado no
Resolume Arena e feito para ser internacional. Grade de camadas, colunas e clipes; mistura em
WebGL2; Saída avançada com telas, slices, quatro cantos, malha bezier, soft edge e máscaras;
90 efeitos de vídeo e 6 de áudio; fontes geradas, texto, câmera, GIF, vídeo preparado por
WebCodecs; decks, grupos, crossfader, BPM, autopilot; APC40 mkII nativa; módulo de laser para o
LaserCube por Wi-Fi. Três versões sobre o mesmo motor: Windows (Electron, já existe), web e
Android. O projecionista.app fica parado e vira uma versão brasileira feita em cima do OpenLuz.

## Core Value

Projecionistas de rua e de palco têm, de graça e aberto, um programa de mapeamento de
nível profissional.

## Current State

| Attribute | Value |
|-----------|-------|
| Type | Application |
| Version | 0.3.0-beta.3 (pré-release pública; 0.2.0 estável publicada em 2026-11-11) |
| Status | Em uso pelo Felipe em show; marco v0.3 aberto em 2026-11-20 |
| Last Updated | 2026-11-20 |

**Repositório:** `felipespencer/openluz` (público; colaboradores dobidu e
fbarretto). Pasta local `OneDrive/Documentos/projecionista-pc`, remote `origin`.

## Requirements

### Core Features

- Grade de clipes no jeito do Resolume (camadas, colunas, decks, grupos, crossfader, BPM, autopilot)
- Saída avançada: telas por projetor, slices, deformação, soft edge, máscaras, presets em disco
- Efeitos e fontes do Resolume (vídeo, áudio, geradores, texto, câmera, tirar fundo)
- Laser (LaserCube por Wi-Fi): texto, desenho, SVG, formas, mapeamento por âncoras, interação com a projeção
- Controle externo: APC40 mkII nativa, atalhos de teclado
- Três versões do mesmo motor: Windows, web e Android

### Validated (Shipped)

- [x] Tudo listado em "Feito" no `ROADMAP.md` da raiz, até a release 0.1.0 (Windows) de 2026-10-15
- [x] Webcam virtual: a composição aparece como câmera no Google Meet, pela câmera do OBS — Fase 8
- [x] Soft edge por degradê com alça, quatro por slice, nas abas Entrada e Saída (slice em trapézio ou malha) — Fase 7
- [x] Câmera que segue o rosto: detecção local (YuNet, MIT) e recorte que acompanha a pessoa no clipe de câmera — Fase 11
- [x] Automape: foto da lente vira slices e máscaras na Saída avançada — v0.2
- [x] Slices em polígono na Saída avançada (com lápis, pontos, Exportar SVG) — v0.2
- [x] Saída avançada igual à Advanced Output do Resolume (28 diferenças do 07-03 fechadas) — v0.2
- [x] Estável com dois projetores, 4K e efeitos nas duas saídas (12-18, 12-19) — v0.2

### Active (In Progress)

- [ ] Redondo no uso de show: arestas que aparecem com os projetores ligados (v0.3)
- [ ] Efeitos iguais ao Resolume no gabarito (CRT, Strokes, Triangulate, Sphere, Bloom…)
- [ ] Fechar com sim ou não: Higgsfield (09-03), 3D (10-01), página de primeiros passos (13-01), Saída 3D (14-01)
- [ ] Automape com IA em fotos novas (01-04, 01-05, a confirmar)

### Planned (Next)

- [ ] Conferir no cubo real o laser (atraso de cor 4 amostras, 45 Hz) e o mapeamento por âncoras
- [ ] Provar a APC40 mkII com a controladora de verdade (cores dos pads, SysEx, anéis dos knobs)
- [ ] Estrutura das três versões: web (sem Electron) e Android (casca Kotlin do PROJECIONISTAapp)
- [ ] Ler DXV1/DXV3 do Resolume e oferecer "Preparar em DXV1"
- [ ] Organização no GitHub (admin para dobidu e fbarretto), repositório público
- [ ] Tradução para inglês (depois; só README e commits são bilíngues hoje)

### Out of Scope

- DMX e luminárias (Lumiverse), NDI, Spout — fora por enquanto
- Media Manager, Fixture Editor, importar da versão 6 do Resolume
- Depth (modelos de profundidade pesados), Ableton Link, SMPTE
- Código descompilado do Resolume ou do LaserOS: só o comportamento entra, com código nosso

## Target Users

**Primary:** quem faz projeção mapeada e VJ na rua, em festa e em palco (rede Projetemos, o
próprio Felipe)
- quer o fluxo do Resolume sem pagar licença e sem os botões que ninguém usa
- julga pelo que vê: o programa aberto na tela, não lista de opções

**Secondary:** colaboradores do código aberto (dobidu, fbarretto) e, depois, público internacional

## Context

**Business Context:** nome neutro e licença copyleft para alcance internacional; o Projecionista
vira a marca local sobre o mesmo motor. Repositório privado "só pra nós dois por enquanto" até o
Felipe criar a organização no GitHub.

**Technical Context:** Electron sem bundler; `main.js` serve `app/` por `app://`; `app/engine.js`
mistura em WebGL2 (1920×1080); `app/ao.js` + `app/screens.js` + `app/warp.js` são a Saída
avançada; diálogos por `openDialog` em `app/menus.js`; onnxruntime-web já embarcado (PP-HumanSeg);
teste `PROJ_TEST=<pasta> electron .`; CDP na porta 9333 para verificar a interface com eventos reais.

## Constraints

### Technical Constraints

- Sem bundler e sem dependências pesadas novas sem necessidade; o `app/` tem de abrir no navegador comum
- Interface, documentação e comentários em português; GitHub (README e commits) bilíngue PT/EN
- Nada de botão que não faz nada: o que entra funciona
- Verificar controles com evento real (CDP), nunca com `.click()` sintético
- Reabrir o programa começa do zero (sem cache)

### Business Constraints

- Um desenvolvedor principal (Felipe) decidindo pelo que vê; pedidos chegam em rajada e mudam
- Regra "tudo do Resolume entra, ele poda depois"

### Compliance Constraints

- GPL-3.0; nenhum código descompilado de terceiros no repositório

## Key Decisions

| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| Recomeçar o programa de PC do zero, no jeito do Resolume | Três interfaces reencaixadas do celular foram rejeitadas | 2026-10-13 | Active |
| Tudo do Resolume entra; poda é do Felipe | Prefere decidir vendo | 2026-10-14 | Active |
| Maquete HTML aprovada antes de construir telas grandes | Foi o que funcionou (Saída avançada, laser) | 2026-10-14 | Active |
| Projeto principal passa a ser o OpenLuz, GPL-3.0, três versões | Alcance internacional, nome neutro | 2026-10-15 | Active |
| Repositório privado até existir organização no GitHub | Pedido do Felipe | 2026-10-15 | Superseded: público desde 2026-10-29 |
| Webcam pela câmera virtual do OBS, sem câmera própria | A DLL assinada do OBS dispensa certificado; cada computador precisa do OBS instalado | 2026-11-02 | Active |
| Corte da v0.2.0: Windows estável com o que existe | O programa nunca acabava | 2026-11-11 | Done (v0.2.0 publicada) |
| Depth e Slice Delay fora da v0.3 | Decisão do Felipe | 2026-11-13 | Active |

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Felipe faz um show inteiro só com o OpenLuz (projeção + laser) | 1 show | 1 show em 2026-11 (falta confirmar se só com o OpenLuz) | In progress |
| Versões web e Android abrindo o mesmo motor | 3 versões | 1 (Windows) | At risk |
| Repositório público com colaboradores | público | público; colaboradores sem admin | In progress |

## Tech Stack / Tools

| Layer | Technology | Notes |
|-------|------------|-------|
| Casca | Electron (sem bundler), electron-builder MSI/NSIS/zip | `main.js`, `app/preload.js` |
| Motor | WebGL2, WebCodecs + mp4box.js, WebAudio, ImageDecoder | `app/engine.js`, `app/player.js` |
| IA no cliente | onnxruntime-web (WASM), PP-HumanSeg | `app/segment.js`, `app/vendor/` |
| Webcam | koffi + memória compartilhada da câmera do OBS | `app/webcam-native.js`, `app/webcam.js` |
| Laser | UDP para LaserCube (protocolo da libLaserdockCore) | `lasercube.js`, `app/laser*.js` |
| MIDI | Web MIDI, mapa da APC40 mkII | `app/apc40.js` |
| Vídeo | ffmpeg embarcado (preparar vídeo) | `tools/ffmpeg` |
| Referência | Catálogo do Resolume e do LaserOS | `referencia-resolume/`, `referencia-laseros/` |

## Links

| Resource | URL |
|----------|-----|
| Repository | https://github.com/felipespencer/openluz |
| Releases | https://github.com/felipespencer/openluz/releases |
| Rumo detalhado | `ROADMAP.md` na raiz do repositório |

---
*PROJECT.md — Updated when requirements or context change*
*Last updated: 2026-11-20 after v0.2 Automape e provas no equipamento*
