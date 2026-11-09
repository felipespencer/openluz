---
phase: 09-editor-de-texto
plan: 02
subsystem: ia
tags: [ia, imagem, pollinations, gemini, comfyui, openai]
requires: [09-01]
provides:
  - Fonte "✦ IA generativa": imagens por pedido, versões, variar, maior, Ken Burns e loop na batida
affects: [Fase 10 Modelos 3D (nada direto)]
key-files:
  created: [ia-imagem-main.js, tools/iagen-check.mjs]
  modified: [app/app.js, app/browser.js, app/clips.js, app/panels.js, app/preload.js, app/style.css, ia-main.js, package.json]
key-decisions:
  - "Pollinations sem chave como serviço padrão: único grátis que funcionou (Gemini imagem respondeu 429, cota 0 = pago)"
  - "Uma imagem por vez com contagem regressiva: o Pollinations sem chave deixa 1 imagem a cada 45 s por IP"
  - "As chaves ficam no processo principal; a página só vê temChave"
started: 2026-11-08
completed: 2026-11-09
description: "Fonte ✦ IA generativa com Pollinations (sem chave), Gemini, ComfyUI e OpenAI; aprovada pelo Felipe"
type: Summary
about: "OpenLume"
---

# Fase 9, Plano 02: IA generativa

**Aprovado pelo Felipe em 2026-11-09 ("aprovado"), na beta.57 instalada.** Commit a303b94.

## Critérios de aceite

| AC | Resultado |
|----|-----------|
| AC-1 Fonte própria com pedido, ideias, estilo, proporção, quantas (1/2/4) e Depois | Passou |
| AC-2 ✦ Gerar, um clique põe a versão, ↻ variar, ⤢ maior | Passou (iagen-check com serviço de mentira; Pollinations real gerou duas mandalas) |
| AC-3 Gemini, Pollinations, ComfyUI, OpenAI, cada um com link | Pollinations testado de verdade; Gemini respondeu 429 (pago, marcado assim); ComfyUI e OpenAI escritos mas não testados (sem ComfyUI instalado nem chave) |
| AC-4 Imagens em arquivo (Vídeos\OpenLume\IA), composição abre igual, Ctrl+Z | Passou |
| AC-5 iagen-check, baterias de sempre, beta instalada | Passou: iagen 15/15 no dev e na beta.57 instalada; editor 23, ia 12, ui 18, undo 11 |

## Desvios

- Defeito antigo achado e corrigido: clipe de imagem/vídeo renomeado não abria de novo (deserializeClip usava o nome como caminho).
- Clipe de espera nasce sem nome (antes dava "Não é vídeo nem imagem: IA generativa").
- Versões no mesmo segundo se sobrescreviam: nome do arquivo ganhou sufixo aleatório.

## Limitações conhecidas

- Pollinations sem chave: 1024×576, uma marca no canto e 45 s entre imagens.
- ComfyUI e OpenAI ainda sem prova de verdade.
