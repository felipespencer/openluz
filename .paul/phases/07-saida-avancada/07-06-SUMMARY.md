---
phase: 07-saida-avancada
plan: 06
subsystem: saida-avancada
tags: [presets, menu, resolume]

requires:
  - phase: 07-saida-avancada
    provides: medidas do menu Presets do Resolume (07-03, linha 14)
provides:
  - menu Presets com Salvar, Salvar como…, Apagar, Renomear…, Novo, Mostrar na pasta, Abrir… e a lista
  - no disco: presets:rename, presets:show, presets:pick
  - tools/ao-presets-check.mjs (16 verificações)
affects: [07-07 em diante]

key-files:
  created: [tools/ao-presets-check.mjs]
  modified: [app/ao.js, app/style.css, main.js, app/preload.js]

key-decisions:
  - "Exportar SVG não entra agora: fica com o slice polígono, no fim da lista"
  - "Abrir… carrega o arquivo de fora sem copiá-lo para a pasta de presets; o editor fica sem nome e avisa para usar Salvar como…"

duration: 2026-11-15
started: 2026-11-15
completed: 2026-11-15
description: "Menu de presets da Saída avançada como o do Resolume, sem o Exportar SVG"
type: Summary
about: "OpenLuz"
---

# Fase 7 Plano 06: menu de presets — Resumo

**O menu Presets da Saída avançada tem os mesmos itens do Resolume, menos o Exportar SVG. O campo de nome dentro do
menu saiu: o nome agora é pedido em diálogo por Salvar como… e Renomear….**

## Critérios de aceite

| AC | Resultado |
|----|-----------|
| AC-1 o menu | Passou — sete itens e a lista sob "Presets"; quatro itens apagados sem preset carregado |
| AC-2 cada item | Passou para Salvar como…, Salvar, Renomear…, Novo (com Ctrl+Z), a lista e Apagar, com mouse e teclado reais. **Mostrar na pasta e Abrir… não foram clicados** (abrem janelas do Windows que o CDP não fecha): só presença e estado |
| AC-3 nada quebra | Passou — ao-presets 16/16 (4 de 4 reprovavam antes), baterias da Saída avançada, loteb1, salvar e presets pelo executor, selftest e 30 baterias em quatro partes |

## Desvios

- Plano criado e aplicado com o Felipe fora do computador, pela leitura de "aprova tudo aí" (ele foi avisado e respondeu "continua").
- `salvar-check` rodado direto reprovou 8 de 21; pelo executor de baterias, com a pasta de dados que ele prepara, passou. Era a forma de rodar.
- O 12-12 continua aberto no checkpoint (teste do cabo).

## Não conferido

- Mostrar na pasta e Abrir… com clique de verdade.
- Renomear por cima de um preset existente (o caminho da confirmação só foi exercitado no Salvar como…).

## Pendências

- 07-07 em diante: Is Key, Black BG, imagem de guia, origens da entrada, "Mostrar na saída", Inverter padrão; polígono e SVG por último.
