---
phase: 11-camera-segue-rosto
plan: 01
subsystem: camera
tags: [yunet, onnxruntime-node, directml, face-detection, crop, one-euro]
requires:
  - phase: 02-efeitos-do-resolume
    provides: leitura assíncrona de quadro pela placa (beginReadTex/pollReadClipFrame) e o padrão de processo nativo do Background Removal
provides:
  - Seguir rosto no clipe de câmera (webcam e celular)
  - recorte de origem por clipe no motor (uSrc), antes dos efeitos
  - processo nativo de detecção de rosto (face-native.js)
affects: [câmera, Background Removal, composições salvas]
tech-stack:
  added: [YuNet face_detection_yunet_2023mar.onnx (OpenCV Zoo, MIT, 232 KB)]
  patterns: [um utilityProcess por modelo, para um não esperar o outro; testes com câmera falsa do Chromium e janela fora da tela]
key-files:
  created: [app/face.js, app/face-native.js, app/vendor/yunet/, tools/rosto-check.mjs, camera-rosto-mockup.html, tools/compare/clips/rostos.jpg]
  modified: [app/engine.js, app/clips.js, app/panels.js, app/app.js, app/preload.js, main.js]
key-decisions:
  - "Detector na placa (DirectML, 3,7 ms) num processo próprio, em vez de no processador da janela como dizia o plano"
  - "Só detecção: não identifica a pessoa nem guarda nada"
duration: ~2h
completed: 2026-11-09T16:40:00-03:00
description: "Clipe de câmera segue o rosto: YuNet na placa, recorte liso antes dos efeitos, 29 qps com o Background Removal junto"
type: Summary
about: "OpenLuz"
---

# Fase 11 Plano 01: Câmera que segue o rosto — Resumo

**O clipe de câmera ganhou "Seguir rosto". O YuNet acha o rosto num processo nativo, na placa de vídeo, e o motor recorta a imagem em volta dele antes dos efeitos. O recorte anda liso pelo filtro 1€. Com o Background Removal no mesmo clipe, a composição fica em 29 qps.**

## Critérios de aceite

| Critério | Status | Notas |
|----------|--------|-------|
| AC-1: Maquete aprovada | Pass | `camera-rosto-mockup.html`, com o detector de verdade; "aprovadoo face traccking" |
| AC-2: Ligar no clipe de câmera | Pass | Só aparece em clipe de câmera. Desligado, `_crop` fica nulo e o uSrc é (0,0,1,1), o mesmo caminho de antes |
| AC-3: Controles | Pass | Os controles estão todos lá. Zoom e Altura têm ♪. MIDI usa o mapeamento geral dos números do painel e não foi testado à parte |
| AC-4: Liso e leve | Pass | Parado, o recorte variou 0,00% da largura. Composição a 29 qps com o Background Removal, detector a 14,7 por segundo (câmera falsa) |
| AC-5: Salvar, copiar, desfazer | Pass | Salvar e abrir guardam os ajustes. A cópia segue o rosto sozinha. Ctrl+Z desfaz o ♪ |
| AC-6: Webcam real do Felipe | Pass | "aprovado, pode fechar" (2026-11-09), na beta.62 |

## O que foi feito

- **`app/face-native.js`** é um utilityProcess com o YuNet no onnxruntime-node.
  - Na placa (DirectML) leva 3,7 ms por quadro. Sem DirectML, cai para o processador com 2 fios (16 ms).
  - Faz o NMS e devolve as caixas em frações da imagem.
- **`app/face.js`** cuida do resto:
  - pede um quadro de 640 px a cada 66 ms, pela leitura assíncrona da placa;
  - escolhe o rosto (O maior, Todos juntos ou O do meio) e não pula de pessoa: usa a sobreposição com o rosto que já seguia;
  - calcula o alvo (Enquadrar × Zoom, Altura, na proporção da composição) e passa pelo filtro 1€;
  - quando ninguém aparece, segura 1 s e depois faz o que o controle "Sem rosto" diz;
  - desenha a marcação da Prévia.
- **Motor:**
  - `uSrc` no shader da camada e `cropOf()`;
  - o `fitScale` usa a proporção do recorte;
  - `noCropId` faz a Prévia mostrar a imagem inteira.
- **Clipes:** `c.face = { on, params, panim }` entra em salvar e abrir, no Ctrl+Z (`applyClipProps`) e na cópia, que ganha rastreio próprio.
- **Painel:** grupo "Seguir rosto" com `paramRows`, mais a linha "Rostos" (quantos rostos, quantos ms, placa ou processador).
- **Bateria `tools/rosto-check.mjs`:** 21 verificações, com mouse e teclado reais, câmera falsa (vídeo y4m) e janela fora da tela.

## Verificação

- rosto-check passou 21 de 21 no programa de desenvolvimento.
- Também passaram: ui-check (18; uma falha intermitente no Esc, que passou nas 2 rodadas seguintes), undo-check (11), modelo3d-check (13), texto-check (18) e camadas-check (31).
- No programa instalado (beta.62), o detector respondeu na placa (ep=dml).
- **webcam-check não conferido.** Com a câmera falsa ligada, ele não vê o OBS. Sem ela, deu "Could not start video source", porque o OpenLuz instalado estava aberto ao mesmo tempo. O caminho da webcam virtual não foi tocado.

## Desvios

| Tipo | O quê | Por quê |
|------|-------|---------|
| Plano → feito | O detector roda na placa, num processo nativo próprio, e não em wasm no processador da janela | A medição deu DML 3,7 ms, CPU 14–22 ms e wasm na maquete 60–110 ms |
| Acrescentado | `tools/compare/clips/rostos.jpg` (foto gerada pelo Pollinations) | Rostos de teste para a maquete e para a câmera falsa |
| Teste | A bateria roda com a câmera falsa do Chromium e a janela fora da tela | Não depende da webcam e não pisca na tela do Felipe |
| Fora do plano, na mesma sessão | Trava de cópia única (`requestSingleInstanceLock`) e `PROJ_USERDATA` | Duas cópias do programa abertas faziam a tela piscar. Está na beta.61 |

## Observações

- O primeiro rosto aparece uns 4 s depois de ligar a opção, enquanto o modelo carrega e o DirectML compila. O processo não é aquecido na abertura do programa.
- A linha "Rostos" do painel só se atualiza quando o painel é redesenhado.
- O modelo tem entrada fixa de 640×640. A imagem vai encostada no canto, e o resto fica preto.

---
*Fase: 11-camera-segue-rosto, Plano: 01 — concluído em 2026-11-09*
