---
phase: 09-editor-de-texto
plan: 01
subsystem: texto
tags: [texto, editor, canvas2d, batida, cartaz]
requires: [02-05 Text Block, beta.55 estilos prontos, 02-06 IA de texto]
provides:
  - Fonte "Texto" com editor no jeito do Canva (✎ Editar texto / dois cliques na casa)
  - Fonte "Texto com IA" separada (o ✦ Montar com IA mora nela)
affects: [09-02 IA generativa]
key-files:
  created: [app/cartaz.js, app/text-editor.js, app/text-presets.js, tools/editor-check.mjs, tools/presets-check.mjs]
  modified: [app/app.js, app/browser.js, app/clips.js, app/panels.js, app/ia.js, app/style.css, tools/ia-check.mjs, package.json]
key-decisions:
  - "O desenho do cartaz ficou num módulo próprio (app/cartaz.js) em vez de dentro de app/text.js: o Text Block do Resolume fica intocado"
  - "Os efeitos são desenhados pelo motor no canvas 2D (sombra, neon e elevar por shadowBlur), nada de CSS"
  - "O editor só redesenha a caixa se ela se mexeu: senão o duplo clique não entrava na escrita"
started: 2026-11-07
completed: 2026-11-09
description: "Editor de texto no jeito do Canva: caixas, pedaços, 13 estilos, 12 efeitos, 7 animações na batida; aprovado pelo Felipe"
type: Summary
about: "OpenLume"
---

# Fase 9, Plano 01: Editor de texto

**Aprovado pelo Felipe em 2026-11-09 ("aprovado"), na beta.57 instalada.** Commit principal 1f2668a (beta.56).

## Critérios de aceite

| AC | Resultado |
|----|-----------|
| AC-1 Fontes separadas (Text Block, Text Animator, Texto, Texto com IA); composições antigas com IA abrem iguais | Passou (ia-check com a fonte Texto com IA; o painel da IA só aparece com `t.iaFonte` ou `t.ia`) |
| AC-2 Editor: abrir, várias caixas, selecionar, escrever, mover com ímã, aumentar, girar, barra de cima, Ctrl+Z | Passou (editor-check, mouse real) |
| AC-3 Estilos: adicionar título/subtítulo/texto, 9 prontos + Vazado, Glitch, Eco, Degradê; fonte/cor por pedaço | Passou |
| AC-4 Doze efeitos com Força e Cor, 30 qps com cinco caixas | Passou (menos de 20 ms por quadro a 1920×1080 no editor-check) |
| AC-5 Animações Surgir, Subir, Digitar, Pulso, Piscar, Tremer, Bloco no BPM, por letra/palavra/linha/caixa | Passou |
| AC-6 editor-check, baterias de sempre, beta instalada, salvar e abrir | Passou: editor 23, presets 27, ia 12, ui 18, undo 11, texto 18, camadas 31 |

## Desvios

- Desenho em `app/cartaz.js` (novo), não em `app/text.js` como o plano dizia.
- Correções no caminho: título do editor colidia com a classe `.tit` (virou `edtit`); o duplo clique não entrava na escrita (redesenho no pointerup); o painel do Texto com IA não mostrava a IA (o sinal era ligado depois de pôr o clipe).
- A bateria `achar` passou a esperar o item ficar parado sob o ponteiro antes de clicar (cliques falhando na lista de Fontes).

## Para conferir depois (olho do Felipe)

- O brilho do Neon e o contorno do Letreiro podem estar fracos; a Curva foi suavizada e não foi revista na tela grande.
