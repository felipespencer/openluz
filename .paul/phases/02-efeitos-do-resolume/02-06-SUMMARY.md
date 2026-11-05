---
phase: 02-efeitos-do-resolume
plan: 06
subsystem: fontes
tags: [texto, ia, gemini, groq, ollama, claude]

requires:
  - phase: 02-efeitos-do-resolume
    provides: Text Block e Text Animator iguais ao Resolume (02-05)
provides:
  - "✦ Montar com IA no painel do Text Block/Animator: Diagramar, Animar, Escrever, Separar em clipes; três versões"
  - "Configuração › IA (menu OpenLume): Gemini, Groq, Ollama, Claude, chave cifrada pelo Windows"
  - "texto com linhas de estilo próprio (fonte, estilo, tamanho, cor, espaço X) e ♪ nos valores do texto"
  - bateria tools/ia-check.mjs (serviço de mentira + Testar do Ollama)
affects: [texto, mcp-do-openlume]

tech-stack:
  added: ["@anthropic-ai/sdk 1.5.0"]
  patterns:
    - "Pedido à IA só pelo processo principal (ia-main.js); a página nunca vê a chave"
    - "A IA devolve dados num esquema JSON; o OpenLume valida, limita e desenha"

key-files:
  created: [app/ia.js, ia-main.js, tools/ia-check.mjs]
  modified: [app/text.js, app/clips.js, app/panels.js, app/panel.js, app/app.js, app/style.css, app/preload.js, main.js, package.json, package-lock.json]

key-decisions:
  - "Modelo de cada serviço vem da lista do próprio serviço no Testar (nomes mudam); Ollama escolhe o maior que cabe na placa"
  - "Claude = claude-opus-5-5 pelo SDK oficial, saída estruturada"
  - "Validação corrige o que modelo pequeno erra: espaço −10 a 30, cor escura clareada, encaixe na tela, quebra de linha no Animator"

duration: 2026-11-05
started: 2026-11-05
completed: 2026-11-05
description: "Texto com IA: botão Montar com IA no Text Block/Animator com quatro serviços à escolha; testado de verdade com o Ollama local"
type: Summary
about: "OpenLume"
---

# Fase 2 Plano 06: Texto com IA — Resumo

**O Text Block e o Text Animator têm "✦ Montar com IA": a pessoa escreve do jeito que sair, a IA devolve três versões
(cartaz diagramado, animado no BPM, escrito a partir do pedido, separado em clipes) e o OpenLume desenha; tudo
continua editável à mão e Ctrl+Z volta.**

## Desempenho

| Métrica | Valor |
|---------|-------|
| Início / fim | 2026-11-05 |
| Ok do Felipe | "Adianta mais coisa, tô fora de casa, testa tudo": checkpoint testado por mim na beta.52 instalada |
| Tarefas | 4 auto + 1 checkpoint |
| Beta | 0.2.0-beta.52 (commit 02155d9) |

## Critérios de aceite

| Critério | Resultado |
|----------|-----------|
| AC-1 Configuração › IA | Passou: quatro serviços, Testar, chave por safeStorage, fora da composição e da página (ia-check) |
| AC-2 Montar | Passou: três versões, troca por clique, Ctrl+Z, sem serviço abre a Configuração |
| AC-3 o que a IA muda | Passou: linhas com estilo próprio, Animator com ♪, Escrever, Separar (5 clipes no teste real) |
| AC-4 nada quebra | Passou: texto-check 18/18, baterias de sempre, autoteste 74/75 (a falha de sempre, "Captura: página web") |

## Teste no instalado (no lugar do Felipe)

- ia-check 15/15 e texto-check 18/18 na beta.52 instalada.
- Ollama de verdade (llama3.1:8b), pelo painel: "convite pro show da banda Maré Alta sexta 21h no Teatro Municipal,
  ingresso 30 reais, crianças grátis" com Diagramar + Escrever + Separar → três versões em 42 s e cinco clipes
  ("MARÉ ALTA", "Sexta, 21h", "Teatro Municipal", "Ingresso: R$30", "Crianças grátis!").
- Gemini, Groq e Claude sem teste real: precisam da chave do Felipe.

## Desvios do plano

- `ia-main.js` novo na raiz (fora da lista de arquivos): o pedido fica no processo principal.
- `package-lock.json` e `@anthropic-ai/sdk` novos (Claude pelo SDK oficial).
- Ordem das tarefas 2 e 1 trocada (o desenho por linha antes dos serviços).
- Limites na validação acrescentados depois de ver o llama3.1 errar (letras separadas demais, cinza escuro e azul
  puro no fundo preto, linhas maiores que a tela).
- Bug achado e corrigido: o Ollama aberto pelo Electron herdava a porta do DevTools; agora abre por Start-Process.
- O seletor de estilo virou "Estilo do cartaz" (dois "Estilo" no painel confundiam a bateria).
- gemma4:26b (18,7 GB) não cabe na RTX 2070 SUPER e passou de 5 min: o padrão é o maior modelo abaixo de 7 GB.

## Fica para depois

- Testar Gemini, Groq e Claude com chave de verdade.
- As miniaturas das três versões ficam cortadas quando o painel é baixo (dá para rolar).
