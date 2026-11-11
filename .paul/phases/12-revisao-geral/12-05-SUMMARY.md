---
phase: 12-revisao-geral
plan: 05
subsystem: infra
tags: [recorte, webgpu, onnx, webcam-virtual, seguir-rosto, utilityprocess]

requires:
  - phase: 12-revisao-geral
    provides: achados 60, 61, 62, 64 (12-01)
provides:
  - reserva do recorte que funciona
  - recorte, detector de rosto e webcam virtual que se recuperam da morte do processo nativo
  - tools/nativos-check.mjs
affects: [12-06, 08-webcam-virtual, 11-camera-segue-rosto]

tech-stack:
  added: []
  patterns:
    - "O processo principal manda 'nativo:saiu' (seg | face | webcam) quando um utilityProcess sai; cada peça solta o que esperava e pede a porta de novo"
    - "Toda espera por resposta de processo nativo tem prazo (webcam.pede)"

key-files:
  created: [tools/nativos-check.mjs]
  modified: [main.js, app/preload.js, app/segment-worker.js, app/segment.js, app/face.js, app/webcam.js, app/app.js, app/panels.js, tools/webcam-check.mjs]

key-decisions:
  - "O recorte refaz o processo nativo até 3 vezes por sessão; depois segue pela WebGPU"
  - "A webcam virtual não religa sozinha: passa a desligada e avisa (quem decide religar é a pessoa)"

patterns-established:
  - "Bateria que mede ritmo espera a carga do modelo antes de medir (no instalado a carga leva ~7 s)"
  - "Conferir os argumentos que a bateria espera antes de acusar o programa (o falso achado 63)"

duration: 90min
started: 2026-11-11T16:00:00-03:00
completed: 2026-11-11T17:40:00-03:00
description: "Recorte, webcam virtual e detector de rosto se recuperam quando o processo nativo morre; a reserva do recorte funciona; beta.70 instalada"
type: Summary
about: "OpenLuz"
---

# Fase 12 Plano 05: Recorte, webcam e nativos — Resumo

**Quatro achados consertados (60, 61, 62, 64) no commit `1837d36`; beta.70 instalada no CAIOPRADO. O achado 63 foi
retirado: era erro meu.**

## Critérios de aceite

| Critério | Resultado | Notas |
|---|---|---|
| AC-1: a reserva funciona | Passa | Antes: 1 máscara em 8 s. Depois: 51 em 4 s no desenvolvimento; no instalado, carga de ~7 s e depois ~13 por segundo |
| AC-2: recorte com o nativo morto | Passa | 155 máscaras em 8 s depois do taskkill; processo novo sobe sozinho |
| AC-3: webcam virtual | Passa | Antes: "ligada" com a câmera congelada, 0 quadros, desligar pendurado. Depois: desligada com aviso, religar entrega 30 quadros/s, desligar responde |
| AC-4: detector de rosto | Passa | 28 detecções em 3 s antes; morto o processo, 50 em 6 s com processo novo (vídeo no lugar da câmera; a webcam do Felipe tem uma vedação preta) |
| AC-5: nada regrediu | Passa | selftest 75/75 e as 27 baterias limpas, pela primeira vez sem nenhuma reprovação |

## Verificação

- `node tools/nativos-check.mjs`: 9/9 no desenvolvimento e na beta.70 instalada; no código antigo reprovava em 5.
- No instalado: webcam-check 10/10, trava-check 25/25.
- Checkpoint humano: pendente.

## Desvios

- **Achado 63 retirado.** A "webcam preta com a composição quadrada" era falso alarme: eu rodava o webcam-check sem a
  imagem de prova e ele comparava preto com preto. A bateria passou a usar `tools/compare/clips/cam-prova.png` quando
  não recebe outra (commit `509b7b3`), e a linha de base e a lista de achados foram corrigidas.
- A primeira versão da bateria media a reserva em 8 s corridos e reprovou no instalado, onde a carga do modelo leva
  ~7 s. Passou a esperar a carga e medir 4 s depois.
- O 64 (botão Gerar preso) foi consertado e conferido só no código: não achei jeito barato de provocar a falha.
- Apareceu e foi consertado junto: quadro preparado para o nativo (só pixels) que chegava à reserva dava erro de `drawImage`.

## Aberto

- Entre a morte do nativo e a reserva assumir há a carga do modelo na WebGPU (~7 s na primeira vez), em que a máscara
  fica a última; quando o nativo é refeito a tempo isso nem aparece.
- 65 (máscara velha ao trocar de clipe), 66 (modelo 3D sem liberar), 67 e 68 continuam na lista.

---
*Fase: 12-revisao-geral, Plano: 05*
*Concluído: 2026-11-11 (falta o aprovado do Felipe)*
