---
phase: 02-efeitos-do-resolume
plan: 05
subsystem: fontes
tags: [texto, text-block, text-animator, resolume, bancada]

requires:
  - phase: 02-efeitos-do-resolume
    provides: bancada lado a lado (REST do Resolume, Spout, CDP do OpenLume)
provides:
  - Text Block e Text Animator com os controles e o desenho do Resolume 7.28.1 (app/text.js)
  - bancada de texto (tools/compare/texto.py, texto-cmp.mjs) e bateria tools/texto-check.mjs
  - primeiro Ctrl+Z depois de abrir o programa desfaz de verdade
affects: [texto-ia]

tech-stack:
  added: []
  patterns:
    - "Texto desenhado em canvas 2D por letra; contorno e brilho por traços somados (faixa em volta da borda)"
    - "Text Animator: histórico dos valores animados, cada pedaço lê o valor de agora − i × Delay"

key-files:
  created: [app/text.js, tools/texto-check.mjs, tools/compare/texto.py, tools/compare/texto-cmp.mjs]
  modified: [app/clips.js, app/panels.js, app/panel.js, app/app.js, app/browser.js, app/style.css, app/composition.js, main.js, tools/selftest-main.js, tools/compare/capture.py, tools/compare/capture-burst.py]

key-decisions:
  - "em = 128 px × Size e linha = altura normal da fonte (com entrelinha), pelas medidas"
  - "Text Animator igual ao do Resolume: não anima sozinho; o movimento vem do valor animado mudando"
  - "Mapa de teclas vazio salva como nenhum mapa (corrige o primeiro Ctrl+Z)"

duration: 2026-11-05 (02h30 a 12h)
started: 2026-11-05
completed: 2026-11-05
description: "Text Block e Text Animator iguais ao Resolume 7.28.1, medidos lado a lado (48 casos a até 2 px), com atraso por pedaço no Animator; base para o Texto com IA"
type: Summary
about: "OpenLume"
---

# Fase 2 Plano 05: Text Block e Text Animator — Resumo

**As fontes Text Block e Text Animator têm os controles do Resolume 7.28.1, na mesma ordem e faixa, e desenham igual
com os mesmos valores (48 casos com a caixa a até 2 px do Resolume na bancada).**

## Desempenho

| Métrica | Valor |
|---------|-------|
| Início / fim | 2026-11-05 |
| Ok do Felipe | "Nem vi mas aprovo" (aprovou sem testar na beta.51) |
| Tarefas | 3 auto + 1 checkpoint |
| Beta | 0.2.0-beta.51 (commits 41d3ff7, aef0b9c, e94b5de) |

## Critérios de aceite

| AC | Resultado |
|----|-----------|
| AC-1 mesmos controles | Passou — texto-check confere a lista e a ordem no painel |
| AC-2 mesmo desenho | Passou — texto-cmp: 48 casos, caixa a até 2 px; maior diferença no texto: borda suavizada e Brilho dentro (~17 de 255 em média nos pixels do texto) |
| AC-3 mesma animação | Passou — medido o atraso i × Delay no Resolume; no OpenLume a 1ª letra desce na hora e a 4ª depois de 3 × Delay |
| AC-4 nada quebra | Passou — texto antigo abre no modelo novo; ao-check 20, soft-check 42, ui-check 18, undo-check 11, grade-check, camadas-check 31, keymap-check, ao-menu-check 42; selftest 74/75 (só a Captura: página web de sempre) |

**Ressalva:** o Felipe aprovou sem olhar ("Nem vi mas aprovo"); a conferência foi só a da bancada e das baterias.

## Desvios

- Fora da lista do plano: `main.js` (permissão local-fonts para a lista de fontes), `app/panel.js` (campo de várias
  linhas), `app/style.css`, `app/composition.js` (correção do Ctrl+Z), `tools/selftest-main.js` (o teste de texto
  usava o tamanho antigo: agora Tamanho 1,25), `capture.py`/`capture-burst.py` (aceitar quadro escuro, mais quadros).
- `app/engine.js` estava na lista e não mudou (o texto já sobe como textura do canvas).
- Bug achado pela bateria e corrigido: o primeiro Ctrl+Z depois de abrir não desfazia nada visível (o mapa de teclas
  nascia na primeira tecla e mudava o retrato da composição).
- Bug achado e corrigido: digitar no campo de texto perdia o foco a cada letra (o painel se redesenhava).
- No Resolume ficou ligado Output › Texture sharing (Spout) para a captura; a saída dele estava "Disabled".

## Pendências

- Tag e release das betas 49, 50 e 51 no GitHub.
- Próximo: Texto com IA (maquete texto-ia-mockup.html, "aprovado por enquanto"), em cima dos campos de `text.js`.
