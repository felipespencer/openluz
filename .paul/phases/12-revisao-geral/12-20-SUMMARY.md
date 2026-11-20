---
phase: 12-revisao-geral
plan: 20
completed: 2026-11-20
key-files:
  modified: [app/panel.js, tools/ao-gestos-check.mjs]
  created: [tools/redondo-check.mjs, .paul/phases/12-revisao-geral/12-20-RESULTADOS.md]
---

# 12-20 — Arestas com os dois projetores ligados

## O que foi feito
- **AC-1, cumprido:** o seletor do painel guarda o foco quando a seta troca a opção (`app/panel.js`, vale para todos os
  `pselect`); redondo-check 2/8 antes, 8/8 depois (af88b2f).
- **AC-2, cumprido sem mudança:** o Resolume também estica a composição 16:9 numa tela em pé (slice de fábrica = composição
  inteira → tela inteira, lido no `AdvancedOutput.xml` dele e no fórum); não medido trocando o dispositivo ao vivo.
- **AC-3, cumprido sem mudança:** cena com três efeitos 29,7 / 29,1 / 28,8 qps; quedas espalhadas, sem ligação com a entrada
  dos efeitos. Vídeos diferentes dos do 12-19 (os de Downloads sumiram).
- **AC-4, cumprido:** ao-gestos e nativos 5/5 recém-abertos; o `null.split` era a bateria lendo o palco cedo demais (agora espera).
- **AC-5, cumprido com oscilações:** regressão inteira aprovada; editor, rosto e ao-painel só na 2ª rodada; modelo3d com GLB novo.

## Desvios
- Checkpoint de verificação do Felipe passado para a beta.4, que ele mandou segurar até o 12-21 entrar.
- `tools/compare/saida/bat/carga.mjs` (fora do git) ganhou SERIE=1 e a troca dos vídeos que sumiram.

## Pedidos novos (2026-11-20, no laptop) → 12-21
- Quadros Prévia e Composição presos em 16:9 mesmo com composição em pé (defeito: no Resolume seguem a composição).
- Ver o que sai em todos os projetores na janela principal (recurso só nosso; maquete antes).
