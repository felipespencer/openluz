---
phase: 07-saida-avancada
plan: 02
subsystem: ui
tags: [saida-avancada, menu-de-contexto, botao-direito, resolume]

requires:
  - phase: 07-saida-avancada
    provides: editor da Saída avançada (ao.js) com abas Entrada/Saída, malha bezier e Ctrl+Z
provides:
  - botão direito no desenho e na lista da Saída avançada, com o mesmo menu do Resolume 7.28.1
  - geometria de apoio em screens.js (cloneItem, uniqueName, circleMesh)
  - bateria tools/ao-menu-check.mjs (42 verificações com clique direito real)
affects: [saida-avancada, automape]

tech-stack:
  added: []
  patterns:
    - "Menu de contexto do editor usa o mesmo menubar.context do programa (passado pelo app.js), e Esc fecha só o menu"
    - "Cada item do menu é um passo de Ctrl+Z"

key-files:
  created: [tools/ao-menu-check.mjs, tools/compare/janela.py]
  modified: [app/ao.js, app/screens.js, app/app.js]

key-decisions:
  - "Lista da Saída avançada passou a mostrar o item da frente em cima, como no Resolume (antes era o contrário)"
  - "Área de transferência do slice é ao.clip (interna), não a do sistema — a do sistema contaminava a segunda rodada da bateria"

duration: 2026-11-05 (02h30 a 03h10, mais o teste do Felipe)
started: 2026-11-05
completed: 2026-11-05
description: "Botão direito na Saída avançada com o mesmo menu do Resolume 7.28.1 (centralizar, espelhar, metades, círculo, casar, trocar, ordem, duplicar, copiar, recortar, colar), medido item a item"
type: Summary
about: "OpenLume"
---

# Fase 7 Plano 02: botão direito na Saída avançada — Resumo

**O botão direito na Saída avançada abre o mesmo menu do Resolume 7.28.1, em português, no desenho e na lista,
nas abas Entrada e Saída; cada item faz o que o Resolume faz (medido) e volta com Ctrl+Z.**

## Desempenho

| Métrica | Valor |
|---------|-------|
| Início | 2026-11-05 |
| Fim | 2026-11-05 (ok do Felipe: "aprovado", na beta.50 instalada) |
| Tarefas | 3 auto + 1 checkpoint |
| Arquivos alterados | 3 do app + 2 ferramentas |
| Beta | 0.2.0-beta.50 (9d9ef1b), código em 9faddcc |

## Critérios de aceite

| AC | Resultado |
|----|-----------|
| AC-1 menu nos mesmos lugares (desenho, lista, tela; só com seleção) | Passou — ao-menu-check e teste do Felipe |
| AC-2 cada item igual ao Resolume, com Ctrl+Z | Passou — números de MEDIDAS.md conferidos na bateria (42/42, duas rodadas, também no instalado) |
| AC-3 nada quebra | Passou — ao-check 20, soft-check 42, ui-check 18, undo-check 11, grade-check, camadas-check 31, keymap-check; selftest 74/75 (ver desvios) |

## O que foi feito

- **Medição** (tools/compare/saida/menu-ao/MEDIDAS.md e fotos, fora do git): cada item aplicado a um slice 800×400 fora do centro, lido nos campos e desfeito; Cancel no fim.
- **Slice:** Centralizar X/Y, Espelhar X/Y, Metade esquerda/de cima/direita/de baixo, Área toda, Fazer círculo (só Saída: malha bezier 4×4 com alças de círculo), Casar com a entrada/saída, Trocar entrada e saída, Trazer para frente, Mandar para trás, Duplicar, Copiar, Recortar, Colar.
- **Máscara:** o mesmo, sem Fazer círculo, Casar e Trocar.
- **Tela:** Dispositivos de saída (Automático, Janela, monitores com marca no atual), Duplicar, Colar.

## Desvios

- **app/app.js** mexido fora da lista do plano: passa `menu` e `menuOpen` ao editor.
- **style.css** estava na lista e não precisou mudar (o menu reaproveita o do programa).
- **Lista invertida:** a Saída avançada agora mostra o da frente em cima, como no Resolume.
- **ao.clip** em vez da área de transferência do sistema.
- **selftest 74/75:** "fonte Captura: página web" reprova igual sem as mudanças (git stash), com o Resolume aberto em tela cheia no monitor 2; passou às 01h40 com ele fechado. Ambiente, não o 07-02. Reconferir com o Resolume fechado.

## Pendências

- Tag e release das betas 49 e 50 no GitHub não feitas; nada foi enviado.
- Próximo: Texto — igualar Text Block e Text Animator (lidos em text-block.json e text-animator.json), depois a IA (maquete texto-ia-mockup.html, "aprovado por enquanto").
