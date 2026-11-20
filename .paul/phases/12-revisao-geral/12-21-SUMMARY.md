---
phase: 12-revisao-geral
plan: 21
completed: 2026-11-20
key-files:
  modified: [app/index.html, app/style.css, app/app.js, app/panel.js, package.json]
  created: [tools/monitores-check.mjs, projetores-mockup.html, docs/notas-0.3.0-beta.4.md]
---

# 12-21 — Quadros na forma da composição, vista Projetores, 0.3.0-beta.4

## O que foi feito
- **AC-1, cumprido:** Composição e Prévia seguem a forma da composição (`--comp-ar` posto no `applySettings`, teto de
  altura pela altura da coluna). monitores-check reprovou 6 de 10 no código de antes e aprova 22/22.
- **AC-2, cumprido por leitura:** maquete `projetores-mockup.html` mandada; o Felipe: "continua" e "nem vi a maquete com
  esmero mas vai continua". As quatro perguntas ficaram com a resposta da maquete (vista no lugar da lista Telas, quadros
  lado a lado, aviso "Deixar em pé", clique abre a Saída avançada).
- **AC-3, cumprido:** vista Projetores (31f452a, 7052fb9): miniaturas na forma de cada tela, em fila na ordem do Windows,
  imagem real (telas no ar copiam o canvas da saída a cada 5 quadros; fechadas são desenhadas a cada 15), clique abre a
  Saída avançada na aba Saída; aviso com "Deixar em pé" (desfaz com Ctrl+Z). 29,8 qps com duas saídas e a vista.
- **De quebra:** o foco do seletor (12-20) também nos diálogos (Preset das Configurações), que não têm id.
- **AC-4, em parte:** regressão inteira aprovada (ao-painel só na 2ª rodada, pelo diálogo da primeira vez; modelo3d com
  o GLB gerado); 0.3.0-beta.4 gerada (2662852, MSI 274 MB) e instalada no CAIOPRADO; no instalado nova 10, monitores 22,
  redondo 8. Publicação: ver abaixo.

## Desvios
- Composição e Prévia lado a lado e o botão Saída avançada saiu da faixa da Composição para uma linha própria (#btnAO
  com o mesmo id).
- O GitHub ficou sem responder (conexão expira; o resto da internet funciona) na hora de publicar.
