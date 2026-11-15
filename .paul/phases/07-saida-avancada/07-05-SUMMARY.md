---
phase: 07-saida-avancada
plan: 05
subsystem: saida-avancada
tags: [mascara, painel, giro, zoom, resolume]

requires:
  - phase: 07-saida-avancada
    provides: anel de giro da máscara (07-04) e as medidas do 07-03
provides:
  - painel da máscara com X, Y, Esquerda, Topo, Largura, Altura e Giro
  - giro da máscara guardado (`rot`), salvo e reaberto
  - máscara nova quadrada, 70% da altura, no centro
  - zoom com 10%, 150% e 300%
  - tools/ao-painel-check.mjs (22 verificações)
affects: [07-06 em diante]

key-files:
  created: [tools/ao-painel-check.mjs]
  modified: [app/ao.js, app/screens.js]

key-decisions:
  - "Inverter padrão não muda: no Resolume a máscara nasce com Invert ligado, mas o efeito na imagem de saída não foi medido"
  - "Largura e Altura são a caixa dos pontos já girados (no Resolume, provavelmente a forma sem giro): não medido"

duration: 2026-11-15
started: 2026-11-15
completed: 2026-11-15
description: "Máscara da Saída avançada com números e giro no painel, máscara nova quadrada como no Resolume e lista de zoom completa"
type: Summary
about: "OpenLuz"
---

# Fase 7 Plano 05: máscara e zoom — Resumo

**O painel da máscara ganhou posição, tamanho e giro em números; a máscara nova nasce 756×756 no centro de uma tela
1920×1080, como no Resolume; o zoom tem a lista completa. Linhas 16, 21 (forma) e 25 do 07-03-DIFERENCAS.md.**

## Critérios de aceite

| AC | Resultado |
|----|-----------|
| AC-1 painel com números | Passou — sete campos, cada um digitado com teclado real e desfeito com Ctrl+Z |
| AC-2 giro guardado | Passou — campo acompanha o anel; a cópia (que passa por salvar e abrir) guarda o giro. Salvar em disco e reabrir o programa não foi rodado |
| AC-3 máscara nova | Passou — 756×756 em (582, 162) |
| AC-4 lista de zoom | Passou |
| AC-5 nada quebra | Passou — ao-painel 22/22 (6 de 6 reprovavam antes), ao-gestos 64, ao-check 20, ao-menu 42, ao-mesh, soft 42, loteb 9, selftest e 30 baterias |

## Desvios

- Plano criado e aplicado sem o "1" do Felipe, pela leitura de "Tou fora do PC aprova tudo aí" como aprovação dos planos da lista da Saída avançada. Avisado a ele em 2026-11-15; ele respondeu "continua".
- A regressão foi interrompida duas vezes a pedido dele ("da um pause", "pera para") e terminou em quatro partes.
- As outras formas (círculo, triângulo, hexágono, coração) também nascem na caixa quadrada; só a retangular foi medida no Resolume.

## Pendências

- Inverter padrão: medir a saída do Resolume com Invert ligado e desligado antes de decidir.
- 07-06 em diante: Is Key, Black BG, imagem de guia, origens da entrada, presets, "Mostrar na saída".
